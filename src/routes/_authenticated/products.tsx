import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({ meta: [{ title: "Products — JR Bakery ERP" }] }),
  component: () => (
    <CrudPage
      title="Products"
      description="Finished goods catalog"
      table="products"
      orderBy={{ column: "name", ascending: true }}
      columns={[
        { key: "code", label: "Code" },
        { key: "name", label: "Name" },
        { key: "category", label: "Category" },
        { key: "unit_weight", label: "Unit weight (g)" },
        { key: "selling_price", label: "Selling price", render: (r) => inr(r.selling_price) },
      ]}
      fields={[
        { name: "code", label: "Code" },
        { name: "name", label: "Product name", required: true },
        { name: "category", label: "Category" },
        { name: "unit_weight", label: "Unit weight (g)", type: "number", step: "0.001" },
        { name: "selling_price", label: "Selling price", type: "number", step: "0.01", required: true },
      ]}
    />
  ),
});
