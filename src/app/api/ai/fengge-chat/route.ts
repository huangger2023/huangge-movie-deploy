import { NextRequest, NextResponse } from "next/server";
import { getActiveAiModel, chatCompletionRaw } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 120;

const GUEST_COOKIE = "fg_guest";
const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 天

/** 荒哥人设 system 提示词 */
const FENGGE_SYSTEM = `你是「荒哥」，《荒哥说电影》的主理人、抖音电影解说创作导师。

你的人设：
- 西南普通中年，带点方言口吻，会自然冒出「嘛」「咋说呢」「这个事儿嘛」等语气词，但不刻意、不夸张、不油。
- 性格直爽、有耐心、像个愿意带新人的老哥。不说教、不端着。
- 你只聊电影解说创作、文案写作、抖音运营、完播率/留人、开场钩子、结尾升华这些你擅长的领域。

你的回答规则：
1. 基于你「荒哥说电影」的方法论体系回答（看点前置、强冲突先行、反差开头、四步骨架、结尾升华等）。
2. 口语化、像真人说话，避免 AI 味的排比和模板化过渡。
3. 回答控制在 300 字以内，重点突出，可用分点或短段落，但别堆砌空话。
4. 如果用户问实操问题，给具体可执行的步骤。
5. 如果用户问的完全无关（非电影解说创作话题），用荒哥的口吻礼貌引导回主题，比如「这事儿我没咋研究，咱还是聊回写文案嘛」。
6. 不要自称 AI、模型、助手。你就是荒哥本人。`;

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface FenggeGuestRow {
  id: string;
  turnCount: number;
}

async function getGuestQuota(): Promise<number> {
  try {
    const row = await db.systemSetting.findUnique({
      where: { key: "fengge_guest_quota" },
    });
    const v = Number(row?.value);
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 5;
  } catch {
    return 5;
  }
}

