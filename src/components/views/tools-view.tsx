"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Type,
  Zap,
  Wand2,
  Mic,
  Sparkles,
  Copy,
  Check,
  Download,
  Loader2,
  ArrowRight,
  ListOrdered,
  Volume2,
  Wand,
  Clapperboard,
  Bot,
  Search,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Agent 协作 hook：管理「联网搜索真实剧情」开关 + 搜索状态
 * 返回 plotContext（搜索结果）供生成时传入，以及搜索 UI 状态
 */
function useAgentPlot() {
  const [enabled, setEnabled] = React.useState(false);
  const [searching, setSearching] = React.useState(false);
  const [plotContext, setPlotContext] = React.useState<string | null>(null);
  const [sourceCount, setSourceCount] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const reset = () => {
    setPlotContext(null);
    setSourceCount(0);
    setError(null);
  };

  const search = async (movieTitle: string, genre?: string): Promise<string | null> => {
    if (!movieTitle.trim()) {
      toast.error("请先填写电影名称");
      return null;
    }
    setSearching(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieTitle: movieTitle.trim(), genre }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "搜索失败");
      const ctx = data.combined || data.snippets || "";
      setPlotContext(ctx);
      setSourceCount(data.sources?.length || 0);
      toast.success(`Agent 已联网搜索到 ${data.sources?.length || 0} 个真实剧情来源`, {
        description: "生成时将基于真实剧情，不瞎编",
      });
      return ctx;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "联网搜索失败";
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setSearching(false);
    }
  };

  return { enabled, setEnabled, searching, plotContext, sourceCount, error, search, reset };
}

