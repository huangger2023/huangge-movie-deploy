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
  StudioLight,
} from "@/components/site/illustrations";

const FEATURES = [
  { code: "ai/draft", title: "AI 文案初稿", desc: "结构化解说初稿，再人工校事实和改口语。" },
  { code: "course/3-stage", title: "系统实战课程", desc: "小白、爆款、精选三阶段主课配合实操作业。" },
  { code: "tools/edit", title: "实操工具配套", desc: "标题、开头、改稿等环节都有对应工具。" },
  { code: "community", title: "活跃学员社群", desc: "课时问题、改稿思路和作品复盘交流。" },
];

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
      setView("home");
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
      <div className="absolute inset-0 code-bg opacity-50" />
      <StudioLight
        className="pointer-events-none absolute right-[6%] top-[6%] hidden text-amber-400/30 lg:block"
        aria-hidden="true"
      />

      <div className="container-page relative grid gap-10 pt-12 pb-20 lg:grid-cols-2 lg:items-start lg:gap-16 lg:pt-20">
        {/* —— 左：品牌区（桌面端） —— */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden lg:block"
        >
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            / auth · 注册 · 登录
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

          <ul className="mt-10 space-y-4 border-l border-dashed border-border pl-6">
            {FEATURES.map((f, i) => (
              <motion.li
                key={f.code}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 + i * 0.06 }}
                className="relative"
              >
                <span className="absolute -left-[28px] top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground/70">
                  {f.code}
                </div>
                <div className="mt-0.5 font-display text-[15px] font-semibold tracking-tight">
                  {f.title}
                </div>
                <div className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                  {f.desc}
                </div>
              </motion.li>
            ))}
          </ul>
        </motion.div>
        {/* —— 右：表单控制台 —— */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="w-full max-w-md justify-self-center lg:justify-self-end"
        >
          <div className="rounded-[2px] border border-border bg-card/70 backdrop-blur-sm">
            {/* 顶部状态条 */}
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              <div className="flex items-center gap-2.5">
                <span className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-400/70" />
                  <span className="h-2 w-2 rounded-full bg-amber-400/70" />
                  <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
                </span>
                <span>auth.console</span>
              </div>
              <span>{mode === "login" ? "LOGIN" : "REGISTER"}</span>
            </div>

            <div className="px-6 py-7">
              {/* 移动端品牌 */}
              <div className="mb-5 lg:hidden">
                <BrandLogo size="md" />
              </div>

              {/* 模式切换 */}
              <div className="grid grid-cols-2 rounded-[2px] border border-border/70 p-0.5">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={cn(
                    "rounded-[2px] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors",
                    mode === "login"
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  登录 · LOGIN
                </button>
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className={cn(
                    "rounded-[2px] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors",
                    mode === "register"
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  注册 · REGISTER
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
                  label="邮箱 / EMAIL"
                  icon={<Mail className="h-4 w-4 text-muted-foreground" />}
                >
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-[2px] border-border/70 pl-9 font-mono text-[13px]"
                    required
                    autoComplete="email"
                  />
                </FormField>

                <FormField
                  id="name"
                  label={
                    <>
                      姓名 / NAME{mode === "register" && (
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
                    className="rounded-[2px] border-border/70 pl-9 text-[13px]"
                    autoComplete="name"
                  />
                </FormField>

                <FormField
                  id="password"
                  label="密码 / PASSWORD"
                  icon={<Lock className="h-4 w-4 text-muted-foreground" />}
                >
                  <Input
                    id="password"
                    type="password"
                    placeholder="默认 123456"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-[2px] border-border/70 pl-9 font-mono text-[13px]"
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                  />
                </FormField>
                <p className="font-mono text-[10px] tracking-[0.04em] text-muted-foreground">
                  // 新邮箱将自动注册，老邮箱需校验密码
                </p>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-[2px] font-mono text-[12px] uppercase tracking-[0.08em]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      处理中
                    </>
                  ) : (
                    <>
                      {mode === "login" ? "登录" : "注册并登录"}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
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
  return (
    <div className="relative min-h-[80vh] overflow-hidden">
      <div className="absolute inset-0 spotlight-soft opacity-60" />
      <div className="absolute inset-0 code-bg opacity-40" />
      <div className="container-page relative flex flex-col items-center justify-center pt-24 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
        >
          / auth · session active
        </motion.div>

        <h1 className="font-display mt-3 text-balance text-[36px] font-extrabold leading-[1.05] tracking-[-0.025em] sm:text-[48px]">
          <span className="relative inline-block">
            已登录
            <ScribbleUnderline className="absolute -bottom-1 left-0 right-0 text-emerald-400/85" />
          </span>
        </h1>

        <div className="mt-8 w-full max-w-md rounded-[2px] border border-border bg-card/60 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            <span>session</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-500 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              ACTIVE
            </span>
          </div>
          <div className="space-y-4 px-5 py-5 text-left">
            <div className="flex items-center gap-3 rounded-[2px] border border-border/60 bg-background/50 px-3 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-[2px] border border-border/60 bg-card font-mono text-[14px] font-bold">
                {user.name.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold tracking-tight">{user.name}</div>
                <div className="font-mono text-[11px] text-muted-foreground truncate">{user.email}</div>
              </div>
              <span
                className={cn(
                  "font-mono text-[10px] uppercase tracking-[0.08em]",
                  user.role === "ADMIN"
                    ? "text-amber-500 dark:text-amber-400"
                    : "text-muted-foreground"
                )}
              >
                {user.role === "ADMIN" ? "● ADMIN" : "● USER"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setView("dashboard")}
                className="rounded-[2px] font-mono text-[12px] uppercase tracking-[0.06em]"
              >
                <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />
                控制台
              </Button>
              <Button
                variant="outline"
                onClick={() => setView("home")}
                className="rounded-[2px] font-mono text-[12px] uppercase tracking-[0.06em]"
              >
                返回首页
              </Button>
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
      <Label htmlFor={id} className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>
        {children}
      </div>
    </div>
  );
}
