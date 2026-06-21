import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { maskApiKey } from "@/app/api/admin/ai-models/route";

export const runtime = "nodejs";

/** 更新 AI 模型（仅管理员）。apiKey 留空则保留原值；设为默认时同步取消其他默认 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await req.json();

    const existing = await db.aiModel.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "模型不存在" }, { status: 404 });
    }

    const data: {
      name?: string;
      baseUrl?: string;
      apiKey?: string;
      model?: string;
      isDefault?: boolean;
      isActive?: boolean;
    } = {};

    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
    if (typeof body.baseUrl === "string" && body.baseUrl.trim()) data.baseUrl = body.baseUrl.trim();
    if (typeof body.model === "string" && body.model.trim()) data.model = body.model.trim();
    // apiKey 留空则不更新，保留原值
    if (typeof body.apiKey === "string" && body.apiKey.trim()) data.apiKey = body.apiKey.trim();
    if (typeof body.isDefault === "boolean") data.isDefault = body.isDefault;
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;

    // 设为默认时，先把其他记录的 isDefault 置 false
    if (data.isDefault && !existing.isDefault) {
      await db.aiModel.updateMany({
        where: { isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    const updated = await db.aiModel.update({ where: { id }, data });

    return NextResponse.json({
      model: {
        id: updated.id,
        name: updated.name,
        baseUrl: updated.baseUrl,
        model: updated.model,
        apiKeyMasked: maskApiKey(updated.apiKey),
        isDefault: updated.isDefault,
        isActive: updated.isActive,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (e) {
    console.error("ai-models update error", e);
    return NextResponse.json({ error: "更新模型失败" }, { status: 500 });
  }
}

/** 删除 AI 模型（仅管理员）。若删除的是默认模型，自动把最早一条设为默认 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;

    const existing = await db.aiModel.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "模型不存在" }, { status: 404 });
    }

    await db.aiModel.delete({ where: { id } });

    // 删除的是默认模型时，自动把剩余最早一条设为默认
    if (existing.isDefault) {
      const next = await db.aiModel.findFirst({
        orderBy: { createdAt: "asc" },
      });
      if (next) {
        await db.aiModel.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("ai-models delete error", e);
    return NextResponse.json({ error: "删除模型失败" }, { status: 500 });
  }
}
