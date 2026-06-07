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
import { ChefHat, Sparkles, ShieldCheck, ChartLine } from "lucide-react";

export const Route = createFileRoute("/auth")({
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
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — check email to confirm, then sign in.");
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (r.error) toast.error(r.error.message);
  };

  return (
    <div className="min-h-svh px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100svh-3rem)] w-full max-w-6xl overflow-hidden rounded-4xl border border-border/60 bg-background/80 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.55)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden flex-col justify-between border-r border-border/60 bg-linear-to-br from-primary via-primary/95 to-accent p-8 text-primary-foreground lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
              <ChefHat className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm/none font-semibold uppercase tracking-[0.2em] text-white/80">JR Bakery ERP</div>
              <div className="mt-1 text-xs text-white/70">Operations and finance, designed like a modern SaaS product</div>
            </div>
          </div>

          <div className="max-w-md space-y-6">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/70">Built for speed</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight">A calm, premium workspace for bakery operations.</h1>
              <p className="mt-4 text-sm leading-6 text-white/75">Track sales, purchases, production, cashflow, and compliance in a polished interface that stays fast on desktop and mobile.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: Sparkles, title: "Refined workflows", text: "Cleaner navigation and denser information hierarchy." },
                { icon: ShieldCheck, title: "Role-aware access", text: "Auth and permissions remain unchanged." },
                { icon: ChartLine, title: "Operational visibility", text: "Dashboards and reports feel more executive-ready." },
                { icon: ChefHat, title: "Bakery-first UX", text: "Built for the way JR Bakery teams actually work." },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <item.icon className="h-5 w-5 text-white" />
                  <div className="mt-3 text-sm font-semibold text-white">{item.title}</div>
                  <p className="mt-1 text-xs leading-5 text-white/70">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-white/60">Premium UI refactor in progress. Business logic and database behavior remain intact.</div>
        </div>

        <div className="flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <Card className="w-full max-w-xl border-border/60 bg-background/90">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/20">
                <ChefHat className="h-7 w-7" />
              </div>
              <CardTitle className="text-2xl">JR Bakery ERP</CardTitle>
              <CardDescription>Sign in to continue</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Sign up</TabsTrigger>
                </TabsList>
                <TabsContent value="signin">
                  <form onSubmit={signIn} className="space-y-4 pt-5">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? "Signing in..." : "Sign in"}
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup">
                  <form onSubmit={signUp} className="space-y-4 pt-5">
                    <div className="space-y-2">
                      <Label>Full name</Label>
                      <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? "Creating..." : "Create account"}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">First user becomes Super Admin.</p>
                  </form>
                </TabsContent>
              </Tabs>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/60" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div>
              </div>
              <Button variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
