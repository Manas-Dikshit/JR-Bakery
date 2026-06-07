import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { inr, fmt } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — JR Bakery ERP" }] }),
  component: Reports,
});

function Reports() {
  const { data } = useQuery({
    queryKey: ["reports-pl-v2"],
    queryFn: async () => {
      const [sales, expenses, waste, materials, recipeItems, products] = await Promise.all([
        supabase.from("sales").select("total_amount, sale_date, product_id, quantity"),
        supabase.from("expenses").select("amount, expense_date, category"),
        supabase.from("waste").select("est_value, waste_date"),
        supabase.from("materials").select("id, avg_cost"),
        supabase.from("recipe_items").select("product_id, material_id, quantity_per_unit"),
        supabase.from("products").select("id, name"),
      ]);

      // Build product cost map
      const matCost = new Map((materials.data ?? []).map(m => [m.id, Number(m.avg_cost)]));
      const productCost = new Map<string, number>();
      for (const r of (recipeItems.data ?? [])) {
        const cost = Number(r.quantity_per_unit) * (matCost.get(r.material_id) ?? 0);
        productCost.set(r.product_id, (productCost.get(r.product_id) ?? 0) + cost);
      }

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);

      const compute = (from: string) => {
        const s = (sales.data ?? []).filter(r => r.sale_date >= from);
        const rev = s.reduce((a, r) => a + Number(r.total_amount), 0);
        const cogs = s.reduce((a, r) => a + Number(r.quantity) * (productCost.get(r.product_id) ?? 0), 0);
        const exp = (expenses.data ?? []).filter(r => r.expense_date >= from).reduce((a, r) => a + Number(r.amount), 0);
        const wst = (waste.data ?? []).filter(r => r.waste_date >= from).reduce((a, r) => a + Number(r.est_value || 0), 0);
        return { rev, cogs, gross: rev - cogs, exp, wst, net: rev - cogs - exp - wst };
      };

      // Top products
      const productMap = new Map((products.data ?? []).map(p => [p.id, p.name]));
      const byProduct = new Map<string, { name: string; qty: number; rev: number; cogs: number }>();
      for (const s of (sales.data ?? []).filter(r => r.sale_date >= monthStart)) {
        const name = productMap.get(s.product_id) ?? "—";
        const prev = byProduct.get(s.product_id) ?? { name, qty: 0, rev: 0, cogs: 0 };
        prev.qty += Number(s.quantity);
        prev.rev += Number(s.total_amount);
        prev.cogs += Number(s.quantity) * (productCost.get(s.product_id) ?? 0);
        byProduct.set(s.product_id, prev);
      }
      const top = Array.from(byProduct.values()).map(p => ({ ...p, margin: p.rev - p.cogs })).sort((a, b) => b.rev - a.rev).slice(0, 10);

      // Expense breakdown
      const byCat = new Map<string, number>();
      for (const e of (expenses.data ?? []).filter(r => r.expense_date >= monthStart)) {
        byCat.set(e.category, (byCat.get(e.category) ?? 0) + Number(e.amount));
      }
      const expCats = Array.from(byCat.entries()).map(([k, v]) => ({ category: k, amount: v })).sort((a, b) => b.amount - a.amount);

      return { month: compute(monthStart), year: compute(yearStart), top, expCats };
    },
  });

  const m = data?.month, y = data?.year;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profit & Loss</h1>
        <p className="text-sm text-muted-foreground mt-1">Real COGS computed from recipes × current material costs.</p>
      </div>

      <Tabs defaultValue="month">
        <TabsList><TabsTrigger value="month">This Month</TabsTrigger><TabsTrigger value="year">This Year</TabsTrigger></TabsList>
        {(["month", "year"] as const).map(scope => {
          const d = scope === "month" ? m : y;
          return (
            <TabsContent key={scope} value={scope} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <KPI label="Revenue" value={inr(d?.rev ?? 0)} />
                <KPI label="COGS" value={inr(d?.cogs ?? 0)} tone="warning" />
                <KPI label="Gross Profit" value={inr(d?.gross ?? 0)} tone="success" sub={d?.rev ? `${((d.gross/d.rev)*100).toFixed(1)}%` : ""} />
                <KPI label="Op. Expenses" value={inr(d?.exp ?? 0)} tone="warning" />
                <KPI label="Net Profit" value={inr(d?.net ?? 0)} tone={(d?.net ?? 0) >= 0 ? "success" : "destructive"} />
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Top products this month</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Margin</TableHead></TableRow></TableHeader>
              <TableBody>
                {(data?.top ?? []).length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No sales</TableCell></TableRow>
                : data!.top.map(p => (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{fmt(p.qty, 0)}</TableCell>
                    <TableCell className="text-right">{inr(p.rev)}</TableCell>
                    <TableCell className="text-right text-success font-medium">{inr(p.margin)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Expense breakdown — this month</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">%</TableHead></TableRow></TableHeader>
              <TableBody>
                {(data?.expCats ?? []).length === 0 ? <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No expenses</TableCell></TableRow>
                : data!.expCats.map(c => (
                  <TableRow key={c.category}>
                    <TableCell className="font-medium capitalize">{c.category}</TableCell>
                    <TableCell className="text-right">{inr(c.amount)}</TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">{m?.exp ? ((c.amount / m.exp) * 100).toFixed(1) : 0}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPI({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "success" | "warning" | "destructive" }) {
  const cls = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <Card><CardContent className="p-4">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${cls}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </CardContent></Card>
  );
}
