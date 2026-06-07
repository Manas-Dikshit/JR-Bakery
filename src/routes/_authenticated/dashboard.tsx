import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, IndianRupee, Factory, Wallet, Package, AlertTriangle } from "lucide-react";
import { inr, fmt } from "@/lib/format";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — JR Bakery ERP" }] }),
  component: Dashboard,
});

const today = () => new Date().toISOString().slice(0, 10);

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const t = today();
      const [sales, expenses, production, materials] = await Promise.all([
        supabase.from("sales").select("total_amount, sale_date"),
        supabase.from("expenses").select("amount, expense_date"),
        supabase.from("production").select("quantity, production_date, product_id"),
        supabase.from("materials").select("name, current_stock, min_stock, avg_cost"),
      ]);
      const todaySales = (sales.data ?? []).filter((s) => s.sale_date === t).reduce((a, b) => a + Number(b.total_amount), 0);
      const todayExp = (expenses.data ?? []).filter((e) => e.expense_date === t).reduce((a, b) => a + Number(b.amount), 0);
      const todayProd = (production.data ?? []).filter((p) => p.production_date === t).reduce((a, b) => a + Number(b.quantity), 0);
      const invValue = (materials.data ?? []).reduce((a, m) => a + Number(m.current_stock) * Number(m.avg_cost), 0);
      const lowStock = (materials.data ?? []).filter((m) => Number(m.current_stock) <= Number(m.min_stock) && Number(m.min_stock) > 0);

      // Last 14 days revenue trend
      const days: Record<string, { date: string; revenue: number; expense: number }> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const k = d.toISOString().slice(0, 10);
        days[k] = { date: k.slice(5), revenue: 0, expense: 0 };
      }
      (sales.data ?? []).forEach((s) => { if (days[s.sale_date]) days[s.sale_date].revenue += Number(s.total_amount); });
      (expenses.data ?? []).forEach((e) => { if (days[e.expense_date]) days[e.expense_date].expense += Number(e.amount); });

      return {
        todaySales, todayExp, todayProd,
        todayProfit: todaySales - todayExp,
        invValue, lowStock,
        trend: Object.values(days),
      };
    },
  });

  const cards = [
    { label: "Today's Revenue", value: inr(stats?.todaySales ?? 0), icon: IndianRupee, color: "text-success" },
    { label: "Today's Expenses", value: inr(stats?.todayExp ?? 0), icon: Wallet, color: "text-warning" },
    { label: "Today's Profit", value: inr(stats?.todayProfit ?? 0), icon: TrendingUp, color: "text-primary" },
    { label: "Today's Production", value: fmt(stats?.todayProd ?? 0, 0) + " units", icon: Factory, color: "text-chart-3" },
    { label: "Inventory Value", value: inr(stats?.invValue ?? 0), icon: Package, color: "text-chart-5" },
    { label: "Low Stock Alerts", value: String(stats?.lowStock.length ?? 0), icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time view of your bakery operations</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">{c.label}</div>
                <div className="text-2xl font-semibold mt-1">{c.value}</div>
              </div>
              <c.icon className={`h-6 w-6 ${c.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Revenue & Expense — last 14 days</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.trend ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-success)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expense" stroke="var(--color-warning)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {stats?.lowStock && stats.lowStock.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Low stock materials</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {stats.lowStock.map((m: any) => (
                <div key={m.name} className="flex justify-between border rounded-md p-3 text-sm">
                  <span>{m.name}</span>
                  <span className="text-destructive font-medium">{fmt(m.current_stock, 1)} / {fmt(m.min_stock, 1)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
