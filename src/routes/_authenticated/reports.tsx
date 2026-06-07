import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — JR Bakery ERP" }] }),
  component: Reports,
});

function Reports() {
  const { data } = useQuery({
    queryKey: ["reports-pl"],
    queryFn: async () => {
      const [sales, expenses, waste] = await Promise.all([
        supabase.from("sales").select("total_amount, sale_date"),
        supabase.from("expenses").select("amount, expense_date"),
        supabase.from("waste").select("est_value, waste_date"),
      ]);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      const sum = (rows: any[], k: string, dateK: string, from: string) =>
        rows.filter((r) => r[dateK] >= from).reduce((a, b) => a + Number(b[k]), 0);

      const monthRev = sum(sales.data ?? [], "total_amount", "sale_date", monthStart);
      const monthExp = sum(expenses.data ?? [], "amount", "expense_date", monthStart);
      const monthWaste = sum(waste.data ?? [], "est_value", "waste_date", monthStart);
      const yearRev = sum(sales.data ?? [], "total_amount", "sale_date", yearStart);
      const yearExp = sum(expenses.data ?? [], "amount", "expense_date", yearStart);

      return {
        monthRev, monthExp, monthWaste, monthProfit: monthRev - monthExp - monthWaste,
        yearRev, yearExp, yearProfit: yearRev - yearExp,
      };
    },
  });

  const blocks = [
    { title: "This Month", items: [
      ["Revenue", data?.monthRev], ["Expenses", data?.monthExp], ["Waste", data?.monthWaste], ["Net Profit", data?.monthProfit],
    ]},
    { title: "This Year", items: [
      ["Revenue", data?.yearRev], ["Expenses", data?.yearExp], ["Net Profit", data?.yearProfit],
    ]},
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Profit & loss summary</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {blocks.map((b) => (
          <Card key={b.title}>
            <CardHeader><CardTitle>{b.title}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {b.items.map(([k, v]) => (
                <div key={k as string} className="flex justify-between border-b last:border-0 py-2">
                  <span className="text-sm text-muted-foreground">{k}</span>
                  <span className="font-medium">{inr((v as number) ?? 0)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
