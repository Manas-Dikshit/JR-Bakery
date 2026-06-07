
-- 1. Schema extensions
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS outstanding numeric NOT NULL DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS invoice_no text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS paid_amount numeric NOT NULL DEFAULT 0;

-- 2. Customer payments
CREATE TABLE IF NOT EXISTS public.customer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  amount numeric NOT NULL CHECK (amount > 0),
  method text NOT NULL DEFAULT 'cash',
  reference text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_payments TO authenticated;
GRANT ALL ON public.customer_payments TO service_role;
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read cp" ON public.customer_payments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR public.has_role(auth.uid(), 'viewer'));
CREATE POLICY "staff write cp" ON public.customer_payments FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "manager update cp" ON public.customer_payments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "admin delete cp" ON public.customer_payments FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));

-- 3. Supplier payments
CREATE TABLE IF NOT EXISTS public.supplier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  amount numeric NOT NULL CHECK (amount > 0),
  method text NOT NULL DEFAULT 'cash',
  reference text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_payments TO authenticated;
GRANT ALL ON public.supplier_payments TO service_role;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read sp" ON public.supplier_payments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR public.has_role(auth.uid(),'viewer'));
CREATE POLICY "staff write sp" ON public.supplier_payments FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "manager update sp" ON public.supplier_payments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "admin delete sp" ON public.supplier_payments FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));

-- 4. Triggers — sales -> customer outstanding
CREATE OR REPLACE FUNCTION public.tg_sale_outstanding()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE delta numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.customer_id IS NOT NULL AND NEW.payment_type = 'credit' THEN
      UPDATE public.customers SET outstanding = COALESCE(outstanding,0) + (NEW.total_amount - COALESCE(NEW.paid_amount,0)) WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.customer_id IS NOT NULL AND OLD.payment_type = 'credit' THEN
      UPDATE public.customers SET outstanding = COALESCE(outstanding,0) - (OLD.total_amount - COALESCE(OLD.paid_amount,0)) WHERE id = OLD.customer_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sale_outstanding ON public.sales;
CREATE TRIGGER trg_sale_outstanding AFTER INSERT OR DELETE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.tg_sale_outstanding();

-- 5. Triggers — customer payment -> customer outstanding
CREATE OR REPLACE FUNCTION public.tg_customer_payment()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.customers SET outstanding = COALESCE(outstanding,0) - NEW.amount WHERE id = NEW.customer_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.customers SET outstanding = COALESCE(outstanding,0) + OLD.amount WHERE id = OLD.customer_id;
    RETURN OLD;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_customer_payment ON public.customer_payments;
CREATE TRIGGER trg_customer_payment AFTER INSERT OR DELETE ON public.customer_payments FOR EACH ROW EXECUTE FUNCTION public.tg_customer_payment();

-- 6. Triggers — purchase -> supplier outstanding
CREATE OR REPLACE FUNCTION public.tg_purchase_outstanding()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.supplier_id IS NOT NULL THEN
      UPDATE public.suppliers SET outstanding = COALESCE(outstanding,0) + NEW.total_amount WHERE id = NEW.supplier_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.supplier_id IS NOT NULL THEN
      UPDATE public.suppliers SET outstanding = COALESCE(outstanding,0) - OLD.total_amount WHERE id = OLD.supplier_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_purchase_outstanding ON public.purchases;
CREATE TRIGGER trg_purchase_outstanding AFTER INSERT OR DELETE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.tg_purchase_outstanding();

-- 7. Triggers — supplier payment -> supplier outstanding
CREATE OR REPLACE FUNCTION public.tg_supplier_payment()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.suppliers SET outstanding = COALESCE(outstanding,0) - NEW.amount WHERE id = NEW.supplier_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.suppliers SET outstanding = COALESCE(outstanding,0) + OLD.amount WHERE id = OLD.supplier_id;
    RETURN OLD;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_supplier_payment ON public.supplier_payments;
CREATE TRIGGER trg_supplier_payment AFTER INSERT OR DELETE ON public.supplier_payments FOR EACH ROW EXECUTE FUNCTION public.tg_supplier_payment();

-- 8. Audit triggers
DROP TRIGGER IF EXISTS audit_cp ON public.customer_payments;
CREATE TRIGGER audit_cp AFTER INSERT OR UPDATE OR DELETE ON public.customer_payments FOR EACH ROW EXECUTE FUNCTION public.tg_audit();
DROP TRIGGER IF EXISTS audit_sp ON public.supplier_payments;
CREATE TRIGGER audit_sp AFTER INSERT OR UPDATE OR DELETE ON public.supplier_payments FOR EACH ROW EXECUTE FUNCTION public.tg_audit();

-- 9. Backfill existing suppliers outstanding from purchases
UPDATE public.suppliers s SET outstanding = COALESCE((SELECT SUM(total_amount) FROM public.purchases WHERE supplier_id = s.id), 0);

-- 10. Backfill customers outstanding from credit sales (no payments yet)
UPDATE public.customers c SET outstanding = COALESCE((SELECT SUM(total_amount - COALESCE(paid_amount,0)) FROM public.sales WHERE customer_id = c.id AND payment_type='credit'), 0);

-- 11. Allow super_admin to manage user roles
DROP POLICY IF EXISTS "admin manage roles" ON public.user_roles;
CREATE POLICY "admin manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- 12. Profiles readable by all authenticated for role-mgmt UI
DROP POLICY IF EXISTS "auth read profiles" ON public.profiles;
CREATE POLICY "auth read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
