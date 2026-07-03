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
  RotateCcw,
  PenLine,
  MessageSquare,
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
import { DoubanSearchButton } from "@/components/site/douban-search-button";
import { PasteTitleButton } from "@/components/site/paste-title-button";
import { cn } from "@/lib/utils";

const GENRES = ["剧情", "悬疑", "科幻", "爱情", "动作", "恐怖", "喜剧", "犯罪", "动画", "纪录片"];
const STYLES = ["悬疑反转", "情感共鸣", "速看爽文", "深度解读", "搞笑吐槽"];
const DURATIONS_PRESET = ["10分钟", "15分钟", "20分钟", "25分钟", "30分钟", "45分钟", "60分钟"];
const DURATIONS = [...DURATIONS_PRESET, "自定义"];
const HOOK_TYPES = ["反差冲击", "悬念提问", "情感代入", "数据震撼", "故事引入"];
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
  customDuration: string;
  hookType: string;
  tone: string;
  keywords: string;
  extraNotes: string;
  // 剧情增量参数
  entryPoint: string;   // 内容切入点
  uniqueAngle: string;  // 独家角度
}

const DEFAULT_FORM: FormState = {
  movieTitle: "",
  genre: "悬疑",
  style: "悬疑反转",
  duration: "10分钟",
  customDuration: "",
  hookType: "反差冲击",
  tone: "犀利",
  keywords: "",
  extraNotes: "",
  entryPoint: "完整剧情梳理",
  uniqueAngle: "专业电影解说视角",
};

