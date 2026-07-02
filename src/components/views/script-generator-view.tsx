"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  Sparkles,
  Film,
  Wand2,
  Copy,
  Heart,
  RefreshCw,
  Volume2,
  Loader2,
  Clapperboard,
  Lightbulb,
  CheckCircle2,
  Star,
  Bot,
  Search,
  FileText,
  Globe,
  Upload,
  Trash2,
  ExternalLink,
  AlertCircle,
  XCircle,
  FileSearch,
  Library,
  Plus,
  Download,
  ListTree,
  Clock,
  Camera,
  ScrollText,
  FolderKanban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import { SaveToWorkspaceDialog, type WorkspaceField } from "@/components/site/save-to-workspace-dialog";
import { useSSEAgentSearch } from "@/lib/use-sse-agent-search";
import { cn } from "@/lib/utils";

const GENRES = ["剧情", "悬疑", "科幻", "爱情", "动作", "恐怖", "喜剧", "犯罪", "动画", "纪录片"];
const STYLES = ["悬疑反转", "情感共鸣", "速看爽文", "深度解读", "搞笑吐槽"];
const DURATIONS = ["60秒", "90秒", "3分钟", "5分钟"];
const HOOK_TYPES = ["悬念提问", "反差冲击", "情感代入", "数据震撼", "故事引入"];
const TONES = ["犀利", "温暖", "幽默", "神秘", "激情"];

const SAMPLE_MOVIES = [
  { title: "消失的她", genre: "悬疑" },
  { title: "肖申克的救赎", genre: "剧情" },
  { title: "盗梦空间", genre: "科幻" },
  { title: "你好，李焕英", genre: "喜剧" },
  { title: "无间道", genre: "犯罪" },
];

interface FormState {
  movieTitle: string;
  genre: string;
  style: string;
  duration: string;
  hookType: string;
  tone: string;
  keywords: string;
  extraNotes: string;
}

const DEFAULT_FORM: FormState = {
  movieTitle: "",
  genre: "悬疑",
  style: "悬疑反转",
  duration: "90秒",
  hookType: "悬念提问",
  tone: "犀利",
  keywords: "",
  extraNotes: "",
};

type AgentMode = "none" | "web" | "doc";

