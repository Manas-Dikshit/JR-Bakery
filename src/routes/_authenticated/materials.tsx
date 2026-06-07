import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { fmt } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/materials")({
  head: () => ({ meta: [{ title: "Materials — JR Bakery ERP" }] }),
  component: () => (
    <CrudPage
      title="Raw Materials"
      description="Master list of raw materials and live stock levels"
      table="materials"
      orderBy={{ column: "name", ascending: true }}
      columns={[
        { key: "code", label: "Code" },
        { key: "name", label: "Name" },
        { key: "category", label: "Category" },
        { key: "unit", label: "Unit" },
        { key: "current_stock", label: "Stock", render: (r) => fmt(r.current_stock, 2) },
        { key: "min_stock", label: "Min", render: (r) => fmt(r.min_stock, 2) },
        { key: "avg_cost", label: "Avg cost", render: (r) => fmt(r.avg_cost) },
        { key: "current_price", label: "Last price", render: (r) => fmt(r.current_price) },
      ]}
      fields={[
        { name: "code", label: "Code" },
        { name: "name", label: "Name", required: true },
        { name: "category", label: "Category" },
        { name: "unit", label: "Unit (kg/g/L/pcs)", required: true, defaultValue: "kg" },
        { name: "current_price", label: "Current price", type: "number", step: "0.01" },
        { name: "avg_cost", label: "Avg cost", type: "number", step: "0.01" },
        { name: "current_stock", label: "Opening stock", type: "number", step: "0.001" },
        { name: "min_stock", label: "Minimum stock", type: "number", step: "0.001" },
        { name: "reorder_level", label: "Reorder level", type: "number", step: "0.001" },
      ]}
    />
  ),
});