/** 生成游客 cookie 值 */
function newGuestId() {
  return crypto.randomUUID();
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const message: string = String(body?.message || "").trim();
    const clientSessionId: string | undefined = body?.sessionId;
    const history: ChatTurn[] = Array.isArray(body?.history) ? body.history : [];

    if (!message) {
      return NextResponse.json({ error: "请输入内容" }, { status: 400 });
    }

    // —— 游客限流 ——
    let guestId: string | null = null;
    if (!user) {
      const cookieGuestId = req.cookies.get(GUEST_COOKIE)?.value;
      if (cookieGuestId) {
        guestId = cookieGuestId;
      } else {
        guestId = newGuestId();
      }
      const quota = await getGuestQuota();
      let guest: FenggeGuestRow | null = null;
      try {
        guest = await db.fenggeGuest.findUnique({ where: { id: guestId } });
      } catch {
        guest = null;
      }
      let turnCount = guest?.turnCount ?? 0;
      // 超额：拒绝（但还是把 cookie 回写，便于持续识别）
      const res403 = NextResponse.json(
        {
          error: "游客体验额度已用完，登录后可继续和荒哥聊",
          needLogin: true,
          quota,
          TurnCount: turnCount,
        },
        { status: 403 }
      );
      if (!cookieGuestId) {
        res403.cookies.set(GUEST_COOKIE, guestId, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: GUEST_COOKIE_MAX_AGE,
        });
      }
      if (turnCount >= quota) {
        return res403;
      }
      // 增加计数
      if (guest) {
        await db.fenggeGuest.update({
          where: { id: guestId },
          data: { turnCount: { increment: 1 } },
        }).catch(() => null);
        turnCount += 1;
      } else {
        try {
          await db.fenggeGuest.create({
            data: { id: guestId, turnCount: 1 },
          });
          turnCount = 1;
        } catch {
          // 并发 create 冲突：回退到 update
          await db.fenggeGuest.update({
            where: { id: guestId },
            data: { turnCount: { increment: 1 } },
          }).catch(() => null);
          turnCount += 1;
        }
      }
      const remainingGuestTurns = Math.max(0, quota - turnCount);
      const aiCtx = undefined; // 游客走全局公开模型逻辑（在 getActiveAiModel 内部处理）
      const result = await runChat(message, history, aiCtx, remainingGuestTurns);
      const res = NextResponse.json({
        ...result,
        remainingGuestTurns,
        guest: true,
      });
      if (!cookieGuestId) {
        res.cookies.set(GUEST_COOKIE, guestId, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: GUEST_COOKIE_MAX_AGE,
        });
      }
      return res;
    }

    // —— 登录用户 ——
    const aiCtx = { userId: user.id, isAdmin: user.role === "ADMIN" };
    // 确定/生成 sessionId
    let sessionId = clientSessionId;
    if (!sessionId) {
      sessionId = `fg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
    const result = await runChat(message, history, aiCtx, undefined);

    // 持久化用户提问 + 荒哥回复
    try {
      await db.fenggeChat.createMany({
        data: [
          { userId: user.id, sessionId, role: "user", content: message },
          {
            userId: user.id,
            sessionId,
            role: "assistant",
            content: result.answer,
          },
        ],
      });
    } catch (e) {
      console.error("fengge-chat persist failed", e);
    }

    return NextResponse.json({
      ...result,
      sessionId,
      guest: false,
    });
  } catch (e) {
    console.error("fengge-chat error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "荒哥暂时没法回话，请稍后重试" },
      { status: 500 }
    );
  }
}

/** 调用 LLM 生成荒哥回复 */
async function runChat(
  message: string,
  history: ChatTurn[],
  aiCtx: { userId?: string; isAdmin?: boolean } | undefined,
  remainingGuestTurns?: number
): Promise<{ answer: string }> {
  const role = aiCtx?.isAdmin ? "管理员" : "学员";
  const systemPrompt = `${FENGGE_SYSTEM}\n\n当前用户身份：${role}。`;

  const cfg = await getActiveAiModel(aiCtx);
  if (!cfg) {
    throw new Error(
      "未配置可用的 AI 模型。登录后在「我的模型」添加自己的模型，或联系管理员开放全局模型。"
    );
  }

  // 拼历史：取最近 6 轮
  const recent = history.slice(-6).filter(
    (m) => m.role === "user" || m.role === "assistant"
  );
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...recent.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  const answer = await chatCompletionRaw(messages, cfg);
  return { answer: answer.trim() || "嗯……咋说呢，这个我回头琢磨琢磨再回你。" };
}

/** 获取登录用户某会话历史 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录", guest: true, messages: [] }, { status: 200 });
    }
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    if (sessionId) {
      const messages = await db.fenggeChat.findMany({
        where: { userId: user.id, sessionId },
        orderBy: { createdAt: "asc" },
        take: 100,
        select: { id: true, role: true, content: true, createdAt: true },
      });
      return NextResponse.json({ messages, guest: false });
    }
    // 列出用户的会话（按最近一条）
    const recent = await db.fenggeChat.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 1,
      select: { sessionId: true },
    });
    const lastSession = recent[0]?.sessionId;
    if (!lastSession) return NextResponse.json({ messages: [], guest: false });
    const messages = await db.fenggeChat.findMany({
      where: { userId: user.id, sessionId: lastSession },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: { id: true, role: true, content: true, createdAt: true },
    });
    return NextResponse.json({ messages, sessionId: lastSession, guest: false });
  } catch (e) {
    console.error("fengge-chat history error", e);
    return NextResponse.json({ error: "获取历史失败" }, { status: 500 });
  }
}

/** 清除登录用户某会话历史 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "缺少 sessionId" }, { status: 400 });
    }
    const result = await db.fenggeChat.deleteMany({
      where: { userId: user.id, sessionId },
    });
    return NextResponse.json({ deleted: result.count });
  } catch (e) {
    console.error("fengge-chat clear error", e);
    return NextResponse.json({ error: "清除历史失败" }, { status: 500 });
  }
}