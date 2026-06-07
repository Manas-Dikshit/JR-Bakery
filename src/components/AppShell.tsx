import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Package,
  Truck,
  ShoppingCart,
  Cookie,
  BookOpen,
  Factory,
  Users,
  Receipt,
  Wallet,
  Trash2,
  BarChart3,
  ChefHat,
  LogOut,
  ClipboardCheck,
  Wrench,
  ShieldCheck,
  AlertTriangle,
  CreditCard,
  BookText,
  UserCog,
  Search,
  Bell,
  MoonStar,
  SunMedium,
  Sparkles,
  ChevronRight,
  PanelLeftClose,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const groups = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", url: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Inventory",
    items: [
      { title: "Materials", url: "/materials", icon: Package },
      { title: "Suppliers", url: "/suppliers", icon: Truck },
      { title: "Purchases", url: "/purchases", icon: ShoppingCart },
      { title: "Adjustments", url: "/adjustments", icon: Wrench },
    ],
  },
  {
    label: "Production",
    items: [
      { title: "Products", url: "/products", icon: Cookie },
      { title: "Recipes", url: "/recipes", icon: BookOpen },
      { title: "Production", url: "/production", icon: Factory },
      { title: "Waste", url: "/waste", icon: Trash2 },
    ],
  },
  {
    label: "Commerce",
    items: [
      { title: "Customers", url: "/customers", icon: Users },
      { title: "Sales", url: "/sales", icon: Receipt },
      { title: "Payments", url: "/payments", icon: CreditCard },
      { title: "Ledger", url: "/ledger", icon: BookText },
      { title: "Expenses", url: "/expenses", icon: Wallet },
      { title: "Daily Closing", url: "/closing", icon: ClipboardCheck },
    ],
  },
  {
    label: "Insights",
    items: [
      { title: "Reports", url: "/reports", icon: BarChart3 },
      { title: "Variance", url: "/variance", icon: AlertTriangle },
      { title: "Audit Log", url: "/audit", icon: ShieldCheck },
    ],
  },
  {
    label: "Admin",
    items: [{ title: "User Roles", url: "/roles", icon: UserCog }],
  },
];

const flatNav = groups.flatMap((group) => group.items.map((item) => ({ ...item, group: group.label })));

const routeTitles: Record<string, { title: string; group?: string }> = Object.fromEntries(
  flatNav.map((item) => [item.url, { title: item.title, group: item.group }]),
);

const themeStorageKey = "jr-bakery-theme";

