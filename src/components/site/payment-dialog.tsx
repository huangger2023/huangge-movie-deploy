"use client";

import * as React from "react";
import { CreditCard, ExternalLink, Sparkles } from "lucide-react";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * 支付通道弹窗 — 直接在右下角浮窗点击弹出，显示微信和支付宝支付二维码。
 * 用户长按或扫描二维码即可添加客服完成支付。
 */
export function PaymentDialogContent() {
  const [selected, setSelected] = React.useState<"wechat" | "alipay" | null>(null);

  return (
    <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
      {/* 顶部渐变标头 */}
      <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 px-6 pt-7 pb-6 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
        </div>
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-medium backdrop-blur">
            <Sparkles className="h-3 w-3" />
            学员专属通道
          </div>
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-2xl font-bold text-white">
              支付通道
            </DialogTitle>
            <DialogDescription className="text-white/85">
              长按或扫描下方二维码添加客服微信/支付宝，确认学员身份后完成支付。
            </DialogDescription>
          </DialogHeader>
        </div>
      </div>

      {/* 主体：两张二维码 */}
      <div className="px-6 pt-5 pb-6">
        {selected ? (
          /* 选中某一支付方式 → 展示大图 */
          <div className="space-y-4">
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← 返回选择支付方式
            </button>
            <div className="flex flex-col items-center gap-3">
              <img
                src={selected === "wechat" ? "/wechat-pay.jpg" : "/alipay.jpg"}
                alt={selected === "wechat" ? "微信支付二维码" : "支付宝支付二维码"}
                className="h-64 w-64 rounded-xl border object-contain shadow-sm"
              />
              <p className="text-sm font-medium">
                {selected === "wechat" ? "微信支付" : "支付宝"}
              </p>
              <p className="text-xs text-muted-foreground text-center">
                长按识别二维码 → 添加客服 → 确认学员身份 → 完成支付
              </p>
            </div>
          </div>
        ) : (
          /* 选择支付方式 → 两张卡片并排 */
          <div className="grid grid-cols-2 gap-4">
            {/* 微信支付 */}
            <button
              onClick={() => setSelected("wechat")}
              className={cn(
                "group flex flex-col items-center gap-3 rounded-xl border p-4 transition-all",
                "hover:border-green-400 hover:shadow-md hover:-translate-y-0.5"
              )}
            >
              <div className="overflow-hidden rounded-lg border">
                <img
                  src="/wechat-pay.jpg"
                  alt="微信支付二维码"
                  className="h-36 w-36 object-contain transition-transform group-hover:scale-105"
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">微信支付</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">点击查看大图</p>
              </div>
            </button>

            {/* 支付宝 */}
            <button
              onClick={() => setSelected("alipay")}
              className={cn(
                "group flex flex-col items-center gap-3 rounded-xl border p-4 transition-all",
                "hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5"
              )}
            >
              <div className="overflow-hidden rounded-lg border">
                <img
                  src="/alipay.jpg"
                  alt="支付宝支付二维码"
                  className="h-36 w-36 object-contain transition-transform group-hover:scale-105"
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">支付宝</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">点击查看大图</p>
              </div>
            </button>
          </div>
        )}

        {/* 底部联系客服入口 */}
        <div className="mt-5 flex items-center justify-center gap-2 border-t pt-4 text-xs text-muted-foreground">
          <span>遇到问题？</span>
          <Button variant="link" className="h-auto p-0 text-xs" asChild>
            <a href="https://wpa.qq.com/msgrd?v=3&uin=&site=qq&menu=yes" target="_blank" rel="noopener noreferrer">
              联系客服 <ExternalLink className="ml-0.5 h-3 w-3" />
            </a>
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}