/** Agent 协作开关组件（标题/开头工具共用） */
function AgentToggle({
  agent,
  movieTitle,
  genre,
}: {
  agent: ReturnType<typeof useAgentPlot>;
  movieTitle: string;
  genre?: string;
}) {
  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-accent/[0.04] p-3">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
          <Bot className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold">Agent 联网搜索真实剧情</p>
          <p className="text-[10px] text-muted-foreground">
            开启后生成前先联网搜索真实剧情，标题/开头基于真实情节不瞎编
          </p>
        </div>
        <Switch
          checked={agent.enabled}
          onCheckedChange={(v) => {
            agent.setEnabled(v);
            if (!v) agent.reset();
          }}
        />
      </div>
      {agent.enabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="overflow-hidden"
        >
          <div className="mt-2.5 flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => agent.search(movieTitle, genre)}
              disabled={agent.searching || !movieTitle.trim()}
              className="h-7 gap-1.5 rounded-full text-xs"
            >
              {agent.searching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              {agent.searching ? "搜索中…" : agent.plotContext ? "重新搜索" : "搜索真实剧情"}
            </Button>
            {agent.plotContext && (
              <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                {agent.sourceCount} 个来源 · {(agent.plotContext.length / 1000).toFixed(1)}k 字
              </Badge>
            )}
            {agent.error && (
              <span className="flex items-center gap-1 text-[11px] text-destructive">
                <AlertCircle className="h-3 w-3" />
                {agent.error}
              </span>
            )}
          </div>
          {agent.plotContext && (
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
              ✓ 生成时将基于以上真实剧情，标题/开头涉及情节忠于事实
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}

// Mirrored from src/lib/ai.ts (which is server-only) so this client view can
// render the voice picker without pulling the Node-only SDK into the bundle.
const TTS_VOICES = [
  { id: "tongtong", name: "彤彤", desc: "温暖亲切", emoji: "🌸" },
  { id: "chuichui", name: "吹吹", desc: "活泼可爱", emoji: "✨" },
  { id: "xiaochen", name: "小辰", desc: "沉稳专业", emoji: "🎙️" },
  { id: "jam", name: "Jam", desc: "英音绅士", emoji: "🎩" },
  { id: "kazi", name: "卡子", desc: "清晰标准", emoji: "📻" },
  { id: "douji", name: "豆叽", desc: "自然流畅", emoji: "🍃" },
  { id: "luodo", name: "罗多", desc: "富有感染力", emoji: "🔥" },
] as const;

const GENRES = [
  "剧情",
  "悬疑",
  "动作",
  "科幻",
  "爱情",
  "喜剧",
  "恐怖",
  "犯罪",
  "奇幻",
  "动画",
  "战争",
  "惊悚",
  "历史",
  "纪录片",
];

const HOOK_TYPES = [
  "悬念提问",
  "反差冲击",
  "情感代入",
  "数据震撼",
  "故事引入",
];

const POLISH_GOALS = [
  "爆款化",
  "口语化",
  "提速",
  "情感强化",
  "反转加强",
];

const TOOLS = [
  {
    id: "title",
    name: "爆款标题生成器",
    short: "爆款标题",
    desc: "六大爆款公式批量产出悬念/反差/数字型标题",
    icon: Type,
    color: "from-amber-500 to-orange-500",
  },
  {
    id: "hook",
    name: "黄金3秒开头生成器",
    short: "黄金开头",
    desc: "5 种钩子类型，一句话把观众钉在屏幕上",
    icon: Zap,
    color: "from-fuchsia-500 to-rose-500",
  },
  {
    id: "polish",
    name: "文案润色神器",
    short: "文案润色",
    desc: "增强转折词、画面感、情绪张力，让文案有人味",
    icon: Wand2,
    color: "from-emerald-500 to-teal-500",
  },
  {
    id: "tts",
    name: "语音试听",
    short: "语音试听",
    desc: "7 种声线即时合成，挑出最适合你账号的音色",
    icon: Mic,
    color: "from-rose-500 to-pink-500",
  },
] as const;

export function ToolsView() {
  const selectedTool = useAppStore((s) => s.selectedTool);
  const selectTool = useAppStore((s) => s.selectTool);
  const [activeTab, setActiveTab] = React.useState<string>(
    selectedTool && TOOLS.some((t) => t.id === selectedTool)
      ? selectedTool
      : "title"
  );

  React.useEffect(() => {
    if (selectedTool && TOOLS.some((t) => t.id === selectedTool)) {
      setActiveTab(selectedTool);
    }
  }, [selectedTool]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    selectTool(value);
  };

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 bg-cinema-radial" />
      <div className="pointer-events-none absolute inset-0 bg-grid-faint opacity-30" />

      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <Badge
            variant="outline"
            className="mb-4 gap-1.5 border-primary/30 bg-primary/10 px-3 py-1 text-primary"
          >
            <Wand className="h-3.5 w-3.5" />
            自研辅助创作工具链
          </Badge>
          <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            创作<span className="text-gradient-primary">工具箱</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            自研辅助创作工具，让爆款创作更高效
          </p>
        </motion.div>

        {/* Entry cards grid */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((tool, i) => {
            const isActive = activeTab === tool.id;
            return (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
              >
                <Card
                  role="button"
                  tabIndex={0}
                  onClick={() => handleTabChange(tool.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleTabChange(tool.id);
                    }
                  }}
                  className={cn(
                    "group h-full cursor-pointer p-5 outline-none transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-primary focus-visible:ring-2 focus-visible:ring-ring",
                    isActive &&
                      "ring-2 ring-primary shadow-glow-primary"
                  )}
                >
                  <div
                    className={cn(
                      "mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg",
                      tool.color
                    )}
                  >
                    <tool.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold">{tool.name}</h3>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {tool.desc}
                  </p>
                  <div
                    className={cn(
                      "mt-3 flex items-center text-xs font-medium transition-opacity",
                      isActive
                        ? "text-primary opacity-100"
                        : "text-muted-foreground opacity-0 group-hover:opacity-100"
                    )}
                  >
                    {isActive ? "正在使用" : "立即使用"}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="mt-8"
        >
          <TabsList className="scrollbar-thin h-auto w-full max-w-full overflow-x-auto rounded-xl p-1">
            {TOOLS.map((tool) => (
              <TabsTrigger
                key={tool.id}
                value={tool.id}
                className="gap-1.5 rounded-lg px-3 py-1.5"
              >
                <tool.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tool.name}</span>
                <span className="sm:hidden">{tool.short}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* forceMount keeps each tool mounted so state persists across tab switches */}
          <TabsContent
            value="title"
            forceMount
            className="hidden data-[state=active]:block outline-none"
          >
            <TitleTool />
          </TabsContent>
          <TabsContent
            value="hook"
            forceMount
            className="hidden data-[state=active]:block outline-none"
          >
            <HookTool />
          </TabsContent>
          <TabsContent
            value="polish"
            forceMount
            className="hidden data-[state=active]:block outline-none"
          >
            <PolishTool />
          </TabsContent>
          <TabsContent
            value="tts"
            forceMount
            className="hidden data-[state=active]:block outline-none"
          >
            <TtsTool />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

function parseNumberedItems(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d+\s*[.、)]\s*/, "").trim())
    .filter((line) => line.length > 0);
}

function CopyButton({
  text,
  label = "复制",
  size = "sm",
}: {
  text: string;
  label?: string;
  size?: "sm" | "default";
}) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("已复制到剪贴板");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("复制失败，请手动选择文本");
    }
  };
  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleCopy}
      className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "已复制" : label}
    </Button>
  );
}

