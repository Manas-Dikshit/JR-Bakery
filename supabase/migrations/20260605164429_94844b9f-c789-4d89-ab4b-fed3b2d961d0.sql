
-- ===== ROLES =====
CREATE TYPE public.app_role AS ENUM ('super_admin', 'manager', 'operator', 'viewer');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
  ORDER BY CASE role WHEN 'super_admin' THEN 1 WHEN 'manager' THEN 2 WHEN 'operator' THEN 3 ELSE 4 END
  LIMIT 1
$$;

-- Helper for "any staff role" (everyone but pure viewer)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin','manager','operator'))
$$;

-- Auto-create profile + give first user super_admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count INT;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ===== SUPPLIERS =====
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  gst_number TEXT,
  payment_terms TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers_read" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "suppliers_write" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "suppliers_update" ON public.suppliers FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "suppliers_delete" ON public.suppliers FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ===== MATERIALS =====
CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'kg',
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  current_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  avg_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_stock NUMERIC(12,3) NOT NULL DEFAULT 0,
  min_stock NUMERIC(12,3) NOT NULL DEFAULT 0,
  reorder_level NUMERIC(12,3) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT ALL ON public.materials TO service_role;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materials_read" ON public.materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "materials_write" ON public.materials FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "materials_update" ON public.materials FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "materials_delete" ON public.materials FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_materials_updated BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ===== PURCHASES =====
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  invoice_number TEXT,
  material_id UUID NOT NULL REFERENCES public.materials(id),
  quantity NUMERIC(12,3) NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchases_read" ON public.purchases FOR SELECT TO authenticated USING (true);
CREATE POLICY "purchases_write" ON public.purchases FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "purchases_update" ON public.purchases FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "purchases_delete" ON public.purchases FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));

-- Auto-update stock on purchase
CREATE OR REPLACE FUNCTION public.tg_purchase_stock()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.materials
    SET current_stock = current_stock + NEW.quantity,
        current_price = NEW.unit_price,
        avg_cost = CASE WHEN current_stock + NEW.quantity > 0
                        THEN ((avg_cost * current_stock) + (NEW.unit_price * NEW.quantity)) / (current_stock + NEW.quantity)
                        ELSE NEW.unit_price END
  WHERE id = NEW.material_id;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_purchase_stock AFTER INSERT ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.tg_purchase_stock();

-- ===== PRODUCTS =====
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  unit_weight NUMERIC(12,3),
  selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_read" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_write" ON public.products FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "products_update" ON public.products FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "products_delete" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ===== RECIPES =====
CREATE TABLE public.recipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id),
  quantity_per_unit NUMERIC(12,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, material_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_items TO authenticated;
GRANT ALL ON public.recipe_items TO service_role;
ALTER TABLE public.recipe_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipes_read" ON public.recipe_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "recipes_write" ON public.recipe_items FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "recipes_update" ON public.recipe_items FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "recipes_delete" ON public.recipe_items FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- ===== PRODUCTION =====
CREATE TABLE public.production (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift TEXT,
  batch_number TEXT,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity NUMERIC(12,3) NOT NULL,
  operator_id UUID REFERENCES auth.users(id),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production TO authenticated;
GRANT ALL ON public.production TO service_role;
ALTER TABLE public.production ENABLE ROW LEVEL SECURITY;
CREATE POLICY "production_read" ON public.production FOR SELECT TO authenticated USING (true);
CREATE POLICY "production_write" ON public.production FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "production_update" ON public.production FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "production_delete" ON public.production FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));

-- Auto-consume stock from recipe on production
CREATE OR REPLACE FUNCTION public.tg_production_consume()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.materials m
    SET current_stock = m.current_stock - (ri.quantity_per_unit * NEW.quantity)
  FROM public.recipe_items ri
  WHERE ri.product_id = NEW.product_id AND ri.material_id = m.id;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_production_consume AFTER INSERT ON public.production
  FOR EACH ROW EXECUTE FUNCTION public.tg_production_consume();

-- ===== CUSTOMERS =====
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  credit_limit NUMERIC(12,2) NOT NULL DEFAULT 0,
  outstanding NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_read" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "customers_write" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "customers_update" ON public.customers FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "customers_delete" ON public.customers FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ===== SALES =====
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity NUMERIC(12,3) NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'cash',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_read" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "sales_write" ON public.sales FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "sales_update" ON public.sales FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "sales_delete" ON public.sales FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));

-- ===== EXPENSES =====
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_read" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "expenses_write" ON public.expenses FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));

-- ===== WASTE =====
CREATE TABLE public.waste (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waste_date DATE NOT NULL DEFAULT CURRENT_DATE,
  product_id UUID REFERENCES public.products(id),
  quantity NUMERIC(12,3) NOT NULL,
  reason TEXT,
  est_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waste TO authenticated;
GRANT ALL ON public.waste TO service_role;
ALTER TABLE public.waste ENABLE ROW LEVEL SECURITY;
CREATE POLICY "waste_read" ON public.waste FOR SELECT TO authenticated USING (true);
CREATE POLICY "waste_write" ON public.waste FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "waste_update" ON public.waste FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "waste_delete" ON public.waste FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));
