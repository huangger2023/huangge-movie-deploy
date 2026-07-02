import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getGlobalModelPublic } from "@/lib/ai";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();

    interface ModelEntry {
      id: string;
      name: string;
      model: string;
      baseUrl: string;
    }

    const entries: ModelEntry[] = [];

    // 1. 用户自有模型优先
    if (user) {
      const userModels = await db.userAiModel.findMany({
        where: { userId: user.id, isActive: true },
        orderBy: { updatedAt: "desc" },
      });
      for (const um of userModels) {
        if (isTtsModel(um.baseUrl, um.name)) continue;
        const models = um.model
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean);
        for (const m of models) {
          entries.push({ id: um.id, name: um.name, model: m, baseUrl: um.baseUrl });
        }
      }
    }

    // 2. 管理员全局模型（受公开开关控制）
    const isPublic = await getGlobalModelPublic();
    if (user?.role === "ADMIN" || isPublic) {
      const globalModels = await db.aiModel.findMany({
        where: { isActive: true },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      });
      for (const gm of globalModels) {
        if (isTtsModel(gm.baseUrl, gm.name)) continue;
        const models = gm.model
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean);
        for (const m of models) {
          entries.push({ id: gm.id, name: gm.name, model: m, baseUrl: gm.baseUrl });
        }
      }
    }

    return NextResponse.json({ models: entries });
  } catch (error) {
    console.error("获取可用模型列表失败:", error);
    return NextResponse.json({ error: "获取模型列表失败" }, { status: 500 });
  }
}

/** 判断是否 TTS 专用模型（不应出现在文案生成下拉框） */
function isTtsModel(baseUrl: string, name: string): boolean {
  const url = baseUrl.toLowerCase();
  const n = name.toLowerCase();
  return (
    url.includes("xiaomimimo") ||
    url.includes("mimotts") ||
    url.includes("mimo") ||
    n.includes("tts") ||
    n.includes("语音") ||
    n.includes("mimo")
  );
}
