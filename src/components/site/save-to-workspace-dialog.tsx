"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  FolderKanban,
  Plus,
  Loader2,
  Search,
  CheckCircle2,
  Film,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/** 工作台允许写入的字段 */
export type WorkspaceField = "script" | "titles" | "hooks" | "storyboard" | "notes";

const FIELD_LABEL: Record<WorkspaceField, string> = {
  script: "解说文案",
  titles: "爆款标题",
  hooks: "黄金开头",
  storyboard: "分镜表",
  notes: "创作笔记",
};

const FIELD_ICON: Record<WorkspaceField, string> = {
  script: "📝",
  titles: "🏷️",
  hooks: "⚡",
  storyboard: "🎬",
  notes: "🗒️",
};

const GENRES = [
  "剧情",
  "悬疑",
  "科幻",
  "爱情",
  "动作",
  "恐怖",
  "喜剧",
  "犯罪",
  "动画",
  "纪录片",
];

const COVER_COLORS = [
  { id: "rose", label: "玫瑰", className: "from-rose-500 to-pink-500" },
  { id: "amber", label: "琥珀", className: "from-amber-500 to-orange-500" },
  { id: "emerald", label: "翡翠", className: "from-emerald-500 to-teal-500" },
  { id: "violet", label: "紫罗兰", className: "from-violet-500 to-fuchsia-500" },
  { id: "sky", label: "青空", className: "from-cyan-500 to-blue-500" },
] as const;

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
  progress: number;
  updatedAt: string;
}

interface SaveToWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 要写入的字段名 */
  field: WorkspaceField;
  /** 要写入的内容 */
  value: string;
  /** 默认电影名（用于新建项目时预填） */
  defaultMovieTitle?: string;
  /** 默认类型 */
  defaultGenre?: string;
  /** 保存成功后回调（如跳转到工作台） */
  onSaved?: (workspaceId: string) => void;
}

