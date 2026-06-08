import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, IndianRupee, Factory, Wallet, Package, AlertTriangle, Receipt, ShoppingCart, ArrowUpRight } from "lucide-react";
import { inr, fmt } from "@/lib/format";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — JR Bakery ERP" }] }),
  component: Dashboard,
});

const today = () => new Date().toISOString().slice(0, 10);

function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const t = today();
      const [sales, expenses, production, materials] = await Promise.all([
        supabase.from("sales").select("total_amount, sale_date"),
        supabase.from("expenses").select("amount, expense_date"),
        supabase.from("production").select("quantity, production_date, product_id"),
        supabase.from("materials").select("name, current_stock, min_stock, avg_cost, unit"),
      ]);
      const todaySales = (sales.data ?? []).filter((s) => s.sale_date === t).reduce((a, b) => a + Number(b.total_amount), 0);
      const todayExp = (expenses.data ?? []).filter((e) => e.expense_date === t).reduce((a, b) => a + Number(b.amount), 0);
      const todayProd = (production.data ?? []).filter((p) => p.production_date === t).reduce((a, b) => a + Number(b.quantity), 0);
      const invValue = (materials.data ?? []).reduce((a, m) => a + Number(m.current_stock) * Number(m.avg_cost), 0);
      const lowStock = (materials.data ?? []).filter((m) => Number(m.current_stock) <= Number(m.min_stock) && Number(m.min_stock) > 0);

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
    { label: "Today's Revenue", value: inr(stats?.todaySales ?? 0), icon: IndianRupee, tint: "from-emerald-500/15 to-emerald-500/0", iconColor: "text-emerald-600 dark:text-emerald-400" },
    { label: "Today's Expenses", value: inr(stats?.todayExp ?? 0), icon: Wallet, tint: "from-amber-500/15 to-amber-500/0", iconColor: "text-amber-600 dark:text-amber-400" },
    { label: "Today's Profit", value: inr(stats?.todayProfit ?? 0), icon: TrendingUp, tint: "from-primary/15 to-primary/0", iconColor: "text-primary" },
    { label: "Today's Production", value: fmt(stats?.todayProd ?? 0, 0) + " units", icon: Factory, tint: "from-sky-500/15 to-sky-500/0", iconColor: "text-sky-600 dark:text-sky-400" },
    { label: "Inventory Value", value: inr(stats?.invValue ?? 0), icon: Package, tint: "from-fuchsia-500/15 to-fuchsia-500/0", iconColor: "text-fuchsia-600 dark:text-fuchsia-400" },
    { label: "Low Stock Alerts", value: String(stats?.lowStock.length ?? 0), icon: AlertTriangle, tint: "from-rose-500/15 to-rose-500/0", iconColor: "text-rose-600 dark:text-rose-400" },
  ];

  const quickActions = [
    { label: "New Sale", to: "/sales", icon: Receipt },
    { label: "New Purchase", to: "/purchases", icon: ShoppingCart },
    { label: "Log Production", to: "/production", icon: Factory },
    { label: "Add Expense", to: "/expenses", icon: Wallet },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Hero header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Welcome back 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here's what's happening at <span className="gradient-text font-medium">JR Bakery</span> today.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((a) => (
            <Button key={a.to} asChild variant="outline" size="sm" className="card-hover">
              <Link to={a.to}><a.icon className="h-4 w-4" />{a.label}</Link>
            </Button>
          ))}
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {cards.map((c) => (
          <Card key={c.label} className={`stat-tile card-hover overflow-hidden relative`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${c.tint} pointer-events-none`} />
            <CardContent className="p-4 sm:p-5 relative">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">{c.label}</div>
                  {isLoading ? (
                    <Skeleton className="h-7 w-24 mt-2" />
                  ) : (
                    <div className="text-lg sm:text-2xl font-semibold mt-1.5 tabular-nums truncate">{c.value}</div>
                  )}
                </div>
                <div className={`h-9 w-9 rounded-xl bg-background/70 backdrop-blur flex items-center justify-center ${c.iconColor} shrink-0 border`}>
                  <c.icon className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="soft-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base sm:text-lg">Revenue & Expense</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Last 14 days</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Revenue</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" />Expense</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 sm:h-80 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.trend ?? []}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(16,185,129)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="rgb(16,185,129)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(245,158,11)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="rgb(245,158,11)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={50} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="rgb(16,185,129)" strokeWidth={2} fill="url(#rev)" />
                <Area type="monotone" dataKey="expense" stroke="rgb(245,158,11)" strokeWidth={2} fill="url(#exp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Low stock */}
      {stats?.lowStock && stats.lowStock.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive pulse-soft" />
              Low stock materials
            </CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/materials">View all <ArrowUpRight className="h-3 w-3" /></Link></Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {stats.lowStock.map((m: any) => (
                <div key={m.name} className="flex justify-between items-center border rounded-lg p-3 text-sm card-hover bg-destructive/5">
                  <span className="font-medium truncate">{m.name}</span>
                  <span className="text-destructive font-semibold tabular-nums text-xs shrink-0 ml-2">
                    {fmt(m.current_stock, 1)} / {fmt(m.min_stock, 1)} {m.unit}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
