import { NextRequest, NextResponse } from "next/server";
import { generateNarrationScript, type ScriptGenInput } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.movieTitle?.trim()) {
      return NextResponse.json({ error: "请填写电影名称" }, { status: 400 });
    }

    // 如果传了 configId，查出该配置的完整信息（baseUrl/apiKey/model列表）
    let configBaseUrl: string | undefined;
    let configApiKey: string | undefined;
    let modelOverride: string | undefined;

    if (body.configId && body.modelName) {
      const user = await getCurrentUser();
      // 先在全局模型中查找
      const globalModel = await (db as any).aiModel.findUnique({ where: { id: body.configId } });
      if (globalModel) {
        configBaseUrl = globalModel.baseUrl;
        configApiKey = globalModel.apiKey;
        modelOverride = body.modelName;
      } else if (user) {
        // 再在用户模型中查找
        const userModel = await (db as any).userAiModel.findUnique({ where: { id: body.configId } });
        if (userModel) {
          configBaseUrl = userModel.baseUrl;
          configApiKey = userModel.apiKey;
          modelOverride = body.modelName;
        }
      }
    }

    const output = await generateNarrationScript(
      {
        movieTitle: body.movieTitle.trim(),
        genre: body.genre || "剧情",
        style: body.style || "悬疑反转",
        duration: body.duration || "90秒",
        hookType: body.hookType || "反差冲击",
        tone: body.tone || "犀利",
        keywords: body.keywords,
        extraNotes: body.extraNotes,
        plotContext: body.plotContext,
        model: modelOverride,
        // 剧情增量参数
        entryPoint: body.entryPoint,
        uniqueAngle: body.uniqueAngle,
      },
      undefined,
      configBaseUrl,
      configApiKey,
    );

    const user = await getCurrentUser();
    let savedId: string | null = null;
    if (user) {
      const rec = await db.generatedScript.create({
        data: {
          userId: user.id,
          type: "SCRIPT",
          movieTitle: body.movieTitle.trim(),
          genre: body.genre || "剧情",
          input: JSON.stringify(body),
          output,
          meta: JSON.stringify({ style: body.style, duration: body.duration }),
        },
      });
      savedId = rec.id;
      await db.toolUsage.upsert({
        where: { userId_toolType: { userId: user.id, toolType: "SCRIPT" } },
        create: { userId: user.id, toolType: "SCRIPT", count: 1 },
        update: { count: { increment: 1 } },
      });
    }

    return NextResponse.json({ output, savedId });
  } catch (e) {
    console.error("script-gen error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "生成失败，请重试" },
      { status: 500 }
    );
  }
}
