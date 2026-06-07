import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CrudPage } from "@/components/CrudPage";
import { fmt, inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/waste")({
  head: () => ({ meta: [{ title: "Waste — JR Bakery ERP" }] }),
  component: WastePage,
});

function WastePage() {
  const { data: products = [] } = useQuery({
    queryKey: ["products-waste"],
    queryFn: async () => (await supabase.from("products").select("id,name").order("name")).data ?? [],
  });
  return (
    <CrudPage
      title="Waste & Loss"
      description="Track damaged, burnt, expired and returned product"
      table="waste"
      select="*, product:products(name)"
      orderBy={{ column: "waste_date", ascending: false }}
      columns={[
        { key: "waste_date", label: "Date" },
        { key: "product", label: "Product", render: (r) => r.product?.name ?? "—" },
        { key: "quantity", label: "Qty", render: (r) => fmt(r.quantity, 2) },
        { key: "reason", label: "Reason" },
        { key: "est_value", label: "Est. value", render: (r) => inr(r.est_value) },
      ]}
      fields={[
        { name: "waste_date", label: "Date", type: "date", required: true, defaultValue: new Date().toISOString().slice(0, 10) },
        { name: "product_id", label: "Product", type: "select", options: products.map((p) => ({ value: p.id, label: p.name })) },
        { name: "quantity", label: "Quantity", type: "number", step: "0.001", required: true },
        { name: "reason", label: "Reason", type: "select", options: [
          {value:"Burnt",label:"Burnt"},{value:"Damaged",label:"Damaged"},{value:"Expired",label:"Expired"},{value:"Returned",label:"Returned"}] },
        { name: "est_value", label: "Estimated value", type: "number", step: "0.01", defaultValue: 0 },
      ]}
    />
  );
}
