import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth, canEdit, isSuperAdmin } from "@/lib/auth";

export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea";
  required?: boolean;
  options?: { value: string; label: string }[];
  step?: string;
  defaultValue?: string | number;
}

export interface CrudColumn {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
}

interface Props {
  title: string;
  description?: string;
  table: string;
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  columns: CrudColumn[];
  fields: FieldDef[];
}

export function CrudPage({ title, description, table, select = "*", orderBy, columns, fields }: Props) {
  const qc = useQueryClient();
  const { role } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const { data = [], isLoading } = useQuery({
    queryKey: [table],
    queryFn: async () => {
      let q = supabase.from(table as any).select(select);
      if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? false });
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { error } = await supabase.from(table as any).insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Created");
      qc.invalidateQueries({ queryKey: [table] });
      setOpen(false);
      setForm({});
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: [table] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned: Record<string, any> = {};
    for (const f of fields) {
      let v = form[f.name] ?? f.defaultValue ?? null;
      if (f.type === "number" && v !== null && v !== "") v = Number(v);
      if (v === "") v = null;
      cleaned[f.name] = v;
    }
    create.mutate(cleaned);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        {canEdit(role) && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" />New</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add {title.replace(/s$/, "")}</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {fields.map((f) => (
                  <div key={f.name}>
                    <Label>{f.label}{f.required && " *"}</Label>
                    {f.type === "select" ? (
                      <select
                        required={f.required}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={form[f.name] ?? ""}
                        onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                      >
                        <option value="">Select...</option>
                        {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : f.type === "textarea" ? (
                      <textarea
                        required={f.required}
                        className="flex w-full min-h-16 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={form[f.name] ?? ""}
                        onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                      />
                    ) : (
                      <Input
                        type={f.type ?? "text"}
                        required={f.required}
                        step={f.step}
                        value={form[f.name] ?? f.defaultValue ?? ""}
                        onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                      />
                    )}
                  </div>
                ))}
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
              {columns.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}
              {isSuperAdmin(role) && <TableHead className="w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground py-8">No records yet</TableCell></TableRow>
            ) : data.map((row: any) => (
              <TableRow key={row.id}>
                {columns.map((c) => <TableCell key={c.key}>{c.render ? c.render(row) : row[c.key] ?? "—"}</TableCell>)}
                {isSuperAdmin(role) && (
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this record?")) del.mutate(row.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}