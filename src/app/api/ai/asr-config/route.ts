import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/ai/asr-config
 *
 * 获取讯飞 ASR 全局配置（供前端 WebSocket 签名使用）。
 * 优先读取数据库配置（管理员后台设置），回退到环境变量。
 */
export async function GET() {
  try {
    let appId = "";
    let apiKey = "";
    let apiSecret = "";

    // 1. 尝试从数据库读取（管理员后台配置）
    const row = await db.systemSetting.findUnique({
      where: { key: "xfyun_asr_config" },
    });
    if (row?.value) {
      try {
        const dbConfig = JSON.parse(row.value);
        appId = dbConfig.appId || "";
        apiKey = dbConfig.apiKey || "";
        apiSecret = dbConfig.apiSecret || "";
      } catch {}
    }

    // 2. 回退到环境变量
    if (!appId) appId = process.env.XFYUN_APP_ID || "";
    if (!apiKey) apiKey = process.env.XFYUN_API_KEY || "";
    if (!apiSecret) apiSecret = process.env.XFYUN_API_SECRET || "";

    const configured = Boolean(appId && apiKey && apiSecret);

    return NextResponse.json({ configured, appId, apiKey, apiSecret });
  } catch {
    return NextResponse.json({
      configured: false,
      appId: process.env.XFYUN_APP_ID || "",
      apiKey: process.env.XFYUN_API_KEY || "",
      apiSecret: process.env.XFYUN_API_SECRET || "",
    });
  }
}
