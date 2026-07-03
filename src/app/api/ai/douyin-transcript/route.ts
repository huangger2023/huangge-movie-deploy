import { NextRequest, NextResponse } from "next/server";
import { fetchDouyinTranscript } from "@/lib/douyin";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/ai/douyin-transcript
 *
 * 从抖音分享链接提取视频字幕/文案，作为剧情参考。
 *
 * Body: { "link": "抖音分享链接或包含链接的文本" }
 *
 * 返回:
 * {
 *   videoId: string,
 *   title: string,
 *   desc: string,
 *   author?: string,
 *   duration?: number,
 *   subtitleText?: string,   // 字幕全文
 *   subtitleCues?: { start, end, text }[],
 *   subtitleSource?: string, // 字幕来源说明
 *   fullText: string,        // 优先字幕，无字幕则用描述
 *   cueCount: number,
 *   videoUrl?: string         // 无水印视频下载URL
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const link = String(body.link || "").trim();

    if (!link) {
      return NextResponse.json(
        { error: "请输入抖音分享链接" },
        { status: 400 }
      );
    }

    // 基本校验：必须包含抖音相关域名
    if (
      !link.includes("douyin.com") &&
      !link.includes("iesdouyin.com") &&
      !link.includes("v.douyin.com")
    ) {
      return NextResponse.json(
        { error: "请输入有效的抖音链接（需包含 douyin.com）" },
        { status: 400 }
      );
    }

    const info = await fetchDouyinTranscript(link);

    // 优先使用字幕文本，无字幕则使用视频描述
    const fullText = info.subtitleText || info.desc || "";
    const cueCount = info.subtitleCues?.length || 0;

    // 有字幕 → 直接返回
    if (fullText && info.subtitleText) {
      return NextResponse.json({
        videoId: info.videoId,
        title: info.title,
        desc: info.desc,
        author: info.author,
        duration: info.duration,
        subtitleText: info.subtitleText,
        subtitleCues: info.subtitleCues,
        subtitleSource: info.subtitleSource,
        fullText,
        cueCount,
      });
    }

    // 无字幕：返回视频 URL
    return NextResponse.json({
      videoId: info.videoId,
      title: info.title,
      desc: info.desc,
      author: info.author,
      duration: info.duration,
      fullText: info.desc || "",
      cueCount: 0,
      videoUrl: info.videoUrl || undefined,
    });
  } catch (e) {
    console.error("douyin-transcript error", e);
    const msg = e instanceof Error ? e.message : "抖音文案提取失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
