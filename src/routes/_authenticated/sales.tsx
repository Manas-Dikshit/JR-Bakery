import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { inr, fmt } from "@/lib/format";
import { useAuth, canEdit, isSuperAdmin } from "@/lib/auth";
import { openInvoicePDF } from "@/lib/pdf";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({ meta: [{ title: "Sales — JR Bakery ERP" }] }),
  component: SalesPage,
});

interface Line { product_id: string; quantity: string; unit_price: string }

function SalesPage() {
  const qc = useQueryClient();
  const { role } = useAuth();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerId, setCustomerId] = useState("");
  const [paymentType, setPaymentType] = useState("cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ product_id: "", quantity: "", unit_price: "" }]);

  const { data: products = [] } = useQuery({ queryKey: ["products-sales"], queryFn: async () => (await supabase.from("products").select("id,name,selling_price").order("name")).data ?? [] });
  const { data: customers = [] } = useQuery({ queryKey: ["customers-sales"], queryFn: async () => (await supabase.from("customers").select("id,name,address").order("name")).data ?? [] });
  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => (await supabase.from("sales").select("*, product:products(name), customer:customers(name,address)").order("sale_date", { ascending: false }).limit(500)).data ?? [],
  });

  // Group sales by invoice_no (or by id if standalone)
  const invoices = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const s of sales) {
      const key = s.invoice_no || `s-${s.id}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries()).map(([key, items]) => {
      const first = items[0];
      const total = items.reduce((a, b) => a + Number(b.total_amount), 0);
      const paid = items.reduce((a, b) => a + Number(b.paid_amount), 0);
      return { key, invoice_no: first.invoice_no, date: first.sale_date, customer: first.customer, payment_type: first.payment_type, items, total, paid };
    });
  }, [sales]);

  const subtotal = lines.reduce((a, l) => a + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0), 0);

  const setLine = (i: number, patch: Partial<Line>) => setLines(lines.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const addLine = () => setLines([...lines, { product_id: "", quantity: "", unit_price: "" }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const onProductChange = (i: number, pid: string) => {
    const p = products.find((x: any) => x.id === pid);
    setLine(i, { product_id: pid, unit_price: p ? String(p.selling_price) : "" });
  };

  const resetForm = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setCustomerId(""); setPaymentType("cash"); setPaidAmount(""); setNotes("");
    setLines([{ product_id: "", quantity: "", unit_price: "" }]);
  };

  const create = useMutation({
    mutationFn: async () => {
      const valid = lines.filter(l => l.product_id && Number(l.quantity) > 0);
      if (valid.length === 0) throw new Error("Add at least one line");
      const invNo = `INV-${Date.now().toString().slice(-8)}`;
      const totalAll = valid.reduce((a, l) => a + Number(l.quantity) * Number(l.unit_price), 0);
      const paidAll = paymentType === "credit" ? (Number(paidAmount) || 0) : totalAll;
      // distribute paid proportionally
      const rows = valid.map(l => {
        const lineTotal = Number(l.quantity) * Number(l.unit_price);
        return {
          sale_date: date,
          customer_id: customerId || null,
          product_id: l.product_id,
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
          total_amount: lineTotal,
          payment_type: paymentType,
          invoice_no: invNo,
          paid_amount: totalAll > 0 ? (paidAll * lineTotal) / totalAll : 0,
          notes: notes || null,
        };
      });
      const { error } = await supabase.from("sales").insert(rows);
      if (error) throw error;
      return { invNo, rows, customer: customers.find((c: any) => c.id === customerId), totalAll, paidAll };
    },
    onSuccess: (r) => {
      toast.success(`Invoice ${r.invNo} created`);
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["customers-ledger"] });
      setOpen(false);
      resetForm();
      // auto-open PDF
      openInvoicePDF({
        invoiceNo: r.invNo, date,
        customer: r.customer?.name, customerAddress: r.customer?.address,
        lines: r.rows.map(row => ({
          product: products.find((p: any) => p.id === row.product_id)?.name ?? "—",
          qty: row.quantity, unit: row.unit_price, total: row.total_amount,
        })),
        subtotal: r.totalAll, paid: r.paidAll, paymentType, notes,
      });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("sales").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["sales"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const reprint = (inv: any) => {
    openInvoicePDF({
      invoiceNo: inv.invoice_no || `S-${inv.items[0].id.slice(0, 6)}`,
      date: inv.date,
      customer: inv.customer?.name, customerAddress: inv.customer?.address,
      lines: inv.items.map((it: any) => ({ product: it.product?.name ?? "—", qty: Number(it.quantity), unit: Number(it.unit_price), total: Number(it.total_amount) })),
      subtotal: inv.total, paid: inv.paid, paymentType: inv.payment_type,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
          <p className="text-sm text-muted-foreground mt-1">Multi-line invoices with auto PDF and credit tracking.</p>
        </div>
        {canEdit(role) && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />New Invoice</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>New Invoice</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>Date</Label><Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></div>
                  <div>
                    <Label>Customer</Label>
                    <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="">Walk-in</option>
                      {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Line items</Label>
                  {lines.map((l, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <select required value={l.product_id} onChange={(e) => onProductChange(i, e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                          <option value="">Product…</option>
                          {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2"><Input type="number" step="0.01" placeholder="Qty" required value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} /></div>
                      <div className="col-span-3"><Input type="number" step="0.01" placeholder="Unit ₹" required value={l.unit_price} onChange={(e) => setLine(i, { unit_price: e.target.value })} /></div>
                      <div className="col-span-2 text-right text-sm font-medium pb-2">{inr((Number(l.quantity)||0)*(Number(l.unit_price)||0))}
                        {lines.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-7 w-7 ml-1" onClick={() => removeLine(i)}><X className="h-3 w-3" /></Button>}
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add line</Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Payment type</Label>
                    <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                      {["cash","upi","bank","credit"].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                    </select>
                  </div>
                  {paymentType === "credit" && (
                    <div><Label>Paid now (optional)</Label><Input type="number" step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} /></div>
                  )}
                </div>
                <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

                <div className="flex justify-between items-center border-t pt-3 sticky bottom-0 bg-background">
                  <div className="text-lg font-semibold">Total: {inr(subtotal)}</div>
                  <DialogFooter className="!mt-0"><Button type="submit" disabled={create.isPending}>Save & Print</Button></DialogFooter>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead><TableHead>Invoice #</TableHead><TableHead>Customer</TableHead>
              <TableHead>Items</TableHead><TableHead className="text-right">Total</TableHead>
              <TableHead>Payment</TableHead><TableHead className="text-right">Due</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No sales yet</TableCell></TableRow>
            ) : invoices.map((inv) => (
              <TableRow key={inv.key}>
                <TableCell>{inv.date}</TableCell>
                <TableCell className="font-mono text-xs">{inv.invoice_no ?? "—"}</TableCell>
                <TableCell>{inv.customer?.name ?? "Walk-in"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{inv.items.length} × {inv.items.map((i: any) => i.product?.name).filter(Boolean).slice(0,2).join(", ")}{inv.items.length>2?"…":""}</TableCell>
                <TableCell className="text-right font-medium">{inr(inv.total)}</TableCell>
                <TableCell className="uppercase text-xs">{inv.payment_type}</TableCell>
                <TableCell className="text-right">{inv.total - inv.paid > 0.01 ? <span className="text-destructive font-medium">{inr(inv.total - inv.paid)}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => reprint(inv)} title="Print invoice"><FileText className="h-4 w-4" /></Button>
                    {isSuperAdmin(role) && (
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete entire invoice?")) inv.items.forEach((it: any) => del.mutate(it.id)); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="lg:hidden text-xs text-muted-foreground p-2 border-t">Scroll horizontally to view all columns →</div>
      </Card>
      <p className="text-xs text-muted-foreground">{fmt(invoices.length, 0)} invoices · {fmt(sales.length, 0)} line items</p>
    </div>
  );
}
