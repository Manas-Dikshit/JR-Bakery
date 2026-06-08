import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarTrigger, SidebarFooter } from "@/components/ui/sidebar";
import { LayoutDashboard, Package, Truck, ShoppingCart, Cookie, BookOpen, Factory, Users, Receipt, Wallet, Trash2, BarChart3, ChefHat, LogOut, ClipboardCheck, Wrench, ShieldCheck, AlertTriangle, CreditCard, BookText, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

const groups = [
  { label: "Overview", items: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  ]},
  { label: "Inventory", items: [
    { title: "Materials", url: "/materials", icon: Package },
    { title: "Suppliers", url: "/suppliers", icon: Truck },
    { title: "Purchases", url: "/purchases", icon: ShoppingCart },
    { title: "Adjustments", url: "/adjustments", icon: Wrench },
  ]},
  { label: "Production", items: [
    { title: "Products", url: "/products", icon: Cookie },
    { title: "Recipes", url: "/recipes", icon: BookOpen },
    { title: "Production", url: "/production", icon: Factory },
    { title: "Waste", url: "/waste", icon: Trash2 },
  ]},
  { label: "Commerce", items: [
    { title: "Customers", url: "/customers", icon: Users },
    { title: "Sales", url: "/sales", icon: Receipt },
    { title: "Payments", url: "/payments", icon: CreditCard },
    { title: "Ledger", url: "/ledger", icon: BookText },
    { title: "Expenses", url: "/expenses", icon: Wallet },
    { title: "Daily Closing", url: "/closing", icon: ClipboardCheck },
  ]},
  { label: "Insights", items: [
    { title: "Reports", url: "/reports", icon: BarChart3 },
    { title: "Variance", url: "/variance", icon: AlertTriangle },
    { title: "Audit Log", url: "/audit", icon: ShieldCheck },
  ]},
  { label: "Admin", items: [
    { title: "User Roles", url: "/roles", icon: UserCog },
  ]},
];

function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0"><ChefHat className="h-4 w-4" /></div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-semibold text-sm leading-tight">JR Bakery</span>
            <span className="text-xs text-muted-foreground leading-tight">ERP System</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((i) => (
                  <SidebarMenuItem key={i.url}>
                    <SidebarMenuButton asChild isActive={path === i.url}>
                      <Link to={i.url} className="flex items-center gap-2">
                        <i.icon className="h-4 w-4" />
                        <span>{i.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-2 group-data-[collapsible=icon]:hidden">
          <div className="text-xs font-medium truncate">{user?.email}</div>
          <div className="text-xs text-muted-foreground capitalize">{role?.replace("_", " ")}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="justify-start">
          <LogOut className="h-4 w-4" /><span className="group-data-[collapsible=icon]:hidden">Sign out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const currentTitle = groups.flatMap(g => g.items).find(i => i.url === path)?.title ?? "JR Bakery ERP";
  return (
    <SidebarProvider>
      <div className="min-h-dvh flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b px-3 sm:px-4 sticky top-0 bg-background/80 backdrop-blur-xl z-20">
            <SidebarTrigger />
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-sm sm:text-base truncate">{currentTitle}</span>
            </div>
            <div className="ml-auto hidden sm:flex items-center text-xs text-muted-foreground">
              JR Bakery ERP
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

