"use client";

/**
 * 客户端机器码生成模块
 *
 * 基于浏览器指纹生成稳定的机器唯一标识。
 * 采集维度：Canvas 指纹、UserAgent、屏幕分辨率、时区、语言、硬件并发数等。
 * 最终用 SHA-256 哈希生成 32 位十六进制机器码。
 */

async function sha256Hex(text: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Fallback: 简单 hash（非加密级别，仅用于极老浏览器）
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0").repeat(8);
}

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "no-canvas";

    canvas.width = 220;
    canvas.height = 30;

    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("荒哥独选·机器指纹", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("荒哥独选·机器指纹", 4, 17);

    return canvas.toDataURL();
  } catch {
    return "canvas-error";
  }
}

/**
 * 生成当前浏览器的机器码。
 * 同一浏览器/同一设备下稳定不变，换设备或换浏览器会变化。
 */
export async function getMachineCode(): Promise<string> {
  const factors: string[] = [];

  // Canvas 指纹
  factors.push(`canvas:${getCanvasFingerprint()}`);

  // UserAgent
  factors.push(`ua:${navigator.userAgent}`);

  // 屏幕信息
  factors.push(`screen:${screen.width}x${screen.height}x${screen.colorDepth}`);

  // 时区
  factors.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown"}`);

  // 语言
  factors.push(`lang:${navigator.language || "unknown"}`);

  // 平台
  factors.push(`platform:${navigator.platform || "unknown"}`);

  // 硬件并发数
  factors.push(`cores:${navigator.hardwareConcurrency || "unknown"}`);

  // 设备像素比
  factors.push(`dpr:${window.devicePixelRatio || 1}`);

  const combined = factors.join("|||");
  const hash = await sha256Hex(combined);

  // 格式化为 8-4-4-4-12 风格，方便阅读和复制
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`.toUpperCase();
}

/**
 * 获取机器码的短显示版本（前 16 位），用于 UI 展示。
 */
export function shortMachineCode(machineId: string): string {
  if (machineId.length <= 19) return machineId;
  return machineId.slice(0, 19) + "...";
}
