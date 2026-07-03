import { NextRequest } from "next/server";
import { generateNarrationScript, type ScriptGenInput } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  let closed = false;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };
      const close = () => {
        if (closed) return;
        closed = true;
        try { controller.close(); } catch {}
      };

      // 定期发心跳，保持 Vercel 连接活跃
      const heartbeat = setInterval(() => {
        send("heartbeat", { t: Date.now() });
      }, 15_000);

      // 55 秒超时保护（Vercel Hobby 60s 限制）
      let aborted = false;
      const timeoutId = setTimeout(() => {
        aborted = true;
        send("error", { message: "生成超时，请稍后重试" });
        clearInterval(heartbeat);
        close();
      }, 55_000);

      try {
        const body = await req.json();
        if (!body.movieTitle?.trim()) {
          clearTimeout(timeoutId);
          send("error", { message: "请填写电影名称" });
          close();
          return;
        }

        let configBaseUrl: string | undefined;
        let configApiKey: string | undefined;
        let modelOverride: string | undefined;

        if (body.configId && body.modelName) {
          const user = await getCurrentUser();
          const globalModel = await (db as any).aiModel.findUnique({ where: { id: body.configId } });
          if (globalModel) {
            configBaseUrl = globalModel.baseUrl;
            configApiKey = globalModel.apiKey;
            modelOverride = body.modelName;
          } else if (user) {
            const userModel = await (db as any).userAiModel.findUnique({ where: { id: body.configId } });
            if (userModel) {
              configBaseUrl = userModel.baseUrl;
              configApiKey = userModel.apiKey;
              modelOverride = body.modelName;
            }
          }
        }

        send("stage", { stage: "generating" });

        // 快速模式：跳过字数纠偏和人工化，只做一次 LLM 调用，减少耗时
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
            entryPoint: body.entryPoint,
            uniqueAngle: body.uniqueAngle,
            fastMode: true,
          } satisfies ScriptGenInput,
          undefined,
          configBaseUrl,
          configApiKey,
        );

        if (aborted) return;

        // 保存到历史
        const user = await getCurrentUser();
        let savedId: string | null = null;
        if (user) {
          try {
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
          } catch {}
        }

        clearTimeout(timeoutId);
        send("done", { output, savedId });
      } catch (e) {
        if (!aborted) {
          console.error("script-gen error", e);
          send("error", { message: e instanceof Error ? e.message : "生成失败，请重试" });
        }
      } finally {
        if (!aborted) {
          clearInterval(heartbeat);
          clearTimeout(timeoutId);
          close();
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
