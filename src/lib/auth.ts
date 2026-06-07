import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type Role = "super_admin" | "manager" | "operator" | "viewer";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setRole(null); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      if (!data || data.length === 0) { setRole("viewer"); return; }
      const order: Role[] = ["super_admin", "manager", "operator", "viewer"];
      const found = order.find((r) => data.some((d) => d.role === r));
      setRole(found ?? "viewer");
    });
  }, [user]);

  return { session, user, role, loading };
}

export const canEdit = (r: Role | null) => r === "super_admin" || r === "manager" || r === "operator";
export const canManage = (r: Role | null) => r === "super_admin" || r === "manager";
export const isSuperAdmin = (r: Role | null) => r === "super_admin";
