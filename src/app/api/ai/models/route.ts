import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

/** 把 apiKey 脱敏为掩码，只保留末 4 位 */
function maskApiKey(key: string): string {
  if (!key) return "";
  if (key.length <= 4) return "••••";
  return "••••••••" + key.slice(-4);
}

/**
 * GET /api/ai/models
 * 获取当前用户自己的 AI 模型列表（apiKey 脱敏）
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const models = await db.userAiModel.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      models: models.map((m) => ({
        id: m.id,
        name: m.name,
        baseUrl: m.baseUrl,
        model: m.model,
        apiKeyMasked: maskApiKey(m.apiKey),
        isActive: m.isActive,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
    });
  } catch (e) {
    console.error("user-ai-models list error", e);
    return NextResponse.json({ error: "获取模型列表失败" }, { status: 500 });
  }
}

/**
 * POST /api/ai/models
 * 新增用户自己的 AI 模型（最多 5 个）
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const count = await db.userAiModel.count({ where: { userId: user.id } });
    if (count >= 5) {
      return NextResponse.json(
        { error: "最多添加 5 个模型" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const name = String(body.name || "").trim();
    const baseUrl = String(body.baseUrl || "").trim();
    const apiKey = String(body.apiKey || "").trim();
    const model = String(body.model || "").trim();

    if (!name || !baseUrl || !apiKey || !model) {
      return NextResponse.json(
        { error: "显示名、Base URL、API Key、模型名均为必填" },
        { status: 400 }
      );
    }

    const created = await db.userAiModel.create({
      data: { userId: user.id, name, baseUrl, apiKey, model, isActive: true },
    });

    return NextResponse.json({
      model: {
        id: created.id,
        name: created.name,
        baseUrl: created.baseUrl,
        model: created.model,
        apiKeyMasked: maskApiKey(created.apiKey),
        isActive: created.isActive,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      },
    });
  } catch (e) {
    console.error("user-ai-models create error", e);
    return NextResponse.json({ error: "新增模型失败" }, { status: 500 });
  }
}
