"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  LayoutDashboard,
  Sparkles,
  Wand2,
  BookOpen,
  Clock,
  FileText,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Heart,
  Loader2,
  ArrowRight,
  Crown,
  GraduationCap,
  LogIn,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CourseCard, type CourseItem } from "@/components/site/course-card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface GeneratedScript {
  id: string;
  userId: string;
  type: string;
  movieTitle: string;
  genre: string | null;
  input: string;
  output: string;
  meta: string;
  isFavorite: boolean;
  createdAt: string;
}

const TYPE_META: Record<
  string,
  { label: string; cls: string; color: string }
> = {
  SCRIPT: {
    label: "解说文案",
    cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    color: "#e11d48",
  },
  TITLE: {
    label: "爆款标题",
    cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    color: "#d97706",
  },
  HOOK: {
    label: "黄金开头",
    cls: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400",
    color: "#c026d3",
  },
  POLISH: {
    label: "文案润色",
    cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    color: "#059669",
  },
  OUTLINE: {
    label: "大纲",
    cls: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    color: "#7c3aed",
  },
};

const TYPE_ORDER = ["SCRIPT", "TITLE", "HOOK", "POLISH", "OUTLINE"];

function formatTime(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;
  return d.toLocaleDateString("zh-CN");
}

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} 分钟`;
  if (m === 0) return `${h} 小时`;
  return `${h}小时${m}分`;
}

export function DashboardView() {
  const { user, setView, openCourse } = useAppStore();
  const [courses, setCourses] = React.useState<CourseItem[]>([]);
  const [scripts, setScripts] = React.useState<GeneratedScript[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL");
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch("/api/courses?limit=100").then((r) => r.json()),
      fetch("/api/scripts").then((r) => r.json()),
    ])
      .then(([c, s]) => {
        if (cancelled) return;
        setCourses(c.courses || []);
        setScripts(s.scripts || []);
      })
      .catch(() => toast.error("加载数据失败"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // 未登录引导
  if (!user) {
    return (
      <div className="relative min-h-[70vh] overflow-hidden">
        <div className="absolute inset-0 bg-cinema-radial" />
        <div className="relative mx-auto flex max-w-md flex-col items-center justify-center px-4 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-blue-500 shadow-glow-primary"
          >
            <LogIn className="h-10 w-10 text-primary-foreground" />
          </motion.div>
          <h2 className="mb-2 text-2xl font-bold">登录后查看我的学习</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            登录账号即可查看已报名课程、生成历史与工具使用统计
          </p>
          <Button
            onClick={() => setView("auth")}
            className="bg-gradient-to-r from-green-500 to-blue-500 text-white"
          >
            <LogIn className="mr-1.5 h-4 w-4" />
            去登录
          </Button>
        </div>
      </div>
    );
  }

  const enrolledCourses = courses.filter((c) => c.isEnrolled);
  const filteredScripts =
    typeFilter === "ALL"
      ? scripts
      : scripts.filter((s) => s.type === typeFilter);
  const favoriteCount = scripts.filter((s) => s.isFavorite).length;
  const scriptDocCount = scripts.filter((s) =>
    ["SCRIPT", "POLISH", "OUTLINE"].includes(s.type)
  ).length;
  const learnMinutes = enrolledCourses.length * 45 + scripts.length * 8;

  const chartData = TYPE_ORDER.map((t) => ({
    name: TYPE_META[t]?.label || t,
    value: scripts.filter((s) => s.type === t).length,
    color: TYPE_META[t]?.color || "#94a3b8",
  })).filter((d) => d.value > 0);

  const stats = [
    {
      icon: BookOpen,
      label: "我的报名",
      value: String(enrolledCourses.length),
      hint: "门课程",
      tint: "bg-rose-500/10 text-rose-500",
    },
    {
      icon: Clock,
      label: "学习时长(估算)",
      value: formatDuration(learnMinutes),
      hint: "累计",
      tint: "bg-amber-500/10 text-amber-500",
    },
    {
      icon: FileText,
      label: "生成文案",
      value: String(scriptDocCount),
      hint: "份文案/大纲",
      tint: "bg-emerald-500/10 text-emerald-500",
    },
    {
      icon: Wand2,
      label: "工具使用",
      value: String(scripts.length),
      hint: `次调用 · 收藏 ${favoriteCount}`,
      tint: "bg-violet-500/10 text-violet-500",
    },
  ];

  const quickActions = [
    {
      label: "AI文案生成",
      icon: Sparkles,
      view: "script-generator" as const,
      tint: "from-rose-500 to-pink-500",
    },
    {
      label: "课程中心",
      icon: BookOpen,
      view: "courses" as const,
      tint: "from-amber-500 to-orange-500",
    },
    {
      label: "工具箱",
      icon: Wand2,
      view: "tools" as const,
      tint: "from-emerald-500 to-teal-500",
    },
  ];

  const toggleFav = async (s: GeneratedScript) => {
    const next = !s.isFavorite;
    setScripts((prev) =>
      prev.map((x) => (x.id === s.id ? { ...x, isFavorite: next } : x))
    );
    try {
      const res = await fetch("/api/scripts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s.id, isFavorite: next }),
      });
      if (!res.ok) throw new Error();
      toast.success(next ? "已收藏" : "已取消收藏");
    } catch {
      setScripts((prev) =>
        prev.map((x) => (x.id === s.id ? { ...x, isFavorite: s.isFavorite } : x))
      );
      toast.error("操作失败");
    }
  };

  const copyScript = async (s: GeneratedScript) => {
    try {
      await navigator.clipboard.writeText(s.output);
      toast.success("已复制到剪贴板");
    } catch {
      toast.error("复制失败，请手动选择文本");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/scripts?id=${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setScripts((prev) => prev.filter((x) => x.id !== deleteId));
      toast.success("已删除");
    } catch {
      toast.error("删除失败");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="relative min-h-[70vh]">
      <div className="absolute inset-x-0 top-0 h-64 bg-cinema-radial" />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        {/* Welcome bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="glass-card overflow-hidden">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-blue-500 text-xl font-bold text-primary-foreground shadow-glow-primary">
                  {user.name.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="truncate text-xl font-bold sm:text-2xl">
                      你好，{user.name}
                    </h1>
                    <Badge
                      className={
                        user.role === "ADMIN"
                          ? "bg-accent text-accent-foreground"
                          : "bg-green-500/10 text-green-600 dark:text-green-400"
                      }
                    >
                      {user.role === "ADMIN" ? (
                        <>
                          <Crown className="mr-1 h-3 w-3" />
                          管理员
                        </>
                      ) : (
                        <>
                          <GraduationCap className="mr-1 h-3 w-3" />
                          学员
                        </>
                      )}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {quickActions.map((a) => (
                  <Button
                    key={a.label}
                    variant="outline"
                    size="sm"
                    onClick={() => setView(a.view)}
                    className="bg-background/60"
                  >
                    <a.icon className="mr-1.5 h-4 w-4" />
                    {a.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4"
        >
          {stats.map((s) => (
            <Card key={s.label} className="p-4 sm:p-5">
              <div
                className={cn(
                  "mb-3 flex h-9 w-9 items-center justify-center rounded-lg",
                  s.tint
                )}
              >
                <s.icon className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold tracking-tight">
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  s.value
                )}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {s.label} · {s.hint}
              </div>
            </Card>
          ))}
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-8"
        >
          <Tabs defaultValue="courses">
            <TabsList>
              <TabsTrigger value="courses">
                <BookOpen className="mr-1.5 h-4 w-4" />
                我的课程
                <span className="ml-1.5 rounded bg-muted-foreground/15 px-1.5 text-[10px]">
                  {enrolledCourses.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="scripts">
                <FileText className="mr-1.5 h-4 w-4" />
                生成历史
                <span className="ml-1.5 rounded bg-muted-foreground/15 px-1.5 text-[10px]">
                  {scripts.length}
                </span>
              </TabsTrigger>
            </TabsList>

            {/* 我的课程 */}
            <TabsContent value="courses" className="mt-6">
              {loading ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-[420px] animate-pulse rounded-xl bg-muted/40"
                    />
                  ))}
                </div>
              ) : enrolledCourses.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="还没有报名任何课程"
                  desc="去课程中心挑选一门适合你的电影解说课，从入门到高阶全覆盖"
                  cta="浏览课程中心"
                  onClick={() => setView("courses")}
                />
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {enrolledCourses.map((c) => (
                    <CourseCard key={c.id} course={c} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 生成历史 */}
            <TabsContent value="scripts" className="mt-6">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-32 animate-pulse rounded-xl bg-muted/40"
                    />
                  ))}
                </div>
              ) : scripts.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  title="还没有生成历史"
                  desc="使用 AI 文案生成器或创作工具箱，10 分钟产出第一条爆款解说"
                  cta="体验 AI 文案生成"
                  onClick={() => setView("script-generator")}
                />
              ) : (
                <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                  {/* List */}
                  <div className="space-y-3">
                    {/* Filter chips */}
                    <div className="flex flex-wrap gap-1.5">
                      <FilterChip
                        active={typeFilter === "ALL"}
                        onClick={() => setTypeFilter("ALL")}
                      >
                        全部 ({scripts.length})
                      </FilterChip>
                      {TYPE_ORDER.filter((t) =>
                        scripts.some((s) => s.type === t)
                      ).map((t) => (
                        <FilterChip
                          key={t}
                          active={typeFilter === t}
                          onClick={() => setTypeFilter(t)}
                        >
                          {TYPE_META[t]?.label} (
                          {scripts.filter((s) => s.type === t).length})
                        </FilterChip>
                      ))}
                    </div>

                    {/* Script items */}
                    <div className="space-y-3">
                      {filteredScripts.map((s) => {
                        const meta = TYPE_META[s.type] || {
                          label: s.type,
                          cls: "bg-muted text-muted-foreground",
                          color: "#94a3b8",
                        };
                        const isOpen = expanded.has(s.id);
                        return (
                          <Card key={s.id} className="overflow-hidden p-0">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge
                                      className={cn("border-0", meta.cls)}
                                    >
                                      {meta.label}
                                    </Badge>
                                    <span className="truncate text-sm font-semibold">
                                      {s.movieTitle || "未命名"}
                                    </span>
                                    {s.genre && (
                                      <span className="text-[11px] text-muted-foreground">
                                        · {s.genre}
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {formatTime(s.createdAt)}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleFav(s)}
                                  className="shrink-0 rounded-md p-1.5 transition-colors hover:bg-muted"
                                  aria-label={
                                    s.isFavorite ? "取消收藏" : "收藏"
                                  }
                                >
                                  <Heart
                                    className={cn(
                                      "h-4 w-4 transition-colors",
                                      s.isFavorite
                                        ? "fill-primary text-green-600 dark:text-green-400"
                                        : "text-muted-foreground"
                                    )}
                                  />
                                </button>
                              </div>

                              <div
                                className={cn(
                                  "mt-3 text-sm leading-relaxed text-foreground/80",
                                  !isOpen && "line-clamp-3"
                                )}
                              >
                                <pre className="whitespace-pre-wrap break-words font-sans">
                                  {s.output}
                                </pre>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleExpand(s.id)}
                                  className="h-7 text-xs"
                                >
                                  {isOpen ? (
                                    <>
                                      <ChevronUp className="mr-1 h-3.5 w-3.5" />
                                      收起
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="mr-1 h-3.5 w-3.5" />
                                      展开全文
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyScript(s)}
                                  className="h-7 text-xs"
                                >
                                  <Copy className="mr-1 h-3.5 w-3.5" />
                                  复制
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteId(s.id)}
                                  className="h-7 text-xs text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                                  删除
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                      {filteredScripts.length === 0 && (
                        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                          该类型下暂无记录
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pie chart sidebar */}
                  <div className="lg:sticky lg:top-20 lg:self-start">
                    <Card className="p-5">
                      <CardHeader className="px-0 pt-0">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <LayoutDashboard className="h-4 w-4 text-green-600 dark:text-green-400" />
                          工具使用分布
                        </CardTitle>
                        <CardDescription className="text-xs">
                          按生成类型统计调用次数
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="px-0 pb-0">
                        {chartData.length === 0 ? (
                          <div className="flex h-[180px] items-center justify-center text-xs text-muted-foreground">
                            暂无数据
                          </div>
                        ) : (
                          <>
                            <div className="h-[180px] w-full">
                              <ResponsiveContainer
                                width="100%"
                                height="100%"
                              >
                                <PieChart>
                                  <Pie
                                    data={chartData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={42}
                                    outerRadius={70}
                                    paddingAngle={2}
                                  >
                                    {chartData.map((entry) => (
                                      <Cell
                                        key={entry.name}
                                        fill={entry.color}
                                      />
                                    ))}
                                  </Pie>
                                  <RechartsTooltip
                                    contentStyle={{
                                      borderRadius: 8,
                                      border: "1px solid var(--border)",
                                      background: "var(--popover)",
                                      color: "var(--popover-foreground)",
                                      fontSize: 12,
                                    }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-1.5">
                              {chartData.map((d) => (
                                <div
                                  key={d.name}
                                  className="flex items-center gap-1.5 text-[11px]"
                                >
                                  <span
                                    className="h-2.5 w-2.5 rounded-sm"
                                    style={{ backgroundColor: d.color }}
                                  />
                                  <span className="truncate text-muted-foreground">
                                    {d.name}
                                  </span>
                                  <span className="ml-auto font-medium">
                                    {d.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Delete confirm dialog */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除这条记录？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后无法恢复，请谨慎操作。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  删除中…
                </>
              ) : (
                "确认删除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-green-500 bg-green-500 text-white"
          : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({
  icon: Icon,
  title,
  desc,
  cta,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/30 px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10 text-green-600 dark:text-green-400">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mb-1.5 text-base font-semibold">{title}</h3>
      <p className="mb-5 max-w-sm text-sm text-muted-foreground">{desc}</p>
      <Button
        onClick={onClick}
        className="bg-gradient-to-r from-green-500 to-blue-500 text-white"
      >
        {cta}
        <ArrowRight className="ml-1.5 h-4 w-4" />
      </Button>
    </div>
  );
}