export function SaveToWorkspaceDialog({
  open,
  onOpenChange,
  field,
  value,
  defaultMovieTitle = "",
  defaultGenre = "悬疑",
  onSaved,
}: SaveToWorkspaceDialogProps) {
  const [workspaces, setWorkspaces] = React.useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);

  // 新建项目表单
  const [newTitle, setNewTitle] = React.useState(defaultMovieTitle);
  const [newGenre, setNewGenre] = React.useState(defaultGenre);
  const [newColor, setNewColor] = React.useState<string>("rose");
  const [creating, setCreating] = React.useState(false);

  // 同步默认值
  React.useEffect(() => {
    if (open) {
      setNewTitle(defaultMovieTitle);
      setNewGenre(defaultGenre);
      setShowCreate(false);
      setSearch("");
      void fetchWorkspaces();
    }
  }, [open, defaultMovieTitle, defaultGenre]);

  const fetchWorkspaces = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workspaces");
      if (!res.ok) throw new Error("获取失败");
      const data = (await res.json()) as { workspaces: WorkspaceItem[] };
      setWorkspaces(data.workspaces);
    } catch {
      toast.error("获取工作台项目失败");
    } finally {
      setLoading(false);
    }
  };

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter((w) => w.movieTitle.toLowerCase().includes(q));
  }, [workspaces, search]);

  const handleSave = async (ws: WorkspaceItem) => {
    if (!value.trim()) {
      toast.error("没有内容可保存");
      return;
    }
    setSavingId(ws.id);
    try {
      const res = await fetch(`/api/workspaces/${ws.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ws.id, [field]: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      toast.success(`已存入「${ws.movieTitle}」的${FIELD_LABEL[field]}`, {
        description: "可在创作工作台继续推进",
        action: onSaved
          ? {
              label: "前往",
              onClick: () => {
                onSaved(ws.id);
                onOpenChange(false);
              },
            }
          : undefined,
      });
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSavingId(null);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast.error("请填写电影名称");
      return;
    }
    setCreating(true);
    try {
      // 1. 创建项目
      const createRes = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieTitle: newTitle.trim(),
          genre: newGenre,
          coverColor: newColor,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "创建失败");
      const newWs = createData.workspace as { id: string };
      // 2. 写入字段
      const patchRes = await fetch(`/api/workspaces/${newWs.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: newWs.id, [field]: value }),
      });
      if (!patchRes.ok) throw new Error("写入失败");
      toast.success(`已创建「${newTitle.trim()}」并存入${FIELD_LABEL[field]}`, {
        description: "可在创作工作台继续推进",
        action: onSaved
          ? {
              label: "前往",
              onClick: () => {
                onSaved(newWs.id);
                onOpenChange(false);
              },
            }
          : undefined,
      });
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "创建失败");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground">
              <FolderKanban className="h-4 w-4" />
            </span>
            存入创作工作台
          </DialogTitle>
          <DialogDescription>
            将本次生成的{FIELD_LABEL[field]}保存到工作台项目，统一管理每部电影的创作进度。
            {value.length > 0 && (
              <span className="ml-1 text-primary">· 共 {value.length} 字</span>
            )}
          </DialogDescription>
        </DialogHeader>

        {!showCreate ? (
          <div className="space-y-3">
            {/* 搜索 + 新建 */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索现有项目（电影名）"
                  className="h-9 pl-9"
                />
              </div>
              <Button
                size="sm"
                onClick={() => setShowCreate(true)}
                className="h-9 gap-1.5"
              >
                <Plus className="h-4 w-4" />
                新建项目
              </Button>
            </div>

            {/* 项目列表 */}
            <div className="max-h-[420px] min-h-[200px] space-y-2 overflow-y-auto scrollbar-thin pr-1">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
                    <FolderKanban className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">
                    {search ? "未找到匹配的项目" : "还没有工作台项目"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {search
                      ? "试试其他关键词，或点击右上角新建"
                      : "点击右上角「新建项目」开始你的第一部电影"}
                  </p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {filtered.map((ws) => {
                    const hasSameField =
                      ws[field] && ws[field]!.trim().length > 0;
                    const coverColor =
                      COVER_COLORS.find((c) => c.id === ws.coverColor) ||
                      COVER_COLORS[0];
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
                            "group relative cursor-pointer overflow-hidden p-3 transition-all hover:border-primary/40 hover:shadow-glow-primary",
                            savingId === ws.id && "border-primary/60 ring-1 ring-primary/30"
                          )}
                          onClick={() =>
                            savingId !== ws.id && handleSave(ws)
                          }
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white",
                                coverColor.className
                              )}
                            >
                              <Film className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-semibold">
                                  {ws.movieTitle}
                                </p>
                                <Badge
                                  variant="outline"
                                  className="shrink-0 text-[10px]"
                                >
                                  {ws.genre}
                                </Badge>
                                {ws.status === "进行中" && (
                                  <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/15 dark:text-amber-400 text-[10px]">
                                    进行中
                                  </Badge>
                                )}
                                {ws.status === "已完成" && (
                                  <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400 text-[10px]">
                                    已完成
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                                <span>完成度 {ws.progress}%</span>
                                <span>·</span>
                                <span>
                                  {[ws.script && "文案", ws.titles && "标题", ws.hooks && "开头", ws.storyboard && "分镜"]
                                    .filter(Boolean)
                                    .join(" / ") || "暂无内容"}
                                </span>
                              </div>
                            </div>
                            <div className="shrink-0">
                              {savingId === ws.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              ) : hasSameField ? (
                                <div className="flex flex-col items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span className="text-[9px]">覆盖</span>
                                </div>
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                              )}
                            </div>
                          </div>
                          {hasSameField && (
                            <div className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-[10px] text-amber-700 dark:text-amber-300">
                              <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
                              <span>
                                该项目已存在{FIELD_LABEL[field]}，保存将覆盖原内容（{(ws[field] || "").length} 字 → {value.length} 字）
                              </span>
                            </div>
                          )}
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>
        ) : (
          /* 新建项目表单 */
          <div className="space-y-4 py-1">
            <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-xs">
              <span className="text-base">{FIELD_ICON[field]}</span>
              <span>
                新建后自动存入 <strong className="text-primary">{FIELD_LABEL[field]}</strong>
              </span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-movie-title">电影名称 *</Label>
              <Input
                id="new-movie-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="例如：盗梦空间"
                className="h-10"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>类型</Label>
                <Select value={newGenre} onValueChange={setNewGenre}>
                  <SelectTrigger className="h-10">
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
              <div className="space-y-2">
                <Label>主题色</Label>
                <div className="flex flex-wrap gap-1.5">
                  {COVER_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNewColor(c.id)}
                      className={cn(
                        "h-9 w-9 rounded-lg bg-gradient-to-br transition-all",
                        c.className,
                        newColor === c.id
                          ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-105"
                          : "opacity-70 hover:opacity-100"
                      )}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {!showCreate ? (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              取消
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => setShowCreate(false)}
                disabled={creating}
              >
                返回列表
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating || !newTitle.trim()}
                className="gap-1.5 bg-gradient-to-r from-primary to-accent text-primary-foreground"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {creating ? "创建中…" : "创建并存入"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 一键「存入工作台」按钮：自带 dialog 状态管理，可在任意工具/视图嵌入。
 * 点击后弹出选择项目 dialog，未登录会提示登录。
 */
interface SaveToWorkspaceButtonProps {
  field: WorkspaceField;
  value: string;
  defaultMovieTitle?: string;
  defaultGenre?: string;
  /** 按钮文案，默认「存入工作台」 */
  label?: string;
  /** 按钮尺寸 */
  size?: "sm" | "default";
  /** 按钮变体 */
  variant?: "ghost" | "outline" | "secondary";
  /** 自定义 className */
  className?: string;
  /** 是否显示图标，默认 true */
  showIcon?: boolean;
  /** 保存成功后回调 */
  onSaved?: () => void;
}

export function SaveToWorkspaceButton({
  field,
  value,
  defaultMovieTitle = "",
  defaultGenre = "悬疑",
  label = "存入工作台",
  size = "sm",
  variant = "ghost",
  className,
  showIcon = true,
  onSaved,
}: SaveToWorkspaceButtonProps) {
  const [open, setOpen] = React.useState(false);
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);

  const handleClick = () => {
    if (!user) {
      toast.info("请先登录后再存入工作台", {
        description: "登录后可统一管理每部电影的创作进度",
        action: { label: "去登录", onClick: () => setView("auth") },
      });
      return;
    }
    if (!value.trim()) {
      toast.error("没有内容可保存");
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <Button
        size={size}
        variant={variant}
        onClick={handleClick}
        className={cn(
          "gap-1.5 text-primary hover:bg-primary/10 hover:text-primary",
          className
        )}
        title="存入创作工作台，统一管理每部电影的创作进度"
      >
        {showIcon && <FolderKanban className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />}
        <span>{label}</span>
      </Button>
      <SaveToWorkspaceDialog
        open={open}
        onOpenChange={setOpen}
        field={field}
        value={value}
        defaultMovieTitle={defaultMovieTitle}
        defaultGenre={defaultGenre}
        onSaved={() => {
          onSaved?.();
          setView("workspace");
        }}
      />
    </>
  );
}
