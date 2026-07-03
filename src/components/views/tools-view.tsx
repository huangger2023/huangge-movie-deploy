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
  Upload,
  Trash2,
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
import { DoubanSearchButton } from "@/components/site/douban-search-button";
import { PasteTitleButton } from "@/components/site/paste-title-button";
import {
  MIMO_PRESET_VOICES,
  MIMO_DEFAULT_PRESET_VOICE,
  MIMO_TTS_MODES,
  MIMO_DESIGN_PRESETS,
  type MimoTtsMode,
} from "@/lib/mimo-voices";
import { SaveToWorkspaceButton } from "@/components/site/save-to-workspace-dialog";
import { cn } from "@/lib/utils";

/**
 * Agent 协作 hook：管理「联网搜索真实剧情」开关 + 搜索状态
 * 使用 SSE 流式 API，分阶段推送 sources + fullPlot
 * 返回 plotContext（搜索结果）供生成时传入，以及搜索 UI 状态
 */
function useAgentPlot() {
  const [enabled, setEnabled] = React.useState(false);
  const [searching, setSearching] = React.useState(false);
  const [plotContext, setPlotContext] = React.useState<string | null>(null);
  const [sourceCount, setSourceCount] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [stage, setStage] = React.useState<string>("");

  const reset = () => {
    setPlotContext(null);
    setSourceCount(0);
    setError(null);
    setStage("");
  };

  const search = async (movieTitle: string, genre?: string): Promise<string | null> => {
    if (!movieTitle.trim()) {
      toast.error("请先填写电影名称");
      return null;
    }
    setSearching(true);
    setError(null);
    setStage("search");
    try {
      const res = await fetch("/api/agent/search/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieTitle: movieTitle.trim(), genre }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "搜索失败");
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("无法读取流");
      const decoder = new TextDecoder();
      let buffer = "";
      let ctx = "";
      let count = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";
        for (const evtStr of events) {
          if (!evtStr.trim()) continue;
          let eventType = "message";
          let dataStr = "";
          for (const line of evtStr.split("\n")) {
            if (line.startsWith("event: ")) eventType = line.slice(7).trim();
            else if (line.startsWith("data: ")) dataStr += line.slice(6);
          }
          if (!dataStr) continue;
          let data: unknown;
          try {
            data = JSON.parse(dataStr);
          } catch {
            continue;
          }
          if (eventType === "stage") {
            const s = data as { stage: string; source?: string };
            setStage(s.stage);
            if (s.stage === "read" && s.source) {
              toast.info(`正在深度读取：${s.source}`);
            }
          } else if (eventType === "sources") {
            const d = data as { sources: unknown[]; snippets: string; count: number };
            count = d.count;
            setSourceCount(count);
            setPlotContext(d.snippets);
            ctx = d.snippets;
            toast.success(`已搜索到 ${count} 个真实剧情来源`, {
              description: "正在深度读取最优先来源…",
            });
          } else if (eventType === "fullplot") {
            const d = data as { fullPlot: string; readSource: { name: string } | null; skipped: boolean };
            if (!d.skipped && d.fullPlot) {
              // fullPlot + snippets 组合
              const combined = [
                d.fullPlot ? `=== 深度读取全文 ===\n${d.fullPlot}` : "",
              ].filter(Boolean).join("\n\n") + "\n\n=== 搜索摘要 ===\n" + (ctx || "");
              ctx = combined;
              setPlotContext(combined);
              if (d.readSource) {
                toast.success(`已深度读取《${d.readSource.name}》`, {
                  description: `${d.fullPlot.length} 字真实剧情`,
                });
              }
            }
          } else if (eventType === "done") {
            const d = data as { combined: string; sources: unknown[] };
            ctx = d.combined;
            setPlotContext(d.combined);
            setSourceCount(d.sources.length);
            setStage("done");
            toast.success("Agent 联网搜索完成", {
              description: `${d.sources.length} 来源 · ${d.combined.length} 字真实剧情`,
            });
          } else if (eventType === "error") {
            const d = data as { message: string };
            setError(d.message);
            toast.error(d.message);
          }
        }
      }
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

  return { enabled, setEnabled, searching, plotContext, sourceCount, error, stage, search, reset };
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
    <div className="rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/[0.04] to-accent/[0.04] p-3">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-blue-500">
          <Bot className="h-4 w-4 text-white" />
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
              {agent.searching
                ? agent.stage === "search"
                  ? "搜索中…"
                  : agent.stage === "read"
                  ? "深度读取中…"
                  : "处理中…"
                : agent.plotContext
                ? "重新搜索"
                : "搜索真实剧情"}
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
          {/* SSE 阶段进度指示 */}
          {agent.searching && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className={cn("h-1.5 w-1.5 rounded-full", agent.stage === "search" ? "bg-green-500 animate-pulse" : "bg-emerald-500")} />
                联网搜索
              </div>
              <span className="text-muted-foreground/40">→</span>
              <div className="flex items-center gap-1">
                <span className={cn("h-1.5 w-1.5 rounded-full", agent.stage === "read" ? "bg-green-500 animate-pulse" : agent.stage === "done" ? "bg-emerald-500" : "bg-muted")} />
                深度读取
              </div>
              <span className="text-muted-foreground/40">→</span>
              <div className="flex items-center gap-1">
                <span className={cn("h-1.5 w-1.5 rounded-full", agent.stage === "done" ? "bg-emerald-500" : "bg-muted")} />
                完成
              </div>
            </div>
          )}
          {agent.plotContext && !agent.searching && (
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

      <div className="relative mx-auto min-h-screen max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <Badge
            variant="outline"
            className="mb-4 gap-1.5 border-green-500/30 bg-green-500/10 px-3 py-1 text-green-600 dark:text-green-400"
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
                    "group flex h-full flex-col cursor-pointer p-5 pb-4 outline-none transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-primary focus-visible:ring-2 focus-visible:ring-ring",
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
                  <h3 className="min-h-[2.5rem] text-sm font-semibold leading-tight">{tool.name}</h3>
                  <p className="mt-1.5 min-h-[2.5rem] text-xs leading-relaxed text-muted-foreground">
                    {tool.desc}
                  </p>
                  <div
                    className={cn(
                      "mt-auto flex items-center text-xs font-medium transition-opacity",
                      isActive
                        ? "text-green-600 dark:text-green-400 opacity-100"
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
      <div className="flex flex-col lg:col-span-2 lg:min-h-[520px]">
        <div className="flex min-h-0 flex-1 flex-col">{form}</div>
      </div>
      <div className="flex flex-col lg:col-span-3">
        <div className="flex min-h-0 flex-1 flex-col">{result}</div>
      </div>
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
    <Card className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 border-dashed p-8 text-center">
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
    <Card className="flex h-full flex-col space-y-3 overflow-hidden p-5">
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
        <Card className="flex h-full flex-col space-y-5 p-5 sm:p-6">
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
            <div className="flex items-center gap-2 flex-nowrap">
              <Input
                value={movieTitle}
                onChange={(e) => setMovieTitle(e.target.value)}
                placeholder="例如：盗梦空间"
                className="flex-1"
              />
              <PasteTitleButton onPasteText={setMovieTitle} />
              <DoubanSearchButton mode="home" movieTitle={movieTitle} />
            </div>
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
            className="mt-auto w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90"
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
          <Card className="flex h-full flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-5 py-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ListOrdered className="h-4 w-4 text-green-600 dark:text-green-400" />
                生成结果
                <Badge variant="secondary" className="text-xs">
                  {items.length} 条
                </Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <SaveToWorkspaceButton
                  field="titles"
                  value={output}
                  defaultMovieTitle={movieTitle.trim()}
                  defaultGenre={genre}
                  label="存入工作台"
                />
                <CopyButton text={output} label="整体复制" />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin p-3">
              <ul className="space-y-2">
                {items.map((item, i) => (
                  <li
                    key={i}
                    className="group flex items-start gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5 transition-colors hover:border-green-500/40 hover:bg-green-500/5"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-green-500/15 text-[11px] font-semibold text-green-600 dark:text-green-400">
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
        <Card className="flex h-full flex-col space-y-5 p-5 sm:p-6">
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
            <div className="flex items-center gap-2 flex-nowrap">
              <Input
                value={movieTitle}
                onChange={(e) => setMovieTitle(e.target.value)}
                placeholder="例如：肖申克的救赎"
                className="flex-1"
              />
              <PasteTitleButton onPasteText={setMovieTitle} />
              <DoubanSearchButton mode="home" movieTitle={movieTitle} />
            </div>
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
            className="mt-auto w-full bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white hover:opacity-90"
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
          <div className="flex h-full flex-col">
            <div className="mb-2 flex shrink-0 items-center justify-end gap-1.5">
              <SaveToWorkspaceButton
                field="hooks"
                value={items.map((it, i) => `${i + 1}. ${it}`).join("\n")}
                defaultMovieTitle={movieTitle.trim()}
                defaultGenre={genre}
                label="存入工作台"
              />
              <CopyButton
                text={items.map((it, i) => `${i + 1}. ${it}`).join("\n")}
                label="整体复制"
              />
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto scrollbar-thin pr-1">
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
        <Card className="flex h-full flex-col space-y-5 p-5 sm:p-6">
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
            <div className="flex items-center gap-2 flex-nowrap">
              <Input
                value={movieTitle}
                onChange={(e) => setMovieTitle(e.target.value)}
                placeholder="可选，便于 AI 理解语境"
                className="flex-1"
              />
              <PasteTitleButton onPasteText={setMovieTitle} />
              <DoubanSearchButton mode="home" movieTitle={movieTitle} />
            </div>
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
              className="h-[220px] resize-none overflow-y-auto scrollbar-thin"
            />
          </Field>

          <Button
            onClick={run}
            disabled={loading}
            className="mt-auto w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90"
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
          <Card className="flex h-full flex-col space-y-3 overflow-hidden p-5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </Card>
        ) : output ? (
          <div className="flex h-full flex-col">
            <div className="mb-2 flex shrink-0 items-center justify-end gap-1.5">
              <SaveToWorkspaceButton
                field="script"
                value={output}
                defaultMovieTitle={movieTitle.trim()}
                label="存入工作台"
              />
            </div>
            <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-2">
              <Card className="flex min-h-0 flex-col overflow-hidden p-4">
                <div className="mb-3 flex shrink-0 items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <Clapperboard className="h-4 w-4" />
                    原文案
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {content.trim().length} 字
                  </Badge>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin whitespace-pre-wrap break-words rounded-lg bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground">
                  {content}
                </div>
              </Card>
              <Card className="flex min-h-0 flex-col overflow-hidden border-green-500/30 p-4">
                <div className="mb-3 flex shrink-0 items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
                    <Sparkles className="h-4 w-4" />
                    润色后
                  </span>
                  <CopyButton text={output} label="复制润色稿" />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin whitespace-pre-wrap break-words rounded-lg bg-green-500/5 p-3 text-sm leading-relaxed">
                  {output}
                </div>
              </Card>
            </div>
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
  const [mode, setMode] = React.useState<MimoTtsMode>("preset");
  const [text, setText] = React.useState("");
  const [voice, setVoice] = React.useState<string>(MIMO_DEFAULT_PRESET_VOICE);
  const [speed, setSpeed] = React.useState(1.0);
  const [designPrompt, setDesignPrompt] = React.useState("");
  const [refFile, setRefFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [previewingVoice, setPreviewingVoice] = React.useState<string | null>(null);
  const [previewingRef, setPreviewingRef] = React.useState(false);
  const textCharCount = React.useMemo(() => text.trim().length, [text]);

  const previewAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const refAudioUrlRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      if (refAudioUrlRef.current) {
        URL.revokeObjectURL(refAudioUrlRef.current);
        refAudioUrlRef.current = null;
      }
    };
  }, [audioUrl]);

  /** 从 localStorage 读取创作工具传来的待试听文案 */
  React.useEffect(() => {
    const pending = localStorage.getItem("tts-pending-script");
    if (pending) {
      setText(pending);
      localStorage.removeItem("tts-pending-script");
    }
  }, []);

  /** 预览已上传的参考音频 */
  const previewRefAudio = () => {
    if (!refFile) return;
    // 如果正在播放则停止
    if (previewingRef && previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      setPreviewingRef(false);
      return;
    }
    // 停止预置音色试听
    if (previewingVoice && previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
      setPreviewingVoice(null);
    }
    setPreviewingRef(true);
    // 释放之前的 URL
    if (refAudioUrlRef.current) {
      URL.revokeObjectURL(refAudioUrlRef.current);
    }
    const url = URL.createObjectURL(refFile);
    refAudioUrlRef.current = url;
    const audio = new Audio(url);
    previewAudioRef.current = audio;
    audio.onended = () => {
      setPreviewingRef(false);
      previewAudioRef.current = null;
    };
    audio.onerror = () => {
      setPreviewingRef(false);
      previewAudioRef.current = null;
      toast.error("参考音频播放失败");
    };
    audio.play().catch(() => {
      setPreviewingRef(false);
      toast.error("参考音频播放失败");
    });
  };

  /** 试听某个预置音色：用固定短文本 + 当前语速快速合成并播放 */
  const previewVoice = async (voiceId: string) => {
    // 如果已经在播放该音色，则停止
    if (previewingVoice === voiceId && previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      setPreviewingVoice(null);
      return;
    }
    // 停止之前的播放
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setPreviewingVoice(voiceId);
    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "preset",
          text: "你好，欢迎收看荒哥说电影，今天为你带来一部精彩影片。",
          presetVoice: voiceId,
          speed,
        }),
      });
      if (!res.ok) throw new Error("试听失败");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setPreviewingVoice(null);
        previewAudioRef.current = null;
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setPreviewingVoice(null);
        previewAudioRef.current = null;
        toast.error("试听播放失败");
      };
      await audio.play();
    } catch (e) {
      setPreviewingVoice(null);
      toast.error(e instanceof Error ? e.message : "试听失败");
    }
  };

  const run = async () => {
    const trimmed = text.trim();
    if (!trimmed) { toast.error("请输入要试听的文案"); return; }
    if (mode === "clone" && !refFile) { toast.error("请上传参考音频"); return; }
    if (mode === "design" && !designPrompt.trim()) { toast.error("请描述想要的音色风格"); return; }
    setLoading(true);
    try {
      let res;
      if (mode === "clone") {
        const form = new FormData();
        form.append("mode", "clone");
        form.append("text", trimmed);
        if (designPrompt.trim()) form.append("style", designPrompt.trim());
        if (refFile) form.append("reference", refFile);
        res = await fetch("/api/ai/tts", { method: "POST", body: form });
      } else {
        res = await fetch("/api/ai/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode, text: trimmed,
            presetVoice: mode === "preset" ? voice : undefined,
            speed: mode === "preset" ? speed : undefined,
            style: mode === "design" ? designPrompt.trim() : undefined,
          }),
        });
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(
          d.error ||
            (res.status === 429
              ? "音色复刻当前请求过于频繁或额度受限，请稍等 1-2 分钟后重试"
              : "语音合成失败")
        );
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      toast.success("语音合成完成");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "语音合成失败");
    } finally { setLoading(false); }
  };

  const clearText = () => {
    setText("");
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  return (
    <ToolShell
      form={
        <Card className="flex h-full flex-col space-y-5 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-500">
              <Mic className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">语音试听</h2>
              <p className="text-xs text-muted-foreground">预置音色 / 音色设计 / 音色复刻</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-muted/40 p-1">
            {MIMO_TTS_MODES.map((m) => {
              const active = mode === m.key;
              return (
                <button key={m.key} type="button" onClick={() => setMode(m.key)}
                  className={cn("flex flex-col items-center gap-0.5 rounded-md px-2 py-2 text-center transition-all",
                    active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  <span className="text-base leading-none">{m.emoji}</span>
                  <span className="text-[11px] font-medium">{m.label}</span>
                </button>
              );
            })}
          </div>

	          <Field label="待合成文案" hint="不限字数">
	            <Card className="space-y-3 border-border/80 bg-muted/20 p-4">
	              <div className="flex flex-wrap items-center justify-between gap-2">
	                <div className="flex items-center gap-2">
	                  <PasteTitleButton
	                    label="粘贴文案"
	                    onPasteText={setText}
	                    disabled={loading}
	                    className="h-8"
	                  />
	                  <Button
	                    type="button"
	                    variant="outline"
	                    size="sm"
	                    onClick={clearText}
	                    disabled={loading || !text}
	                    className="h-8 gap-1.5 rounded-[2px] px-2.5 text-xs"
	                  >
	                    <Trash2 className="h-3.5 w-3.5" />
	                    <span className="hidden sm:inline">清空</span>
	                  </Button>
	                </div>
	                <span className="rounded-[2px] border border-border/70 bg-background/50 px-2 py-1 font-mono text-[11px] text-muted-foreground">
	                  约 {textCharCount.toLocaleString("zh-CN")} 字
	                </span>
	              </div>
	              <Textarea
	                value={text}
	                onChange={(e) => setText(e.target.value)}
	                placeholder="粘贴电影解说文案，可长可短。长文案会自动分段合成，仍导出一段完整音频…"
	                className="h-[220px] resize-none overflow-y-auto scrollbar-thin"
	              />
	              <p className="text-[11px] text-muted-foreground">
	                字数不限，长文案自动分段合成，最终拼成一段完整音频。
	              </p>
	            </Card>
	          </Field>

          {mode === "preset" && (
            <>
              <Field label="预置音色">
                <div className="grid grid-cols-2 gap-2">
                  {MIMO_PRESET_VOICES.map((v) => {
                    const a = voice === v.id;
                    const isPreviewing = previewingVoice === v.id;
                    return (
                      <div key={v.id} className={cn("flex items-center gap-0 rounded-lg border transition-all",
                        a ? "border-green-500 bg-green-500/10 ring-1 ring-primary" : "border-border bg-muted/30")}>
                        <button type="button" onClick={() => setVoice(v.id)}
                          className="flex min-w-0 flex-1 items-center gap-2 p-2.5 text-left">
                          <span className="text-xl">{v.emoji}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium">{v.name}</span>
                            <span className="block truncate text-[11px] text-muted-foreground">{v.desc}</span>
                          </span>
                          {a && <Check className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />}
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); previewVoice(v.id); }}
                          className="flex shrink-0 items-center justify-center self-stretch border-l border-border/50 px-2.5 transition-colors hover:bg-green-500/10 active:bg-green-500/20"
                          title={isPreviewing ? "停止播放" : "试听此音色"}>
                          {isPreviewing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-green-600 dark:text-green-400" />
                          ) : (
                            <Volume2 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </Field>
              <Field label="语速" hint={`${speed.toFixed(1)}x`}>
                <Slider value={[speed]} min={0.5} max={2.0} step={0.1} onValueChange={(v) => setSpeed(v[0])} />
              </Field>
            </>
          )}

          {mode === "design" && (
            <Field label="音色风格描述" hint="自然语言">
              <div className="flex flex-wrap gap-1.5">
                {MIMO_DESIGN_PRESETS.map((p) => {
                  const a = designPrompt === p.prompt;
                  return (
                    <button key={p.id} type="button" onClick={() => setDesignPrompt(a ? "" : p.prompt)}
                      className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
                        a ? "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400" : "border-border/70 bg-muted/30 text-muted-foreground hover:border-green-500/40 hover:text-foreground")}>
                      <span className="leading-none">{p.emoji}</span>{p.label}
                    </button>
                  );
                })}
              </div>
              <Textarea value={designPrompt} onChange={(e) => setDesignPrompt(e.target.value.slice(0, 300))}
                placeholder="例如：年轻男性磁性嗓音，节奏明快，略带兴奋…" className="h-[96px] resize-none overflow-y-auto scrollbar-thin" />
              <p className="text-[11px] text-muted-foreground">点击上方类型快速填入，或自己写一句音色描述。</p>
            </Field>
          )}

          {mode === "clone" && (
            <Field label="参考音频" hint="≤5MB · wav/mp3/m4a/webm">
              <div className={cn("rounded-xl border transition-all",
                refFile ? "border-green-500/50" : "border-border")}>
                {refFile ? (
                  <div className="flex items-center gap-3 p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                      <Volume2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{refFile.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {(refFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={previewRefAudio}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 transition-colors hover:bg-green-500/10 active:bg-green-500/20"
                        title={previewingRef ? "停止播放" : "试听参考音频"}>
                        {previewingRef ? (
                          <Loader2 className="h-4 w-4 animate-spin text-green-600 dark:text-green-400" />
                        ) : (
                          <Volume2 className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border/60 transition-colors hover:bg-muted/50">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                        <input type="file" accept="audio/wav,audio/mpeg,audio/mp3,audio/mp4,audio/m4a,audio/x-m4a,audio/webm,audio/ogg"
                          className="hidden" onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            if (f && f.size > 5 * 1024 * 1024) { toast.error("参考音频过大，请控制在 5MB 以内"); setRefFile(null); }
                            else { setRefFile(f); }
                          }} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center transition-colors hover:bg-green-500/5">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium">点击上传参考音频</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">上传一段目标声音，复刻同款声线</p>
                    </div>
                    <input type="file" accept="audio/wav,audio/mpeg,audio/mp3,audio/mp4,audio/m4a,audio/x-m4a,audio/webm,audio/ogg"
                      className="hidden" onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        if (f && f.size > 5 * 1024 * 1024) { toast.error("参考音频过大，请控制在 5MB 以内"); setRefFile(null); }
                        else { setRefFile(f); }
                      }} />
                  </label>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">建议上传 10~30 秒清晰人声，复刻效果更稳。</p>
            </Field>
          )}

          <Button onClick={run} disabled={loading}
            className="mt-auto w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:opacity-90">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />合成中…</> : <><Volume2 className="h-4 w-4" />立即试听</>}
          </Button>
        </Card>
      }
      result={
        loading ? (
          <Card className="flex h-full min-h-0 flex-col items-center justify-center gap-4 overflow-hidden p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <Loader2 className="h-7 w-7 animate-spin text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center">
              <p className="font-medium">正在合成语音…</p>
              <p className="mt-1 text-sm text-muted-foreground">长文案会分段合成，请稍候</p>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-green-500" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </Card>
        ) : audioUrl ? (
          <Card className="flex h-full flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-5 py-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Volume2 className="h-4 w-4 text-green-600 dark:text-green-400" />试听结果
              </div>
              <a href={audioUrl} download="yingshu-tts.wav">
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs">
                  <Download className="h-3.5 w-3.5" />下载
                </Button>
              </a>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto scrollbar-thin p-5">
              <audio controls src={audioUrl} className="w-full">您的浏览器不支持音频播放。</audio>
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">试听文案</p>
                <p className="h-[180px] overflow-y-auto scrollbar-thin whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
              <p className="text-xs text-muted-foreground">提示：满意后可下载 wav 音频文件，导入剪辑软件即可直接使用。</p>
            </div>
          </Card>
        ) : (
          <ResultPlaceholder icon={Mic} title="还没有试听音频" desc="切换模式、填好文案后点击立即试听" />
        )
      }
    />
  );
}
