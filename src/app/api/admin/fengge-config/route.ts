import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

/** 「和荒哥聊聊」相关 SystemSetting 键 */
const KEY_VOICE = "fengge_voice"; // 荒哥参考音频 dataURI（clone 模式）
const KEY_QUOTA = "fengge_guest_quota"; // 游客免费轮数

const ALLOWED_AUDIO_MIME = [
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/webm",
  "audio/ogg",
];
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

/**
 * GET /api/admin/fengge-config
 * 返回：是否已配置荒哥音色、游客配额。
 * 不回传音频 dataURI（体积大），仅返回 hasVoice。
 */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const [voiceRow, quotaRow] = await Promise.all([
      db.systemSetting.findUnique({ where: { key: KEY_VOICE } }).catch(() => null),
      db.systemSetting.findUnique({ where: { key: KEY_QUOTA } }).catch(() => null),
    ]);

    const hasVoice = !!voiceRow?.value && voiceRow.value.startsWith("data:");
    let quota = 5;
    if (quotaRow?.value) {
      const v = Number(quotaRow.value);
      if (Number.isFinite(v) && v > 0) quota = Math.floor(v);
    }

    return NextResponse.json({ hasVoice, quota });
  } catch (e) {
    console.error("fengge-config get error", e);
    return NextResponse.json({ error: "获取荒哥配置失败" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/fengge-config
 * Body（multipart/form-data）:
 *   - quota: string (数字)
 *   - action: "upload" | "remove" | "quota_only"
 *   - file?: audio File（仅 action=upload 时）
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const form = await req.formData();
    const action = String(form.get("action") || "quota_only");
    const quotaRaw = String(form.get("quota") || "").trim();

    // —— 更新游客配额 ——
    let quota = NaN;
    if (quotaRaw) {
      quota = Number(quotaRaw);
      if (!Number.isFinite(quota) || quota < 0) {
        return NextResponse.json(
          { error: "游客配额必须是非负数字" },
          { status: 400 }
        );
      }
      quota = Math.floor(quota);
      await db.systemSetting.upsert({
        where: { key: KEY_QUOTA },
        create: { key: KEY_QUOTA, value: String(quota) },
        update: { value: String(quota) },
      });
    }

    // —— 处理参考音频 ——
    if (action === "remove") {
      await db.systemSetting
        .deleteMany({ where: { key: KEY_VOICE } })
        .catch(() => null);
    } else if (action === "upload") {
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "请上传音频文件" }, { status: 400 });
      }
      if (file.size > MAX_AUDIO_BYTES) {
        return NextResponse.json(
          { error: "音频过大，请控制在 5MB 以内" },
          { status: 400 }
        );
      }
      const mime = file.type || "audio/wav";
      if (!ALLOWED_AUDIO_MIME.includes(mime)) {
        return NextResponse.json(
          { error: "音频格式不支持，请上传 wav / mp3 / m4a / webm / ogg" },
          { status: 400 }
        );
      }
      const buf = Buffer.from(await file.arrayBuffer());
      const dataUri = `data:${mime};base64,${buf.toString("base64")}`;
      await db.systemSetting.upsert({
        where: { key: KEY_VOICE },
        create: { key: KEY_VOICE, value: dataUri },
        update: { value: dataUri },
      });
    }

    // 返回最新状态
    const voiceRow = await db.systemSetting
      .findUnique({ where: { key: KEY_VOICE } })
      .catch(() => null);
    const hasVoice = !!voiceRow?.value && voiceRow.value.startsWith("data:");
    const quotaRow = await db.systemSetting
      .findUnique({ where: { key: KEY_QUOTA } })
      .catch(() => null);
    let finalQuota = 5;
    if (quotaRow?.value) {
      const v = Number(quotaRow.value);
      if (Number.isFinite(v) && v > 0) finalQuota = Math.floor(v);
    }

    return NextResponse.json({
      success: true,
      hasVoice,
      quota: Number.isFinite(quota) ? quota : finalQuota,
    });
  } catch (e) {
    console.error("fengge-config put error", e);
    return NextResponse.json({ error: "保存荒哥配置失败" }, { status: 500 });
  }
}