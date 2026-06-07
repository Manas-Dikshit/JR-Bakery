import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmt, inr } from "@/lib/format";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/variance")({
  head: () => ({ meta: [{ title: "Variance Report — JR Bakery ERP" }] }),
  component: VariancePage,
});

function VariancePage() {
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); });
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const { data } = useQuery({
    queryKey: ["variance", from, to],
    queryFn: async () => {
      const [prod, sales, waste, products] = await Promise.all([
        supabase.from("production").select("product_id, quantity, production_date").gte("production_date", from).lte("production_date", to),
        supabase.from("sales").select("product_id, quantity, sale_date").gte("sale_date", from).lte("sale_date", to),
        supabase.from("waste").select("product_id, quantity, est_value, waste_date").gte("waste_date", from).lte("waste_date", to),
        supabase.from("products").select("id, name, selling_price"),
      ]);
      const byProd: Record<string, { name: string; produced: number; sold: number; wasted: number; wasteValue: number; price: number }> = {};
      (products.data ?? []).forEach(p => { byProd[p.id] = { name: p.name, produced: 0, sold: 0, wasted: 0, wasteValue: 0, price: Number(p.selling_price) }; });
      (prod.data ?? []).forEach(p => { if (byProd[p.product_id]) byProd[p.product_id].produced += Number(p.quantity); });
      (sales.data ?? []).forEach(s => { if (byProd[s.product_id]) byProd[s.product_id].sold += Number(s.quantity); });
      (waste.data ?? []).forEach(w => { if (w.product_id && byProd[w.product_id]) { byProd[w.product_id].wasted += Number(w.quantity); byProd[w.product_id].wasteValue += Number(w.est_value); } });
      return Object.values(byProd).filter(r => r.produced > 0 || r.sold > 0 || r.wasted > 0);
    },
  });

  const rows = data ?? [];
  const totalLoss = rows.reduce((a, r) => a + r.wasteValue + Math.max(0, (r.produced - r.sold - r.wasted)) * 0, 0);
  const totalUnaccounted = rows.reduce((a, r) => a + Math.max(0, r.produced - r.sold - r.wasted), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Variance Report</h1>
        <p className="text-sm text-muted-foreground mt-1">Produced vs sold vs wasted — unaccounted stock indicates shrinkage</p>
      </div>

      <div className="flex gap-3 items-end">
        <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-5"><div className="text-xs text-muted-foreground uppercase">Waste value</div><div className="text-2xl font-semibold mt-1">{inr(rows.reduce((a, r) => a + r.wasteValue, 0))}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-xs text-muted-foreground uppercase">Unaccounted units</div><div className="text-2xl font-semibold mt-1 text-warning">{fmt(totalUnaccounted, 0)}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-xs text-muted-foreground uppercase">Potential lost revenue</div><div className="text-2xl font-semibold mt-1 text-destructive">{inr(rows.reduce((a, r) => a + Math.max(0, r.produced - r.sold - r.wasted) * r.price, 0))}</div></CardContent></Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <CardHeader><CardTitle className="text-base">By product</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Produced</TableHead>
              <TableHead className="text-right">Sold</TableHead>
              <TableHead className="text-right">Wasted</TableHead>
              <TableHead className="text-right">Unaccounted</TableHead>
              <TableHead className="text-right">Variance %</TableHead>
              <TableHead className="text-right">Est. loss</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => {
              const unacc = Math.max(0, r.produced - r.sold - r.wasted);
              const pct = r.produced > 0 ? (unacc / r.produced) * 100 : 0;
              return (
                <TableRow key={r.name}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-right">{fmt(r.produced, 1)}</TableCell>
                  <TableCell className="text-right">{fmt(r.sold, 1)}</TableCell>
                  <TableCell className="text-right">{fmt(r.wasted, 1)}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(unacc, 1)}</TableCell>
                  <TableCell className={`text-right ${pct > 5 ? "text-destructive font-medium" : ""}`}>{fmt(pct, 1)}%</TableCell>
                  <TableCell className="text-right">{inr(unacc * r.price + r.wasteValue)}</TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No data for this range</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
