import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/ledger" as any)({
  head: () => ({ meta: [{ title: "Ledger — JR Bakery ERP" }] }),
  component: LedgerPage,
});

function LedgerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ledger</h1>
        <p className="text-sm text-muted-foreground mt-1">Customer and supplier statements with running balances.</p>
      </div>
      <Tabs defaultValue="customer">
        <TabsList className="grid grid-cols-2 w-full max-w-sm">
          <TabsTrigger value="customer">Customers</TabsTrigger>
          <TabsTrigger value="supplier">Suppliers</TabsTrigger>
        </TabsList>
        <TabsContent value="customer" className="mt-4"><CustomerLedger /></TabsContent>
        <TabsContent value="supplier" className="mt-4"><SupplierLedger /></TabsContent>
      </Tabs>
    </div>
  );
}

function CustomerLedger() {
  const [selected, setSelected] = useState<string>("");
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-ledger"],
    queryFn: async () => (await supabase.from("customers").select("id,name,outstanding,credit_limit").order("outstanding", { ascending: false })).data ?? [],
  });
  const { data: ledger = [] } = useQuery({
    queryKey: ["customer-ledger", selected],
    enabled: !!selected,
    queryFn: async () => {
      const [sales, pays] = await Promise.all([
        (supabase as any).from("sales").select("sale_date,total_amount,invoice_no,payment_type").eq("customer_id", selected).order("sale_date"),
        (supabase as any).from("customer_payments").select("payment_date,amount,method,reference").eq("customer_id", selected).order("payment_date"),
      ]);
      const events = [
        ...(sales.data ?? []).map((s: any) => ({ date: s.sale_date, type: "Sale", debit: Number(s.total_amount), credit: 0, ref: s.invoice_no ?? s.payment_type })),
        ...(pays.data ?? []).map((p: any) => ({ date: p.payment_date, type: "Receipt", debit: 0, credit: Number(p.amount), ref: `${p.method} ${p.reference ?? ""}` })),
      ].sort((a, b) => a.date.localeCompare(b.date));
      let bal = 0;
      return events.map(e => ({ ...e, balance: (bal += e.debit - e.credit) }));
    },
  });
  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-4">
      <Card className="p-0 overflow-hidden h-fit">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Customers</CardTitle></CardHeader>
        <div className="max-h-[60vh] overflow-y-auto divide-y">
          {customers.map((c: any) => (
            <button key={c.id} onClick={() => setSelected(c.id)} className={`w-full text-left px-4 py-3 hover:bg-accent transition ${selected === c.id ? "bg-accent" : ""}`}>
              <div className="flex justify-between items-center gap-2">
                <span className="font-medium text-sm truncate">{c.name}</span>
                <Badge variant={Number(c.outstanding) > 0 ? "destructive" : "secondary"} className="shrink-0">{inr(c.outstanding)}</Badge>
              </div>
            </button>
          ))}
        </div>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">{selected ? "Statement" : "Select a customer"}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {selected && (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Ref</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
              <TableBody>
                {ledger.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No transactions</TableCell></TableRow>
                : ledger.map((e: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{e.date}</TableCell><TableCell>{e.type}</TableCell><TableCell className="text-xs">{e.ref}</TableCell>
                    <TableCell className="text-right">{e.debit ? inr(e.debit) : "—"}</TableCell>
                    <TableCell className="text-right">{e.credit ? inr(e.credit) : "—"}</TableCell>
                    <TableCell className="text-right font-medium">{inr(e.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SupplierLedger() {
  const [selected, setSelected] = useState<string>("");
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-ledger"],
    queryFn: async () => (await supabase.from("suppliers").select("id,name,outstanding").order("outstanding", { ascending: false })).data ?? [],
  });
  const { data: ledger = [] } = useQuery({
    queryKey: ["supplier-ledger", selected],
    enabled: !!selected,
    queryFn: async () => {
      const [purs, pays] = await Promise.all([
        (supabase as any).from("purchases").select("purchase_date,total_amount,invoice_number").eq("supplier_id", selected).order("purchase_date"),
        (supabase as any).from("supplier_payments").select("payment_date,amount,method,reference").eq("supplier_id", selected).order("payment_date"),
      ]);
      const events = [
        ...(purs.data ?? []).map((p: any) => ({ date: p.purchase_date, type: "Purchase", credit: Number(p.total_amount), debit: 0, ref: p.invoice_number ?? "—" })),
        ...(pays.data ?? []).map((p: any) => ({ date: p.payment_date, type: "Payment", debit: Number(p.amount), credit: 0, ref: `${p.method} ${p.reference ?? ""}` })),
      ].sort((a, b) => a.date.localeCompare(b.date));
      let bal = 0;
      return events.map(e => ({ ...e, balance: (bal += e.credit - e.debit) }));
    },
  });
  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-4">
      <Card className="p-0 overflow-hidden h-fit">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Suppliers</CardTitle></CardHeader>
        <div className="max-h-[60vh] overflow-y-auto divide-y">
          {suppliers.map((s: any) => (
            <button key={s.id} onClick={() => setSelected(s.id)} className={`w-full text-left px-4 py-3 hover:bg-accent transition ${selected === s.id ? "bg-accent" : ""}`}>
              <div className="flex justify-between items-center gap-2">
                <span className="font-medium text-sm truncate">{s.name}</span>
                <Badge variant={Number(s.outstanding) > 0 ? "destructive" : "secondary"} className="shrink-0">{inr(s.outstanding)}</Badge>
              </div>
            </button>
          ))}
        </div>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">{selected ? "Statement" : "Select a supplier"}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {selected && (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Ref</TableHead><TableHead className="text-right">Payment</TableHead><TableHead className="text-right">Bill</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
              <TableBody>
                {ledger.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No transactions</TableCell></TableRow>
                : ledger.map((e: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{e.date}</TableCell><TableCell>{e.type}</TableCell><TableCell className="text-xs">{e.ref}</TableCell>
                    <TableCell className="text-right">{e.debit ? inr(e.debit) : "—"}</TableCell>
                    <TableCell className="text-right">{e.credit ? inr(e.credit) : "—"}</TableCell>
                    <TableCell className="text-right font-medium">{inr(e.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
