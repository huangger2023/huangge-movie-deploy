import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { clearGlobalModelPublicCache } from "@/lib/ai";

export const runtime = "nodejs";

/** 把 apiKey 脱敏为掩码，只保留末 4 位 */
export function maskApiKey(key: string): string {
  if (!key) return "";
  if (key.length <= 4) return "••••";
  return "••••••••" + key.slice(-4);
}

/** 读取全局模型公开开关（SystemSetting 表 + globalThis 内存缓存） */
async function getGlobalModelPublicSetting(): Promise<boolean> {
  const g = globalThis as unknown as { __globalModelPublic?: string };
  if (g.__globalModelPublic !== undefined) return g.__globalModelPublic === "true";
  try {
    const row = await db.systemSetting.findUnique({
      where: { key: "ai_global_model_public" },
    });
    return row?.value !== "false"; // 默认公开
  } catch {
    return true;
  }
}

/** 获取全部 AI 模型配置（仅管理员，apiKey 脱敏）+ 全局开关状态 */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const [models, globalModelPublic] = await Promise.all([
      db.aiModel.findMany({
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      }),
      getGlobalModelPublicSetting(),
    ]);

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
      globalModelPublic,
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

/**
 * PUT /api/admin/ai-models
 * 切换全局模型公开开关（仅管理员）。
 * body: { globalModelPublic: boolean }
 * - true: 全局使用，所有用户可使用管理员配置的默认模型
 * - false: 仅管理员可用，普通用户需自行配置模型
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await req.json();
    const globalModelPublic = Boolean(body.globalModelPublic);

    // Vercel serverless 文件系统只读，无法写入 SQLite 文件。
    // 改用 globalThis 内存缓存（同实例内即时生效）。
    // 注：不同实例间可能短暂不一致，但对于一个开关来说影响极小。
    const g = globalThis as unknown as { __globalModelPublic?: string };
    g.__globalModelPublic = String(globalModelPublic);
    
    // 也尝试写入数据库（成功则持久化，失败也无妨）
    try {
      await db.systemSetting.upsert({
        where: { key: "ai_global_model_public" },
        create: {
          key: "ai_global_model_public",
          value: String(globalModelPublic),
        },
        update: {
          value: String(globalModelPublic),
        },
      });
    } catch {
      // 写入失败：SQLite 只读，忽略
    }

    // 清除缓存，让后续 AI 调用立即生效
    clearGlobalModelPublicCache();

    return NextResponse.json({
      globalModelPublic,
      message: globalModelPublic
        ? "全局模型已公开，所有用户可使用"
        : "全局模型已关闭，仅管理员可用",
    });
  } catch (e) {
    console.error("ai-models put error", e);
    return NextResponse.json({ error: "切换全局开关失败" }, { status: 500 });
  }
}
