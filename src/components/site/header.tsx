"use client";

import * as React from "react";
import {
  Film,
  Sparkles,
  LayoutGrid,
  Wand2,
  LayoutDashboard,
  Settings,
  LogIn,
  LogOut,
  FolderKanban,
  Menu,
  Package,
  ChevronDown,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { useAppStore, type ViewKey } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetHeader,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { BrandLogo, BrandIcon } from "@/components/site/brand-logo";

const NAV: { key: ViewKey; label: string; icon: React.ElementType }[] = [
  { key: "home", label: "首页", icon: Film },
  { key: "courses", label: "课程中心", icon: LayoutGrid },
  { key: "script-generator", label: "AI 文案", icon: Sparkles },
  { key: "tools", label: "工具箱", icon: Wand2 },
  { key: "workspace", label: "工作台", icon: FolderKanban },
  { key: "dashboard", label: "我的学习", icon: LayoutDashboard },
];

const PRODUCT_SUB_NAV: { key: ViewKey; label: string }[] = [
  { key: "product-home", label: "方案总览" },
  { key: "cineflow-suite", label: "CineFlow Pro" },
  { key: "ai-copywriting", label: "荒哥AI" },
  { key: "hgtts-pro", label: "hgTTS-Pro" },
  { key: "visual-match", label: "荒的一匹" },
  { key: "resources", label: "资源中心" },
];

const PRODUCT_VIEW_KEYS = [
  "product-home",
  "cineflow-suite",
  "ai-copywriting",
  "hgtts-pro",
  "visual-match",
  "resources",
  "contact",
  "payment",
];

export function Header() {
  const { view, setView, user, logout } = useAppStore();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const isProductActive = PRODUCT_VIEW_KEYS.includes(view);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (k: ViewKey) => {
    setView(k);
    setOpen(false);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } catch {}
    logout();
    toast.success("已退出登录");
    setView("home");
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-border/50 glass-header"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="container-page flex h-16 items-center gap-8">
        {/* Logo */}
        <BrandLogo size="md" showTagline={false} onClick={() => go("home")} />

        {/* Desktop Nav — Modern pill-style navigation */}
        <nav className="hidden shrink-0 items-center gap-0.5 rounded-full border border-border/50 bg-card/40 p-1 lg:flex">
          {NAV.map((item) => {
            const active = view === item.key;
            return (
              <button
                key={item.key}
                onClick={() => go(item.key)}
                className={cn(
                  "relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200",
                  active
                    ? "bg-green-500 text-white shadow-soft"
                    : "border border-border/50 bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground hover:border-primary/30"
                )}
              >
                <item.icon className="h-3.5 w-3.5" strokeWidth={2} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {/* Admin entry — prominent button for admin users */}
          {user?.role === "ADMIN" && (
            <button
              type="button"
              onClick={() => go("admin")}
              className={cn(
                "hidden h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium transition-all lg:inline-flex",
                view === "admin"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10"
              )}
            >
              <Settings className="h-3.5 w-3.5" strokeWidth={2} />
              管理后台
            </button>
          )}

          {/* Products dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "hidden h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium transition-all lg:inline-flex",
                  isProductActive
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border/60 bg-card/60 text-muted-foreground hover:border-primary/40 hover:bg-card hover:text-foreground"
                )}
              >
                <Package className="h-3.5 w-3.5" strokeWidth={2} />
                方案
                <ChevronDown className="h-3 w-3 opacity-60" strokeWidth={2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl border-border/50 bg-card p-1.5 shadow-elevated">
              <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                产品方案
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {PRODUCT_SUB_NAV.map((sub) => {
                const subActive = view === sub.key;
                return (
                  <DropdownMenuItem
                    key={sub.key}
                    onClick={() => go(sub.key)}
                    className={cn(
                      "cursor-pointer rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      subActive ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-foreground/5"
                    )}
                  >
                    {sub.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme toggle */}
          <ThemeToggle />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex h-9 items-center gap-2 rounded-full pl-1 pr-3"
                >
                  <Avatar className="h-7 w-7 border border-border/50">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-[11px] font-semibold text-primary-foreground">
                      {user.name.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:inline">
                    {user.name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-elevated">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user.role === "ADMIN" ? (
                  <DropdownMenuItem onClick={() => go("admin")} className="rounded-lg cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    管理后台
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => go("dashboard")} className="rounded-lg cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    我的学习
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => go("script-generator")} className="rounded-lg cursor-pointer">
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI 文案生成
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="rounded-lg cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              size="sm"
              onClick={() => go("auth")}
              className="hidden h-9 rounded-full px-4 text-[13px] font-medium sm:inline-flex"
            >
              <LogIn className="mr-1.5 h-3.5 w-3.5" />
              登录 / 注册
            </Button>
          )}

          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden rounded-full">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <SheetHeader className="px-5 pt-5">
                <SheetTitle className="flex items-center gap-2">
                  <BrandIcon size="sm" />
                  <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-base font-bold text-transparent">
                    荒哥说电影
                  </span>
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-4 flex flex-col gap-1 px-4 pb-6">
                {user?.role === "ADMIN" && (
                  <button
                    type="button"
                    onClick={() => go("admin")}
                    className={cn(
                      "mb-2 flex w-full items-center gap-3 rounded-xl bg-amber-500/10 px-3 py-2.5 text-sm font-semibold text-amber-600 dark:text-amber-400 transition-opacity hover:brightness-105",
                      view === "admin" && "ring-2 ring-amber-300/40"
                    )}
                  >
                    <Settings className="h-4 w-4" />
                    管理后台
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => go("payment")}
                  className={cn(
                    "mb-2 flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 px-3 py-2.5 text-sm font-semibold text-white shadow-soft transition-opacity hover:brightness-105",
                    view === "payment" && "ring-2 ring-amber-300/40"
                  )}
                >
                  <CreditCard className="h-4 w-4" />
                  支付通道
                </button>
                <div className="mb-2 rounded-xl border border-border/50 bg-card/30 p-2">
                  <button
                    type="button"
                    onClick={() => go("product-home")}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors",
                      isProductActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                    )}
                  >
                    <Package className="h-4 w-4" />
                    产品方案
                  </button>
                  <div className="mt-1 grid grid-cols-2 gap-1">
                    {PRODUCT_SUB_NAV.map((sub) => (
                      <button
                        key={sub.key}
                        onClick={() => go(sub.key)}
                        className={cn(
                          "rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors",
                          view === sub.key
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                        )}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                </div>
                {NAV.map((item) => {
                  return (
                    <button
                      key={item.key}
                      onClick={() => go(item.key)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                        view === item.key
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
                {!user && (
                  <Button
                    onClick={() => go("auth")}
                    className="mt-3 rounded-xl"
                  >
                    <LogIn className="mr-1.5 h-4 w-4" />
                    登录 / 注册
                  </Button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
