import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Paperclip, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { fmt, inr } from "@/lib/format";
import { useAuth, canEdit, isSuperAdmin } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/purchases")({
  head: () => ({ meta: [{ title: "Purchases — JR Bakery ERP" }] }),
  component: PurchasesPage,
});

function PurchasesPage() {
  const qc = useQueryClient();
  const { role } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ purchase_date: new Date().toISOString().slice(0, 10), tax: 0 });
  const [file, setFile] = useState<File | null>(null);

  const { data: materials = [] } = useQuery({ queryKey: ["materials-options"], queryFn: async () => (await supabase.from("materials").select("id,name").order("name")).data ?? [] });
  const { data: suppliers = [] } = useQuery({ queryKey: ["suppliers-options"], queryFn: async () => (await supabase.from("suppliers").select("id,name").order("name")).data ?? [] });
  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases"],
    queryFn: async () => (await supabase.from("purchases").select("*, material:materials(name), supplier:suppliers(name)").order("purchase_date", { ascending: false })).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      let bill_url: string | null = null;
      if (file) {
        const path = `${Date.now()}-${file.name}`;
        const up = await supabase.storage.from("bills").upload(path, file);
        if (up.error) throw up.error;
        bill_url = up.data.path;
      }
      const { error } = await supabase.from("purchases").insert({
        purchase_date: form.purchase_date,
        supplier_id: form.supplier_id || null,
        invoice_number: form.invoice_number || null,
        material_id: form.material_id,
        quantity: Number(form.quantity),
        unit_price: Number(form.unit_price),
        tax: Number(form.tax) || 0,
        total_amount: Number(form.total_amount),
        notes: form.notes || null,
        bill_url,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Purchase recorded"); qc.invalidateQueries({ queryKey: ["purchases"] }); qc.invalidateQueries({ queryKey: ["materials"] }); setOpen(false); setForm({ purchase_date: new Date().toISOString().slice(0, 10), tax: 0 }); setFile(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("purchases").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["purchases"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const viewBill = async (path: string) => {
    const { data, error } = await supabase.storage.from("bills").createSignedUrl(path, 300);
    if (error) { toast.error(error.message); return; }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Purchases</h1>
          <p className="text-sm text-muted-foreground mt-1">Material purchases — stock and average cost update automatically; attach bills.</p>
        </div>
        {canEdit(role) && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />New Purchase</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>New Purchase</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                <Row label="Date *"><Input type="date" required value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} /></Row>
                <Row label="Supplier"><Select value={form.supplier_id ?? ""} onChange={(v) => setForm({ ...form, supplier_id: v })} options={suppliers.map(s => ({ value: s.id, label: s.name }))} /></Row>
                <Row label="Invoice #"><Input value={form.invoice_number ?? ""} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} /></Row>
                <Row label="Material *"><Select required value={form.material_id ?? ""} onChange={(v) => setForm({ ...form, material_id: v })} options={materials.map(m => ({ value: m.id, label: m.name }))} /></Row>
                <Row label="Quantity *"><Input type="number" step="0.001" required value={form.quantity ?? ""} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Row>
                <Row label="Unit price *"><Input type="number" step="0.01" required value={form.unit_price ?? ""} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} /></Row>
                <Row label="Tax"><Input type="number" step="0.01" value={form.tax ?? 0} onChange={(e) => setForm({ ...form, tax: e.target.value })} /></Row>
                <Row label="Total amount *"><Input type="number" step="0.01" required value={form.total_amount ?? ""} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} /></Row>
                <Row label="Bill / invoice scan"><Input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Row>
                <Row label="Notes"><Input value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Row>
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
              <TableHead>Date</TableHead><TableHead>Supplier</TableHead><TableHead>Invoice</TableHead>
              <TableHead>Material</TableHead><TableHead>Qty</TableHead><TableHead>Unit</TableHead><TableHead>Total</TableHead>
              <TableHead>Bill</TableHead>{isSuperAdmin(role) && <TableHead></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No purchases yet</TableCell></TableRow>
            ) : purchases.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>{p.purchase_date}</TableCell>
                <TableCell>{p.supplier?.name ?? "—"}</TableCell>
                <TableCell>{p.invoice_number ?? "—"}</TableCell>
                <TableCell>{p.material?.name ?? "—"}</TableCell>
                <TableCell>{fmt(p.quantity, 2)}</TableCell>
                <TableCell>{fmt(p.unit_price)}</TableCell>
                <TableCell>{inr(p.total_amount)}</TableCell>
                <TableCell>
                  {p.bill_url ? (
                    <Button variant="ghost" size="sm" onClick={() => viewBill(p.bill_url)}><Paperclip className="h-3 w-3 mr-1" />View</Button>
                  ) : "—"}
                </TableCell>
                {isSuperAdmin(role) && (
                  <TableCell><Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete?")) del.mutate(p.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>;
}
function Select({ value, onChange, options, required }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; required?: boolean }) {
  return (
    <select required={required} value={value} onChange={(e) => onChange(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
      <option value="">Select...</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
