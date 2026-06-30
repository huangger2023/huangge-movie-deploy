"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ProductMarketingView } from "@/components/views/product-marketing-view";
import { ExclusiveScriptTool } from "@/components/views/exclusive-script-tab";
import { Sparkles, Clapperboard, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function AiCopywritingView() {
  const [showTool, setShowTool] = React.useState(false);

  return (
    <div>
      {/* 原有营销页面 */}
      <ProductMarketingView pageKey="ai-copywriting" />

      {/* 分隔 + 快速入口 */}
      <div className="relative border-t border-border/40 bg-gradient-to-b from-background to-muted/30">
        <div className="container-page py-12">
          {/* 入口卡片 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-2xl text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              文案创作工具
            </div>
            <h2 className="mt-4 text-balance text-2xl font-bold tracking-tight sm:text-3xl">
              独家一键出稿
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              输入片名即可基于联网真实剧情生成带观点的影评式解说文案，无需提供剧情文档
            </p>
          </motion.div>

          {/* 展开/收起按钮 */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setShowTool(!showTool)}
              className={cn(
                "group inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium transition-all",
                showTool
                  ? "border-primary/30 bg-primary/5 text-primary"
                  : "border-border/60 bg-card text-muted-foreground hover:border-primary/30 hover:text-primary"
              )}
            >
              <Clapperboard className="h-4 w-4" />
              {showTool ? "收起工具" : "立即使用独家一键出稿"}
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-300",
                  showTool && "rotate-180"
                )}
              />
            </button>
          </div>

          {/* 工具组件 */}
          <motion.div
            initial={false}
            animate={{
              height: showTool ? "auto" : 0,
              opacity: showTool ? 1 : 0,
            }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-8">
              <div className="mx-auto max-w-2xl">
                <ExclusiveScriptTool />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
