"use client";

import * as React from "react";
import {
  Cpu,
  Plus,
  Pencil,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  Crown,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserAiModelItem {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  apiKeyMasked: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserAiModelForm {
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string;
}

export function UserAiModels() {
  const [models, setModels] = React.useState<UserAiModelItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [showKey, setShowKey] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<UserAiModelItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [form, setForm] = React.useState<UserAiModelForm>({
    name: "",
    baseUrl: "",
    model: "",
    apiKey: "",
  });

  const fetchModels = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/models");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setModels(data.models || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载模型失败");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", baseUrl: "", model: "", apiKey: "" });
    setShowKey(false);
    setDialogOpen(true);
  };

  const openEdit = (m: UserAiModelItem) => {
    setEditingId(m.id);
    setForm({
      name: m.name,
      baseUrl: m.baseUrl,
      model: m.model,
      apiKey: "",
    });
    setShowKey(false);
    setDialogOpen(true);
  };

  const normalizeBaseUrl = (url: string) =>
    url.replace(/\/+$/, "").replace(/\/chat\/completions\/?$/i, "");

  const handleTestConnection = async () => {
    if (!form.baseUrl.trim() || !form.model.trim()) {
      toast.error("Base URL 和模型名均不能为空");
      return;
    }
    if (!form.apiKey.trim() && !editingId) {
      toast.error("请先填写 API Key");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/ai/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: normalizeBaseUrl(form.baseUrl.trim()),
          model: form.model.trim(),
          apiKey: form.apiKey.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `连接失败 (${res.status})`);
      toast.success("连接成功！模型可用");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "测试连接失败");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.baseUrl.trim() || !form.model.trim()) {
      toast.error("显示名、Base URL、模型名均为必填");
      return;
    }
    if (!editingId && !form.apiKey.trim()) {
      toast.error("新增模型时 API Key 必填");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        baseUrl: normalizeBaseUrl(form.baseUrl.trim()),
        model: form.model.trim(),
      };
      if (form.apiKey.trim()) body.apiKey = form.apiKey.trim();

      const url = editingId
        ? `/api/ai/models/${editingId}`
        : "/api/ai/models";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      toast.success(editingId ? "模型已更新" : "模型已添加");
      setDialogOpen(false);
      fetchModels();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存模型失败");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (m: UserAiModelItem) => {
    try {
      const res = await fetch(`/api/ai/models/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !m.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "切换失败");
      toast.success(m.isActive ? "已停用" : "已启用");
      fetchModels();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "切换状态失败");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/ai/models/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "删除失败");
      toast.success("模型已删除");
      setDeleteTarget(null);
      fetchModels();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "删除模型失败");
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const activeCount = models.filter((m) => m.isActive).length;

  return (
    <div className="space-y-4">
      <Card className="p-0">
        <CardHeader className="border-b px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Cpu className="h-4 w-4 text-primary" />
                我的 AI 模型
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                配置自己的模型，优先使用。未配置时回退到管理员全局模型。
              </CardDescription>
            </div>
            <Button size="sm" onClick={openCreate} disabled={models.length >= 5}>
              <Plus className="mr-1.5 h-4 w-4" />
              添加模型
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              加载中…
            </div>
          ) : models.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Cpu className="h-7 w-7 opacity-40" />
              <p className="text-sm">尚未配置自己的模型</p>
              <p className="text-[11px] text-muted-foreground/70">
                添加后，AI 文案生成将优先使用你的模型
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[28%]">显示名 / 模型名</TableHead>
                  <TableHead className="w-[28%]">Base URL</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="font-medium">{m.name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {m.model}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground break-all">
                      {m.baseUrl}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {m.apiKeyMasked || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(m)}
                        className="inline-flex items-center gap-1.5 text-xs hover:opacity-80"
                        title={m.isActive ? "点击停用" : "点击启用"}
                      >
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            m.isActive ? "bg-emerald-500" : "bg-muted-foreground/40"
                          )}
                        />
                        {m.isActive ? "启用" : "停用"}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => openEdit(m)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-rose-500 hover:text-rose-600"
                          onClick={() => setDeleteTarget(m)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 创建 / 编辑 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑模型" : "添加模型"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "修改模型信息，API Key 留空则保留原值"
                : "填写 OpenAI 兼容端点信息，添加后优先使用你的模型"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>显示名</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="如：我的 GLM-4-Flash"
              />
            </div>

            <div className="grid gap-2">
              <Label>Base URL</Label>
              <Input
                value={form.baseUrl}
                onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                placeholder="https://open.bigmodel.cn/api/paas/v4"
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                OpenAI 兼容端点，无需带 /chat/completions 后缀
              </p>
            </div>

            <div className="grid gap-2">
              <Label>模型名</Label>
              <Input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="glm-4-flash"
                className="font-mono text-xs"
              />
            </div>

            <div className="grid gap-2">
              <Label>API Key</Label>
              <div className="relative">
                <KeyRound className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showKey ? "text" : "password"}
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder={editingId ? "留空则不修改" : "输入 API Key"}
                  className="pl-8 pr-9 font-mono text-xs"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  title={showKey ? "隐藏" : "显示"}
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="secondary"
              onClick={handleTestConnection}
              disabled={testing}
            >
              {testing ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  测试中…
                </>
              ) : (
                "测试连接"
              )}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  保存中…
                </>
              ) : editingId ? (
                "保存修改"
              ) : (
                "添加"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除模型</AlertDialogTitle>
            <AlertDialogDescription>
              将删除「{deleteTarget?.name}」，该操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-500 text-white hover:bg-rose-600"
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

      <p className="px-1 text-[11px] text-muted-foreground">
        共 {models.length} 个模型 · 启用 {activeCount} 个 · 最后更新{" "}
        {models[0] ? formatDate(models[0].updatedAt) : "—"}
      </p>
    </div>
  );
}
