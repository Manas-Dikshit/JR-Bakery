import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth, isSuperAdmin, type Role } from "@/lib/auth";
import { ShieldAlert } from "lucide-react";

createFileRoute("/_authenticated/roles")({
  head: () => ({ meta: [{ title: "User Roles — JR Bakery ERP" }] }),
  component: RolesPage,
});

const ROLES: Role[] = ["super_admin", "manager", "operator", "viewer"];

function RolesPage() {
  const qc = useQueryClient();
  const { role, user } = useAuth();

  const { data = [], isLoading } = useQuery({
    queryKey: ["all-users"],
    enabled: isSuperAdmin(role),
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id,email,full_name"),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      return (profiles ?? []).map((p: any) => ({
        ...p,
        roles: (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role),
      }));
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: Role }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["all-users"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!isSuperAdmin(role)) {
    return (
      <Card className="p-8 text-center">
        <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
        <h2 className="font-semibold">Restricted</h2>
        <p className="text-sm text-muted-foreground">Only Super Admins can manage roles.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">User Roles</h1>
        <p className="text-sm text-muted-foreground mt-1">Assign access level — changes apply immediately.</p>
      </div>
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Email</TableHead><TableHead>Current</TableHead><TableHead>Assign</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>
            : data.map((u: any) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name ?? "—"}{u.id === user?.id && <Badge variant="secondary" className="ml-2">you</Badge>}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                <TableCell>{u.roles[0] ? <Badge>{u.roles[0].replace("_", " ")}</Badge> : "—"}</TableCell>
                <TableCell>
                  <select
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                    value={u.roles[0] ?? ""}
                    disabled={u.id === user?.id}
                    onChange={(e) => setRole.mutate({ userId: u.id, newRole: e.target.value as Role })}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r.replace("_"," ")}</option>)}
                  </select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
