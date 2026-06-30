"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Clapperboard,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  Search,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export function ExclusiveScriptTool() {
  const [movieTitle, setMovieTitle] = React.useState("");
  const [targetChars, setTargetChars] = React.useState("");
  const [duration, setDuration] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [output, setOutput] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const [needsConfirm, setNeedsConfirm] = React.useState(false);
  const [searchInfo, setSearchInfo] = React.useState<{
    sourceCount: number;
  } | null>(null);

  const canGenerate = movieTitle.trim() && !generating;

  const handleGenerate = async () => {
    if (!movieTitle.trim()) {
      toast.error("请输入电影或剧集名称");
      return;
    }

    // 字数确认机制
    const chars = Number(targetChars);
    if (!targetChars.trim() || isNaN(chars) || chars <= 0 || !duration.trim()) {
      setNeedsConfirm(true);
      setOutput("");
      return;
    }

    setNeedsConfirm(false);
    setGenerating(true);
    setOutput("");
    setSearchInfo(null);

    try {
      const res = await fetch("/api/ai/film-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieTitle: movieTitle.trim(),
          targetChars: chars,
          duration: duration.trim(),
        }),
      });

      const data = await res.json();

      if (data.requireConfirm) {
        setNeedsConfirm(true);
        toast.info(data.message || "请填写字数和时长");
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || `生成失败 (${res.status})`);
      }

      setOutput(data.script || "");
      if (data.plotSourceCount > 0) {
        setSearchInfo({ sourceCount: data.plotSourceCount });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("复制失败");
    }
  };

  return (
    <div className="space-y-4">
      {/* 标识组件：独家一键出稿 */}
      <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-accent/[0.04] px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
          <Clapperboard className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              独家一键出稿
            </span>
            <Badge variant="secondary" className="h-5 text-[10px]">
              影评式解说
            </Badge>
            <Badge variant="outline" className="h-5 border-sky-500/30 text-[10px] text-sky-600 dark:text-sky-400">
              <Search className="mr-0.5 h-3 w-3" />
              强制联网
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            无需提供剧情文档，输入片名即可基于联网真实剧情生成带观点的影评解说
          </p>
        </div>
      </div>

      {/* 输入区 */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">电影 / 剧集名称</Label>
          <Input
            value={movieTitle}
            onChange={(e) => setMovieTitle(e.target.value)}
            placeholder="输入电影或剧集名称，如：肖申克的救赎"
            className="h-9 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && canGenerate) handleGenerate();
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              目标字数
              <span className="ml-1 font-normal text-muted-foreground">（必填）</span>
            </Label>
            <Input
              type="number"
              min={100}
              max={10000}
              value={targetChars}
              onChange={(e) => setTargetChars(e.target.value)}
              placeholder="如：2500"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              对应时长
              <span className="ml-1 font-normal text-muted-foreground">（必填）</span>
            </Label>
            <Input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="如：8分钟"
              className="h-9 text-sm"
            />
          </div>
        </div>

        {needsConfirm && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>请问这条要写多少字、对应时长多少？请填写上方字数和时长后再试。</span>
          </motion.div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              联网搜索并生成中...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              一键生成影评解说
            </>
          )}
        </Button>
      </div>

      {/* 搜索信息 */}
      {searchInfo && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Badge variant="outline" className="h-5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
            <Search className="mr-0.5 h-3 w-3" />
            已联网搜索 {searchInfo.sourceCount} 个来源
          </Badge>
        </div>
      )}

      {/* 输出区 */}
      {output && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold">生成结果</span>
              <Badge variant="secondary" className="h-5 text-[10px]">
                共 {output.length} 字
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 gap-1.5 text-xs"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  复制文案
                </>
              )}
            </Button>
          </div>
          <div className="relative rounded-xl border bg-card p-4 text-sm leading-relaxed">
            <div className="whitespace-pre-wrap break-words">{output}</div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