function ToolShell({
  form,
  result,
}: {
  form: React.ReactNode;
  result: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mt-4 grid gap-6 lg:grid-cols-5"
    >
      <div className="lg:col-span-2 lg:sticky lg:top-20 lg:self-start">
        {form}
      </div>
      <div className="lg:col-span-3">{result}</div>
    </motion.div>
  );
}

function ResultPlaceholder({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <Card className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 border-dashed p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      </div>
    </Card>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        {hint && (
          <span className="text-xs text-muted-foreground">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function GeneratingSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card className="space-y-3 p-5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-6 w-6 shrink-0 rounded-md" />
          <Skeleton
            className="h-4 flex-1"
            style={{ width: `${70 + ((i * 13) % 25)}%` }}
          />
        </div>
      ))}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 1. 爆款标题生成器                                                    */
/* ------------------------------------------------------------------ */

function TitleTool() {
  const [movieTitle, setMovieTitle] = React.useState("");
  const [genre, setGenre] = React.useState("悬疑");
  const [count, setCount] = React.useState(8);
  const [loading, setLoading] = React.useState(false);
  const [output, setOutput] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<string[]>([]);
  const agent = useAgentPlot();

  const run = async () => {
    if (!movieTitle.trim()) {
      toast.error("请填写电影名称");
      return;
    }
    // 若开启 Agent 但还没搜索，先搜索
    let plotContext: string | undefined;
    if (agent.enabled) {
      if (!agent.plotContext) {
        const ctx = await agent.search(movieTitle, genre);
        if (!ctx) return;
        plotContext = ctx;
      } else {
        plotContext = agent.plotContext;
      }
    }
    setLoading(true);
    setOutput(null);
    setItems([]);
    try {
      const res = await fetch("/api/ai/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieTitle: movieTitle.trim(),
          genre,
          count,
          plotContext,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      setOutput(data.output);
      setItems(parseNumberedItems(data.output));
      toast.success(
        `已生成 ${count} 个爆款标题` + (plotContext ? "（基于真实剧情）" : "")
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "生成失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell
      form={
        <Card className="space-y-5 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
              <Type className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">爆款标题生成器</h2>
              <p className="text-xs text-muted-foreground">
                六大公式批量产出钩子标题
              </p>
            </div>
          </div>

          <Field label="电影名称">
            <Input
              value={movieTitle}
              onChange={(e) => setMovieTitle(e.target.value)}
              placeholder="例如：盗梦空间"
            />
          </Field>

          <Field label="电影类型">
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
          </Field>

          <Field label="生成数量" hint={`${count} 个`}>
            <Slider
              value={[count]}
              min={3}
              max={12}
              step={1}
              onValueChange={(v) => setCount(v[0])}
            />
          </Field>

          <AgentToggle agent={agent} movieTitle={movieTitle} genre={genre} />

          <Button
            onClick={run}
            disabled={loading || agent.searching}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90"
          >
            {loading || agent.searching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {agent.searching ? "Agent 搜索剧情中…" : "生成中…"}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {agent.enabled ? "生成爆款标题（基于真实剧情）" : "生成爆款标题"}
              </>
            )}
          </Button>
        </Card>
      }
      result={
        loading ? (
          <GeneratingSkeleton rows={count} />
        ) : output ? (
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ListOrdered className="h-4 w-4 text-primary" />
                生成结果
                <Badge variant="secondary" className="text-xs">
                  {items.length} 条
                </Badge>
              </div>
              <CopyButton text={output} label="整体复制" />
            </div>
            <div className="max-h-[640px] overflow-y-auto scrollbar-thin p-3">
              <ul className="space-y-2">
                {items.map((item, i) => (
                  <li
                    key={i}
                    className="group flex items-start gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/15 text-[11px] font-semibold text-primary">
                      {i + 1}
                    </span>
                    <p className="flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {item}
                    </p>
                    <CopyButton text={item} />
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ) : (
          <ResultPlaceholder
            icon={Type}
            title="还没有生成标题"
            desc="填写电影名称，选择类型与数量后点击生成"
          />
        )
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* 2. 黄金3秒开头生成器                                                 */
/* ------------------------------------------------------------------ */

function HookTool() {
  const [movieTitle, setMovieTitle] = React.useState("");
  const [genre, setGenre] = React.useState("悬疑");
  const [hookType, setHookType] = React.useState("悬念提问");
  const [count, setCount] = React.useState(5);
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<string[]>([]);
  const agent = useAgentPlot();

  const run = async () => {
    if (!movieTitle.trim()) {
      toast.error("请填写电影名称");
      return;
    }
    let plotContext: string | undefined;
    if (agent.enabled) {
      if (!agent.plotContext) {
        const ctx = await agent.search(movieTitle, genre);
        if (!ctx) return;
        plotContext = ctx;
      } else {
        plotContext = agent.plotContext;
      }
    }
    setLoading(true);
    setItems([]);
    try {
      const res = await fetch("/api/ai/hook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieTitle: movieTitle.trim(),
          genre,
          hookType,
          count,
          plotContext,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      setItems(parseNumberedItems(data.output));
      toast.success(
        `已生成 ${count} 个黄金开头` + (plotContext ? "（基于真实剧情）" : "")
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "生成失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell
      form={
        <Card className="space-y-5 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-rose-500">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">黄金3秒开头生成器</h2>
              <p className="text-xs text-muted-foreground">
                前3秒决定一条视频的生死
              </p>
            </div>
          </div>

          <Field label="电影名称">
            <Input
              value={movieTitle}
              onChange={(e) => setMovieTitle(e.target.value)}
              placeholder="例如：肖申克的救赎"
            />
          </Field>

          <Field label="电影类型">
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
          </Field>

          <Field label="钩子类型">
            <Select value={hookType} onValueChange={setHookType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOOK_TYPES.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="生成数量" hint={`${count} 个`}>
            <Slider
              value={[count]}
              min={3}
              max={10}
              step={1}
              onValueChange={(v) => setCount(v[0])}
            />
          </Field>

          <AgentToggle agent={agent} movieTitle={movieTitle} genre={genre} />

          <Button
            onClick={run}
            disabled={loading || agent.searching}
            className="w-full bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white hover:opacity-90"
          >
            {loading || agent.searching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {agent.searching ? "Agent 搜索剧情中…" : "生成中…"}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {agent.enabled ? "生成黄金开头（基于真实剧情）" : "生成黄金开头"}
              </>
            )}
          </Button>
        </Card>
      }
      result={
        loading ? (
          <GeneratingSkeleton rows={count} />
        ) : items.length > 0 ? (
          <div className="max-h-[720px] space-y-3 overflow-y-auto scrollbar-thin pr-1">
            {items.map((item, i) => (
              <Card
                key={i}
                className="group flex items-start gap-3 p-4 transition-all hover:shadow-glow-primary"
              >
                <Badge className="mt-0.5 h-7 min-w-7 shrink-0 justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-rose-500 px-2 text-xs text-white">
                  {i + 1}
                </Badge>
                <p className="flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {item}
                </p>
                <CopyButton text={item} />
              </Card>
            ))}
          </div>
        ) : (
          <ResultPlaceholder
            icon={Zap}
            title="还没有生成开头"
            desc="填写电影信息并选择钩子类型后点击生成"
          />
        )
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* 3. 文案润色神器                                                     */
/* ------------------------------------------------------------------ */

function PolishTool() {
  const [movieTitle, setMovieTitle] = React.useState("");
  const [goal, setGoal] = React.useState("爆款化");
  const [content, setContent] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [output, setOutput] = React.useState<string | null>(null);

  const run = async () => {
    if (!content.trim()) {
      toast.error("请输入需要润色的文案");
      return;
    }
    setLoading(true);
    setOutput(null);
    try {
      const res = await fetch("/api/ai/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieTitle: movieTitle.trim() || undefined,
          content: content.trim(),
          goal,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "润色失败");
      setOutput(data.output);
      toast.success("润色完成");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "润色失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell
      form={
        <Card className="space-y-5 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
              <Wand2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">文案润色神器</h2>
              <p className="text-xs text-muted-foreground">
                把平淡文案改造成爆款
              </p>
            </div>
          </div>

          <Field label="电影名称" hint="可选">
            <Input
              value={movieTitle}
              onChange={(e) => setMovieTitle(e.target.value)}
              placeholder="可选，便于 AI 理解语境"
            />
          </Field>

          <Field label="润色目标">
            <Select value={goal} onValueChange={setGoal}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POLISH_GOALS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="待润色文案">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="粘贴你的解说文案，AI 会保留剧情信息并全面提升表现力…"
              className="min-h-[180px] resize-y"
            />
          </Field>

          <Button
            onClick={run}
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                润色中…
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                开始润色
              </>
            )}
          </Button>
        </Card>
      }
      result={
        loading ? (
          <Card className="space-y-3 p-5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </Card>
        ) : output ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="flex h-full flex-col p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <Clapperboard className="h-4 w-4" />
                  原文案
                </span>
                <Badge variant="secondary" className="text-xs">
                  {content.trim().length} 字
                </Badge>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin whitespace-pre-wrap break-words rounded-lg bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground">
                {content}
              </div>
            </Card>
            <Card className="flex h-full flex-col border-primary/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
                  <Sparkles className="h-4 w-4" />
                  润色后
                </span>
                <CopyButton text={output} label="复制润色稿" />
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin whitespace-pre-wrap break-words rounded-lg bg-primary/5 p-3 text-sm leading-relaxed">
                {output}
              </div>
            </Card>
          </div>
        ) : (
          <ResultPlaceholder
            icon={Wand2}
            title="还没有润色结果"
            desc="粘贴文案并选择润色目标，左右对比查看效果"
          />
        )
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* 4. 语音试听                                                         */
/* ------------------------------------------------------------------ */

function TtsTool() {
  const [text, setText] = React.useState("");
  const [voice, setVoice] = React.useState<string>(TTS_VOICES[0].id);
  const [speed, setSpeed] = React.useState(1.0);
  const [loading, setLoading] = React.useState(false);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);

  // Revoke object URL when it changes or on unmount
  React.useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const run = async () => {
    if (!text.trim()) {
      toast.error("请输入要试听的文案");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), voice, speed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "语音合成失败");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      toast.success("语音合成完成");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "语音合成失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell
      form={
        <Card className="space-y-5 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-500">
              <Mic className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">语音试听</h2>
              <p className="text-xs text-muted-foreground">
                挑出最适合你账号的声线
              </p>
            </div>
          </div>

          <Field label="待试听文案" hint="最多 1000 字">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 1000))}
              placeholder="粘贴一段解说文案，听听 AI 配音的效果…"
              className="min-h-[140px] resize-y"
            />
          </Field>

          <Field label="音色选择">
            <div className="grid grid-cols-2 gap-2">
              {TTS_VOICES.map((v) => {
                const isActive = voice === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVoice(v.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all",
                      isActive
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50"
                    )}
                  >
                    <span className="text-xl">{v.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">
                        {v.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {v.desc}
                      </span>
                    </span>
                    {isActive && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="语速" hint={`${speed.toFixed(1)}x`}>
            <Slider
              value={[speed]}
              min={0.5}
              max={2.0}
              step={0.1}
              onValueChange={(v) => setSpeed(v[0])}
            />
          </Field>

          <Button
            onClick={run}
            disabled={loading}
            className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:opacity-90"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                合成中…
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4" />
                立即试听
              </>
            )}
          </Button>
        </Card>
      }
      result={
        loading ? (
          <Card className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4 p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium">正在合成语音…</p>
              <p className="mt-1 text-sm text-muted-foreground">
                AI 正在为你生成电影级声线，请稍候
              </p>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-2 w-2 animate-bounce rounded-full bg-primary"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </Card>
        ) : audioUrl ? (
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Volume2 className="h-4 w-4 text-primary" />
                试听结果
              </div>
              <a href={audioUrl} download="yingshu-tts.wav">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  下载
                </Button>
              </a>
            </div>
            <div className="space-y-4 p-5">
              <audio controls src={audioUrl} className="w-full">
                您的浏览器不支持音频播放。
              </audio>
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  试听文案
                </p>
                <p className="line-clamp-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                  {text}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                提示：满意后可下载 wav 音频文件，导入剪辑软件即可直接使用。
              </p>
            </div>
          </Card>
        ) : (
          <ResultPlaceholder
            icon={Mic}
            title="还没有试听音频"
            desc="粘贴文案、选择音色与语速后点击立即试听"
          />
        )
      }
    />
  );
}
