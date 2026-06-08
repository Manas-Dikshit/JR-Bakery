import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CrudPage } from "@/components/CrudPage";
import { fmt } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/production")({
  head: () => ({ meta: [{ title: "Production — JR Bakery ERP" }] }),
  component: ProductionPage,
});

function ProductionPage() {
  const { data: products = [] } = useQuery({
    queryKey: ["products-prod"],
    queryFn: async () => (await supabase.from("products").select("id,name").order("name")).data ?? [],
  });
  return (
    <CrudPage
      title="Production"
      description="Daily production entries — recipe materials are deducted from stock automatically"
      table="production"
      select="*, product:products(name)"
      orderBy={{ column: "production_date", ascending: false }}
      columns={[
        { key: "production_date", label: "Date" },
        { key: "shift", label: "Shift" },
        { key: "batch_number", label: "Batch" },
        { key: "product", label: "Product", render: (r) => r.product?.name ?? "—" },
        { key: "quantity", label: "Qty", render: (r) => fmt(r.quantity, 0) },
      ]}
      fields={[
        { name: "production_date", label: "Date", type: "date", required: true, defaultValue: new Date().toISOString().slice(0, 10) },
        { name: "shift", label: "Shift", type: "select", options: [{value:"morning",label:"Morning"},{value:"afternoon",label:"Afternoon"},{value:"night",label:"Night"}] },
        { name: "batch_number", label: "Batch #" },
        { name: "product_id", label: "Product", type: "select", required: true, options: products.map((p) => ({ value: p.id, label: p.name })) },
        { name: "quantity", label: "Quantity produced", type: "number", step: "0.001", required: true },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  );
}
