import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { inr } from "@/lib/format";
import { useAuth, canEdit, canManage } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/closing")({
  head: () => ({ meta: [{ title: "Daily Closing — JR Bakery ERP" }] }),
  component: ClosingPage,
});

function ClosingPage() {
  const qc = useQueryClient();
  const { role } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [opening, setOpening] = useState("0");
  const [closing, setClosing] = useState("0");
  const [notes, setNotes] = useState("");

  const { data: summary } = useQuery({
    queryKey: ["closing-summary", date],
    queryFn: async () => {
      const [s, e] = await Promise.all([
        supabase.from("sales").select("total_amount,payment_type").eq("sale_date", date),
        supabase.from("expenses").select("amount").eq("expense_date", date),
      ]);
      const sales = (s.data ?? []).reduce((a, b) => a + Number(b.total_amount), 0);
      const cashSales = (s.data ?? []).filter(x => x.payment_type === "cash").reduce((a, b) => a + Number(b.total_amount), 0);
      const exp = (e.data ?? []).reduce((a, b) => a + Number(b.amount), 0);
      return { sales, cashSales, exp };
    },
  });

  const { data: closings = [] } = useQuery({
    queryKey: ["closings"],
    queryFn: async () => (await supabase.from("daily_closing").select("*").order("closing_date", { ascending: false }).limit(30)).data ?? [],
  });

  const expectedCash = (Number(opening) || 0) + (summary?.cashSales ?? 0) - (summary?.exp ?? 0);
  const variance = (Number(closing) || 0) - expectedCash;

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("daily_closing").upsert({
        closing_date: date,
        opening_cash: Number(opening) || 0,
        closing_cash: Number(closing) || 0,
        total_sales: summary?.sales ?? 0,
        total_expenses: summary?.exp ?? 0,
        cash_variance: variance,
        notes,
      }, { onConflict: "closing_date" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Closing saved");
      qc.invalidateQueries({ queryKey: ["closings"] });
      qc.invalidateQueries({ queryKey: ["closing-summary"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const verify = useMutation({
    mutationFn: async (id: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("daily_closing").update({ verified: true, verified_by: u.user?.id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Verified"); qc.invalidateQueries({ queryKey: ["closings"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Daily Closing</h1>
        <p className="text-sm text-muted-foreground mt-1">End-of-day cash reconciliation</p>
      </div>

      {canEdit(role) && (
        <Card>
          <CardHeader><CardTitle>Close the day</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Opening cash</Label>
              <Input type="number" step="0.01" value={opening} onChange={(e) => setOpening(e.target.value)} />
            </div>
            <div>
              <Label>Closing cash (counted)</Label>
              <Input type="number" step="0.01" value={closing} onChange={(e) => setClosing(e.target.value)} />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="sm:col-span-2 lg:col-span-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
              <Stat label="Total sales" value={inr(summary?.sales ?? 0)} />
              <Stat label="Cash sales" value={inr(summary?.cashSales ?? 0)} />
              <Stat label="Expenses" value={inr(summary?.exp ?? 0)} />
              <Stat label="Expected cash" value={inr(expectedCash)} />
              <Stat label="Variance" value={inr(variance)} highlight={Math.abs(variance) > 0.01} />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Button onClick={() => save.mutate()} disabled={save.isPending}>Save closing</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Opening</TableHead>
              <TableHead>Sales</TableHead>
              <TableHead>Expenses</TableHead>
              <TableHead>Closing</TableHead>
              <TableHead>Variance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {closings.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell>{c.closing_date}</TableCell>
                <TableCell>{inr(c.opening_cash)}</TableCell>
                <TableCell>{inr(c.total_sales)}</TableCell>
                <TableCell>{inr(c.total_expenses)}</TableCell>
                <TableCell>{inr(c.closing_cash)}</TableCell>
                <TableCell className={Math.abs(Number(c.cash_variance)) > 0.01 ? "text-destructive font-medium" : ""}>{inr(c.cash_variance)}</TableCell>
                <TableCell>{c.verified ? <Badge>Verified</Badge> : <Badge variant="secondary">Pending</Badge>}</TableCell>
                <TableCell>
                  {!c.verified && canManage(role) && (
                    <Button size="sm" variant="outline" onClick={() => verify.mutate(c.id)}>Verify</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="border rounded-md p-3">
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
      <div className={`font-semibold mt-1 ${highlight ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}
