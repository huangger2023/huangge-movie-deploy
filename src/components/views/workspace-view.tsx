"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderKanban,
  Plus,
  Film,
  Trash2,
  Sparkles,
  Type,
  Zap,
  Clapperboard,
  FileText,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Save,
  Copy,
  Download,
  TrendingUp,
  Search,
  Filter,
  CopyPlus,
  ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WorkspaceItem {
  id: string;
  movieTitle: string;
  genre: string;
  coverColor: string;
  status: string;
  script: string | null;
  titles: string | null;
  hooks: string | null;
  storyboard: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  progress: number;
}

const COLORS = [
  { id: "rose", cls: "from-rose-500 to-pink-500" },
  { id: "amber", cls: "from-amber-500 to-orange-500" },
  { id: "emerald", cls: "from-emerald-500 to-teal-500" },
  { id: "violet", cls: "from-violet-500 to-fuchsia-500" },
  { id: "sky", cls: "from-sky-500 to-cyan-500" },
];

const STATUS_META: Record<string, { label: string; cls: string }> = {
  draft: { label: "草稿", cls: "bg-muted text-muted-foreground" },
  "in-progress": { label: "进行中", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  done: { label: "已完成", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
};

const GENRES = ["剧情", "悬疑", "动作", "科幻", "爱情", "恐怖", "喜剧", "犯罪", "动画"];

function colorCls(id: string) {
  return COLORS.find((c) => c.id === id)?.cls || COLORS[0].cls;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;
  return d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

export function WorkspaceView() {
  const { user, setView } = useAppStore();
  const [workspaces, setWorkspaces] = React.useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [duplicateId, setDuplicateId] = React.useState<string | null>(null);

  // 筛选 / 搜索 / 排序
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [sortBy, setSortBy] = React.useState<"updated" | "created" | "progress">("updated");

  const fetchList = React.useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/workspaces");
      const data = await res.json();
      setWorkspaces(data.workspaces || []);
    } catch {
      toast.error("加载工作台失败");
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    fetchList();
  }, [fetchList]);

  // 派生：统计 + 筛选后列表
  const stats = React.useMemo(() => {
    const total = workspaces.length;
    const inProgress = workspaces.filter((w) => w.status === "in-progress").length;
    const done = workspaces.filter((w) => w.status === "done").length;
    const draft = workspaces.filter((w) => w.status === "draft" || !w.status).length;
    const totalWords = workspaces.reduce(
      (s, w) =>
        s + [w.script, w.titles, w.hooks, w.storyboard, w.notes]
          .filter(Boolean)
          .reduce((a, b) => a + b!.length, 0),
      0
    );
    return { total, inProgress, done, draft, totalWords };
  }, [workspaces]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = workspaces;
    if (q) list = list.filter((w) => w.movieTitle.toLowerCase().includes(q));
    if (statusFilter !== "all") {
      list = list.filter((w) => {
        if (statusFilter === "draft") return w.status === "draft" || !w.status;
        return w.status === statusFilter;
      });
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortBy === "created") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "progress") {
        return b.progress - a.progress;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return sorted;
  }, [workspaces, search, statusFilter, sortBy]);

  // 未登录
  if (!user) {
    return (
      <div className="relative min-h-[70vh] overflow-hidden">
        <div className="absolute inset-0 bg-cinema-radial" />
        <div className="relative mx-auto flex max-w-md flex-col items-center justify-center px-4 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-blue-500 shadow-glow-primary"
          >
            <FolderKanban className="h-10 w-10 text-primary-foreground" />
          </motion.div>
          <h2 className="mb-2 text-2xl font-bold">登录后使用创作工作台</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            把每部电影的文案、标题、开头、分镜统一管理，打造你的创作中台
          </p>
          <Button
            onClick={() => setView("auth")}
            className="bg-gradient-to-r from-green-500 to-blue-500 text-white"
          >
            去登录
          </Button>
        </div>
      </div>
    );
  }

  const selected = workspaces.find((w) => w.id === selectedId);

  // 项目详情编辑器
  if (selected) {
    return (
      <WorkspaceEditor
        workspace={selected}
        onBack={() => {
          setSelectedId(null);
          fetchList();
        }}
        onUpdate={(updated) => {
          setWorkspaces((prev) =>
            prev.map((w) => (w.id === updated.id ? { ...w, ...updated, progress: calcProgress(updated) } : w))
          );
        }}
      />
    );
  }

  // 项目列表
  return (
    <div className="relative min-h-[80vh]">
      <div className="pointer-events-none absolute inset-0 bg-cinema-radial opacity-50" />
      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* 标题区 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-end justify-between"
        >
          <div>
            <div className="mb-2 flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className=text-sm font-medium text-green-600 dark:text-green-400">创作工作台</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">我的创作项目</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              把每部电影的文案、标题、开头、分镜统一管理，一站式推进创作进度
            </p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-gradient-to-r from-green-500 to-blue-500 text-white"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            新建项目
          </Button>
        </motion.div>

        {/* 统计栏 */}
        {!loading && workspaces.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            <Card className="flex items-center gap-3 p-3.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                <FolderKanban className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">项目总数</p>
                <p className="text-lg font-bold leading-tight">{stats.total}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3 p-3.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">进行中</p>
                <p className="text-lg font-bold leading-tight">{stats.inProgress}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3 p-3.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">已完成</p>
                <p className="text-lg font-bold leading-tight">{stats.done}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3 p-3.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent-foreground">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">累计字数</p>
                <p className="text-lg font-bold leading-tight">
                  {stats.totalWords >= 10000
                    ? `${(stats.totalWords / 10000).toFixed(1)}万`
                    : stats.totalWords}
                </p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* 搜索 + 筛选 + 排序 */}
        {!loading && workspaces.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索项目（电影名）…"
                className="h-9 pl-9"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
              {[
                { id: "all", label: "全部", count: stats.total },
                { id: "in-progress", label: "进行中", count: stats.inProgress },
                { id: "done", label: "已完成", count: stats.done },
                { id: "draft", label: "草稿", count: stats.draft },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setStatusFilter(opt.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all",
                    statusFilter === opt.id
                      ? "border-green-500 bg-green-500 text-white shadow-sm"
                      : "border-border/60 bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {opt.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-px text-[10px]",
                      statusFilter === opt.id
                        ? "bg-primary-foreground/20"
                        : "bg-muted"
                    )}
                  >
                    {opt.count}
                  </span>
                </button>
              ))}
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="h-9 w-[140px] shrink-0 text-xs">
                <Filter className="mr-1.5 h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">最近更新</SelectItem>
                <SelectItem value="created">创建时间</SelectItem>
                <SelectItem value="progress">完成度</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>
        )}

        {/* 项目网格 */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-44 w-full rounded-2xl" />
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20 text-center">
            <FolderKanban className="mb-4 h-12 w-12 text-muted/40" />
            <h3 className="mb-1 text-lg font-semibold">还没有创作项目</h3>
            <p className="mb-5 max-w-sm text-sm text-muted-foreground">
              新建一个项目，开始管理你的电影解说创作。每部影视作品一个项目，文案标题开头分镜集中管理。
            </p>
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-gradient-to-r from-green-500 to-blue-500 text-white"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              创建第一个项目
            </Button>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="mb-3 h-10 w-10 text-muted/40" />
            <h3 className="mb-1 text-base font-semibold">未找到匹配的项目</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              试试调整搜索关键词或筛选条件
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
            >
              清除筛选
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((ws, i) => (
              <motion.div
                key={ws.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Card
                  onClick={() => setSelectedId(ws.id)}
                  className="group relative cursor-pointer overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-primary"
                >
                  {/* 顶部色带 */}
                  <div className={cn("h-1.5 w-full bg-gradient-to-r", colorCls(ws.coverColor))} />
                  <div className="p-5">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white", colorCls(ws.coverColor))}>
                          <Film className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold leading-tight">{ws.movieTitle}</h3>
                          <p className="text-xs text-muted-foreground">{ws.genre}</p>
                        </div>
                      </div>
                      <Badge className={cn("shrink-0", (STATUS_META[ws.status] || STATUS_META.draft).cls)}>
                        {(STATUS_META[ws.status] || STATUS_META.draft).label}
                      </Badge>
                    </div>

                    {/* 进度 */}
                    <div className="mb-3">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">完成度</span>
                        <span className="font-medium">{ws.progress}%</span>
                      </div>
                      <Progress value={ws.progress} className="h-1.5" />
                    </div>

                    {/* 模块状态 */}
                    <div className="mb-3 grid grid-cols-4 gap-1.5">
                      {[
                        { icon: FileText, label: "文案", filled: !!ws.script },
                        { icon: Type, label: "标题", filled: !!ws.titles },
                        { icon: Zap, label: "开头", filled: !!ws.hooks },
                        { icon: Clapperboard, label: "分镜", filled: !!ws.storyboard },
                      ].map((m) => (
                        <div
                          key={m.label}
                          className={cn(
                            "flex flex-col items-center gap-0.5 rounded-lg border py-1.5 text-[10px]",
                            m.filled
                              ? "border-green-500/30 bg-green-500/5 text-green-600 dark:text-green-400"
                              : "border-border/60 text-muted-foreground/60"
                          )}
                        >
                          <m.icon className="h-3.5 w-3.5" />
                          {m.label}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between border-t border-border/60 pt-3">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatTime(ws.updatedAt)}
                      </span>
                      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDuplicateId(ws.id);
                          }}
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400"
                          title="复制为新项目"
                        >
                          <CopyPlus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(ws.id);
                          }}
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          title="删除项目"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* 新建项目 Dialog */}
      <CreateWorkspaceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(ws) => {
          setWorkspaces((prev) => [{ ...ws, progress: 0 }, ...prev]);
          setCreateOpen(false);
          setSelectedId(ws.id);
        }}
      />

      {/* 删除确认 */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除该项目？</AlertDialogTitle>
            <AlertDialogDescription>
              该项目的所有文案、标题、开头、分镜将被永久删除，无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteId) return;
                try {
                  const res = await fetch(`/api/workspaces/${deleteId}`, { method: "DELETE" });
                  if (!res.ok) throw new Error();
                  setWorkspaces((prev) => prev.filter((w) => w.id !== deleteId));
                  toast.success("项目已删除");
                } catch {
                  toast.error("删除失败");
                }
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 复制为新项目 Dialog */}
      <Dialog open={!!duplicateId} onOpenChange={(v) => !v && setDuplicateId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CopyPlus className="h-4 w-4 text-green-600 dark:text-green-400" />
              复制为新项目
            </DialogTitle>
            <DialogDescription>
              基于现有项目创建新项目，电影名和创作内容将被复制（状态重置为草稿）。
            </DialogDescription>
          </DialogHeader>
          {duplicateId && (
            <DuplicateForm
              sourceId={duplicateId}
              sourceTitle={workspaces.find((w) => w.id === duplicateId)?.movieTitle || ""}
              onCreated={(ws) => {
                setWorkspaces((prev) => [{ ...ws, progress: 0 }, ...prev]);
                setDuplicateId(null);
                toast.success("项目已复制");
              }}
              onCancel={() => setDuplicateId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function calcProgress(w: { script?: string | null; titles?: string | null; hooks?: string | null; storyboard?: string | null }) {
  const filled = [w.script, w.titles, w.hooks, w.storyboard].filter((x) => x && x.trim().length > 0).length;
  return Math.round((filled / 4) * 100);
}

function DuplicateForm({
  sourceId,
  sourceTitle,
  onCreated,
  onCancel,
}: {
  sourceId: string;
  sourceTitle: string;
  onCreated: (ws: WorkspaceItem) => void;
  onCancel: () => void;
}) {
  const [newTitle, setNewTitle] = React.useState(sourceTitle);
  const [copyContent, setCopyContent] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const handleDuplicate = async () => {
    if (!newTitle.trim()) {
      toast.error("请填写新电影名称");
      return;
    }
    setSaving(true);
    try {
      // 1. 先获取源项目完整内容
      const sourceRes = await fetch("/api/workspaces");
      const sourceData = (await sourceRes.json()) as { workspaces: WorkspaceItem[] };
      const source = sourceData.workspaces.find((w) => w.id === sourceId);
      if (!source) throw new Error("源项目不存在");

      // 2. 创建新项目
      const createRes = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieTitle: newTitle.trim(),
          genre: source.genre,
          coverColor: source.coverColor,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "创建失败");
      const newWs = createData.workspace as { id: string };

      // 3. 如果勾选复制内容，写入字段
      if (copyContent) {
        const patchFields: Record<string, string> = {};
        if (source.script) patchFields.script = source.script;
        if (source.titles) patchFields.titles = source.titles;
        if (source.hooks) patchFields.hooks = source.hooks;
        if (source.storyboard) patchFields.storyboard = source.storyboard;
        if (source.notes) patchFields.notes = source.notes;
        if (Object.keys(patchFields).length > 0) {
          const patchRes = await fetch(`/api/workspaces/${newWs.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: newWs.id, ...patchFields }),
          });
          if (!patchRes.ok) throw new Error("复制内容失败");
        }
      }

      onCreated({
        ...newWs,
        movieTitle: newTitle.trim(),
        genre: source.genre,
        coverColor: source.coverColor,
        status: "draft",
        script: copyContent ? source.script : null,
        titles: copyContent ? source.titles : null,
        hooks: copyContent ? source.hooks : null,
        storyboard: copyContent ? source.storyboard : null,
        notes: copyContent ? source.notes : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        progress: copyContent ? calcProgress(source) : 0,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "复制失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label>新电影名称</Label>
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="输入新电影名"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handleDuplicate()}
        />
      </div>
      <div className="flex items-center gap-2.5">
        <Switch
          checked={copyContent}
          onCheckedChange={setCopyContent}
        />
        <div>
          <p className="text-sm font-medium">复制创作内容</p>
          <p className="text-[11px] text-muted-foreground">
            {copyContent ? "文案、标题、开头、分镜、笔记将一并复制" : "仅复制类型和主题色，内容留空"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 rounded-lg bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
        <CopyPlus className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
        <span>
          源项目「{sourceTitle}」→ 新项目「{newTitle || "未命名"}」，状态重置为草稿
        </span>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          取消
        </Button>
        <Button
          onClick={handleDuplicate}
          disabled={saving || !newTitle.trim()}
          className="gap-1.5 bg-gradient-to-r from-green-500 to-blue-500 text-white"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CopyPlus className="h-4 w-4" />}
          {saving ? "复制中…" : "创建副本"}
        </Button>
      </div>
    </div>
  );
}

function CreateWorkspaceDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (ws: WorkspaceItem) => void;
}) {
  const [movieTitle, setMovieTitle] = React.useState("");
  const [genre, setGenre] = React.useState("剧情");
  const [coverColor, setCoverColor] = React.useState("rose");
  const [saving, setSaving] = React.useState(false);

  const submit = async () => {
    if (!movieTitle.trim()) {
      toast.error("请填写电影名称");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieTitle: movieTitle.trim(), genre, coverColor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "创建失败");
      onCreated({ ...data.workspace, progress: 0 });
      toast.success("项目已创建");
      setMovieTitle("");
      setGenre("剧情");
      setCoverColor("rose");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "创建失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />
            新建创作项目
          </DialogTitle>
          <DialogDescription>为一部影视作品创建项目，集中管理创作素材</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>电影 / 影视名称</Label>
            <Input
              value={movieTitle}
              onChange={(e) => setMovieTitle(e.target.value)}
              placeholder="例如：肖申克的救赎"
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
          <div className="space-y-1.5">
            <Label>类型</Label>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GENRES.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>主题色</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCoverColor(c.id)}
                  className={cn(
                    "h-8 w-8 rounded-full bg-gradient-to-br transition-all",
                    c.cls,
                    coverColor === c.id ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110" : "opacity-70 hover:opacity-100"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            取消
          </Button>
          <Button onClick={submit} disabled={saving} className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 项目编辑器：管理文案/标题/开头/分镜/笔记 */
function WorkspaceEditor({
  workspace,
  onBack,
  onUpdate,
}: {
  workspace: WorkspaceItem;
  onBack: () => void;
  onUpdate: (updated: Partial<WorkspaceItem> & { id: string }) => void;
}) {
  const { setView } = useAppStore();
  const [activeTab, setActiveTab] = React.useState<"script" | "titles" | "hooks" | "storyboard" | "notes">("script");
  const [saving, setSaving] = React.useState(false);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // 本地编辑态
  const [script, setScript] = React.useState(workspace.script || "");
  const [titles, setTitles] = React.useState(workspace.titles || "");
  const [hooks, setHooks] = React.useState(workspace.hooks || "");
  const [storyboard, setStoryboard] = React.useState(workspace.storyboard || "");
  const [notes, setNotes] = React.useState(workspace.notes || "");
  const [status, setStatus] = React.useState(workspace.status);
  // 从其他项目导入 dialog
  const [importOpen, setImportOpen] = React.useState(false);
  const [importField, setImportField] = React.useState<"script" | "titles" | "hooks" | "storyboard" | "notes">("script");

  // 防抖保存
  const save = React.useCallback(
    async (field: string, value: string) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/workspaces/${workspace.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: workspace.id, [field]: value }),
        });
        if (!res.ok) throw new Error();
        onUpdate({ id: workspace.id, [field]: value });
      } catch {
        toast.error("保存失败");
      } finally {
        setSaving(false);
      }
    },
    [workspace.id, onUpdate]
  );

  const debouncedSave = React.useCallback(
    (field: string, value: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => save(field, value), 1000);
    },
    [save]
  );

  const updateStatus = async (newStatus: string) => {
    setStatus(newStatus);
    try {
      await fetch(`/api/workspaces/${workspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: workspace.id, status: newStatus }),
      });
      onUpdate({ id: workspace.id, status: newStatus });
    } catch {
      toast.error("更新状态失败");
    }
  };

  const tabs = [
    { key: "script" as const, label: "解说文案", icon: FileText, value: script, setter: setScript },
    { key: "titles" as const, label: "爆款标题", icon: Type, value: titles, setter: setTitles },
    { key: "hooks" as const, label: "黄金开头", icon: Zap, value: hooks, setter: setHooks },
    { key: "storyboard" as const, label: "分镜表", icon: Clapperboard, value: storyboard, setter: setStoryboard },
    { key: "notes" as const, label: "创作笔记", icon: FileText, value: notes, setter: setNotes },
  ];

  const activeTab_ = tabs.find((t) => t.key === activeTab)!;

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("已复制到剪贴板");
  };

  const exportAll = () => {
    const md = [
      `# ${workspace.movieTitle} · 创作项目`,
      ``,
      `**类型**：${workspace.genre}　**状态**：${STATUS_META[status]?.label || "草稿"}`,
      ``,
      `## 解说文案`,
      script || "（暂无）",
      ``,
      `## 爆款标题`,
      titles || "（暂无）",
      ``,
      `## 黄金开头`,
      hooks || "（暂无）",
      ``,
      `## 分镜表`,
      storyboard || "（暂无）",
      ``,
      `## 创作笔记`,
      notes || "（暂无）",
    ].join("\n");
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workspace.movieTitle}-创作项目.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("已导出完整创作项目");
  };

  return (
    <div className="relative min-h-[80vh]">
      <div className="pointer-events-none absolute inset-0 bg-cinema-radial opacity-40" />
      <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* 顶部栏 */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </Button>
          <div className="flex items-center gap-2.5">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white", colorCls(workspace.coverColor))}>
              <Film className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">{workspace.movieTitle}</h1>
              <p className="text-xs text-muted-foreground">{workspace.genre} · {formatTime(workspace.updatedAt)}更新</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {saving && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                保存中
              </span>
            )}
            <Select value={status} onValueChange={updateStatus}>
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">草稿</SelectItem>
                <SelectItem value="in-progress">进行中</SelectItem>
                <SelectItem value="done">已完成</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={exportAll} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              导出
            </Button>
          </div>
        </div>

        {/* 进度条 */}
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-3">
          <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-xs text-muted-foreground">创作完成度</span>
          <Progress value={workspace.progress} className="h-2 flex-1" />
          <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{workspace.progress}%</span>
        </div>

        {/* Tab 栏 */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {tabs.map((t) => {
            const filled = t.value && t.value.trim().length > 0;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                  activeTab === t.key
                    ? "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400 shadow-sm"
                    : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {filled ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Circle className="h-3.5 w-3.5" />
                )}
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* 编辑区 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/60 bg-card/40 px-4 py-2.5">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <activeTab_.icon className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  {activeTab_.label}
                </div>
                <div className="flex items-center gap-1.5">
                  {activeTab_.value && activeTab_.value.trim() && (
                    <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => copyText(activeTab_.value)}>
                      <Copy className="h-3 w-3" />
                      复制
                    </Button>
                  )}
                  {activeTab !== "notes" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 px-2 text-xs"
                      onClick={() => setView(activeTab === "script" ? "script-generator" : "tools")}
                    >
                      <Sparkles className="h-3 w-3 text-green-600 dark:text-green-400" />
                      用AI生成
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => {
                      setImportField(activeTab);
                      setImportOpen(true);
                    }}
                  >
                    <ArrowLeftRight className="h-3 w-3 text-accent" />
                    从其他项目导入
                  </Button>
                </div>
              </div>
              <Textarea
                value={activeTab_.value}
                onChange={(e) => {
                  activeTab_.setter(e.target.value);
                  debouncedSave(activeTab_.key, e.target.value);
                }}
                placeholder={
                  activeTab === "script"
                    ? "在此粘贴或编辑完整解说文案，或点击右上角「用AI生成」…"
                    : activeTab === "titles"
                    ? "每行一个标题，或点击「用AI生成」批量产出…"
                    : activeTab === "hooks"
                    ? "每行一个黄金开头，或点击「用AI生成」…"
                    : activeTab === "storyboard"
                    ? "粘贴分镜表（镜号|章节|画面类型|旁白|时长）…"
                    : "记录你的创作思路、灵感、待办…"
                }
                className="min-h-[400px] resize-none rounded-none border-0 font-mono text-sm leading-relaxed focus-visible:ring-0"
              />
            </Card>
            <p className="mt-2 text-center text-[11px] text-muted-foreground/70">
              <Save className="mr-1 inline h-3 w-3" />
              自动保存（输入停顿1秒后）
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 从其他项目导入 Dialog */}
      <ImportFromProjectDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        currentWorkspaceId={workspace.id}
        field={importField}
        onImport={async (sourceWs, field) => {
          const value = (sourceWs[field] as string) || "";
          if (!value.trim()) {
            toast.error("源项目该字段为空");
            return;
          }
          // 写入本地 + 后端
          const setter = field === "script" ? setScript : field === "titles" ? setTitles : field === "hooks" ? setHooks : field === "storyboard" ? setStoryboard : setNotes;
          setter(value);
          await save(field, value);
          toast.success(`已从「${sourceWs.movieTitle}」导入${FIELD_LABEL[field]}`, {
            description: `${value.length} 字`,
          });
          setImportOpen(false);
        }}
      />
    </div>
  );
}

const FIELD_LABEL: Record<string, string> = {
  script: "解说文案",
  titles: "爆款标题",
  hooks: "黄金开头",
  storyboard: "分镜表",
  notes: "创作笔记",
};

/** 从其他项目导入 Dialog */
function ImportFromProjectDialog({
  open,
  onOpenChange,
  currentWorkspaceId,
  field,
  onImport,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentWorkspaceId: string;
  field: "script" | "titles" | "hooks" | "storyboard" | "notes";
  onImport: (source: WorkspaceItem & { [k: string]: string | null }, field: typeof field) => Promise<void>;
}) {
  const [workspaces, setWorkspaces] = React.useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [importing, setImporting] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/workspaces")
      .then((r) => r.json())
      .then((d) => setWorkspaces((d.workspaces || []).filter((w: WorkspaceItem) => w.id !== currentWorkspaceId)))
      .catch(() => toast.error("获取项目列表失败"))
      .finally(() => setLoading(false));
  }, [open, currentWorkspaceId]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter((w) => w.movieTitle.toLowerCase().includes(q));
  }, [workspaces, search]);

  const handleImport = async (ws: WorkspaceItem) => {
    setImporting(ws.id);
    try {
      await onImport(ws as WorkspaceItem & { [k: string]: string | null }, field);
    } finally {
      setImporting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-accent" />
            从其他项目导入{FIELD_LABEL[field]}
          </DialogTitle>
          <DialogDescription>
            选择另一个项目，将其{FIELD_LABEL[field]}内容导入到当前项目（会覆盖现有内容）
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索项目（电影名）…"
            className="h-9 pl-9"
          />
        </div>

        <div className="max-h-[420px] min-h-[200px] space-y-2 overflow-y-auto scrollbar-thin pr-1">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/40" />
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <ArrowLeftRight className="mb-2 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {search ? "未找到匹配的项目" : "没有其他项目可导入"}
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {filtered.map((ws) => {
                const fieldValue = (ws[field] as string) || "";
                const hasField = fieldValue.trim().length > 0;
                const coverColor = COLORS.find((c) => c.id === ws.coverColor) || COLORS[0];
                return (
                  <motion.div
                    key={ws.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                  >
                    <Card
                      className={cn(
                        "group relative cursor-pointer overflow-hidden p-3 transition-all hover:border-accent/40",
                        !hasField && "opacity-60"
                      )}
                      onClick={() => hasField && importing !== ws.id && handleImport(ws)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white", coverColor.cls)}>
                          <Film className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold">{ws.movieTitle}</p>
                            <Badge variant="outline" className="shrink-0 text-[10px]">{ws.genre}</Badge>
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {FIELD_LABEL[field]}：
                            {hasField ? (
                              <span className="text-emerald-600 dark:text-emerald-400">{fieldValue.length} 字</span>
                            ) : (
                              <span>空</span>
                            )}
                          </p>
                          {hasField && (
                            <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
                              {fieldValue.slice(0, 60)}…
                            </p>
                          )}
                        </div>
                        <div className="shrink-0">
                          {importing === ws.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-accent" />
                          ) : hasField ? (
                            <span className="flex items-center gap-1 text-[11px] text-accent">
                              导入
                              <ArrowLeftRight className="h-3 w-3" />
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">无可导入内容</span>
                          )}
                        </div>
                      </div>
                      {hasField && (
                        <div className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-[10px] text-amber-700 dark:text-amber-300">
                          <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
                          <span>导入将覆盖当前项目的{FIELD_LABEL[field]}（{(fieldValue).length} 字）</span>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
