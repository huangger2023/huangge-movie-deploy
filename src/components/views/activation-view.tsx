"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  KeyRound,
  Cpu,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/lib/store";
import { getMachineCode, shortMachineCode } from "@/lib/machine-code";

interface AuthStatus {
  authRequired: boolean;
  activated: boolean;
  expired?: boolean;
  adminBypass?: boolean;
  machineId?: string;
  expireDate?: string;
  daysLeft?: number;
}

export function ActivationView() {
  const { user, setView } = useAppStore();
  const [machineCode, setMachineCode] = React.useState("");
  const [licenseKey, setLicenseKey] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [activating, setActivating] = React.useState(false);
  const [authStatus, setAuthStatus] = React.useState<AuthStatus | null>(null);
  const [copied, setCopied] = React.useState(false);

  // 生成机器码 + 获取授权状态
  React.useEffect(() => {
    // 管理员不需要激活，直接跳走
    if (user?.role === "ADMIN") {
      setView("admin");
      return;
    }
    (async () => {
      try {
        const code = await getMachineCode();
        setMachineCode(code);

        const resp = await fetch("/api/authorization");
        const data = await resp.json();
        setAuthStatus(data);
        // 如果后端返回 adminBypass，也自动跳走
        if (data.adminBypass) {
          setView("admin");
          return;
        }
      } catch {
        toast.error("初始化失败");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, setView]);

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      toast.error("请输入激活码");
      return;
    }
    setActivating(true);
    try {
      const resp = await fetch("/api/authorization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          licenseKey: licenseKey.trim(),
          machineId: machineCode,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || "激活失败");
        return;
      }
      toast.success("激活成功！", {
        description: `有效期至 ${data.expireDate}（剩余 ${data.daysLeft} 天）`,
      });
      setAuthStatus({
        authRequired: true,
        activated: true,
        machineId: data.machineId,
        expireDate: data.expireDate,
        daysLeft: data.daysLeft,
      });
      // 刷新页面让用户进入主界面
      setTimeout(() => {
        setView("home");
        window.location.reload();
      }, 1500);
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setActivating(false);
    }
  };

  const handleCopyMachineId = () => {
    navigator.clipboard.writeText(machineCode);
    setCopied(true);
    toast.success("机器码已复制到剪贴板");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className=h-8 w-8 animate-spin text-green-600 dark:text-green-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* 头部 */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            授权激活
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            当前账号需要激活授权后才能使用平台功能
          </p>
        </div>

        {/* 当前状态 */}
        {authStatus?.activated && !authStatus.expired ? (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="flex items-center gap-4 p-6">
              <CheckCircle2 className="h-10 w-10 shrink-0 text-emerald-500" />
              <div className="flex-1">
                <p className="font-medium text-emerald-700 dark:text-emerald-400">
                  已激活授权
                </p>
                {authStatus.expireDate && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    有效期至 {authStatus.expireDate} · 剩余 {authStatus.daysLeft} 天
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => setView("home")}>
                进入平台
              </Button>
            </CardContent>
          </Card>
        ) : authStatus?.expired ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-center gap-4 p-6">
              <AlertCircle className="h-10 w-10 shrink-0 text-destructive" />
              <div className="flex-1">
                <p className="font-medium text-destructive">授权已过期</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  请联系管理员获取新的激活码
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* 机器码区域 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              设备机器码
            </CardTitle>
            <CardDescription className="text-xs">
              将此机器码发送给管理员，管理员通过激活码管理器生成对应的激活码
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-md border bg-muted/50 px-3 py-2.5 font-mono text-sm">
                {machineCode || "生成中..."}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyMachineId}
                disabled={!machineCode}
                title="复制机器码"
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 激活码输入区域 */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              输入激活码
            </CardTitle>
            <CardDescription className="text-xs">
              粘贴管理员提供的激活码，点击激活即可使用
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="在此粘贴激活码..."
              className="min-h-[80px] resize-none font-mono text-sm"
              rows={3}
            />
            <Button
              className="mt-3 w-full"
              onClick={handleActivate}
              disabled={activating || !licenseKey.trim()}
            >
              {activating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在激活...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  激活授权
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 说明 */}
        <div className="mt-6 space-y-2 rounded-lg border border-dashed border-border/60 bg-muted/20 p-4">
          <p className="text-xs font-medium text-muted-foreground">激活说明</p>
          <ul className="space-y-1.5 text-xs text-muted-foreground/80">
            <li className="flex gap-2">
              <span className=font-mono text-green-600 dark:text-green-400">1.</span>
              复制上方「设备机器码」，发送给管理员
            </li>
            <li className="flex gap-2">
              <span className=font-mono text-green-600 dark:text-green-400">2.</span>
              管理员在「激活码管理器」中选择「荒哥独选」产品，粘贴机器码并生成激活码
            </li>
            <li className="flex gap-2">
              <span className=font-mono text-green-600 dark:text-green-400">3.</span>
              将生成的激活码粘贴到上方输入框，点击激活
            </li>
            <li className="flex gap-2">
              <span className=font-mono text-green-600 dark:text-green-400">4.</span>
              激活码有有效期限制，过期后需重新获取
            </li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
