"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, MessageCircle, ChevronUp, Users, Check } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { QQ_GROUP } from "@/lib/qq-group";
import { toast } from "sonner";

function FloatingButton({
  icon,
  label,
  sublabel,
  gradient,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  gradient: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-full px-4 py-2.5 text-white shadow-lg transition-all duration-300 hover:shadow-xl",
        gradient
      )}
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
        {icon}
      </div>
      <div className="flex flex-col items-start leading-tight">
        <span className="text-sm font-bold tracking-wide">{label}</span>
        {sublabel && (
          <span className="text-[10px] font-medium text-white/70">{sublabel}</span>
        )}
      </div>
    </motion.button>
  );
}

export function FloatingActions() {
  const { setView } = useAppStore();
  const [expanded, setExpanded] = React.useState(false);
  const [qqCopied, setQqCopied] = React.useState(false);

  const handleCopyQQ = async () => {
    try {
      await navigator.clipboard.writeText(QQ_GROUP.number);
      setQqCopied(true);
      toast.success("群号已复制", { description: "打开QQ添加群聊" });
      setTimeout(() => setQqCopied(false), 2000);
    } catch {
      toast.error("复制失败");
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {expanded && (
          <>
            {/* 充值通道 */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <FloatingButton
                icon={<CreditCard className="h-3.5 w-3.5 text-white" />}
                label="充值通道"
                sublabel="学员专属价格"
                gradient="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500"
                onClick={() => setView("payment")}
              />
            </motion.div>

            {/* 加 QQ 群 */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ duration: 0.25, ease: "easeOut", delay: 0.1 }}
            >
              <FloatingButton
                icon={qqCopied ? <Check className="h-3.5 w-3.5 text-white" /> : <Users className="h-3.5 w-3.5 text-white" />}
                label={qqCopied ? "已复制" : "加 QQ 群"}
                sublabel="实战答疑交流"
                gradient="bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500"
                onClick={handleCopyQQ}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 展开/收起按钮 */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-300",
          expanded
            ? "bg-rose-500 text-white shadow-rose-500/40"
            : "bg-gradient-to-br from-rose-500 to-pink-600 text-white"
        )}
        style={{
          boxShadow: expanded
            ? "0 0 30px rgba(244,63,94,0.4)"
            : "0 4px 20px rgba(0,0,0,0.3), 0 0 15px rgba(244,63,94,0.2)",
        }}
      >
        {expanded ? (
          <ChevronUp className="h-5 w-5" />
        ) : (
          <MessageCircle className="h-5 w-5" />
        )}
      </motion.button>
    </div>
  );
}