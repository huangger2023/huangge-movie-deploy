import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/ai/audio-proxy?url=...
 *
 * 代理下载音频/视频文件，解决前端跨域问题。
 * 用于前端讯飞 ASR 流程：前端通过此代理下载抖音无水印视频。
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "缺少 url 参数" }, { status: 400 });
  }

  // 安全校验：只允许代理已知域名
  const parsed = new URL(url);
  const isAllowed =
    parsed.hostname.endsWith(".douyinvod.com") ||
    parsed.hostname.endsWith(".snssdk.com") ||
    parsed.hostname.endsWith(".amemv.com") ||
    parsed.hostname === "aweme.snssdk.com" ||
    parsed.hostname === "api.amemv.com";

  if (!isAllowed) {
    return NextResponse.json(
      { error: `不支持的域名: ${parsed.hostname}` },
      { status: 403 }
    );
  }

  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/121.0.2277.107 Version/17.0 Mobile/15E148 Safari/604.1",
        Referer: "https://www.iesdouyin.com/",
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!resp.ok) {
      return NextResponse.json(
        { error: `下载失败: ${resp.status}` },
        { status: 502 }
      );
    }

    const contentType =
      resp.headers.get("content-type") || "application/octet-stream";
    const contentLength = resp.headers.get("content-length") || "";

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    };
    if (contentLength) headers["Content-Length"] = contentLength;

    return new NextResponse(resp.body, {
      status: 200,
      headers,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "代理下载失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
