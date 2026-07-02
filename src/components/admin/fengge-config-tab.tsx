"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Mic,
  Loader2,
  Upload,
  Trash2,
  CheckCircle2,
  AudioLines,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FenggeConfig {
  hasVoice: boolean;
  quota: number;
}

const AUDIO_ACCEPT =
  "audio/wav,audio/mpeg,audio/mp3,audio/m4a,audio/x-m4a,audio/webm,audio/ogg";

export function FenggeConfigTab() {
  const [config, setConfig] = React.useState<FenggeConfig | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [quotaInput, setQuotaInput] = React.useState("5");
  const [file, setFile] = React.useState<File | null>(null);
  const [savingVoice, setSavingVoice] = React.useState(false);
  const [savingQuota, setSavingQuota] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);

  const loadData = React.useCallback(async () => {
    try {
      const resp = await fetch("/api/admin/fengge-config");
      const d = await resp.json();
      if (resp.ok) {
        setConfig({ hasVoice: d.hasVoice, quota: d.quota });
        setQuotaInput(String(d.quota ?? 5));
      } else {
        toast.error(d.error || "加载荒哥配置失败");
      }
    } catch {
      toast.error("加载荒哥配置失败");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveQuota = async () => {
    const v = Number(quotaInput);
    if (!Number.isFinite(v) || v < 0) {
      toast.error("游客配额必须是非负数字");
      return;
    }
    setSavingQuota(true);
    try {
      const form = new FormData();
      form.append("action", "quota_only");
      form.append("quota", String(Math.floor(v)));
      const resp = await fetch("/api/admin/fengge-config", {
        method: "PUT",
        body: form,
      });
      const d = await resp.json();
      if (resp.ok) {
        toast.success("游客配额已保存");
        setConfig((c) => (c ? { ...c, quota: d.quota ?? Math.floor(v) } : c));
      } else {
        toast.error(d.error || "保存失败");
      }
    } catch {
      toast.error("保存失败");
    } finally {
      setSavingQuota(false);
    }
  };

  const handleUploadVoice = async () => {
    if (!file) {
      toast.error("请先选择音频文件");
      return;
    }
    setSavingVoice(true);
    try {
      const form = new FormData();
      form.append("action", "upload");
      form.append("quota", quotaInput);
      form.append("file", file);
      const resp = await fetch("/api/admin/fengge-config", {
        method: "PUT",
        body: form,
      });
      const d = await resp.json();
      if (resp.ok) {
        toast.success("荒哥音色已更新");
        setFile(null);
        setConfig((c) => (c ? { ...c, hasVoice: true, quota: d.quota ?? c.quota } : c));
        if (typeof d.quota === "number") setQuotaInput(String(d.quota));
      } else {
        toast.error(d.error || "上传失败");
      }
    } catch {
      toast.error("上传失败");
    } finally {
      setSavingVoice(false);
    }
  };

  const handleRemoveVoice = async () => {
    setRemoving(true);
    try {
      const form = new FormData();
      form.append("action", "remove");
      const resp = await fetch("/api/admin/fengge-config", {
        method: "PUT",
        body: form,
      });
      const d = await resp.json();
      if (resp.ok) {
        toast.success("已移除荒哥音色，朗读将回落预置音色");
        setConfig((c) => (c ? { ...c, hasVoice: false } : c));
      } else {
        toast.error(d.error || "移除失败");
      }
    } catch {
      toast.error("移除失败");
    } finally {
      setRemoving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mic className="h-4 w-4 text-primary" />
          和荒哥聊聊 · 配置
        </CardTitle>
        <CardDescription>
          配置「和荒哥聊聊」的荒哥参考音色（语音克隆）与游客免费对话轮数。
          未配置音色时，朗读自动回落到默认预置音色。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 音色状态 */}
        <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-4 py-3">
          <AudioLines className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <div className="text-sm font-medium">荒哥音色</div>
            <div className="text-xs text-muted-foreground">
              建议 15-45 秒干净人声录音，≤5MB（wav/mp3/m4a/webm/ogg）
            </div>
          </div>
          {config?.hasVoice ? (
            <Badge className="rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              已配置音色（克隆模式）
            </Badge>
          ) : (
            <Badge variant="outline" className="rounded-lg">
              未配置 · 预置音色
            </Badge>
          )}
        </div>

        {/* 上传音色 */}
        <div className="space-y-2">
          <Label htmlFor="fengge-voice-file">上传 / 替换荒哥参考音频</Label>
          <div className="flex items-center gap-2">
            <Input
              id="fengge-voice-file"
              type="file"
              accept={AUDIO_ACCEPT}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="rounded-lg"
            />
            <Button
              onClick={handleUploadVoice}
              disabled={!file || savingVoice}
              className="shrink-0 rounded-lg"
            >
              {savingVoice ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-1 h-4 w-4" />
              )}
              保存音色
            </Button>
          </div>
          {file && (
            <div className="text-xs text-muted-foreground">
              已选择：{file.name}（{(file.size / 1024).toFixed(1)} KB)
            </div>
          )}
          {config?.hasVoice && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveVoice}
              disabled={removing}
              className="mt-1 h-8 rounded-lg text-destructive hover:text-destructive"
            >
              {removing ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-3 w-3" />
              )}
              移除音色
            </Button>
          )}
        </div>

        {/* 游客配额 */}
        <div className="space-y-2">
          <Label htmlFor="fengge-guest-quota">游客免费对话轮数</Label>
          <div className="flex items-center gap-2">
            <Input
              id="fengge-guest-quota"
              type="number"
              min={0}
              value={quotaInput}
              onChange={(e) => setQuotaInput(e.target.value)}
              className="max-w-[160px] rounded-lg"
            />
            <Button
              onClick={handleSaveQuota}
              disabled={savingQuota}
              variant="outline"
              className="rounded-lg"
            >
              {savingQuota ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : null}
              保存配额
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            游客（未登录）可免费对话的轮数，超出后引导登录。设为 0 表示游客不可聊。
          </div>
        </div>
      </CardContent>
    </Card>
  );
}