import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({ meta: [{ title: "Customers — JR Bakery ERP" }] }),
  component: () => (
    <CrudPage
      title="Customers"
      description="Customer directory and credit tracking"
      table="customers"
      orderBy={{ column: "name", ascending: true }}
      columns={[
        { key: "name", label: "Name" },
        { key: "phone", label: "Phone" },
        { key: "credit_limit", label: "Credit limit", render: (r) => inr(r.credit_limit) },
        { key: "outstanding", label: "Outstanding", render: (r) => inr(r.outstanding) },
      ]}
      fields={[
        { name: "name", label: "Customer name", required: true },
        { name: "phone", label: "Phone" },
        { name: "address", label: "Address", type: "textarea" },
        { name: "credit_limit", label: "Credit limit", type: "number", step: "0.01", defaultValue: 0 },
      ]}
    />
  ),
});
