import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CrudPage } from "@/components/CrudPage";
import { fmt, inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({ meta: [{ title: "Sales — JR Bakery ERP" }] }),
  component: SalesPage,
});

function SalesPage() {
  const { data: products = [] } = useQuery({
    queryKey: ["products-sales"],
    queryFn: async () => (await supabase.from("products").select("id,name,selling_price").order("name")).data ?? [],
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-sales"],
    queryFn: async () => (await supabase.from("customers").select("id,name").order("name")).data ?? [],
  });
  return (
    <CrudPage
      title="Sales"
      description="Daily sales entries"
      table="sales"
      select="*, product:products(name), customer:customers(name)"
      orderBy={{ column: "sale_date", ascending: false }}
      columns={[
        { key: "sale_date", label: "Date" },
        { key: "customer", label: "Customer", render: (r) => r.customer?.name ?? "Walk-in" },
        { key: "product", label: "Product", render: (r) => r.product?.name ?? "—" },
        { key: "quantity", label: "Qty", render: (r) => fmt(r.quantity, 0) },
        { key: "unit_price", label: "Unit", render: (r) => fmt(r.unit_price) },
        { key: "total_amount", label: "Total", render: (r) => inr(r.total_amount) },
        { key: "payment_type", label: "Payment" },
      ]}
      fields={[
        { name: "sale_date", label: "Date", type: "date", required: true, defaultValue: new Date().toISOString().slice(0, 10) },
        { name: "customer_id", label: "Customer", type: "select", options: customers.map((c) => ({ value: c.id, label: c.name })) },
        { name: "product_id", label: "Product", type: "select", required: true, options: products.map((p) => ({ value: p.id, label: p.name })) },
        { name: "quantity", label: "Quantity", type: "number", step: "0.001", required: true },
        { name: "unit_price", label: "Unit price", type: "number", step: "0.01", required: true },
        { name: "total_amount", label: "Total amount", type: "number", step: "0.01", required: true },
        { name: "payment_type", label: "Payment type", type: "select", required: true, defaultValue: "cash",
          options: [{value:"cash",label:"Cash"},{value:"credit",label:"Credit"},{value:"upi",label:"UPI"},{value:"bank",label:"Bank"}] },
      ]}
    />
  );
}
