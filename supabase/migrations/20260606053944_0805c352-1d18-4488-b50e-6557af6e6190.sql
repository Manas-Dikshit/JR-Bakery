
-- ===== AUDIT LOG =====
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL, -- INSERT|UPDATE|DELETE
  changed_by UUID REFERENCES auth.users(id),
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_read" ON public.audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_insert" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX idx_audit_table_created ON public.audit_log(table_name, created_at DESC);

CREATE OR REPLACE FUNCTION public.tg_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log(table_name, record_id, action, changed_by, new_data)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', auth.uid(), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log(table_name, record_id, action, changed_by, old_data, new_data)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSE
    INSERT INTO public.audit_log(table_name, record_id, action, changed_by, old_data)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', auth.uid(), to_jsonb(OLD));
    RETURN OLD;
  END IF;
END $$;

CREATE TRIGGER trg_audit_materials AFTER INSERT OR UPDATE OR DELETE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.tg_audit();
CREATE TRIGGER trg_audit_purchases AFTER INSERT OR UPDATE OR DELETE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.tg_audit();
CREATE TRIGGER trg_audit_production AFTER INSERT OR UPDATE OR DELETE ON public.production FOR EACH ROW EXECUTE FUNCTION public.tg_audit();
CREATE TRIGGER trg_audit_sales AFTER INSERT OR UPDATE OR DELETE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.tg_audit();
CREATE TRIGGER trg_audit_expenses AFTER INSERT OR UPDATE OR DELETE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.tg_audit();
CREATE TRIGGER trg_audit_waste AFTER INSERT OR UPDATE OR DELETE ON public.waste FOR EACH ROW EXECUTE FUNCTION public.tg_audit();
CREATE TRIGGER trg_audit_recipe_items AFTER INSERT OR UPDATE OR DELETE ON public.recipe_items FOR EACH ROW EXECUTE FUNCTION public.tg_audit();
CREATE TRIGGER trg_audit_products AFTER INSERT OR UPDATE OR DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.tg_audit();

-- ===== DAILY CLOSING =====
CREATE TABLE public.daily_closing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_date DATE NOT NULL UNIQUE,
  opening_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_expenses NUMERIC(12,2) NOT NULL DEFAULT 0,
  cash_variance NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_closing TO authenticated;
GRANT ALL ON public.daily_closing TO service_role;
ALTER TABLE public.daily_closing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "closing_read" ON public.daily_closing FOR SELECT TO authenticated USING (true);
CREATE POLICY "closing_write" ON public.daily_closing FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "closing_update" ON public.daily_closing FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "closing_delete" ON public.daily_closing FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_closing_updated BEFORE UPDATE ON public.daily_closing FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_audit_closing AFTER INSERT OR UPDATE OR DELETE ON public.daily_closing FOR EACH ROW EXECUTE FUNCTION public.tg_audit();

-- ===== STOCK ADJUSTMENTS (correction workflow) =====
CREATE TABLE public.stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  material_id UUID NOT NULL REFERENCES public.materials(id),
  quantity_delta NUMERIC(12,3) NOT NULL, -- positive=add, negative=remove
  reason TEXT NOT NULL, -- recount, damage, loss, transfer, found
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  requested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_adjustments TO authenticated;
GRANT ALL ON public.stock_adjustments TO service_role;
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "adj_read" ON public.stock_adjustments FOR SELECT TO authenticated USING (true);
CREATE POLICY "adj_write" ON public.stock_adjustments FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "adj_update" ON public.stock_adjustments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "adj_delete" ON public.stock_adjustments FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_adj_updated BEFORE UPDATE ON public.stock_adjustments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_audit_adj AFTER INSERT OR UPDATE OR DELETE ON public.stock_adjustments FOR EACH ROW EXECUTE FUNCTION public.tg_audit();

-- Apply stock change when adjustment is approved
CREATE OR REPLACE FUNCTION public.tg_apply_adjustment()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.materials
      SET current_stock = current_stock + NEW.quantity_delta
      WHERE id = NEW.material_id;
    NEW.approved_at = now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_apply_adjustment BEFORE UPDATE ON public.stock_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.tg_apply_adjustment();

-- ===== PURCHASES: bill attachment =====
ALTER TABLE public.purchases ADD COLUMN bill_url TEXT;
