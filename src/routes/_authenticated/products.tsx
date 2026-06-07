import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { inr } from "@/lib/format";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({ meta: [{ title: "Products — JR Bakery ERP" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>Finished goods catalog</CardDescription>
        </CardHeader>
        <CardContent>
          <CrudPage
            title="Products"
            description=""
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
        </CardContent>
      </Card>
    </div>
  );
}
