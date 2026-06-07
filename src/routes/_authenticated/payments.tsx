import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { inr } from "@/lib/format";
import { useAuth, canEdit, isSuperAdmin } from "@/lib/auth";

createFileRoute("/_authenticated/payments")({
  head: () => ({ meta: [{ title: "Payments — JR Bakery ERP" }] }),
  component: PaymentsPage,
});

function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground mt-1">Record receipts from customers and payments to suppliers — outstanding balances update automatically.</p>
      </div>
      <Tabs defaultValue="customer">
        <TabsList className="grid grid-cols-2 w-full max-w-sm">
          <TabsTrigger value="customer">Customer receipts</TabsTrigger>
          <TabsTrigger value="supplier">Supplier payments</TabsTrigger>
        </TabsList>
        <TabsContent value="customer" className="mt-4"><PaymentList kind="customer" /></TabsContent>
        <TabsContent value="supplier" className="mt-4"><PaymentList kind="supplier" /></TabsContent>
      </Tabs>
    </div>
  );
}

function PaymentList({ kind }: { kind: "customer" | "supplier" }) {
  const qc = useQueryClient();
  const { role } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ payment_date: new Date().toISOString().slice(0, 10), method: "cash" });
  const table = kind === "customer" ? "customer_payments" : "supplier_payments";
  const fk = kind === "customer" ? "customer_id" : "supplier_id";
  const partyTable = kind === "customer" ? "customers" : "suppliers";

  const { data: parties = [] } = useQuery({
    queryKey: [partyTable + "-opts"],
    queryFn: async () => (await supabase.from(partyTable).select("id,name,outstanding").order("name")).data ?? [],
  });
  const { data: rows = [] } = useQuery({
    queryKey: [table],
    queryFn: async () => (await supabase.from(table as any).select(`*, party:${partyTable}(name)`).order("payment_date", { ascending: false })).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      const payload: any = {
        payment_date: form.payment_date,
        amount: Number(form.amount),
        method: form.method,
        reference: form.reference || null,
        notes: form.notes || null,
      };
      payload[fk] = form.party_id;
      const { error } = await supabase.from(table as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      qc.invalidateQueries({ queryKey: [table] });
      qc.invalidateQueries({ queryKey: [partyTable + "-opts"] });
      qc.invalidateQueries({ queryKey: [partyTable] });
      setOpen(false);
      setForm({ payment_date: new Date().toISOString().slice(0, 10), method: "cash" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from(table as any).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: [table] }); qc.invalidateQueries({ queryKey: [partyTable + "-opts"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canEdit(role) && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Record payment</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{kind === "customer" ? "Customer receipt" : "Supplier payment"}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
                <div><Label>Date</Label><Input type="date" required value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} /></div>
                <div>
                  <Label>{kind === "customer" ? "Customer" : "Supplier"}</Label>
                  <select required className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.party_id ?? ""} onChange={(e) => setForm({ ...form, party_id: e.target.value })}>
                    <option value="">Select…</option>
                    {parties.map((p: any) => <option key={p.id} value={p.id}>{p.name} — Due {inr(p.outstanding)}</option>)}
                  </select>
                </div>
                <div><Label>Amount</Label><Input type="number" step="0.01" required value={form.amount ?? ""} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                <div>
                  <Label>Method</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                    {["cash","upi","bank","cheque"].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                  </select>
                </div>
                <div><Label>Reference</Label><Input value={form.reference ?? ""} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="UTR / cheque no." /></div>
                <div><Label>Notes</Label><Input value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <DialogFooter><Button type="submit" disabled={create.isPending}>Save</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead><TableHead>{kind === "customer" ? "Customer" : "Supplier"}</TableHead>
              <TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Reference</TableHead>
              {isSuperAdmin(role) && <TableHead></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No payments recorded</TableCell></TableRow>
            ) : rows.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>{r.payment_date}</TableCell>
                <TableCell>{r.party?.name ?? "—"}</TableCell>
                <TableCell className="font-medium">{inr(r.amount)}</TableCell>
                <TableCell className="uppercase text-xs">{r.method}</TableCell>
                <TableCell>{r.reference ?? "—"}</TableCell>
                {isSuperAdmin(role) && (
                  <TableCell><Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete payment? This will restore the outstanding balance.")) del.mutate(r.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
