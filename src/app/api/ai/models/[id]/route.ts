import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

function maskApiKey(key: string): string {
  if (!key) return "";
  if (key.length <= 4) return "••••";
  return "••••••••" + key.slice(-4);
}

/**
 * PATCH /api/ai/models/[id]
 * 更新用户自己的 AI 模型（apiKey 留空则不修改）
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.userAiModel.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "模型不存在" }, { status: 404 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
    if (typeof body.baseUrl === "string" && body.baseUrl.trim()) data.baseUrl = body.baseUrl.trim();
    if (typeof body.model === "string" && body.model.trim()) data.model = body.model.trim();
    if (typeof body.apiKey === "string" && body.apiKey.trim()) data.apiKey = body.apiKey.trim();
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;

    const updated = await db.userAiModel.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      model: {
        id: updated.id,
        name: updated.name,
        baseUrl: updated.baseUrl,
        model: updated.model,
        apiKeyMasked: maskApiKey(updated.apiKey),
        isActive: updated.isActive,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (e) {
    console.error("user-ai-models update error", e);
    return NextResponse.json({ error: "更新模型失败" }, { status: 500 });
  }
}

/**
 * DELETE /api/ai/models/[id]
 * 删除用户自己的 AI 模型
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.userAiModel.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "模型不存在" }, { status: 404 });
    }

    await db.userAiModel.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("user-ai-models delete error", e);
    return NextResponse.json({ error: "删除模型失败" }, { status: 500 });
  }
}
