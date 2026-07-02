"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Trash2,
  Loader2,
  Copy,
  CheckCircle2,
  AlertCircle,
  Clock,
  Power,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface ActivationRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  machineId: string;
  expireDate: string;
  activatedAt: string;
  expired: boolean;
  daysLeft: number;
}

interface AuthData {
  authRequired: boolean;
  activations: ActivationRecord[];
}

export function AuthorizationTab() {
  const [data, setData] = React.useState<AuthData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [toggling, setToggling] = React.useState(false);

  const loadData = React.useCallback(async () => {
    try {
      const resp = await fetch("/api/admin/authorization");
      const d = await resp.json();
      if (resp.ok) {
        setData(d);
      }
    } catch {
      toast.error("加载授权信息失败");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (enabled: boolean) => {
    setToggling(true);
    try {
      const resp = await fetch("/api/admin/authorization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const d = await resp.json();
      if (resp.ok) {
        toast.success(enabled ? "授权已开启" : "授权已关闭", {
          description: enabled
            ? "未激活用户将无法使用平台功能"
            : "所有用户可自由使用平台",
        });
        setData((prev) => (prev ? { ...prev, authRequired: enabled } : prev));
      } else {
        toast.error(d.error || "操作失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setToggling(false);
    }
  };

  const handleRevoke = async (id: string, name: string) => {
    if (!confirm(`确定要撤销 ${name} 的授权吗？`)) return;
    try {
      const resp = await fetch(`/api/admin/authorization?id=${id}`, {
        method: "DELETE",
      });
      if (resp.ok) {
        toast.success("已撤销授权");
        loadData();
      } else {
        toast.error("撤销失败");
      }
    } catch {
      toast.error("网络错误");
    }
  };

  const handleCopyMachineId = (machineId: string) => {
    navigator.clipboard.writeText(machineId);
    toast.success("机器码已复制");
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeCount = data?.activations.filter((a) => !a.expired).length ?? 0;
  const expiredCount = data?.activations.filter((a) => a.expired).length ?? 0;

  return (
    <div className="space-y-4">
      {/* 授权开关 */}
      <Card>
        <CardHeader className="border-b px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  data?.authRequired
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {data?.authRequired ? (
                  <ShieldCheck className="h-5 w-5" />
                ) : (
                  <ShieldAlert className="h-5 w-5" />
                )}
              </div>
              <div>
                <CardTitle className="text-base">授权开关</CardTitle>
                <CardDescription className="text-xs">
                  {data?.authRequired
                    ? "已开启 — 未激活用户无法使用平台功能"
                    : "已关闭 — 所有用户可自由使用平台"}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {data?.authRequired ? "已开启" : "已关闭"}
              </span>
              <Switch
                checked={data?.authRequired ?? false}
                onCheckedChange={handleToggle}
                disabled={toggling}
              />
            </div>
          </div>
        </CardHeader>
        {data?.authRequired && (
          <CardContent className="px-5 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Power className="h-3.5 w-3.5" />
              授权开启后，用户需在「激活码管理器」中生成激活码并分发给用户。
              产品名称选择「荒哥独选」。
            </div>
          </CardContent>
        )}
      </Card>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">总激活数</span>
          </div>
          <p className="mt-1 text-2xl font-bold">{data?.activations.length ?? 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-muted-foreground">有效授权</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{activeCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-xs text-muted-foreground">已过期</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-destructive">{expiredCount}</p>
        </Card>
      </div>

      {/* 激活记录列表 */}
      <Card className="p-0">
        <CardHeader className="border-b px-5 py-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            激活记录
          </CardTitle>
          <CardDescription className="text-xs">
            所有已激活用户的授权记录，可撤销授权
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {data?.activations.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <KeyRound className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                暂无激活记录
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">用户</TableHead>
                  <TableHead className="min-w-[100px]">邮箱</TableHead>
                  <TableHead className="min-w-[180px]">机器码</TableHead>
                  <TableHead className="min-w-[100px]">到期日期</TableHead>
                  <TableHead className="min-w-[80px]">剩余天数</TableHead>
                  <TableHead className="min-w-[80px]">状态</TableHead>
                  <TableHead className="min-w-[80px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.activations.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <span className="font-medium">{a.userName}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {a.userEmail}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <code className="max-w-[140px] truncate font-mono text-xs">
                          {a.machineId}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => handleCopyMachineId(a.machineId)}
                          title="复制机器码"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{a.expireDate}</span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          a.daysLeft <= 3
                            ? "text-destructive"
                            : a.daysLeft <= 7
                              ? "text-orange-500"
                              : "text-emerald-600"
                        )}
                      >
                        {a.daysLeft} 天
                      </span>
                    </TableCell>
                    <TableCell>
                      {a.expired ? (
                        <Badge variant="destructive" className="text-xs">
                          已过期
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-emerald-600 text-xs">
                          有效
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRevoke(a.id, a.userName)}
                        title="撤销授权"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
