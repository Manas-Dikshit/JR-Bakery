import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, IndianRupee, Factory, Wallet, Package, AlertTriangle, Sparkles, ChevronRight, Clock3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { inr, fmt } from "@/lib/format";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — JR Bakery ERP" }] }),
  component: Dashboard,
});

const today = () => new Date().toISOString().slice(0, 10);

function Dashboard() {
  const { data: sales = [] } = useQuery({
    queryKey: ["sales-dashboard"],
    queryFn: async () => (await supabase.from("sales").select("total_amount, sale_date")).data ?? [],
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses-dashboard"],
    queryFn: async () => (await supabase.from("expenses").select("amount, expense_date")).data ?? [],
  });

  const { data: production = [] } = useQuery({
    queryKey: ["production-dashboard"],
    queryFn: async () => (await supabase.from("production").select("quantity, production_date")).data ?? [],
  });

  const { data: materials = [] } = useQuery({
    queryKey: ["materials-dashboard"],
    queryFn: async () => (await supabase.from("materials").select("name, current_stock, min_stock, avg_cost")).data ?? [],
  });

  // compute simple stats
  const t = today();
  const todaySales = (sales ?? []).filter((s: any) => s.sale_date === t).reduce((a: number, b: any) => a + Number(b.total_amount ?? 0), 0);
  const todayExp = (expenses ?? []).filter((e: any) => e.expense_date === t).reduce((a: number, b: any) => a + Number(b.amount ?? 0), 0);
  const todayProd = (production ?? []).filter((p: any) => p.production_date === t).reduce((a: number, b: any) => a + Number(b.quantity ?? 0), 0);
  const invValue = (materials ?? []).reduce((a: number, m: any) => a + (Number(m.current_stock ?? 0) * Number(m.avg_cost ?? 0)), 0);
  const lowStock = (materials ?? []).filter((m: any) => Number(m.min_stock ?? 0) > 0 && Number(m.current_stock ?? 0) <= Number(m.min_stock ?? 0));

  // trend for last 14 days
  const days: Record<string, { date: string; revenue: number; expense: number }> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days[key] = { date: key, revenue: 0, expense: 0 };
  }
  (sales ?? []).forEach((s: any) => {
    const key = (s.sale_date ?? "").toString();
    if (days[key]) days[key].revenue += Number(s.total_amount ?? 0);
  });
  (expenses ?? []).forEach((e: any) => {
    const key = (e.expense_date ?? "").toString();
    if (days[key]) days[key].expense += Number(e.amount ?? 0);
  });

  const trend = Object.values(days);

  const kpis = [
    { label: "Today's Revenue", value: inr(todaySales), icon: IndianRupee, color: "text-success", delta: "Sales settled today" },
    { label: "Today's Expenses", value: inr(todayExp), icon: Wallet, color: "text-warning", delta: "Operational spend" },
    { label: "Today's Profit", value: inr(todaySales - todayExp), icon: TrendingUp, color: "text-primary", delta: "Revenue minus expenses" },
    { label: "Today's Production", value: fmt(todayProd, 0) + " units", icon: Factory, color: "text-chart-3", delta: "Batch output" },
    { label: "Inventory Value", value: inr(invValue), icon: Package, color: "text-chart-5", delta: "Stock on hand" },
    { label: "Low Stock Alerts", value: String(lowStock.length ?? 0), icon: AlertTriangle, color: "text-destructive", delta: "Items need replenishment" },
  ];

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-4xl border border-border/60 bg-linear-to-br from-background via-background to-accent/30 p-6 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.3)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.09),transparent_25%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.08),transparent_30%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              Executive overview
            </Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Dashboard</h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">Real-time view of your bakery operations with revenue, production, inventory, and cost signals in one place.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="rounded-2xl bg-background/80 shadow-sm">
              <Clock3 className="h-4 w-4" />
              Today
            </Button>
            <Button className="rounded-2xl">
              View reports
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((c) => (
          <Card key={c.label} className="group overflow-hidden">
            <CardContent className="flex items-start justify-between p-5">
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{c.label}</div>
                <div className="text-3xl font-semibold tracking-tight">{c.value}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {c.label.includes("Expense") ? <ArrowDownRight className="h-3.5 w-3.5 text-warning" /> : <ArrowUpRight className="h-3.5 w-3.5 text-success" />}
                  {c.delta}
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-3 shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5">
                <c.icon className={`h-6 w-6 ${c.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Revenue & Expense</CardTitle>
            <CardDescription>Last 14 days at a glance.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 16 }} />
                  <Line type="monotone" dataKey="revenue" stroke="var(--color-success)" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="expense" stroke="var(--color-warning)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory alerts</CardTitle>
            <CardDescription>Items needing attention right now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStock && lowStock.length > 0 ? (
              lowStock.slice(0, 6).map((m: any) => (
                <div key={m.name} className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 px-3 py-3 text-sm">
                  <span className="font-medium">{m.name}</span>
                  <span className="text-destructive font-semibold">{fmt(m.current_stock, 1)} / {fmt(m.min_stock, 1)}</span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                No low stock alerts at the moment.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Production summary</CardTitle>
          <CardDescription>Inventory value and batch activity remain strong.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Production today</div>
              <div className="mt-2 text-2xl font-semibold">{fmt(todayProd, 0)}</div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Inventory value</div>
              <div className="mt-2 text-2xl font-semibold">{inr(invValue)}</div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Low stock items</div>
              <div className="mt-2 text-2xl font-semibold">{fmt(lowStock.length ?? 0, 0)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Revenue & Expense — last 14 days</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
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

      {lowStock && lowStock.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Low stock materials</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {lowStock.map((m: any) => (
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