function getInitialTheme() {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(themeStorageKey);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function AppSidebar({ onOpenCommand }: { onOpenCommand: () => void }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <Sidebar collapsible="icon" variant="floating" className="border-0 bg-transparent md:p-2">
      <SidebarHeader>
        <div className="rounded-3xl border border-border/60 bg-background/75 p-4 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl group-data-[collapsible=icon]:p-3 dark:border-white/10 dark:bg-background/50">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-orange-500 via-amber-400 to-red-500 text-white shadow-lg shadow-orange-500/20 ring-1 ring-white/30">
              <ChefHat className="h-5 w-5" />
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <h2 className="truncate text-sm font-semibold tracking-tight">JR Bakery</h2>
              <p className="text-xs text-muted-foreground">ERP Platform</p>
            </div>
          </div>

          <Button
            variant="outline"
            className="mt-4 w-full justify-between rounded-2xl border-border/60 bg-white/70 px-3 text-left shadow-sm backdrop-blur-xl group-data-[collapsible=icon]:hidden dark:bg-white/5"
            onClick={onOpenCommand}
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <Search className="h-4 w-4" />
              Search workspace
            </span>
            <kbd className="rounded-md border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">⌘K</kbd>
          </Button>

          <div className="mt-4 flex items-center justify-between rounded-2xl border border-border/60 bg-background/80 px-3 py-2 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
              <span className="text-xs font-medium text-muted-foreground">Online</span>
            </div>
            <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]">Live</Badge>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={path === item.url}
                      className={cn(
                        "group rounded-2xl px-3 py-2.5 transition-all duration-200",
                        "hover:bg-accent/70 hover:shadow-sm data-[active=true]:border data-[active=true]:border-primary/20 data-[active=true]:bg-linear-to-r data-[active=true]:from-primary/15 data-[active=true]:to-accent/80 data-[active=true]:shadow-sm",
                      )}
                    >
                      <Link to={item.url} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-data-[active=true]:text-primary" />
                        <span className="font-medium">{item.title}</span>
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
        <div className="rounded-3xl border border-border/60 bg-background/80 p-3 shadow-sm backdrop-blur-xl group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-border/60">
              <AvatarFallback className="bg-linear-to-br from-primary/20 to-accent text-sm font-semibold text-primary">
                {(user?.email ?? "JR").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{user?.email}</div>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full capitalize">
                  {role?.replace("_", " ")}
                </Badge>
                <span className="text-[11px] text-muted-foreground">Ready</span>
              </div>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="justify-start rounded-2xl px-3">
          <LogOut className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const [commandOpen, setCommandOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const activeRoute = routeTitles[path] ?? { title: "Dashboard", group: "Overview" };

  useEffect(() => {
    setTheme(getInitialTheme() as "light" | "dark");
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    window.localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  const breadcrumbs = useMemo(() => {
    const crumbs: Array<{ label: string; to: string }> = [{ label: "Home", to: "/dashboard" }];
    if (activeRoute.group && activeRoute.title !== "Dashboard") {
      crumbs.push({ label: activeRoute.group, to: "/dashboard" });
    }
    crumbs.push({ label: activeRoute.title, to: path });
    return crumbs;
  }, [activeRoute.group, activeRoute.title, path]);

  return (
    <SidebarProvider>
      <div className="min-h-svh w-full bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.08),transparent_26%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_22%),linear-gradient(180deg,var(--color-background),var(--color-background))] text-foreground">
        <AppSidebar onOpenCommand={() => setCommandOpen(true)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border/60 bg-background/75 backdrop-blur-2xl supports-backdrop-filter:bg-background/60">
            <div className="mx-auto flex h-16 w-full max-w-400 items-center gap-3 px-4 sm:px-6 lg:px-8">
              <SidebarTrigger className="h-9 w-9 rounded-xl border border-border/60 bg-background shadow-sm" />
              <div className="min-w-0 flex-1">
                <Breadcrumb>
                  <BreadcrumbList>
                    {breadcrumbs.map((crumb, index) => (
                      <BreadcrumbItem key={crumb.label}>
                        {index < breadcrumbs.length - 1 ? (
                          <>
                            <BreadcrumbLink asChild>
                              <Link to={crumb.to} className="text-muted-foreground hover:text-foreground">
                                {crumb.label}
                              </Link>
                            </BreadcrumbLink>
                            <BreadcrumbSeparator>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </BreadcrumbSeparator>
                          </>
                        ) : (
                          <BreadcrumbPage className="font-medium text-foreground">{crumb.label}</BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
                <div className="mt-1 flex items-center gap-2">
                  <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">{activeRoute.title}</h1>
                  <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]">ERP</Badge>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="hidden rounded-xl border-border/60 bg-background/80 shadow-sm md:inline-flex"
                  onClick={() => setCommandOpen(true)}
                  aria-label="Open command palette"
                >
                  <Search className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="hidden rounded-xl border-border/60 bg-background/80 shadow-sm md:inline-flex"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-xl border-border/60 bg-background/80 shadow-sm" aria-label="Notifications">
                      <Bell className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72 rounded-2xl p-2">
                    <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Notifications
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      <Sparkles className="mx-auto mb-2 h-5 w-5" />
                      No new notifications
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="hidden items-center gap-3 rounded-2xl border-border/60 bg-background/80 px-3 shadow-sm md:inline-flex">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-linear-to-br from-primary/20 to-accent text-xs font-semibold text-primary">JR</AvatarFallback>
                      </Avatar>
                      <span className="max-w-35 truncate text-sm font-medium">Workspace</span>
                      <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
                    <DropdownMenuLabel className="px-2 py-1.5 text-sm">JR Bakery ERP</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setCommandOpen(true)} className="rounded-xl">
                      Open command palette
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="rounded-xl">
                      {theme === "dark" ? "Switch to light" : "Switch to dark"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="rounded-xl"
                      onClick={async () => {
                        await supabase.auth.signOut();
                        navigate({ to: "/auth" });
                      }}
                    >
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="flex-1">
            <div className="mx-auto w-full max-w-400 px-4 py-6 sm:px-6 lg:px-8">
              <div className="animate-[fade-in_220ms_ease-out]">{children}</div>
            </div>
          </main>

          <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
            <CommandInput placeholder="Search routes or actions..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Navigate">
                {flatNav.map((item) => (
                  <CommandItem
                    key={item.url}
                    onSelect={() => {
                      setCommandOpen(false);
                      navigate({ to: item.url as any });
                    }}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                    <CommandShortcut>{item.group}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Actions">
                <CommandItem onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
                  <span>Toggle theme</span>
                  <CommandShortcut>⌘J</CommandShortcut>
                </CommandItem>
                <CommandItem
                  onSelect={async () => {
                    await supabase.auth.signOut();
                    navigate({ to: "/auth" });
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </CommandDialog>
        </div>
      </div>
    </SidebarProvider>
  );
}
