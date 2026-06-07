import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";

export const Route = createFileRoute("/_authenticated/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers — JR Bakery ERP" }] }),
  component: () => (
    <CrudPage
      title="Suppliers"
      description="Supplier directory and contact details"
      table="suppliers"
      orderBy={{ column: "name", ascending: true }}
      columns={[
        { key: "name", label: "Name" },
        { key: "contact_person", label: "Contact" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "gst_number", label: "GST" },
        { key: "payment_terms", label: "Terms" },
      ]}
      fields={[
        { name: "name", label: "Supplier name", required: true },
        { name: "contact_person", label: "Contact person" },
        { name: "phone", label: "Phone" },
        { name: "email", label: "Email" },
        { name: "address", label: "Address", type: "textarea" },
        { name: "gst_number", label: "GST number" },
        { name: "payment_terms", label: "Payment terms" },
      ]}
    />
  ),
});
