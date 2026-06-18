"use client";

import * as React from "react";
import Link from "next/link";
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
  X,
  GraduationCap,
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

const NAV: { key: ViewKey; label: string; icon: React.ElementType }[] = [
  { key: "home", label: "首页", icon: Film },
  { key: "courses", label: "课程中心", icon: LayoutGrid },
  { key: "script-generator", label: "AI文案生成", icon: Sparkles },
  { key: "tools", label: "创作工具箱", icon: Wand2 },
  { key: "workspace", label: "创作工作台", icon: FolderKanban },
  { key: "dashboard", label: "我的学习", icon: LayoutDashboard },
];

export function Header() {
  const { view, setView, user, logout } = useAppStore();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

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
          ? "glass-card border-b border-border/60 shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <button
          onClick={() => go("home")}
          className="group flex items-center gap-2.5"
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow-primary transition-transform group-hover:scale-105">
            <Film className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col items-start leading-none">
            <span className="text-base font-bold tracking-tight">
              影述学院
            </span>
            <span className="text-[10px] text-muted-foreground">
              抖音电影解说创作平台
            </span>
          </div>
        </button>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => go(item.key)}
              className={cn(
                "relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                view === item.key
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-1.5">
                <item.icon className="h-4 w-4" />
                {item.label}
              </span>
              {view === item.key && (
                <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 rounded-full pl-1.5 pr-3"
                >
                  <Avatar className="h-7 w-7 border border-border">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-xs text-primary-foreground">
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
                  AI文案生成
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
              className="hidden bg-gradient-to-r from-primary to-accent text-primary-foreground sm:inline-flex"
            >
              <LogIn className="mr-1.5 h-4 w-4" />
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
                  <GraduationCap className="h-5 w-5 text-primary" />
                  影述学院
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                {NAV.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => go(item.key)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      view === item.key
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ))}
                {!user && (
                  <Button
                    onClick={() => go("auth")}
                    className="mt-3 bg-gradient-to-r from-primary to-accent text-primary-foreground"
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
