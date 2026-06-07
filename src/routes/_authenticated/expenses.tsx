import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { inr } from "@/lib/format";

const CATEGORIES = ["Transport","Petrol","Diesel","Electricity","Water","Internet","Salary","Workers","Drivers","Maintenance","Machine Repair","Cleaning","Office","Tea & Snacks","Miscellaneous"];

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({ meta: [{ title: "Expenses — JR Bakery ERP" }] }),
  component: () => (
    <CrudPage
      title="Expenses"
      description="Operational expenses by category"
      table="expenses"
      orderBy={{ column: "expense_date", ascending: false }}
      columns={[
        { key: "expense_date", label: "Date" },
        { key: "category", label: "Category" },
        { key: "description", label: "Description" },
        { key: "amount", label: "Amount", render: (r) => inr(r.amount) },
      ]}
      fields={[
        { name: "expense_date", label: "Date", type: "date", required: true, defaultValue: new Date().toISOString().slice(0, 10) },
        { name: "category", label: "Category", type: "select", required: true, options: CATEGORIES.map((c) => ({ value: c, label: c })) },
        { name: "description", label: "Description", type: "textarea" },
        { name: "amount", label: "Amount", type: "number", step: "0.01", required: true },
      ]}
    />
  ),
});
