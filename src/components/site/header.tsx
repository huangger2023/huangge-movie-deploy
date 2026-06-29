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
  MessageCircle,
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
import { QQGroupButton } from "@/components/site/qq-group";

const NAV: { key: ViewKey; label: string; icon: React.ElementType }[] = [
  { key: "home", label: "首页", icon: Film },
  { key: "courses", label: "课程中心", icon: LayoutGrid },
  { key: "script-generator", label: "AI 文案", icon: Sparkles },
  { key: "tools", label: "工具箱", icon: Wand2 },
  { key: "talk-fengge", label: "和荒哥聊聊", icon: MessageCircle },
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

export function Header() {
  const { view, setView, user, logout } = useAppStore();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const isProductActive = [
    "product-home",
    "cineflow-suite",
    "ai-copywriting",
    "hgtts-pro",
    "visual-match",
    "resources",
    "contact",
  ].includes(view);

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
        "sticky top-0 z-50 w-full transition-[background-color,backdrop-filter,border-color] duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <BrandLogo size="md" showTagline={false} onClick={() => go("home")} />

        {/* Desktop Nav — 方块工具条样式，mono 字体导航项，去掉胶囊感 */}
        <nav className="hidden items-center rounded-[2px] border border-border/60 bg-card/40 p-0.5 lg:flex">
          {NAV.map((item) => {
            const active = view === item.key;
            return (
              <button
                key={item.key}
                onClick={() => go(item.key)}
                className={cn(
                  "relative inline-flex items-center gap-1.5 rounded-[2px] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] transition-colors",
                  active
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="h-3 w-3" strokeWidth={2.2} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "hidden h-9 items-center gap-1.5 rounded-[2px] border px-3 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] transition-[background-color,border-color,color,box-shadow] lg:inline-flex",
                  isProductActive
                    ? "border-primary/45 bg-primary/12 text-primary shadow-[0_0_22px_rgba(244,63,94,0.14)]"
                    : "border-border/70 bg-card/50 text-muted-foreground hover:border-primary/35 hover:bg-primary/8 hover:text-foreground"
                )}
              >
                <Package className="h-3.5 w-3.5" strokeWidth={2.2} />
                方案
                <ChevronDown className="h-2.5 w-2.5" strokeWidth={2.2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-[2px] border-border/60 bg-card p-1">
              <DropdownMenuLabel className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
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
                      "rounded-[2px] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.06em] cursor-pointer",
                      subActive ? "bg-foreground/10 text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {sub.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={() => go("payment")}
            className={cn(
              "hidden h-9 items-center gap-1.5 rounded-[2px] border border-amber-300/35 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 px-3 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-white shadow-[0_0_28px_rgba(245,158,11,0.22)] transition-[opacity,transform,box-shadow] hover:opacity-95 hover:shadow-[0_0_34px_rgba(245,158,11,0.32)] active:scale-[0.98] lg:inline-flex",
              view === "payment" && "ring-2 ring-amber-300/35"
            )}
          >
            <CreditCard className="h-3.5 w-3.5" />
            支付通道
          </button>
          {/* QQ 群按钮：直角、mono 字 */}
          <QQGroupButton
            className="hidden h-9 rounded-[2px] px-3 font-mono text-[11px] uppercase tracking-[0.06em] sm:inline-flex"
            showLabel
          />
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex h-9 items-center gap-2 rounded-full pl-1 pr-3"
                >
                  <Avatar className="h-7 w-7 border border-border/60">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-[11px] font-semibold text-primary-foreground">
                      {user.name.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:inline">
                    {user.name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => go("dashboard")}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  我的学习
                </DropdownMenuItem>
                {user.role === "ADMIN" && (
                  <DropdownMenuItem onClick={() => go("admin")}>
                    <Settings className="mr-2 h-4 w-4" />
                    管理后台
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => go("script-generator")}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI 文案生成
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              size="sm"
              onClick={() => go("auth")}
              className="hidden h-9 rounded-[2px] px-4 font-mono text-[11px] uppercase tracking-[0.06em] sm:inline-flex"
            >
              <LogIn className="mr-1.5 h-3.5 w-3.5" />
              登录 / 注册
            </Button>
          )}

          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <BrandIcon size="sm" />
                  <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-base font-bold text-transparent">
                    荒哥说电影
                  </span>
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1 px-1">
                <button
                  type="button"
                  onClick={() => go("payment")}
                  className={cn(
                    "mb-3 flex w-full items-center gap-3 rounded-[2px] border border-amber-300/35 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 px-3 py-3 text-sm font-semibold text-white shadow-[0_0_28px_rgba(245,158,11,0.22)] transition-opacity hover:opacity-95",
                    view === "payment" && "ring-2 ring-amber-300/35"
                  )}
                >
                  <CreditCard className="h-4 w-4" />
                  支付通道
                </button>
                <div className="mb-3 rounded-[2px] border border-border/60 bg-card/45 p-2">
                  <button
                    type="button"
                    onClick={() => go("product-home")}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[2px] px-2.5 py-2 text-sm font-semibold transition-colors",
                      isProductActive
                        ? "bg-primary/12 text-primary"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
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
                          "rounded-[2px] px-2.5 py-1.5 text-left text-xs font-medium transition-colors",
                          view === sub.key
                            ? "bg-primary/12 text-primary"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
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
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        view === item.key
                          ? "bg-primary/12 text-primary"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
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
                    className="mt-3 rounded-lg"
                  >
                    <LogIn className="mr-1.5 h-4 w-4" />
                    登录 / 注册
                  </Button>
                )}
                <QQGroupButton
                  className="mt-3 w-full rounded-lg"
                  variant="outline"
                  size="lg"
                  showLabel
                />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
