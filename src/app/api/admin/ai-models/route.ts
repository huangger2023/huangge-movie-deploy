import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

/** 把 apiKey 脱敏为掩码，只保留末 4 位 */
export function maskApiKey(key: string): string {
  if (!key) return "";
  if (key.length <= 4) return "••••";
  return "••••••••" + key.slice(-4);
}

/** 获取全部 AI 模型配置（仅管理员，apiKey 脱敏） */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const models = await db.aiModel.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      models: models.map((m) => ({
        id: m.id,
        name: m.name,
        baseUrl: m.baseUrl,
        model: m.model,
        apiKeyMasked: maskApiKey(m.apiKey),
        isDefault: m.isDefault,
        isActive: m.isActive,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
    });
  } catch (e) {
    console.error("ai-models list error", e);
    return NextResponse.json({ error: "获取模型列表失败" }, { status: 500 });
  }
}

/** 新增 AI 模型（仅管理员）。若设为默认，先取消其他默认 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await req.json();
    const name = String(body.name || "").trim();
    const baseUrl = String(body.baseUrl || "").trim();
    const apiKey = String(body.apiKey || "").trim();
    const model = String(body.model || "").trim();
    const isDefault = Boolean(body.isDefault);

    if (!name || !baseUrl || !apiKey || !model) {
      return NextResponse.json(
        { error: "显示名、Base URL、API Key、模型名均为必填" },
        { status: 400 }
      );
    }

    // 设为默认时，先把其他记录的 isDefault 置 false，保证默认全局唯一
    if (isDefault) {
      await db.aiModel.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const created = await db.aiModel.create({
      data: { name, baseUrl, apiKey, model, isDefault },
    });

    return NextResponse.json({
      model: {
        id: created.id,
        name: created.name,
        baseUrl: created.baseUrl,
        model: created.model,
        apiKeyMasked: maskApiKey(created.apiKey),
        isDefault: created.isDefault,
        isActive: created.isActive,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      },
    });
  } catch (e) {
    console.error("ai-models create error", e);
    return NextResponse.json({ error: "新增模型失败" }, { status: 500 });
  }
}
