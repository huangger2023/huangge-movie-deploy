"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Mail,
  User,
  Lock,
  Loader2,
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/site/brand-logo";
import {
  ScribbleUnderline,
} from "@/components/site/illustrations";

export function AuthView() {
  const { user, setUser, setView } = useAppStore();
  const [mode, setMode] = React.useState<"login" | "register">("login");
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("请输入邮箱");
      return;
    }
    if (mode === "register" && !name.trim()) {
      toast.error("注册时请填写昵称");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "登录失败");
        return;
      }
      setUser(data.user);
      toast.success(`欢迎${mode === "register" ? "加入" : "回来"}，${data.user.name}！`);
      // 管理员登录后直接进管理后台，学员进首页
      setView(data.user.role === "ADMIN" ? "admin" : "home");
    } catch {
      toast.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  if (user) return <AuthLoggedIn user={user} setView={setView} />;

  return (
    <div className="relative min-h-[80vh] overflow-hidden">
      <div className="absolute inset-0 spotlight-soft" />
      <div className="absolute inset-0 code-bg opacity-20" />
      <div className="container-page relative grid gap-10 pt-12 pb-20 lg:grid-cols-2 lg:items-start lg:gap-16 lg:pt-20">
        {/* Left: Brand area (desktop) */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden lg:block"
        >
          <div className="text-sm font-medium text-muted-foreground">
            注册 · 登录
          </div>

          <div className="mt-5">
            <BrandLogo size="md" showTagline />
          </div>

          <h1 className="font-display mt-9 text-balance text-[44px] font-extrabold leading-[1.04] tracking-[-0.025em]">
            带方法的{" "}
            <span className="relative inline-block">
              三阶段课
              <ScribbleUnderline className="absolute -bottom-1 left-0 right-0 text-amber-400/80" />
            </span>
            <br />
            和共方法论生成器
          </h1>
          <p className="mt-5 max-w-md text-[14px] leading-[1.7] text-muted-foreground">
            专注抖音电影解说创作教学。课程围绕小白、爆款、精选三阶段展开，并持续补入最新规则、算法透明和
            AIGC 使用边界。AI 工具负责提效，方法和判断仍然交还给创作者自己。
          </p>
        </motion.div>

        {/* Right: Form card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="w-full max-w-md justify-self-center lg:justify-self-end"
        >
          <div className="rounded-2xl border border-border/50 bg-card/70 backdrop-blur-sm shadow-soft">
            <div className="px-6 py-7">
              {/* Mobile brand */}
              <div className="mb-5 lg:hidden">
                <BrandLogo size="md" />
              </div>

              {/* Mode switch */}
              <div className="grid grid-cols-2 rounded-xl border border-border/50 bg-muted/30 p-1">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    mode === "login"
                      ? "bg-card text-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  登录
                </button>
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    mode === "register"
                      ? "bg-card text-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  注册
                </button>
              </div>

              <div className="mt-5">
                <h2 className="font-display text-[22px] font-bold tracking-tight">
                  {mode === "login" ? "欢迎回来" : "注册账号"}
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  {mode === "login"
                    ? "登录账号继续你的创作之旅。"
                    : "注册后联系客服开通授权，即可使用 AI 创作工具。"}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <FormField
                  id="email"
                  label="邮箱"
                  icon={<Mail className="h-4 w-4 text-muted-foreground" />}
                >
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-lg border-border/50 pl-9 text-sm"
                    required
                    autoComplete="email"
                  />
                </FormField>

                <FormField
                  id="name"
                  label={
                    <>
                      姓名{mode === "register" && (
                        <span className="text-destructive"> *</span>
                      )}
                    </>
                  }
                  icon={<User className="h-4 w-4 text-muted-foreground" />}
                >
                  <Input
                    id="name"
                    type="text"
                    placeholder={
                      mode === "register" ? "你的昵称" : "可选，新用户将作为昵称"
                    }
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-lg border-border/50 pl-9 text-sm"
                    autoComplete="name"
                  />
                </FormField>

                <FormField
                  id="password"
                  label="密码"
                  icon={<Lock className="h-4 w-4 text-muted-foreground" />}
                >
                  <Input
                    id="password"
                    type="password"
                    placeholder="默认 123456"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-lg border-border/50 pl-9 text-sm"
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                  />
                </FormField>
                <p className="text-xs text-muted-foreground">
                  新邮箱将自动注册，老邮箱需校验密码
                </p>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg text-sm font-medium"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      处理中
                    </>
                  ) : (
                    <>
                      {mode === "login" ? "登录" : "注册并登录"}
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function AuthLoggedIn({
  user,
  setView,
}: {
  user: { name: string; email: string; role: string };
  setView: (v: any) => void;
}) {
  const isAdmin = user.role === "ADMIN";
  return (
    <div className="relative min-h-[80vh] overflow-hidden">
      <div className="absolute inset-0 spotlight-soft opacity-60" />
      <div className="absolute inset-0 code-bg opacity-15" />
      <div className="container-page relative flex flex-col items-center justify-center pt-24 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="text-sm font-medium text-muted-foreground"
        >
          {isAdmin ? "管理员会话" : "会话已激活"}
        </motion.div>

        <h1 className="font-display mt-3 text-balance text-[36px] font-extrabold leading-[1.05] tracking-[-0.025em] sm:text-[48px]">
          <span className="relative inline-block">
            {isAdmin ? "管理后台" : "已登录"}
            <ScribbleUnderline className="absolute -bottom-1 left-0 right-0 text-emerald-400/85" />
          </span>
        </h1>

        <div className="mt-8 w-full max-w-md rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-soft">
          <div className="flex items-center justify-between border-b border-border/40 px-5 py-3 text-sm text-muted-foreground">
            <span className="font-medium">会话信息</span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5",
                isAdmin ? "text-amber-500 dark:text-amber-400" : "text-emerald-500 dark:text-emerald-400"
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isAdmin ? "管理员" : "已激活"}
            </span>
          </div>
          <div className="space-y-4 px-5 py-5 text-left">
            <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/50 px-3 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/40 bg-card text-sm font-bold">
                {user.name.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold tracking-tight">{user.name}</div>
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  isAdmin
                    ? "text-amber-500 dark:text-amber-400"
                    : "text-muted-foreground"
                )}
              >
                {isAdmin ? "管理员" : "用户"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {isAdmin ? (
                <>
                  <Button
                    onClick={() => setView("admin")}
                    className="rounded-lg text-sm font-medium"
                  >
                    <LayoutDashboard className="mr-1.5 h-4 w-4" />
                    进入管理后台
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setView("home")}
                    className="rounded-lg text-sm font-medium"
                  >
                    返回首页
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => setView("dashboard")}
                    className="rounded-lg text-sm font-medium"
                  >
                    <LayoutDashboard className="mr-1.5 h-4 w-4" />
                    控制台
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setView("home")}
                    className="rounded-lg text-sm font-medium"
                  >
                    返回首页
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({
  id,
  label,
  icon,
  children,
}: {
  id: string;
  label: React.ReactNode;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>
        {children}
      </div>
    </div>
  );
}
