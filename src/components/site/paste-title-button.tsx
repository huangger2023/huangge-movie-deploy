"use client";

import * as React from "react";
import { ClipboardPaste } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PasteTitleButtonProps {
  onPasteText: (text: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function PasteTitleButton({
  onPasteText,
  label = "粘贴",
  className,
  disabled,
}: PasteTitleButtonProps) {
  const handlePaste = React.useCallback(async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        toast.error("剪贴板里没有可粘贴的文字");
        return;
      }
      onPasteText(text);
      toast.success("已粘贴");
    } catch {
      toast.error("读取剪贴板失败，请手动粘贴");
    }
  }, [onPasteText]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handlePaste}
      disabled={disabled}
      aria-label={label}
      className={cn("h-9 shrink-0 gap-1.5 rounded-lg px-2.5 text-xs", className)}
    >
      <ClipboardPaste className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