type AgentMode = "web" | "doc";

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
  const selectTool = useAppStore((s) => s.selectTool);
  const sseSearch = useSSEAgentSearch();

  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [mediaType, setMediaType] = React.useState<"movie" | "tv">("movie");
  const [tvTitle, setTvTitle] = React.useState("");
  const [episodeNumber, setEpisodeNumber] = React.useState(1);
  const [agentMode, setAgentMode] = React.useState<AgentMode>("web");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(() => {
    // 从 localStorage 恢复上次生成的文案
    if (typeof window !== "undefined") {
      return localStorage.getItem("script-generator-result");
    }
    return null;
  });
  const [savedId, setSavedId] = React.useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("script-generator-savedId");
    }
    return null;
  });
  
  // 文案统计
  const resultStats = React.useMemo(() => {
    if (!result) return null;
    
    // 只计算文案主体，移除标题、风格标签等非文案部分
    // 找到文案主体截止位置（标题、风格、标签等标记之前）
    const scriptEndMarkers = ['# 标题', '## 标题', '标题：', '风格标签', '# 风格', '## 风格', '标签：', '# 标签'];
    let scriptContent = result;
    for (const marker of scriptEndMarkers) {
      const idx = result.indexOf(marker);
      if (idx > 0) {
        scriptContent = result.slice(0, idx);
        break;
      }
    }
    
    // 移除 Markdown 格式
    const plainText = scriptContent
      .replace(/[#*`_\[\]()]/g, '')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .trim();
    
    const chars = plainText.length;
    const sentences = (plainText.match(/[。！？.!?]+/g) || []).length;
    const paragraphs = plainText.split(/\n\n+/).filter(p => p.trim()).length;
    // 1万字≈30分钟，即每分钟约333字
    const readingTime = Math.ceil(chars / 333);
    
    return { chars, words: chars, sentences, paragraphs, readingTime };
  }, [result]);
  
  const [isFav, setIsFav] = React.useState(false);
  const [ttsLoading, setTtsLoading] = React.useState(false);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const audioUrlRef = React.useRef<string | null>(null);

  // 选中文本调整相关状态
  const [selectionPopup, setSelectionPopup] = React.useState<{
    visible: boolean;
    x: number;
    y: number;
    selectedText: string;
    context: string;
  }>({ visible: false, x: 0, y: 0, selectedText: "", context: "" });
  const [adjustingText, setAdjustingText] = React.useState<string | null>(null);
  const [adjustPrompt, setAdjustPrompt] = React.useState("");
  const [adjustLoading, setAdjustLoading] = React.useState(false);

  // 切换电视剧时，强制使用剧情文档模式
  React.useEffect(() => {
    if (mediaType === "tv") {
      setAgentMode("doc");
    }
  }, [mediaType]);

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

  // 可用模型列表
  interface AvailableModel {
    id: string;
    name: string;
    model: string;
    baseUrl: string;
  }
  const [availableModels, setAvailableModels] = React.useState<AvailableModel[]>([]);
  const [selectedModel, setSelectedModel] = React.useState<{
    configId: string;
    modelName: string;
  } | null>(null);

  // 获取可用模型列表
  React.useEffect(() => {
    fetch("/api/ai/available-models")
      .then((res) => res.json())
      .then((data) => {
        const models = data.models || [];
        setAvailableModels(models);
        if (models.length > 0) {
          setSelectedModel({ configId: models[0].id, modelName: models[0].model });
        }
      })
      .catch(() => {});
  }, []);

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

  // 文案持久化到 localStorage
  React.useEffect(() => {
    if (result) {
      localStorage.setItem("script-generator-result", result);
    } else {
      localStorage.removeItem("script-generator-result");
    }
  }, [result]);

  React.useEffect(() => {
    if (savedId) {
      localStorage.setItem("script-generator-savedId", savedId);
    } else {
      localStorage.removeItem("script-generator-savedId");
    }
  }, [savedId]);

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
    const title = mediaType === "tv" ? tvTitle.trim() : form.movieTitle.trim();
    const res = await fetch("/api/ai/script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        movieTitle: title,
        genre: form.genre,
        style: form.style,
        duration: form.duration === "自定义" ? form.customDuration : form.duration,
        hookType: form.hookType,
        tone: form.tone,
        keywords: form.keywords.trim() || undefined,
        extraNotes: form.extraNotes.trim() || undefined,
        plotContext,
        configId: selectedModel?.configId || undefined,
        modelName: selectedModel?.modelName || undefined,
        entryPoint: form.entryPoint.trim() || undefined,
        uniqueAngle: form.uniqueAngle.trim() || undefined,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "生成失败");
    }
    // 处理 SSE 流式响应（防止 Vercel 504 超时）
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("text/event-stream")) {
      return new Promise<{ output: string; savedId: string | null }>((resolve, reject) => {
        const reader = res.body?.getReader();
        if (!reader) { reject(new Error("无法读取流")); return; }
        const decoder = new TextDecoder();
        let buffer = "";
        (async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split("\n\n");
            buffer = events.pop() || "";
            for (const evtStr of events) {
              if (!evtStr.trim()) continue;
              let eventType = "message", dataStr = "";
              for (const line of evtStr.split("\n")) {
                if (line.startsWith("event: ")) eventType = line.slice(7).trim();
                else if (line.startsWith("data: ")) dataStr += line.slice(6);
              }
              if (!dataStr) continue;
              try {
                const data = JSON.parse(dataStr);
                if (eventType === "done") {
                  resolve({ output: data.output, savedId: data.savedId ?? null });
                  return;
                }
                if (eventType === "error") { reject(new Error(data.message)); return; }
              } catch {}
            }
          }
          reject(new Error("流结束但未收到结果"));
        })();
      });
    }
    // 兼容旧版非流式响应
    return (await res.json()) as { output: string; savedId: string | null };
  };

  const handleGenerate = async () => {
    const title = mediaType === "tv" ? tvTitle.trim() : form.movieTitle.trim();
    if (!title) {
      toast.error(mediaType === "tv" ? "请先填写剧名" : "请先填写电影名称");
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
        const sseResult = await sseSearch.search(title, form.genre);
        if (!sseResult) {
          throw new Error("联网搜索失败");
        }
        finishStep(1, `找到 ${sseResult.sources.length} 个来源`);
        // 用 SSE 结果构造 SearchResult 兼容现有渲染
        const sdata: SearchResult = {
          movieTitle: sseResult.movieTitle || title,
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

  const handleAdjustText = async (originalText: string) => {
    if (!result || !adjustPrompt.trim()) return;
    setAdjustLoading(true);
    try {
      const res = await fetch("/api/ai/adjust-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalText,
          prompt: adjustPrompt,
          fullText: result,
        }),
      });
      if (!res.ok) throw new Error("调整失败");
      const data = await res.json() as { output: string };
      setResult(data.output);
      toast.success("文案已调整");
      setAdjustingText(null);
      setAdjustPrompt("");
      setSelectionPopup((p) => ({ ...p, visible: false }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "调整失败，请重试");
    } finally {
      setAdjustLoading(false);
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
        body: JSON.stringify({ 
          text, 
          mode: "design",
          style: form.tone || "标准播音腔",
          speed: 1.0 
        }),
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

  // 重置文案
  const handleReset = () => {
    setResult(null);
    setSavedId(null);
    setIsFav(false);
    localStorage.removeItem("script-generator-result");
    localStorage.removeItem("script-generator-savedId");
    toast.success("已重置，可以重新生成了");
  };

  // 跳转到语音试听界面
  const handleGoToVoice = (script: string) => {
    if (script) {
      localStorage.setItem("tts-pending-script", script);
    }
    selectTool("tts");
    setView("tools");
    toast.success("已跳转到语音试听，文案已自动传入");
  };

  const fillSample = (title: string, genre: string) => {
    setForm((p) => ({ ...p, movieTitle: title, genre }));
    toast.success(`已填入《${title}》`, { description: "可点击生成按钮立即创作" });
  };

  const openPlotDialog = () => {
    const title = mediaType === "tv" ? tvTitle.trim() : form.movieTitle.trim();
    setPlotForm({ movieTitle: title, content: "" });
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

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* 顶部标题区 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-6 max-w-2xl text-center"
        >
          <div className="mb-4 flex items-center justify-center gap-2">
            <Badge className="gap-1.5 border-primary/30 bg-primary/10 px-3 py-1 text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
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
        <div className="flex h-[calc(100vh-18rem)] items-stretch gap-6 overflow-hidden">
          {/* 左栏：表单 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex w-[38%] min-w-0 flex-col overflow-hidden"
          >
            <Card className="glass-card flex h-full flex-col overflow-hidden p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-2 shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Clapperboard className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold">创作参数</h2>
                  <p className="text-xs text-muted-foreground">填写后点击生成，AI 即刻创作</p>
                </div>
              </div>

              {/* 作品类型切换 */}
              <div className="mb-4 flex items-center gap-2 shrink-0">
                <span className="text-xs font-medium text-foreground/80">作品类型</span>
                <div className="flex gap-1 rounded-lg border border-border/70 bg-muted/30 p-0.5">
                  <button
                    type="button"
                    onClick={() => setMediaType("movie")}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-medium transition-all",
                      mediaType === "movie"
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    🎬 电影
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaType("tv")}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-medium transition-all",
                      mediaType === "tv"
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    📺 电视剧
                  </button>
                </div>
              </div>

              {/* AI 模型选择 */}
              {availableModels.length > 0 && (
                <div className="mb-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 shrink-0">
                  <Field label="AI 模型">
                    <Select
                      value={selectedModel ? `${selectedModel.configId}::${selectedModel.modelName}` : ""}
                      onValueChange={(val) => {
                        const parts = val.split("::");
                        if (parts.length === 2) {
                          setSelectedModel({ configId: parts[0], modelName: parts[1] });
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 border-primary/30 bg-primary/10 text-xs font-medium text-primary">
                        <SelectValue placeholder="选择模型" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map((am) => (
                          <SelectItem key={`${am.id}-${am.model}`} value={`${am.id}::${am.model}`} className="text-xs">
                            {am.name} - {am.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              )}

              <div className="flex-1 space-y-4 overflow-y-auto p-1">
                {mediaType === "movie" ? (
                  <Field label="电影名称" required>
                    <div className="flex items-center gap-2">
                      <Input
                        value={form.movieTitle}
                        onChange={(e) => updateField("movieTitle", e.target.value)}
                        placeholder="例如：消失的她"
                        className="h-10 flex-1"
                      />
                      <PasteTitleButton
                        onPasteText={(text) => updateField("movieTitle", text)}
                      />
                      <DoubanSearchButton
                        mode="home"
                        label="豆瓣"
                      />
                    </div>
                  </Field>
                ) : (
                  <div className="flex items-end gap-2">
                    <div className="flex-1 min-w-0">
                      <Field label="剧名" required>
                        <Input
                          value={tvTitle}
                          onChange={(e) => setTvTitle(e.target.value)}
                          placeholder="例如：狂飙"
                          className="h-10"
                        />
                      </Field>
                    </div>
                    <div className="shrink-0">
                      <Field label="集数">
                        <Select value={String(episodeNumber)} onValueChange={(v) => setEpisodeNumber(Number(v))}>
<SelectTrigger className="h-10 min-w-[90px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="min-w-[90px]">
                          {Array.from({ length: 60 }, (_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">
                              第{i + 1}集
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    </div>
                    <div className="flex items-end pb-2">
                      <DoubanSearchButton mode="home" label="豆瓣" />
                    </div>
                  </div>
                )}

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
                    {form.duration === "自定义" ? (
                      <div className="flex gap-2">
                        <Input
                          value={form.customDuration || ""}
                          onChange={(e) => updateField("customDuration", e.target.value)}
                          placeholder="如：40分钟"
                          className="h-10 flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateField("duration", "10分钟")}
                          className="h-10 shrink-0"
                        >
                          重置
                        </Button>
                      </div>
                    ) : (
                      <SelectField value={form.duration} onChange={(v) => updateField("duration", v)} options={DURATIONS} />
                    )}
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

                <Field label="内容切入点" hint="决定解说侧重点">
                  <Input
                    value={form.entryPoint}
                    onChange={(e) => updateField("entryPoint", e.target.value)}
                    placeholder="例如：完整剧情梳理、反转深度解析、导演彩蛋盘点"
                    className="h-10"
                  />
                </Field>

                <Field label="独家角度" hint="让内容不可替代">
                  <Input
                    value={form.uniqueAngle}
                    onChange={(e) => updateField("uniqueAngle", e.target.value)}
                    placeholder="例如：新片首发解说、冷门佳片挖掘、多刷发现的细节"
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
              </div>

              <div className="shrink-0 space-y-3 pt-4">
                <Button
                  onClick={handleGenerate}
                  disabled={loading}
                  size="lg"
                  className={cn(
                    "h-12 w-full gap-2 rounded-xl bg-gradient-to-r from-primary to-accent",
                    "text-base font-semibold text-primary-foreground shadow-glow-primary",
                    "transition-all hover:opacity-95 active:scale-[0.99] shrink-0",
                    "pb-1"
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
            className="flex w-[30%] min-w-0 flex-col overflow-hidden"
          >
            <AgentPanel
              agentMode={agentMode}
              setAgentMode={setAgentMode}
              isLoggedIn={!!user}
              steps={steps}
              movieTitle={mediaType === "tv" ? tvTitle.trim() || "电视剧" : form.movieTitle.trim() || "电影"}
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
              mediaType={mediaType}
            />
          </motion.div>

          {/* 右栏：结果 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex w-[32%] min-w-0 flex-col overflow-hidden"
          >
            <Card className="glass-card flex h-full flex-col overflow-hidden p-5 sm:p-6">
              {loading && agentMode === "web" ? (
                <AgentRunningSkeleton />
              ) : loading ? (
                <ResultSkeleton />
              ) : result ? (
                <ResultPanel
                  result={result}
                  resultStats={resultStats}
                  onCopy={handleCopy}
                  onRegenerate={handleGenerate}
                  onReset={handleReset}
                  onGoToVoice={handleGoToVoice}
                  selectionPopup={selectionPopup}
                  adjustingText={adjustingText}
                  adjustPrompt={adjustPrompt}
                  adjustLoading={adjustLoading}
                  onAdjustText={handleAdjustText}
                  onSetAdjustingText={setAdjustingText}
                  onSetAdjustPrompt={setAdjustPrompt}
                  onSetSelectionPopup={setSelectionPopup}
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
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              新建剧情文档
            </DialogTitle>
            <DialogDescription>
              可粘贴豆瓣 / 维基的剧情简介，或上传 TXT 文档 / 字幕文件。AI 将基于此内容创作解说文案。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto pr-2 p-px">
            <Field label="电影名称" required>
              <Input
                value={plotForm.movieTitle}
                onChange={(e) => setPlotForm((p) => ({ ...p, movieTitle: e.target.value }))}
                placeholder="例如：肖申克的救赎"
                className="h-10"
              />
            </Field>
            <Field label="上传文件" hint="支持 TXT、字幕文件 (SRT/ASS)">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".txt,.srt,.ass,.vtt"
                  className="hidden"
                  id="plot-file-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      let text = ev.target?.result as string || "";
                      // 处理字幕文件：移除时间轴和标签
                      if (file.name.endsWith(".srt") || file.name.endsWith(".ass") || file.name.endsWith(".vtt")) {
                        text = text
                          .replace(/^\d+\s*\n[\d:, -->]+\n/gm, "") // 移除序号和时间轴
                          .replace(/<[^>]+>/g, "") // 移除HTML/ASS标签
                          .replace(/\{[^}]+\}/g, "") // 移除ASS样式标签
                          .replace(/\\N/g, "\n") // ASS换行符
                          .trim();
                      }
                      setPlotForm((p) => ({ ...p, content: text.replace(/\s+/g, " ").trim() }));
                      toast.success(`已加载 ${file.name}，${text.length} 字`);
                    };
                    reader.readAsText(file);
                    e.target.value = ""; // 重置以便重复选择同一文件
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => document.getElementById("plot-file-upload")?.click()}
                >
                  <Upload className="h-3.5 w-3.5" />
                  上传 TXT / 字幕
                </Button>
                <span className="text-xs text-muted-foreground">
                  {plotForm.content ? "已上传，可继续编辑" : "或直接粘贴内容"}
                </span>
              </div>
            </Field>
            <Field label="剧情内容" required hint={`${plotForm.content.length} 字`}>
              <Textarea
                value={plotForm.content}
                onChange={(e) => setPlotForm((p) => ({ ...p, content: e.target.value }))}
                placeholder="在此粘贴或输入真实剧情描述，建议 500 字以上，包含主要人物、关键情节、结局走向…"
                className="h-[240px] resize-none scrollbar-thin overflow-y-auto"
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
        defaultMovieTitle={mediaType === "tv" ? tvTitle.trim() : form.movieTitle.trim()}
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
  mediaType: "movie" | "tv";
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
    mediaType,
  } = props;

  const hasTimeline = agentMode === "web" && steps.some((s) => s.status !== "pending");
  // SSE 实时推送的 sources 优先，否则用 searchResult
  const displaySources = liveSources && liveSources.length > 0 ? liveSources : searchResult?.sources || [];
  const hasSources = agentMode === "web" && displaySources.length > 0;
  const hasPlotLib = agentMode === "doc";

  return (
    <Card
      className={cn(
        "glass-card flex h-full flex-col overflow-hidden p-5 transition-all",
        isRunning && "ring-1 ring-primary/40 shadow-glow-primary"
      )}
    >
      {isRunning && (
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-px animate-pulse bg-gradient-to-r from-transparent via-primary to-transparent" />
      )}
      <div className="mb-5 flex items-center gap-2 shrink-0">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
            isRunning ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground"
          )}
        >
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold">Agent 协作</h2>
          <p className="text-xs text-muted-foreground">
            {isRunning ? "正在执行任务…" : "选择剧情来源，让 AI 基于真实剧情创作"}
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-px">
        <SourceSelector
          value={agentMode}
          onChange={setAgentMode}
          disabled={isRunning}
          mediaType={mediaType}
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
                  <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-primary">
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
      <span className="text-primary">{icon}</span>
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
  disabled,
  mediaType,
}: {
  value: AgentMode;
  onChange: (v: AgentMode) => void;
  disabled: boolean;
  mediaType: "movie" | "tv";
}) {
  const options: SourceOption[] = [
    {
      id: "web",
      icon: <Globe className="h-4 w-4" />,
      label: "联网搜索真实剧情",
      desc: mediaType === "tv" ? "电视剧分集数据需上传剧情文档" : "Agent 自动联网抓取 + 深度阅读，约 5-15 秒",
      locked: mediaType === "tv",
    },
    {
      id: "doc",
      icon: <FileText className="h-4 w-4" />,
      label: "使用剧情文档",
      desc: "从你的剧情文档库选取已存或上传剧情文档",
      locked: false,
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
                ? "border-primary bg-primary/5 shadow-glow-primary"
                : "border-border/60 hover:border-primary/40 hover:bg-muted/30",
              isDisabled && "cursor-not-allowed opacity-60"
            )}
          >
            <div
              className={cn(
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                active ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground"
              )}
            >
              {opt.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{opt.label}</span>
                {active && !opt.locked && <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />}
                {opt.id === "web" && mediaType === "tv" && (
                  <Badge variant="outline" className="h-4 px-1.5 text-[10px] border-amber-500/50 text-amber-600">
                    电视剧不可用
                  </Badge>
                )}
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
              <p className="mt-0.5 text-[11px] text-primary/70">处理中…</p>
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
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary ring-2 ring-primary/30">
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
                    ? "border-primary bg-primary/5 shadow-glow-primary"
                    : "border-border/60 hover:border-primary/40 hover:bg-muted/30"
                )}
                onClick={() => onSelect(active ? null : p.id)}
              >
                <div className="flex items-center gap-2 pr-6">
                  <span className="truncate text-sm font-medium">{p.movieTitle}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-4 px-1.5 text-[10px]",
                      p.source === "web" ? "border-primary/30 text-primary" : "border-accent/30 text-accent"
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
            <span className="text-xs font-medium text-primary">已选剧情预览</span>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] text-muted-foreground hover:text-primary"
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
          className="block rounded-md border border-border/60 p-2 transition-all hover:border-primary/40 hover:bg-muted/30"
        >
          <div className="flex items-center gap-1.5">
            <Globe className="h-3 w-3 shrink-0 text-primary" />
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
          {required && <span className="ml-0.5 text-primary">*</span>}
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
    <div className="flex h-full flex-col overflow-y-auto">
      {/* 统一的头部 */}
      <div className="mb-5 flex items-center gap-2 shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Film className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold">文案预览</h2>
          <p className="text-xs text-muted-foreground">生成后在此预览完整文案</p>
        </div>
      </div>

      {/* 空状态内容 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-1 flex-col items-center justify-center text-center"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
          <ScrollText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold">还没有生成文案</h3>
        <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
          填写左侧电影信息与创作参数，选择中栏的 Agent 协作模式，点击「生成独家精选文案」即可。
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {SAMPLE_MOVIES.map((m) => (
            <button
              key={m.title}
              onClick={() => onPick(m.title, m.genre)}
              className="group inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3.5 py-1.5 text-xs font-medium transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            >
              <Star className="h-3 w-3 text-accent" />
              {m.title}
            </button>
          ))}
        </div>
        <div className="mt-6 grid w-full max-w-xs grid-cols-3 gap-3">
          {[
            { icon: Lightbulb, label: "黄金3秒开头" },
            { icon: Wand2, label: "高密度反转" },
            { icon: Sparkles, label: "互动金句结尾" },
          ].map((f) => (
            <div key={f.label} className="rounded-lg border border-border/40 bg-muted/30 p-3">
              <f.icon className="mx-auto mb-1.5 h-4 w-4 text-primary" />
              <p className="text-[10px] leading-tight text-muted-foreground">{f.label}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* 统一的头部 */}
      <div className="mb-5 flex items-center gap-2 shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Film className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold">文案预览</h2>
          <p className="text-xs text-muted-foreground">生成后在此预览完整文案</p>
        </div>
      </div>

      {/* 加载状态 */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          AI 正在精心创作，请稍候…
        </div>
        <div className="relative w-full space-y-4 overflow-hidden">
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
        </div>
      </div>
    </div>
  );
}

function AgentRunningSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* 统一的头部 */}
      <div className="mb-5 flex items-center gap-2 shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Film className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold">文案预览</h2>
          <p className="text-xs text-muted-foreground">生成后在此预览完整文案</p>
        </div>
      </div>

      {/* 加载状态 */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Bot className="h-8 w-8 text-primary" />
          <span className="absolute -right-1 -top-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
          </span>
        </div>
        <h3 className="text-sm font-semibold">Agent 正在协作创作</h3>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
          请查看中栏 Agent 面板的实时执行进度，搜索 + 阅读 + 整合 + 生成四步流程即将完成…
        </p>
      </div>
    </div>
  );
}

interface ResultPanelProps {
  result: string;
  resultStats: { chars: number; words: number; sentences: number; paragraphs: number; readingTime: number } | null;
  onCopy: () => void;
  onRegenerate: () => void;
  onReset: () => void;
  onGoToVoice: (script: string) => void;
  selectionPopup: {
    visible: boolean;
    x: number;
    y: number;
    selectedText: string;
    context: string;
  };
  adjustingText: string | null;
  adjustPrompt: string;
  adjustLoading: boolean;
  onAdjustText: (text: string) => void;
  onSetAdjustingText: (text: string | null) => void;
  onSetAdjustPrompt: (prompt: string) => void;
  onSetSelectionPopup: (popup: { visible: boolean; x: number; y: number; selectedText: string; context: string }) => void;
}

function ResultPanel({
	  result,
	  resultStats,
	  onCopy,
	  onRegenerate,
	  onReset,
	  onGoToVoice,
	  selectionPopup,
	  adjustingText,
	  adjustPrompt,
	  adjustLoading,
	  onAdjustText,
	  onSetAdjustingText,
	  onSetAdjustPrompt,
	  onSetSelectionPopup,
		}: ResultPanelProps) {
  const isUnverified = result.includes("剧情未经校验");
  const [chatPrompt, setChatPrompt] = React.useState("");
  const [chatLoading, setChatLoading] = React.useState(false);
  const [chatResult, setChatResult] = React.useState<string | null>(null);

  const handleChatAdjust = async () => {
    if (!chatPrompt.trim() || chatLoading) return;
    setChatLoading(true);
    try {
      const res = await fetch("/api/ai/adjust-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalText: chatResult || result,
          prompt: chatPrompt.trim(),
          fullText: chatResult || result,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "调整失败");
      setChatResult(data.output);
      setChatPrompt("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "调整失败");
    } finally {
      setChatLoading(false);
    }
  };
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* 统一的头部 */}
      <div className="mb-5 flex items-center gap-2 border-b border-border/60 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Film className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">文案预览</h2>
            <p className="text-xs text-muted-foreground">生成后在此预览完整文案</p>
          </div>
        </div>
{/* 右侧操作按钮 */}
	        <div className="ml-auto flex items-center gap-1">
	          <Button size="sm" variant="ghost" className="h-8 gap-1.5 px-2" onClick={onCopy} title="复制">
	            <Copy className="h-4 w-4" />
	          </Button>
	          <Button size="sm" variant="ghost" className="h-8 gap-1.5 px-2" onClick={onRegenerate} title="重生成">
	            <RefreshCw className="h-4 w-4" />
	          </Button>
	          <Button size="sm" variant="ghost" className="h-8 gap-1.5 px-2" onClick={onReset} title="重置">
	            <RotateCcw className="h-4 w-4" />
	          </Button>
	          <Button size="sm" className="h-8 gap-1.5 px-2 bg-gradient-to-r from-primary to-accent hover:opacity-90" onClick={() => onGoToVoice(result)} title="语音试听">
	            <Volume2 className="h-4 w-4" />
	          </Button>
	        </div>
	      </div>
	      
	      {/* 文案统计 */}
	      {resultStats && (
	        <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg bg-muted/40 px-4 py-2 text-xs">
	          <div className="flex items-center gap-1.5">
	            <span className="text-muted-foreground">字数</span>
	            <span className="font-semibold text-primary">{resultStats.chars.toLocaleString()}</span>
	          </div>
	          <div className="flex items-center gap-1.5">
	            <span className="text-muted-foreground">句数</span>
	            <span className="font-semibold text-primary">{resultStats.sentences}</span>
	          </div>
	          <div className="flex items-center gap-1.5">
	            <span className="text-muted-foreground">段落</span>
	            <span className="font-semibold text-primary">{resultStats.paragraphs}</span>
	          </div>
	          <div className="flex items-center gap-1.5">
	            <span className="text-muted-foreground">预估朗读</span>
	            <span className="font-semibold text-primary">{resultStats.readingTime}分钟</span>
	          </div>
	        </div>
	      )}

      {/* 黄色未校验提示 */}
      {isUnverified && (
        <div className="mb-3 flex items-start gap-2 rounded-md bg-amber-500/10 p-2 text-amber-700 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p className="text-[11px] leading-relaxed">
            本文案未使用 Agent 协作，剧情部分由 AI 自行发挥，<strong>可能存在虚构</strong>。
          </p>
        </div>
      )}

      {/* 内容区 */}
      <div
        className="scrollbar-thin min-h-0 flex-1 overflow-y-auto"
        onMouseUp={() => {
          setTimeout(() => {
            const selection = window.getSelection();
            const selectedText = selection?.toString().trim() || "";
            if (selectedText && selectedText.length > 2) {
              const range = selection?.getRangeAt(0);
              if (range) {
                const rect = range.getBoundingClientRect();
                onSetSelectionPopup({
                  visible: true,
                  x: rect.left + rect.width / 2,
                  y: rect.top - 10,
                  selectedText,
                  context: result || "",
                });
                onSetAdjustingText(selectedText);
                onSetAdjustPrompt("");
              }
            } else {
              onSetSelectionPopup({ ...selectionPopup, visible: false });
              onSetAdjustingText(null);
            }
          }, 10);
        }}
      >
        <div className="rounded-xl border-l-2 border-primary bg-card/40 p-5">
          <Markdown content={result} />
        </div>
      </div>

      {/* 选中文本调整浮层 — 自适应上下位置 */}
      {selectionPopup.visible && (
        <div
          className="fixed z-50"
          style={{
            left: `${Math.min(selectionPopup.x, window.innerWidth - 320)}px`,
            top: `${selectionPopup.y < 260 ? selectionPopup.y + 15 : selectionPopup.y - 10}px`,
            transform: selectionPopup.y < 260 ? "translate(-50%, 0%)" : "translate(-50%, -100%)",
          }}
        >
          <Card className="w-80 border-2 border-primary/40 bg-background p-4 shadow-2xl shadow-primary/20">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Wand2 className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-semibold">调整选中文案</span>
              </div>
              <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                {selectionPopup.selectedText.length}字
              </span>
            </div>
            <div className="mb-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs leading-relaxed text-foreground/80">
              “{selectionPopup.selectedText.slice(0, 80)}{selectionPopup.selectedText.length > 80 ? "…" : ""}”
            </div>
            <Textarea
              value={adjustPrompt}
              onChange={(e) => onSetAdjustPrompt(e.target.value)}
              placeholder="例如：让这段更有悬念、换个更口语化的表达..."
              className="mb-3 min-h-[70px] resize-none text-sm border-primary/30 bg-muted/40 focus:border-primary focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onSetAdjustingText(null);
                  onSetAdjustPrompt("");
                  onSetSelectionPopup({ ...selectionPopup, visible: false });
                }}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                size="sm"
                onClick={() => onAdjustText(selectionPopup.selectedText)}
                disabled={adjustLoading || !adjustPrompt.trim()}
                className="flex-1 gap-1 bg-gradient-to-r from-primary to-accent text-primary-foreground"
              >
                {adjustLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                应用
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* AI 对话调整个文案 - 类 ChatGPT 风格 */}
      <div className="shrink-0 border-t border-border/40 pt-4 mt-2">
        {/* 对话历史 */}
        {chatResult && (
          <div className="mb-3 space-y-3">
            {/* 用户消息 */}
            <div className="flex gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                U
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-muted/70 px-3.5 py-2 text-xs leading-relaxed text-foreground/90 max-w-[85%]">
                {chatPrompt || "调整文案"}
              </div>
            </div>
            {/* AI 回复 */}
            <div className="flex gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-border/50 bg-card px-3.5 py-2 text-xs leading-relaxed text-foreground/90 max-w-[85%] whitespace-pre-wrap">
                {chatResult}
              </div>
            </div>
          </div>
        )}

        {/* 输入区域 */}
        <div className="relative flex items-end gap-2 rounded-2xl border border-border/60 bg-muted/20 px-3 py-2 transition-all focus-within:border-primary/50 focus-within:bg-primary/[0.02] focus-within:shadow-[0_0_0_2px_rgba(59,130,246,0.08)]">
          <Textarea
            value={chatPrompt}
            onChange={(e) => setChatPrompt(e.target.value)}
            placeholder="输入调整要求..."
            className="min-h-[24px] max-h-[100px] resize-none border-0 bg-transparent p-0 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0 shadow-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleChatAdjust();
              }
            }}
          />
          <button
            type="button"
            onClick={handleChatAdjust}
            disabled={chatLoading || !chatPrompt.trim()}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {chatLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            )}
          </button>
        </div>
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
    <div className="space-y-3 min-h-0">
      {/* 概览栏 */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-3">
        <div className="flex items-center gap-1.5 text-xs">
          <ListTree className="h-3.5 w-3.5 text-primary" />
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
          className="ml-auto h-7 gap-1.5 rounded-full bg-gradient-to-r from-primary to-accent px-3 text-xs text-primary-foreground"
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
            className="group flex gap-3 rounded-lg border border-border/60 bg-card/30 p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
          >
            {/* 镜号 */}
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
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
    <div className="text-sm leading-relaxed text-foreground/90 min-h-0">
      <ReactMarkdown
        components={{
          h2: ({ children }) => (
            <h2 className="mb-3 mt-5 flex items-center gap-2 border-b border-border/50 pb-2 text-base font-bold text-foreground first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 text-sm font-semibold text-primary">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-3 leading-7 text-foreground/85">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 ml-4 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 ml-4 list-decimal space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-7 text-foreground/85">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-accent pl-3 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-border/50" />,
          code: ({ children }) => (
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-primary">{children}</code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