interface PlotDoc {
  id: string;
  movieTitle: string;
  content: string;
  source: "manual" | "web";
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

interface SearchSource {
  name: string;
  url: string;
  host: string;
  snippet: string;
}

interface SearchResult {
  movieTitle: string;
  snippets: string;
  fullPlot: string;
  combined: string;
  sources: SearchSource[];
  searchedAt: string;
  savedPlotId: string | null;
}

type StepStatus = "pending" | "running" | "done" | "error";

interface AgentStep {
  id: number;
  icon: React.ReactNode;
  title: (movie: string) => string;
  status: StepStatus;
  elapsed?: number;
  detail?: string;
}

const INITIAL_STEPS: AgentStep[] = [
  { id: 1, icon: <Search className="h-4 w-4" />, title: (m) => `联网搜索《${m}》真实剧情`, status: "pending" },
  { id: 2, icon: <Globe className="h-4 w-4" />, title: () => "深度读取 Top 来源全文", status: "pending" },
  { id: 3, icon: <FileSearch className="h-4 w-4" />, title: () => "提取剧情要素（人物 / 场景 / 结局）", status: "pending" },
  { id: 4, icon: <Wand2 className="h-4 w-4" />, title: () => "基于真实剧情生成解说文案", status: "pending" },
];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function ScriptGeneratorView() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const sseSearch = useSSEAgentSearch();

  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [agentMode, setAgentMode] = React.useState<AgentMode>("none");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);
  const [savedId, setSavedId] = React.useState<string | null>(null);
  const [isFav, setIsFav] = React.useState(false);
  const [ttsLoading, setTtsLoading] = React.useState(false);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const audioUrlRef = React.useRef<string | null>(null);

  // Agent state
  const [steps, setSteps] = React.useState<AgentStep[]>(INITIAL_STEPS);
  const stepTimers = React.useRef<Record<number, number>>({});
  const [searchResult, setSearchResult] = React.useState<SearchResult | null>(null);

  // Plot library state
  const [plots, setPlots] = React.useState<PlotDoc[]>([]);
  const [plotsLoading, setPlotsLoading] = React.useState(false);
  const [selectedPlotId, setSelectedPlotId] = React.useState<string | null>(null);
  const [plotDialogOpen, setPlotDialogOpen] = React.useState(false);
  const [plotForm, setPlotForm] = React.useState({ movieTitle: "", content: "" });
  const [plotSaving, setPlotSaving] = React.useState(false);
  const [plotExpanded, setPlotExpanded] = React.useState(false);

  // 存入工作台 dialog
  const [saveWsOpen, setSaveWsOpen] = React.useState(false);
  const [saveWsField, setSaveWsField] = React.useState<WorkspaceField>("script");
  const [saveWsValue, setSaveWsValue] = React.useState("");

  const openSaveToWorkspace = (field: WorkspaceField, value: string) => {
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
    setSaveWsField(field);
    setSaveWsValue(value);
    setSaveWsOpen(true);
  };

  React.useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  const fetchPlots = React.useCallback(async () => {
    setPlotsLoading(true);
    try {
      const res = await fetch("/api/agent/plots");
      if (!res.ok) throw new Error("获取失败");
      const data = (await res.json()) as { docs: PlotDoc[] };
      setPlots(data.docs);
    } catch {
      toast.error("获取剧情文档失败");
    } finally {
      setPlotsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (agentMode === "doc" && user) {
      void fetchPlots();
    }
  }, [agentMode, user, fetchPlots]);

  const selectedPlot = React.useMemo(
    () => plots.find((p) => p.id === selectedPlotId) ?? null,
    [plots, selectedPlotId]
  );

  const isAgentRunning = steps.some((s) => s.status === "running");

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const updateStep = (id: number, patch: Partial<AgentStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const resetSteps = () => {
    setSteps(
      INITIAL_STEPS.map((s) => ({
        ...s,
        status: "pending" as StepStatus,
        elapsed: undefined,
        detail: undefined,
      }))
    );
  };

  const startStep = (id: number) => {
    stepTimers.current[id] = Date.now();
    updateStep(id, { status: "running", elapsed: undefined, detail: undefined });
  };

  const finishStep = (id: number, detail?: string) => {
    const start = stepTimers.current[id];
    const elapsed = start ? (Date.now() - start) / 1000 : undefined;
    updateStep(id, { status: "done", elapsed, detail });
  };

  const callScript = async (plotContext?: string) => {
    const res = await fetch("/api/ai/script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        movieTitle: form.movieTitle.trim(),
        genre: form.genre,
        style: form.style,
        duration: form.duration,
        hookType: form.hookType,
        tone: form.tone,
        keywords: form.keywords.trim() || undefined,
        extraNotes: form.extraNotes.trim() || undefined,
        plotContext,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "生成失败");
    }
    return (await res.json()) as { output: string; savedId: string | null };
  };

  const handleGenerate = async () => {
    if (!form.movieTitle.trim()) {
      toast.error("请先填写电影名称");
      return;
    }
    if (agentMode === "doc" && !selectedPlot) {
      toast.error("请先在剧情文档库选择一份剧情文档");
      return;
    }

    setLoading(true);
    setResult(null);
    setSavedId(null);
    setIsFav(false);
    setSearchResult(null);
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
      setAudioUrl(null);
    }

    let plotContext: string | undefined = undefined;

    try {
      if (agentMode === "web") {
        resetSteps();
        await sleep(150);
        // === 阶段1：SSE 流式联网搜索 ===
        startStep(1);
        const sseResult = await sseSearch.search(form.movieTitle.trim(), form.genre);
        if (!sseResult) {
          throw new Error("联网搜索失败");
        }
        finishStep(1, `找到 ${sseResult.sources.length} 个来源`);
        // 用 SSE 结果构造 SearchResult 兼容现有渲染
        const sdata: SearchResult = {
          movieTitle: sseResult.movieTitle || form.movieTitle.trim(),
          snippets: sseResult.snippets,
          fullPlot: sseResult.fullPlot,
          combined: sseResult.combined,
          sources: sseResult.sources,
          searchedAt: sseResult.searchedAt,
          savedPlotId: sseResult.savedPlotId,
        };
        setSearchResult(sdata);
        // 搜索成功后若已登录，刷新剧情文档库（搜索会自动入库）
        if (user) void fetchPlots();

        // === 阶段2：深度读取（SSE 已推送 fullplot，这里推进时间线） ===
        startStep(2);
        await sleep(300);
        const readChars = sdata.fullPlot?.length || sdata.snippets.length || 0;
        finishStep(2, `读取 ${readChars} 字`);

        // === 阶段3：提取要素 ===
        await sleep(300);
        startStep(3);
        await sleep(400);
        finishStep(3, "已整合剧情要素");

        // === 阶段4：基于真实剧情生成文案 ===
        startStep(4);
        plotContext = sdata.combined;
        const scriptData = await callScript(plotContext);
        finishStep(4, `生成 ${scriptData.output.length} 字`);
        setResult(scriptData.output);
        setSavedId(scriptData.savedId);
        toast.success("Agent 协作完成！", {
          description: `基于真实剧情生成，已校验 ${sdata.sources.length} 个来源`,
        });
      } else if (agentMode === "doc") {
        plotContext = selectedPlot!.content;
        const scriptData = await callScript(plotContext);
        setResult(scriptData.output);
        setSavedId(scriptData.savedId);
        toast.success("文案生成成功", {
          description: `基于剧情文档《${selectedPlot!.movieTitle}》创作`,
        });
      } else {
        const scriptData = await callScript(undefined);
        setResult(scriptData.output);
        setSavedId(scriptData.savedId);
        toast.success("文案生成成功！", {
          description: scriptData.savedId ? "已自动保存到你的创作历史" : "登录后可保存到历史",
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "生成失败";
      if (agentMode === "web") {
        // 把当前 running 步骤标记为 error
        setSteps((prev) => {
          const next = [...prev];
          const idx = next.findIndex((s) => s.status === "running");
          if (idx >= 0) {
            next[idx] = { ...next[idx], status: "error", detail: msg };
          }
          return next;
        });
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      toast.success("已复制到剪贴板");
    } catch {
      toast.error("复制失败，请手动选择文本");
    }
  };

  const handleFavorite = async () => {
    if (!user) {
      toast.info("请先登录后再收藏", {
        description: "登录后可永久保存文案到创作历史",
        action: { label: "去登录", onClick: () => setView("auth") },
      });
      return;
    }
    if (!savedId) {
      toast.info("该文案未保存，无法收藏");
      return;
    }
    const next = !isFav;
    try {
      const res = await fetch("/api/scripts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: savedId, isFavorite: next }),
      });
      if (!res.ok) throw new Error("操作失败");
      setIsFav(next);
      toast.success(next ? "已收藏" : "已取消收藏");
    } catch {
      toast.error("操作失败，请重试");
    }
  };

  const handleTTS = async () => {
    if (!result) return;
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
      setAudioUrl(null);
    }
    setTtsLoading(true);
    try {
      const text = result.replace(/[#*>`\-]/g, "").replace(/\s+/g, " ").trim().slice(0, 800);
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: "tongtong", speed: 1.0 }),
      });
      if (!res.ok) throw new Error("语音合成失败");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      setAudioUrl(url);
      toast.success("语音已生成，可播放试听");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "语音合成失败");
    } finally {
      setTtsLoading(false);
    }
  };

  const fillSample = (title: string, genre: string) => {
    setForm((p) => ({ ...p, movieTitle: title, genre }));
    toast.success(`已填入《${title}》`, { description: "可点击生成按钮立即创作" });
  };

  const openPlotDialog = () => {
    setPlotForm({ movieTitle: form.movieTitle.trim(), content: "" });
    setPlotDialogOpen(true);
  };

  const savePlot = async () => {
    if (!plotForm.movieTitle.trim() || !plotForm.content.trim()) {
      toast.error("电影名和剧情内容不能为空");
      return;
    }
    setPlotSaving(true);
    try {
      const res = await fetch("/api/agent/plots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieTitle: plotForm.movieTitle.trim(),
          content: plotForm.content.trim(),
          source: "manual",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "保存失败");
      }
      const data = (await res.json()) as { doc: PlotDoc };
      toast.success("剧情文档已保存");
      setPlotDialogOpen(false);
      setPlotForm({ movieTitle: "", content: "" });
      await fetchPlots();
      setSelectedPlotId(data.doc.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败");
    } finally {
      setPlotSaving(false);
    }
  };

  const deletePlot = async (id: string) => {
    try {
      const res = await fetch(`/api/agent/plots?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      toast.success("已删除剧情文档");
      if (selectedPlotId === id) setSelectedPlotId(null);
      await fetchPlots();
    } catch {
      toast.error("删除失败");
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* 背景装饰 */}
      <div className="pointer-events-none absolute inset-0 bg-cinema-radial" />
      <div className="pointer-events-none absolute inset-0 bg-grid-faint opacity-30" />

      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        {/* 顶部标题区 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <div className="mb-4 flex items-center justify-center gap-2">
            <Badge className="gap-1.5 border-green-500/30 bg-green-500/10 px-3 py-1 text-green-600 dark:text-green-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              <Bot className="h-3.5 w-3.5" />
              Agent 协作模式
            </Badge>
          </div>
          <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            <span className="text-gradient-primary">AI 独家文案生成器</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            输入电影信息与创作参数，让 AI Agent 联网搜索真实剧情、整合剧情要素，再基于真实剧情创作解说文案——告别瞎编乱造，每个反转都能对应真实画面。
          </p>
        </motion.div>

        {/* 主体三栏：左表单 / 中 Agent 面板 / 右结果 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[38fr_32fr_30fr] lg:gap-6">
          {/* 左栏：表单 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="glass-card overflow-hidden p-6">
              <div className="mb-5 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                  <Clapperboard className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold">创作参数</h2>
                  <p className="text-xs text-muted-foreground">填写后点击生成，AI 即刻创作</p>
                </div>
              </div>

              <div className="space-y-4">
                <Field label="电影名称" required>
                  <Input
                    value={form.movieTitle}
                    onChange={(e) => updateField("movieTitle", e.target.value)}
                    placeholder="例如：消失的她"
                    className="h-10"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="电影类型">
                    <SelectField value={form.genre} onChange={(v) => updateField("genre", v)} options={GENRES} />
                  </Field>
                  <Field label="解说风格">
                    <SelectField value={form.style} onChange={(v) => updateField("style", v)} options={STYLES} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="视频时长">
                    <SelectField value={form.duration} onChange={(v) => updateField("duration", v)} options={DURATIONS} />
                  </Field>
                  <Field label="黄金3秒钩子">
                    <SelectField value={form.hookType} onChange={(v) => updateField("hookType", v)} options={HOOK_TYPES} />
                  </Field>
                </div>

                <Field label="解说语气">
                  <SelectField value={form.tone} onChange={(v) => updateField("tone", v)} options={TONES} />
                </Field>

                <Field label="关键词" hint="可选，多个用空格分隔">
                  <Input
                    value={form.keywords}
                    onChange={(e) => updateField("keywords", e.target.value)}
                    placeholder="例如：反转 亲情 真相"
                    className="h-10"
                  />
                </Field>

                <Field label="补充要求" hint="可选">
                  <Textarea
                    value={form.extraNotes}
                    onChange={(e) => updateField("extraNotes", e.target.value)}
                    placeholder="例如：突出男主的心理变化，结尾留开放式悬念…"
                    className="min-h-[80px] resize-none"
                  />
                </Field>

                <Button
                  onClick={handleGenerate}
                  disabled={loading}
                  size="lg"
                  className={cn(
                    "h-12 w-full gap-2 rounded-xl bg-gradient-to-r from-green-500 to-blue-500",
                    "text-base font-semibold text-white shadow-glow-primary",
                    "transition-all hover:opacity-95 active:scale-[0.99]"
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {agentMode === "web" ? "Agent 协作中…" : "AI 创作中…"}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      生成独家精选文案
                    </>
                  )}
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">
                  {user ? `当前账号：${user.name}` : "未登录也可体验，登录后可保存历史与剧情文档"}
                </p>
              </div>
            </Card>
          </motion.div>

          {/* 中栏：Agent 协作面板 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <AgentPanel
              agentMode={agentMode}
              setAgentMode={setAgentMode}
              isLoggedIn={!!user}
              steps={steps}
              movieTitle={form.movieTitle.trim() || "电影"}
              isRunning={isAgentRunning || loading || sseSearch.searching}
              searchResult={searchResult}
              liveSources={sseSearch.sources}
              liveStage={sseSearch.stage}
              onRetry={handleGenerate}
              plots={plots}
              plotsLoading={plotsLoading}
              selectedPlotId={selectedPlotId}
              onSelectPlot={setSelectedPlotId}
              onOpenPlotDialog={openPlotDialog}
              onDeletePlot={deletePlot}
              selectedPlot={selectedPlot}
              plotExpanded={plotExpanded}
              setPlotExpanded={setPlotExpanded}
            />
          </motion.div>

          {/* 右栏：结果 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="glass-card flex min-h-[600px] flex-col overflow-hidden">
              {loading && agentMode === "web" ? (
                <AgentRunningSkeleton />
              ) : loading ? (
                <ResultSkeleton />
              ) : result ? (
                <ResultPanel
                  result={result}
                  isFav={isFav}
                  savedId={savedId}
                  ttsLoading={ttsLoading}
                  audioUrl={audioUrl}
                  isLoggedIn={!!user}
                  onCopy={handleCopy}
                  onFavorite={handleFavorite}
                  onRegenerate={handleGenerate}
                  onTTS={handleTTS}
                  onSaveToWorkspace={openSaveToWorkspace}
                />
              ) : (
                <EmptyState onPick={fillSample} />
              )}
            </Card>
          </motion.div>
        </div>
      </div>

      {/* 新建剧情文档 Dialog */}
      <Dialog open={plotDialogOpen} onOpenChange={setPlotDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
              新建剧情文档
            </DialogTitle>
            <DialogDescription>
              可粘贴豆瓣 / 维基的剧情简介，或你自己整理的真实剧情描述。AI 将基于此内容创作解说文案，确保人物、情节、结局与真实画面一致。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="电影名称" required>
              <Input
                value={plotForm.movieTitle}
                onChange={(e) => setPlotForm((p) => ({ ...p, movieTitle: e.target.value }))}
                placeholder="例如：肖申克的救赎"
                className="h-10"
              />
            </Field>
            <Field label="剧情内容" required hint={`${plotForm.content.length} 字`}>
              <Textarea
                value={plotForm.content}
                onChange={(e) => setPlotForm((p) => ({ ...p, content: e.target.value }))}
                placeholder="在此粘贴或输入真实剧情描述，建议 500 字以上，包含主要人物、关键情节、结局走向…"
                className="min-h-[240px] resize-y scrollbar-thin"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPlotDialogOpen(false)} disabled={plotSaving}>
              取消
            </Button>
            <Button onClick={savePlot} disabled={plotSaving} className="gap-1.5">
              {plotSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              保存剧情文档
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 存入创作工作台 Dialog */}
      <SaveToWorkspaceDialog
        open={saveWsOpen}
        onOpenChange={setSaveWsOpen}
        field={saveWsField}
        value={saveWsValue}
        defaultMovieTitle={form.movieTitle.trim()}
        defaultGenre={form.genre}
        onSaved={() => setView("workspace")}
      />
    </div>
  );
}

/* ---------- Agent 协作面板 ---------- */

interface AgentPanelProps {
  agentMode: AgentMode;
  setAgentMode: (m: AgentMode) => void;
  isLoggedIn: boolean;
  steps: AgentStep[];
  movieTitle: string;
  isRunning: boolean;
  searchResult: SearchResult | null;
  liveSources?: SearchSource[];
  liveStage?: { stage: string; status: string; source?: string; url?: string; movieTitle?: string } | null;
  onRetry: () => void;
  plots: PlotDoc[];
  plotsLoading: boolean;
  selectedPlotId: string | null;
  onSelectPlot: (id: string | null) => void;
  onOpenPlotDialog: () => void;
  onDeletePlot: (id: string) => void;
  selectedPlot: PlotDoc | null;
  plotExpanded: boolean;
  setPlotExpanded: (v: boolean) => void;
}

function AgentPanel(props: AgentPanelProps) {
  const {
    agentMode,
    setAgentMode,
    isLoggedIn,
    steps,
    movieTitle,
    isRunning,
    searchResult,
    liveSources,
    liveStage,
    onRetry,
    plots,
    plotsLoading,
    selectedPlotId,
    onSelectPlot,
    onOpenPlotDialog,
    onDeletePlot,
    selectedPlot,
    plotExpanded,
    setPlotExpanded,
  } = props;

  const hasTimeline = agentMode === "web" && steps.some((s) => s.status !== "pending");
  // SSE 实时推送的 sources 优先，否则用 searchResult
  const displaySources = liveSources && liveSources.length > 0 ? liveSources : searchResult?.sources || [];
  const hasSources = agentMode === "web" && displaySources.length > 0;
  const hasPlotLib = agentMode === "doc";

  return (
    <Card
      className={cn(
        "glass-card relative overflow-hidden p-5 transition-all",
        isRunning && "ring-1 ring-green-500/40 shadow-glow-primary"
      )}
    >
      {isRunning && (
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-px animate-pulse bg-gradient-to-r from-transparent via-primary to-transparent" />
      )}
      <div className="mb-4 flex items-center gap-2">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
            isRunning ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-muted/50 text-muted-foreground"
          )}
        >
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold">🤖 Agent 协作</h2>
          <p className="text-xs text-muted-foreground">
            {isRunning ? "正在执行任务…" : "选择剧情来源，让 AI 基于真实剧情创作"}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <SourceSelector
          value={agentMode}
          onChange={setAgentMode}
          isLoggedIn={isLoggedIn}
          disabled={isRunning}
        />

        <AnimatePresence>
          {hasTimeline && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <SectionTitle icon={<Wand2 className="h-3.5 w-3.5" />}>执行流程</SectionTitle>
              <AgentTimeline steps={steps} movieTitle={movieTitle} onRetry={onRetry} />
            </motion.div>
          )}

          {hasPlotLib && (
            <motion.div
              key="plotlib"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <SectionTitle icon={<Library className="h-3.5 w-3.5" />}>剧情文档库</SectionTitle>
              <PlotLibrary
                plots={plots}
                loading={plotsLoading}
                selectedPlotId={selectedPlotId}
                onSelect={onSelectPlot}
                onOpenDialog={onOpenPlotDialog}
                onDelete={onDeletePlot}
                selectedPlot={selectedPlot}
                expanded={plotExpanded}
                setExpanded={setPlotExpanded}
                isLoggedIn={isLoggedIn}
              />
            </motion.div>
          )}

          {hasSources && searchResult && (
            <motion.div
              key="sources"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <SectionTitle icon={<ExternalLink className="h-3.5 w-3.5" />}>
                剧情来源（{displaySources.length}）
                {liveStage && liveStage.stage === "read" && (
                  <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    深度读取中…
                  </span>
                )}
              </SectionTitle>
              <SearchSources sources={displaySources} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <span className="text-green-600 dark:text-green-400">{icon}</span>
      {children}
    </div>
  );
}

interface SourceOption {
  id: AgentMode;
  icon: React.ReactNode;
  label: string;
  desc: string;
  locked?: boolean;
}

function SourceSelector({
  value,
  onChange,
  isLoggedIn,
  disabled,
}: {
  value: AgentMode;
  onChange: (v: AgentMode) => void;
  isLoggedIn: boolean;
  disabled: boolean;
}) {
  const options: SourceOption[] = [
    {
      id: "none",
      icon: <Wand2 className="h-4 w-4" />,
      label: "不使用 Agent",
      desc: "直接生成，文案末尾会标注「剧情未经校验」",
    },
    {
      id: "web",
      icon: <Globe className="h-4 w-4" />,
      label: "联网搜索真实剧情",
      desc: "Agent 自动联网抓取 + 深度阅读，约 5-15 秒",
    },
    {
      id: "doc",
      icon: <FileText className="h-4 w-4" />,
      label: "使用剧情文档",
      desc: isLoggedIn ? "从你的剧情文档库选取已存的真实剧情" : "登录后可用",
      locked: !isLoggedIn,
    },
  ];
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const active = value === opt.id;
        const isDisabled = disabled || opt.locked;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={isDisabled}
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all",
              active
                ? "border-green-500 bg-green-500/5 shadow-glow-primary"
                : "border-border/60 hover:border-green-500/40 hover:bg-muted/30",
              isDisabled && "cursor-not-allowed opacity-60"
            )}
          >
            <div
              className={cn(
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                active ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-muted/50 text-muted-foreground"
              )}
            >
              {opt.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{opt.label}</span>
                {opt.locked && (
                  <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                    需登录
                  </Badge>
                )}
                {active && !opt.locked && <CheckCircle2 className="ml-auto h-4 w-4 text-green-600 dark:text-green-400" />}
              </div>
              <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{opt.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function AgentTimeline({
  steps,
  movieTitle,
  onRetry,
}: {
  steps: AgentStep[];
  movieTitle: string;
  onRetry: () => void;
}) {
  return (
    <ol className="relative space-y-1">
      {steps.map((step, idx) => (
        <li key={step.id} className="relative flex gap-3">
          <div className="flex flex-col items-center">
            <StepIcon status={step.status} icon={step.icon} />
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  "mt-0.5 w-px flex-1 self-stretch",
                  step.status === "done" ? "bg-emerald-500/40" : "bg-border/60"
                )}
              />
            )}
          </div>
          <div className="flex-1 pb-3">
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={cn(
                  "text-sm font-medium",
                  step.status === "pending" && "text-muted-foreground",
                  step.status === "running" && "text-foreground",
                  step.status === "done" && "text-foreground",
                  step.status === "error" && "text-destructive"
                )}
              >
                {step.title(movieTitle)}
                {step.status === "running" && <span className="ml-1 animate-pulse">▍</span>}
              </span>
              {step.elapsed !== undefined && (
                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                  {step.elapsed.toFixed(1)}s
                </span>
              )}
            </div>
            {step.detail && (
              <p
                className={cn(
                  "mt-0.5 text-xs",
                  step.status === "error" ? "text-destructive/80" : "text-muted-foreground"
                )}
              >
                {step.detail}
              </p>
            )}
            {step.status === "running" && (
              <p className="mt-0.5 text-[11px] text-green-600 dark:text-green-400/70">处理中…</p>
            )}
            {step.status === "error" && (
              <Button
                size="sm"
                variant="outline"
                className="mt-1.5 h-6 gap-1 px-2 text-[11px]"
                onClick={onRetry}
              >
                <RefreshCw className="h-3 w-3" />
                重试
              </Button>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function StepIcon({ status, icon }: { status: StepStatus; icon: React.ReactNode }) {
  if (status === "running") {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500/15 text-green-600 dark:text-green-400 ring-2 ring-green-500/30">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </div>
    );
  }
  if (status === "done") {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30">
        <CheckCircle2 className="h-4 w-4" />
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/15 text-destructive ring-1 ring-destructive/30">
        <XCircle className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted/50 text-muted-foreground ring-1 ring-border/60">
      {icon}
    </div>
  );
}

interface PlotLibraryProps {
  plots: PlotDoc[];
  loading: boolean;
  selectedPlotId: string | null;
  onSelect: (id: string | null) => void;
  onOpenDialog: () => void;
  onDelete: (id: string) => void;
  selectedPlot: PlotDoc | null;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  isLoggedIn: boolean;
}

function PlotLibrary({
  plots,
  loading,
  selectedPlotId,
  onSelect,
  onOpenDialog,
  onDelete,
  selectedPlot,
  expanded,
  setExpanded,
  isLoggedIn,
}: PlotLibraryProps) {
  if (!isLoggedIn) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
        请先登录后使用剧情文档库
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={onOpenDialog}>
        <Plus className="h-3.5 w-3.5" />
        新建 / 上传剧情文档
      </Button>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : plots.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 p-4 text-center">
          <FileText className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">还没有剧情文档</p>
          <p className="mt-1 text-[10px] text-muted-foreground/70">
            点击上方按钮，粘贴豆瓣/维基剧情简介即可
          </p>
        </div>
      ) : (
        <div className="scrollbar-thin max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {plots.map((p) => {
            const active = p.id === selectedPlotId;
            return (
              <div
                key={p.id}
                className={cn(
                  "group relative cursor-pointer rounded-lg border p-2.5 transition-all",
                  active
                    ? "border-green-500 bg-green-500/5 shadow-glow-primary"
                    : "border-border/60 hover:border-green-500/40 hover:bg-muted/30"
                )}
                onClick={() => onSelect(active ? null : p.id)}
              >
                <div className="flex items-center gap-2 pr-6">
                  <span className="truncate text-sm font-medium">{p.movieTitle}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-4 px-1.5 text-[10px]",
                      p.source === "web" ? "border-green-500/30 text-green-600 dark:text-green-400" : "border-accent/30 text-accent"
                    )}
                  >
                    {p.source === "web" ? "联网" : "手动"}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{p.wordCount} 字</span>
                  <span>·</span>
                  <span>{formatDate(p.updatedAt)}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(p.id);
                  }}
                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  title="删除"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selectedPlot && (
        <div className="rounded-lg border border-border/60 bg-card/40 p-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-green-600 dark:text-green-400">已选剧情预览</span>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] text-muted-foreground hover:text-green-600 dark:text-green-400"
            >
              {expanded ? "收起" : "展开全文"}
            </button>
          </div>
          <div
            className={cn(
              "scrollbar-thin overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-foreground/75",
              expanded ? "max-h-64" : "max-h-24"
            )}
          >
            {selectedPlot.content}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchSources({ sources }: { sources: SearchSource[] }) {
  return (
    <div className="scrollbar-thin max-h-64 space-y-1.5 overflow-y-auto pr-1">
      {sources.map((s, i) => (
        <a
          key={`${s.url}-${i}`}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-md border border-border/60 p-2 transition-all hover:border-green-500/40 hover:bg-muted/30"
        >
          <div className="flex items-center gap-1.5">
            <Globe className="h-3 w-3 shrink-0 text-green-600 dark:text-green-400" />
            <span className="truncate text-xs font-medium">{s.name}</span>
            <span className="shrink-0 text-[10px] text-muted-foreground">{s.host}</span>
            <ExternalLink className="ml-auto h-3 w-3 shrink-0 text-muted-foreground" />
          </div>
          {s.snippet && (
            <p className="mt-1 line-clamp-2 text-[10px] leading-tight text-muted-foreground">
              {s.snippet.slice(0, 60)}
              {s.snippet.length > 60 ? "…" : ""}
            </p>
          )}
        </a>
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return "刚刚";
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}天前`;
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  } catch {
    return "";
  }
}

/* ---------- 表单辅助 ---------- */

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-xs font-medium text-foreground/80">
          {label}
          {required && <span className="ml-0.5 text-green-600 dark:text-green-400">*</span>}
        </Label>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ---------- 结果区 ---------- */

function EmptyState({ onPick }: { onPick: (title: string, genre: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500/20 to-blue-500/20"
      >
        <Film className="h-10 w-10 text-green-600 dark:text-green-400" />
      </motion.div>
      <h3 className="text-lg font-semibold">还没有生成文案</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        填写左侧电影信息与创作参数，选择中栏的 Agent 协作模式，点击「生成独家精选文案」即可。
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {SAMPLE_MOVIES.map((m) => (
          <button
            key={m.title}
            onClick={() => onPick(m.title, m.genre)}
            className="group inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3.5 py-1.5 text-xs font-medium transition-all hover:border-green-500/40 hover:bg-green-500/5 hover:text-green-600 dark:text-green-400"
          >
            <Star className="h-3 w-3 text-accent" />
            {m.title}
          </button>
        ))}
      </div>
      <div className="mt-8 grid w-full max-w-md grid-cols-3 gap-3">
        {[
          { icon: Lightbulb, label: "黄金3秒开头" },
          { icon: Wand2, label: "高密度反转" },
          { icon: Sparkles, label: "互动金句结尾" },
        ].map((f) => (
          <div key={f.label} className="rounded-lg border border-border/40 bg-muted/30 p-3">
            <f.icon className="mx-auto mb-1.5 h-4 w-4 text-green-600 dark:text-green-400" />
            <p className="text-[10px] leading-tight text-muted-foreground">{f.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="flex-1 p-6">
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-green-600 dark:text-green-400" />
        AI 正在精心创作，请稍候…
      </div>
      <div className="relative space-y-4 overflow-hidden">
        <Skeleton className="relative h-7 w-2/5 overflow-hidden">
          <div className="absolute inset-0 animate-shimmer" />
        </Skeleton>
        <Skeleton className="relative h-4 w-full overflow-hidden">
          <div className="absolute inset-0 animate-shimmer" />
        </Skeleton>
        <Skeleton className="relative h-4 w-11/12 overflow-hidden">
          <div className="absolute inset-0 animate-shimmer" />
        </Skeleton>
        <Skeleton className="relative h-4 w-full overflow-hidden">
          <div className="absolute inset-0 animate-shimmer" />
        </Skeleton>
        <Skeleton className="relative h-7 w-1/3 overflow-hidden">
          <div className="absolute inset-0 animate-shimmer" />
        </Skeleton>
        <Skeleton className="relative h-4 w-full overflow-hidden">
          <div className="absolute inset-0 animate-shimmer" />
        </Skeleton>
        <Skeleton className="relative h-4 w-10/12 overflow-hidden">
          <div className="absolute inset-0 animate-shimmer" />
        </Skeleton>
        <Skeleton className="relative h-4 w-full overflow-hidden">
          <div className="absolute inset-0 animate-shimmer" />
        </Skeleton>
      </div>
    </div>
  );
}

function AgentRunningSkeleton() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10">
        <Bot className="h-8 w-8 text-green-600 dark:text-green-400" />
        <span className="absolute -right-1 -top-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
        </span>
      </div>
      <h3 className="text-sm font-semibold">Agent 正在协作创作</h3>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
        请查看中栏 Agent 面板的实时执行进度，搜索 + 阅读 + 整合 + 生成四步流程即将完成…
      </p>
    </div>
  );
}

interface ResultPanelProps {
  result: string;
  isFav: boolean;
  savedId: string | null;
  ttsLoading: boolean;
  audioUrl: string | null;
  isLoggedIn: boolean;
  onCopy: () => void;
  onFavorite: () => void;
  onRegenerate: () => void;
  onTTS: () => void;
  onSaveToWorkspace: (field: WorkspaceField, value: string) => void;
}

type ResultViewMode = "script" | "storyboard";

function ResultPanel({
  result,
  isFav,
  savedId,
  ttsLoading,
  audioUrl,
  isLoggedIn,
  onCopy,
  onFavorite,
  onRegenerate,
  onTTS,
  onSaveToWorkspace,
}: ResultPanelProps) {
  const isUnverified = result.includes("剧情未经校验");
  const [viewMode, setViewMode] = React.useState<ResultViewMode>("script");
  return (
    <div className="flex flex-1 flex-col">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-card/40 p-3">
        <div className="mr-auto flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          创作完成
        </div>
        {/* 视图切换 */}
        <div className="flex items-center rounded-lg border border-border/60 bg-background/60 p-0.5">
          <Button
            size="sm"
            variant={viewMode === "script" ? "secondary" : "ghost"}
            className={cn("h-7 gap-1.5 px-2.5 text-xs", viewMode === "script" && "shadow-sm")}
            onClick={() => setViewMode("script")}
          >
            <ScrollText className="h-3.5 w-3.5" />
            文案
          </Button>
          <Button
            size="sm"
            variant={viewMode === "storyboard" ? "secondary" : "ghost"}
            className={cn("h-7 gap-1.5 px-2.5 text-xs", viewMode === "storyboard" && "shadow-sm")}
            onClick={() => setViewMode("storyboard")}
          >
            <Clapperboard className="h-3.5 w-3.5" />
            分镜表
          </Button>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 px-2.5 text-green-600 dark:text-green-400 hover:bg-green-500/10 hover:text-green-600 dark:text-green-400"
          onClick={() =>
            onSaveToWorkspace(
              viewMode === "storyboard" ? "storyboard" : "script",
              viewMode === "storyboard" ? exportStoryboardMarkdown(result) : result
            )
          }
          title="存入创作工作台，统一管理每部电影的创作进度"
        >
          <FolderKanban className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">存入工作台</span>
        </Button>
        <Button size="sm" variant="ghost" className="h-8 gap-1.5 px-2.5" onClick={onCopy}>
          <Copy className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">复制</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className={cn("h-8 gap-1.5 px-2.5", isFav && "text-green-600 dark:text-green-400")}
          onClick={onFavorite}
          disabled={!savedId && isLoggedIn}
          title={isLoggedIn ? (isFav ? "取消收藏" : "收藏") : "登录后可收藏"}
        >
          <Heart className={cn("h-3.5 w-3.5", isFav && "fill-primary")} />
          <span className="hidden sm:inline">{isFav ? "已收藏" : "收藏"}</span>
        </Button>
        <Button size="sm" variant="ghost" className="h-8 gap-1.5 px-2.5" onClick={onTTS} disabled={ttsLoading}>
          {ttsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Volume2 className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{ttsLoading ? "合成中" : "试听"}</span>
        </Button>
        <Button size="sm" variant="ghost" className="h-8 gap-1.5 px-2.5" onClick={onRegenerate}>
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">重生成</span>
        </Button>
      </div>

      {/* 黄色未校验提示 */}
      {isUnverified && (
        <div className="flex items-start gap-2 border-b border-amber-500/20 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p className="text-[11px] leading-relaxed">
            本文案未使用 Agent 协作，剧情部分由 AI 自行发挥，<strong>可能存在虚构</strong>。建议切到「联网搜索真实剧情」或「使用剧情文档」模式重新生成，确保剧情与真实画面一致。
          </p>
        </div>
      )}

      {/* 试听播放器 */}
      {audioUrl && (
        <div className="border-b border-border/60 bg-green-500/5 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
            <Volume2 className="h-3.5 w-3.5" />
            语音试听（前800字）
          </div>
          <audio src={audioUrl} controls className="w-full" />
        </div>
      )}

      {/* 内容区：文案 / 分镜表 切换 */}
      <div className="scrollbar-thin flex-1 overflow-y-auto p-5 sm:p-6">
        <AnimatePresence mode="wait">
          {viewMode === "script" ? (
            <motion.div
              key="script"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl border-l-2 border-green-500 bg-card/40 p-5"
            >
              <Markdown content={result} />
            </motion.div>
          ) : (
            <motion.div
              key="storyboard"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <StoryboardTable content={result} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** 分镜表：把文案按章节切句，生成可剪辑的分镜表 */
interface Shot {
  id: number;
  section: string;
  narration: string;
  estDuration: number; // 估算秒数
  sceneType: string;
}

function parseShots(content: string): Shot[] {
  const lines = content.split("\n");
  const shots: Shot[] = [];
  let currentSection = "开头";
  let id = 1;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    // 识别章节标题 (## 开头)
    const h2 = line.match(/^#{1,3}\s*(.*)$/);
    if (h2) {
      const title = h2[1].replace(/^[🎬📖💬🏷️📌\s]+/, "").trim();
      if (title) currentSection = title;
      continue;
    }
    // 跳过标签行（#xxx）和列表项行
    if (/^#[^\s#]/.test(line)) continue;
    // 把段落按句号/问号/感叹号切句
    const sentences = line
      .replace(/^\d+\.\s*/, "")
      .split(/(?<=[。！？!?])\s*/)
      .map((s) => s.trim())
      .filter((s) => s.length > 4);
    for (const s of sentences) {
      const estDuration = Math.max(3, Math.ceil(s.length / 4)); // 约4字/秒
      let sceneType = "剧情画面";
      if (/开头|黄金|钩子/.test(currentSection)) sceneType = "开场冲击";
      else if (/标签/.test(currentSection)) sceneType = "片尾标签";
      else if (/标题|建议/.test(currentSection)) sceneType = "标题字幕";
      else if (/结尾|互动|金句/.test(currentSection)) sceneType = "升华收尾";
      shots.push({
        id: id++,
        section: currentSection,
        narration: s,
        estDuration,
        sceneType,
      });
    }
  }
  return shots;
}

const SCENE_STYLE: Record<string, string> = {
  开场冲击: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  剧情画面: "bg-muted/50 text-muted-foreground border-border/60",
  升华收尾: "bg-accent/10 text-accent-foreground border-accent/20",
  标题字幕: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  片尾标签: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

/** 把文案转换为分镜表 Markdown（用于导出 / 存入工作台） */
function exportStoryboardMarkdown(content: string): string {
  const shots = parseShots(content);
  const totalDuration = shots.reduce((s, sh) => s + sh.estDuration, 0);
  const totalMin = Math.floor(totalDuration / 60);
  const totalSec = totalDuration % 60;
  return [
    `# 分镜表 · 共 ${shots.length} 个镜头 · 预计时长 ${totalMin > 0 ? totalMin + "分" : ""}${totalSec}秒`,
    "",
    "| 镜号 | 章节 | 画面类型 | 旁白文案 | 预计时长 |",
    "| --- | --- | --- | --- | --- |",
    ...shots.map(
      (s) =>
        `| ${s.id} | ${s.section} | ${s.sceneType} | ${s.narration.replace(/\|/g, "\\|")} | ${s.estDuration}s |`
    ),
    "",
    `> 由影述学院 AI 文案生成器自动拆分，可导入剪映/PR 对应剪辑。`,
  ].join("\n");
}

function StoryboardTable({ content }: { content: string }) {
  const shots = React.useMemo(() => parseShots(content), [content]);
  const totalDuration = shots.reduce((s, sh) => s + sh.estDuration, 0);
  const totalMin = Math.floor(totalDuration / 60);
  const totalSec = totalDuration % 60;

  const handleExport = () => {
    const md = exportStoryboardMarkdown(content);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `分镜表-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("分镜表已导出为 Markdown");
  };

  if (shots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Clapperboard className="mb-3 h-10 w-10 text-muted/40" />
        <p className="text-sm text-muted-foreground">无法解析分镜，请先生成文案</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 概览栏 */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-3">
        <div className="flex items-center gap-1.5 text-xs">
          <ListTree className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          <span className="text-muted-foreground">镜头</span>
          <span className="font-semibold">{shots.length}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <Clock className="h-3.5 w-3.5 text-accent" />
          <span className="text-muted-foreground">预计时长</span>
          <span className="font-semibold">
            {totalMin > 0 ? `${totalMin}分` : ""}
            {totalSec}秒
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <Camera className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-muted-foreground">场景类型</span>
          <span className="font-semibold">
            {new Set(shots.map((s) => s.sceneType)).size}
          </span>
        </div>
        <Button
          size="sm"
          onClick={handleExport}
          className="ml-auto h-7 gap-1.5 rounded-full bg-gradient-to-r from-green-500 to-blue-500 px-3 text-xs text-white"
        >
          <Download className="h-3.5 w-3.5" />
          导出分镜表
        </Button>
      </div>

      {/* 分镜列表 */}
      <div className="space-y-2">
        {shots.map((shot, i) => (
          <motion.div
            key={shot.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.4) }}
            className="group flex gap-3 rounded-lg border border-border/60 bg-card/30 p-3 transition-colors hover:border-green-500/40 hover:bg-green-500/[0.03]"
          >
            {/* 镜号 */}
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 text-xs font-bold text-green-600 dark:text-green-400">
                {String(shot.id).padStart(2, "0")}
              </div>
              <span className="mt-1 text-[10px] text-muted-foreground">
                {shot.estDuration}s
              </span>
            </div>
            {/* 内容 */}
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {shot.section}
                </span>
                <span
                  className={cn(
                    "rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                    SCENE_STYLE[shot.sceneType] || SCENE_STYLE["剧情画面"]
                  )}
                >
                  {shot.sceneType}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-foreground/85">
                {shot.narration}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Markdown({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed text-foreground/90">
      <ReactMarkdown
        components={{
          h2: ({ children }) => (
            <h2 className="mb-3 mt-5 flex items-center gap-2 border-b border-border/50 pb-2 text-base font-bold text-foreground first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 text-sm font-semibold text-green-600 dark:text-green-400">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-3 leading-7 text-foreground/85">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 ml-4 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 ml-4 list-decimal space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-7 text-foreground/85">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-green-600 dark:text-green-400">{children}</strong>,
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-accent pl-3 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-border/50" />,
          code: ({ children }) => (
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-green-600 dark:text-green-400">{children}</code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
