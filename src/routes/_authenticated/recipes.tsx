import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth, canEdit } from "@/lib/auth";
import { fmt, inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/recipes")({
  head: () => ({ meta: [{ title: "Recipes — JR Bakery ERP" }] }),
  component: Recipes,
});

function Recipes() {
  const qc = useQueryClient();
  const { role } = useAuth();
  const [productId, setProductId] = useState<string>("");
  const [materialId, setMaterialId] = useState("");
  const [qty, setQty] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["products-all"],
    queryFn: async () => (await supabase.from("products").select("id,name").order("name")).data ?? [],
  });
  const { data: materials = [] } = useQuery({
    queryKey: ["materials-all"],
    queryFn: async () => (await supabase.from("materials").select("id,name,unit,avg_cost").order("name")).data ?? [],
  });
  const { data: items = [] } = useQuery({
    queryKey: ["recipe", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase.from("recipe_items").select("*, material:materials(name,unit,avg_cost)").eq("product_id", productId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("recipe_items").insert({
        product_id: productId, material_id: materialId, quantity_per_unit: Number(qty),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Added"); setMaterialId(""); setQty(""); qc.invalidateQueries({ queryKey: ["recipe", productId] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("recipe_items").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipe", productId] }),
  });

  const costPerUnit = items.reduce((a: number, i: any) => a + Number(i.quantity_per_unit) * Number(i.material?.avg_cost ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recipes & Formulas</h1>
        <p className="text-sm text-muted-foreground mt-1">Material composition per unit. Drives stock consumption and cost-per-unit.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <Label>Select product</Label>
          <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
            value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Choose a product…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </CardContent>
      </Card>

      {productId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Ingredients</CardTitle>
            <div className="text-sm text-muted-foreground">Cost per unit: <span className="font-semibold text-foreground">{inr(costPerUnit)}</span></div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((i: any) => (
              <div key={i.id} className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <div className="font-medium">{i.material?.name}</div>
                  <div className="text-xs text-muted-foreground">{fmt(i.quantity_per_unit, 4)} {i.material?.unit} per unit · {inr(Number(i.quantity_per_unit) * Number(i.material?.avg_cost ?? 0))}</div>
                </div>
                {canEdit(role) && <Button variant="ghost" size="icon" onClick={() => del.mutate(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
              </div>
            ))}
            {items.length === 0 && <p className="text-sm text-muted-foreground">No ingredients yet.</p>}

            {canEdit(role) && (
              <div className="flex gap-2 pt-2 border-t flex-wrap">
                <select className="flex h-9 flex-1 min-w-40 rounded-md border border-input bg-background px-3 text-sm"
                  value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
                  <option value="">Material…</option>
                  {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                </select>
                <Input className="w-32" type="number" step="0.0001" placeholder="Qty/unit" value={qty} onChange={(e) => setQty(e.target.value)} />
                <Button onClick={() => add.mutate()} disabled={!materialId || !qty}><Plus className="h-4 w-4 mr-1" />Add</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
