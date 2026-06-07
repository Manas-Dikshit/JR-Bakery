import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { fmt } from "@/lib/format";
import { useAuth, canEdit, canManage } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/adjustments")({
  head: () => ({ meta: [{ title: "Stock Adjustments — JR Bakery ERP" }] }),
  component: AdjustmentsPage,
});

const REASONS = ["recount", "damage", "loss", "transfer", "found", "expiry"];

function AdjustmentsPage() {
  const qc = useQueryClient();
  const { role } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ adjustment_date: new Date().toISOString().slice(0, 10), reason: "recount" });

  const { data: materials = [] } = useQuery({
    queryKey: ["materials-options"],
    queryFn: async () => (await supabase.from("materials").select("id,name,current_stock,unit").order("name")).data ?? [],
  });

  const { data: adjustments = [] } = useQuery({
    queryKey: ["adjustments"],
    queryFn: async () => (await supabase.from("stock_adjustments")
      .select("*, material:materials(name,unit)")
      .order("created_at", { ascending: false })).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("stock_adjustments").insert({
        adjustment_date: form.adjustment_date,
        material_id: form.material_id,
        quantity_delta: Number(form.quantity_delta),
        reason: form.reason,
        notes: form.notes ?? null,
        requested_by: u.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Adjustment requested"); qc.invalidateQueries({ queryKey: ["adjustments"] }); setOpen(false); setForm({ adjustment_date: new Date().toISOString().slice(0, 10), reason: "recount" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const decide = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("stock_adjustments").update({ status, approved_by: u.user?.id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { toast.success(v.status === "approved" ? "Approved — stock updated" : "Rejected"); qc.invalidateQueries({ queryKey: ["adjustments"] }); qc.invalidateQueries({ queryKey: ["materials"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stock Adjustments</h1>
          <p className="text-sm text-muted-foreground mt-1">Corrections to material stock — require manager approval</p>
        </div>
        {canEdit(role) && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Request adjustment</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Request stock adjustment</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
                <div>
                  <Label>Date</Label>
                  <Input type="date" required value={form.adjustment_date} onChange={(e) => setForm({ ...form, adjustment_date: e.target.value })} />
                </div>
                <div>
                  <Label>Material *</Label>
                  <select required className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.material_id ?? ""} onChange={(e) => setForm({ ...form, material_id: e.target.value })}>
                    <option value="">Select material...</option>
                    {materials.map((m: any) => <option key={m.id} value={m.id}>{m.name} (stock: {fmt(m.current_stock, 2)} {m.unit})</option>)}
                  </select>
                </div>
                <div>
                  <Label>Quantity change * (use negative to remove)</Label>
                  <Input type="number" step="0.001" required value={form.quantity_delta ?? ""} onChange={(e) => setForm({ ...form, quantity_delta: e.target.value })} />
                </div>
                <div>
                  <Label>Reason *</Label>
                  <select required className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
                    {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <DialogFooter><Button type="submit" disabled={create.isPending}>Submit for approval</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Change</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {adjustments.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No adjustments yet</TableCell></TableRow>
            ) : adjustments.map((a: any) => (
              <TableRow key={a.id}>
                <TableCell>{a.adjustment_date}</TableCell>
                <TableCell>{a.material?.name ?? "—"}</TableCell>
                <TableCell className={Number(a.quantity_delta) < 0 ? "text-destructive font-medium" : "text-success font-medium"}>
                  {Number(a.quantity_delta) > 0 ? "+" : ""}{fmt(a.quantity_delta, 3)} {a.material?.unit}
                </TableCell>
                <TableCell className="capitalize">{a.reason}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{a.notes ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={a.status === "approved" ? "default" : a.status === "rejected" ? "destructive" : "secondary"}>{a.status}</Badge>
                </TableCell>
                <TableCell>
                  {a.status === "pending" && canManage(role) && (
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => decide.mutate({ id: a.id, status: "approved" })}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: a.id, status: "rejected" })}>Reject</Button>
                    </div>
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
