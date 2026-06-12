import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ChefHat } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in — JR Bakery ERP" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Use at least 8 characters for your password.");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (data.session) {
      toast.success("Welcome to JR Bakery!");
      navigate({ to: "/dashboard" });
      return;
    }
    // Auto-sign-in fallback if session not returned
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) return toast.success("Account created. Please sign in.");
    navigate({ to: "/dashboard" });
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (r.error) toast.error(r.error.message);
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-background via-accent/40 to-background">
      <div className="absolute inset-0 -z-10 opacity-60 pointer-events-none">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-chart-5/20 blur-3xl" />
      </div>
      <Card className="w-full max-w-md soft-shadow border-border/60 backdrop-blur-sm bg-card/95">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-chart-5 text-primary-foreground flex items-center justify-center soft-shadow">
            <ChefHat className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl"><span className="gradient-text">JR Bakery ERP</span></CardTitle>
          <CardDescription>Sign in to manage your bakery</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-3 pt-4">
                <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div><Label>Password</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button type="submit" disabled={loading} className="w-full">Sign in</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-3 pt-4">
                <div><Label>Full name</Label><Input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
                <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div>
                  <Label>Password</Label>
                  <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                  <p className="text-[11px] text-muted-foreground mt-1">At least 8 characters. Avoid common passwords.</p>
                </div>
                <Button type="submit" disabled={loading} className="w-full">{loading ? "Creating…" : "Create account"}</Button>
                <p className="text-xs text-muted-foreground text-center">First user becomes Super Admin.</p>
              </form>
            </TabsContent>
          </Tabs>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div>
          </div>
          <Button variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
        </CardContent>
      </Card>
    </div>
  );
}
