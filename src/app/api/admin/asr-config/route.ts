import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

/** 把密钥脱敏，只保留末 4 位 */
function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 4) return "••••";
  return "••••••••" + key.slice(-4);
}

const SETTING_KEY = "xfyun_asr_config";

/**
 * GET /api/admin/asr-config
 * 获取讯飞 ASR 全局配置（apiKey 脱敏）
 */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const row = await db.systemSetting.findUnique({
      where: { key: SETTING_KEY },
    });

    let config = { appId: "", apiKey: "", apiSecret: "" };
    if (row?.value) {
      try {
        config = JSON.parse(row.value);
      } catch {
        // 忽略解析错误
      }
    }

    return NextResponse.json({
      appId: config.appId || "",
      apiKeyMasked: maskKey(config.apiKey || ""),
      apiSecretMasked: maskKey(config.apiSecret || ""),
      configured: Boolean(config.appId && config.apiKey && config.apiSecret),
    });
  } catch (e) {
    console.error("asr-config get error", e);
    return NextResponse.json({ error: "获取讯飞配置失败" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/asr-config
 * 保存讯飞 ASR 全局配置
 * Body: { appId, apiKey, apiSecret }
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await req.json();
    const appId = String(body.appId || "").trim();
    const apiKey = String(body.apiKey || "").trim();
    const apiSecret = String(body.apiSecret || "").trim();

    if (!appId || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "APPID、API Key、API Secret 均为必填" },
        { status: 400 }
      );
    }

    const config = JSON.stringify({ appId, apiKey, apiSecret });

    await db.systemSetting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value: config },
      update: { value: config },
    });

    return NextResponse.json({
      success: true,
      appId,
      apiKeyMasked: maskKey(apiKey),
      apiSecretMasked: maskKey(apiSecret),
      configured: true,
    });
  } catch (e) {
    console.error("asr-config put error", e);
    return NextResponse.json({ error: "保存讯飞配置失败" }, { status: 500 });
  }
}
