import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Audit Log — JR Bakery ERP" }] }),
  component: AuditPage,
});

const TABLES = ["all", "materials", "purchases", "production", "sales", "expenses", "waste", "products", "recipe_items", "stock_adjustments", "daily_closing"];

function AuditPage() {
  const [table, setTable] = useState("all");
  const { data = [] } = useQuery({
    queryKey: ["audit", table],
    queryFn: async () => {
      let q = supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(500);
      if (table !== "all") q = q.eq("table_name", table);
      return (await q).data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">Every change to materials, purchases, production, sales, and more</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {TABLES.map((t) => (
          <button
            key={t}
            onClick={() => setTable(t)}
            className={`px-3 py-1 rounded-md text-xs border ${table === t ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
          >{t}</button>
        ))}
      </div>
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Record</TableHead>
              <TableHead>Changes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No audit entries</TableCell></TableRow>
            ) : data.map((row: any) => {
              const diff = diffSummary(row.old_data, row.new_data);
              return (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-xs">{new Date(row.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-xs font-medium">{row.table_name}</TableCell>
                  <TableCell>
                    <Badge variant={row.action === "DELETE" ? "destructive" : row.action === "INSERT" ? "default" : "secondary"}>
                      {row.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono">{row.record_id?.slice(0, 8)}</TableCell>
                  <TableCell className="text-xs">{diff}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function diffSummary(oldData: any, newData: any): string {
  if (!oldData && newData) return Object.keys(newData).slice(0, 3).map(k => `${k}=${fmt(newData[k])}`).join(", ");
  if (oldData && !newData) return "removed";
  if (!oldData || !newData) return "—";
  const changes: string[] = [];
  for (const k of Object.keys(newData)) {
    if (k === "updated_at" || k === "created_at") continue;
    if (JSON.stringify(oldData[k]) !== JSON.stringify(newData[k])) {
      changes.push(`${k}: ${fmt(oldData[k])} → ${fmt(newData[k])}`);
    }
  }
  return changes.slice(0, 3).join(" • ") || "no field changes";
}
function fmt(v: any) { if (v == null) return "∅"; const s = String(v); return s.length > 24 ? s.slice(0, 24) + "…" : s; }
