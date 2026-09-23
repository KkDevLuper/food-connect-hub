import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Utensils,
  PlusCircle,
  ListChecks,
  Search,
  HandHeart,
  ShieldCheck,
  UserRound,
  Menu,
  LogOut,
  Leaf,
} from "lucide-react";
import type { ReactNode } from "react";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };

const NAV: Record<string, NavItem[]> = {
  restaurant: [
    { to: "/restaurant/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/restaurant/donate", label: "New donation", icon: PlusCircle },
    { to: "/restaurant/donations", label: "My donations", icon: ListChecks },
    { to: "/restaurant/profile", label: "Profile", icon: UserRound },
  ],
  ngo: [
    { to: "/ngo/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/ngo/available", label: "Available food", icon: Search },
    { to: "/ngo/claims", label: "My claims", icon: HandHeart },
    { to: "/ngo/profile", label: "Profile", icon: UserRound },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Admin dashboard", icon: ShieldCheck },
  ],
};

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <Leaf className="size-4" />
      </span>
      <span className="text-lg font-extrabold tracking-tight text-foreground">
        FOOD<span className="text-primary">LINK</span>
      </span>
    </Link>
  );
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-white/70 text-primary shadow-sm"
                : "text-muted-foreground hover:bg-white/40 hover:text-foreground",
            )
          }
        >
          <item.icon className="size-4" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const initial = (user?.name ?? user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full border border-white/60 bg-white/50 py-1 pl-1 pr-2.5 backdrop-blur transition hover:bg-white/70"
          aria-label="Account menu"
        >
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary/15 text-xs font-bold text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-28 truncate text-xs font-medium sm:block">
            {user?.name ?? user?.email ?? "Account"}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-strong w-52 border-white/60">
        <DropdownMenuLabel className="text-xs">
          {user?.email ?? "Guest user"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-black/5" />
        <DropdownMenuItem onClick={() => navigate("/onboarding")}>
          <UserRound className="size-4" /> Profile & role
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-rose-600 focus:text-rose-600"
          onClick={async () => {
            await signOut();
            navigate("/");
          }}
        >
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const { role } = useProfile();
  const items = NAV[role ?? ""] ?? [];
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="glass sticky top-0 hidden h-screen w-60 shrink-0 flex-col justify-between rounded-r-3xl p-4 lg:flex">
        <div>
          <div className="px-2 py-2">
            <Logo />
          </div>
          <div className="mt-4">
            <NavLinks items={items} />
          </div>
        </div>
        <p className="px-2 text-[11px] leading-4 text-muted-foreground">
          Turning surplus food into shared meals.
        </p>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="glass-subtle sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-white/50 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {/* Mobile menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-white/60 bg-white/50 lg:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="glass-strong w-72 border-white/60 p-4">
                <div className="py-2">
                  <Logo />
                </div>
                <div className="mt-4">
                  <NavLinks items={items} onNavigate={() => setMobileOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">
                {title}
              </h1>
              {subtitle && (
                <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <UserMenu />
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 pb-24 lg:pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
