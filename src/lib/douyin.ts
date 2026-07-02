/**
 * 抖音视频字幕/文案提取工具
 *
 * 原理：
 * 1. 从分享文本中提取短链接
 * 2. 跟随重定向获取视频 ID
 * 3. 请求 iesdouyin.com 分享页，解析 window._ROUTER_DATA JSON
 * 4. 从 JSON 中提取视频信息、字幕 URL
 * 5. 若有字幕则下载并解析；无字幕则返回视频描述
 */

import { parseSubtitle } from "./subtitle-parser";

const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/121.0.2277.107 Version/17.0 Mobile/15E148 Safari/604.1";

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface DouyinVideoInfo {
  videoId: string;
  title: string;
  desc: string;
  videoUrl?: string;
  author?: string;
  duration?: number;
  /** 字幕原文（如果有） */
  subtitleText?: string;
  /** 字幕条目（如果有） */
  subtitleCues?: { start: number; end: number; text: string }[];
  /** 字幕来源描述 */
  subtitleSource?: string;
}

/**
 * 从分享文本中提取 URL
 * 注意：字符类中必须包含 / 字符，否则短链接如
 * https://v.douyin.com/TSY5_1iXxO8/ 会被截断为 https://v.douyin.com
 */
function extractUrl(text: string): string | null {
  // 使用简单可靠的方式：匹配非空白、非引号、非尖括号的字符
  const match = text.match(/https?:\/\/[^\s<>"']+/);
  return match ? match[0] : null;
}

/**
 * 从 URL 中提取视频 ID
 * 支持格式：
 * - https://www.douyin.com/video/1234567890
 * - https://www.douyin.com/discover?modal_id=1234567890
 * - https://v.douyin.com/xxxxx/ (短链接，需重定向)
 */
function extractVideoId(url: string): string | null {
  // 直接从 URL 路径提取
  const patterns = [
    /\/video\/(\d+)/,
    /\/share\/video\/(\d+)/,
    /modal_id=(\d+)/,
    /\/note\/(\d+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

/**
 * 获取 ttwid cookie（提高短链接解析成功率）
 */
async function getTtwid(): Promise<string> {
  try {
    const r = await fetch("https://ttwid.bytedance.com/ttwid/union/register/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region: "cn",
        aid: 1768,
        needFid: false,
        service: "www.douyin.com",
        migrate_priority: 0,
        callbackUrl: "",
      }),
      signal: AbortSignal.timeout(5000),
    });
    const sc = r.headers.get("set-cookie") || "";
    const m = sc.match(/ttwid=([^;]+)/);
    return m ? m[1] : "";
  } catch {
    return "";
  }
}

/**
 * 解析抖音分享链接，获取视频 ID
 *
 * 策略：
 * 1. 直接从 URL 路径提取（完整链接）
 * 2. 短链接：不跟随重定向，从 302 Location 头提取视频 ID
 * 3. 短链接 + ttwid：如果步骤 2 失败，加 cookie 重试
 * 4. 最终兜底：跟随重定向，从最终 URL 提取
 */
async function resolveShareLink(
  shareText: string
): Promise<{ videoId: string; shareUrl: string }> {
  const rawUrl = extractUrl(shareText);
  console.error("[douyin] rawUrl:", rawUrl);
  if (!rawUrl) {
    throw new Error("未找到有效的分享链接");
  }

  // 策略1：直接从 URL 提取视频 ID
  const directId = extractVideoId(rawUrl);
  console.error("[douyin] directId:", directId);
  if (directId) {
    return {
      videoId: directId,
      shareUrl: `https://www.iesdouyin.com/share/video/${directId}`,
    };
  }

  // 策略2：短链接 302 重定向，不跟随，从 Location 头提取
  const tryRedirect = async (cookie?: string): Promise<string | null> => {
    const headers: Record<string, string> = {
      "User-Agent": MOBILE_UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9",
    };
    if (cookie) headers["Cookie"] = cookie;

    const resp = await fetch(rawUrl, {
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });

    console.error("[douyin] redirect status:", resp.status, "cookie:", !!cookie);

    // 302 重定向
    if (resp.status === 301 || resp.status === 302 || resp.status === 303) {
      const location = resp.headers.get("location") || "";
      console.error("[douyin] Location:", location.slice(0, 150));
      const vid = extractVideoId(location);
      console.error("[douyin] vid from location:", vid);
      if (vid) return vid;
      // 有些 Location 不含 /video/ 路径，尝试从 query 参数提取
      const modalMatch = location.match(/modal_id=(\d+)/);
      if (modalMatch) return modalMatch[1];
    }

    // 有些短链接不返回 302，而是返回 200 + meta refresh 或 JS 跳转
    if (resp.status === 200) {
      const html = await resp.text();
      // 搜索 meta refresh 跳转
      const metaMatch = html.match(
        /<meta[^>]+http-equiv=["']?refresh["']?[^>]+url=([^"'>\s]+)/i
      );
      if (metaMatch) {
        const vid = extractVideoId(metaMatch[1]);
        if (vid) return vid;
      }
      // 搜索 window.location 跳转
      const locMatch = html.match(
        /(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']/
      );
      if (locMatch) {
        const vid = extractVideoId(locMatch[1]);
        if (vid) return vid;
      }
      // 搜索 HTML 中的视频 ID
      const vidInHtml = html.match(/\/share\/video\/(\d+)/);
      if (vidInHtml) return vidInHtml[1];
    }

    return null;
  };

  // 先不带 cookie 尝试
  let videoId = await tryRedirect();

  // 如果失败，带 ttwid cookie 重试
  if (!videoId) {
    const ttwid = await getTtwid();
    if (ttwid) {
      videoId = await tryRedirect(`ttwid=${ttwid}`);
    }
  }

  // 策略3：跟随重定向，从最终 URL 提取
  if (!videoId) {
    const ttwid = await getTtwid();
    const headers: Record<string, string> = { "User-Agent": MOBILE_UA };
    if (ttwid) headers["Cookie"] = `ttwid=${ttwid}`;

    const resp = await fetch(rawUrl, {
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    videoId = extractVideoId(resp.url);
    if (!videoId) {
      // 在最终页面 HTML 中搜索
      const html = await resp.text();
      const vidInHtml = html.match(/\/video\/(\d{15,})/);
      if (vidInHtml) videoId = vidInHtml[1];
    }
  }

  if (!videoId) {
    throw new Error("无法从链接中解析视频 ID，请确认链接是否有效");
  }

  return {
    videoId,
    shareUrl: `https://www.iesdouyin.com/share/video/${videoId}`,
  };
}

/**
 * 从 iesdouyin 分享页提取 _ROUTER_DATA JSON
 */
async function fetchRouterData(
  shareUrl: string
): Promise<Record<string, any>> {
  const resp = await fetch(shareUrl, {
    headers: {
      "User-Agent": MOBILE_UA,
      Referer: "https://www.iesdouyin.com/",
    },
  });

  if (!resp.ok) {
    throw new Error(`请求分享页失败: ${resp.status}`);
  }

  const html = await resp.text();

  // 提取 window._ROUTER_DATA = {...}</script>
  const match = html.match(/window\._ROUTER_DATA\s*=\s*([\s\S]*?)<\/script>/);
  if (!match || !match[1]) {
    throw new Error("从页面中解析视频数据失败，可能需要登录或页面结构已变更");
  }

  const jsonStr = match[1].trim();
  return JSON.parse(jsonStr);
}

/**
 * 从 _ROUTER_DATA 中提取视频信息
 */
function extractVideoFromRouterData(
  routerData: Record<string, any>,
  videoId: string
): { data: Record<string, any>; title: string } {
  const loaderData = routerData.loaderData || {};
  const VIDEO_KEY = "video_(id)/page";
  const NOTE_KEY = "note_(id)/page";

  let videoInfoRes: any = null;

  if (loaderData[VIDEO_KEY]) {
    videoInfoRes = loaderData[VIDEO_KEY].videoInfoRes;
  } else if (loaderData[NOTE_KEY]) {
    videoInfoRes = loaderData[NOTE_KEY].videoInfoRes;
  } else {
    // 尝试遍历 loaderData 找到包含 videoInfoRes 的 key
    for (const key of Object.keys(loaderData)) {
      if (loaderData[key]?.videoInfoRes) {
        videoInfoRes = loaderData[key].videoInfoRes;
        break;
      }
    }
  }

  if (!videoInfoRes) {
    throw new Error("无法从页面数据中找到视频信息");
  }

  const itemList = videoInfoRes.item_list || videoInfoRes.itemList || [];
  if (!itemList.length) {
    throw new Error("视频信息为空，可能视频已被删除或不可访问");
  }

  const data = itemList[0];
  const desc = (data.desc || "").trim() || `douyin_${videoId}`;

  return { data, title: desc };
}

/**
 * 尝试从视频数据中提取字幕
 * 抖音视频可能有多种字幕来源：
 * 1. video.subtitle.subtitleInfos
 * 2. interaction.subtitle
 * 3. video.ai_dynamic_subtitle
 */
async function tryFetchSubtitle(
  data: Record<string, any>
): Promise<{ text: string; cues: any[]; source: string } | null> {
  // 方式1：video.subtitle.subtitleInfos
  const subtitleInfos =
    data?.video?.subtitle?.subtitleInfos ||
    data?.video?.subtitle?.SubtitleInfos ||
    [];

  if (Array.isArray(subtitleInfos) && subtitleInfos.length > 0) {
    // 优先选择中文字幕
    const sorted = [...subtitleInfos].sort((a, b) => {
      const aLang = a.LanguageCodeName || a.language || "";
      const bLang = b.LanguageCodeName || b.language || "";
      const aZh = aLang.includes("zh") || aLang.includes("CN") ? 0 : 1;
      const bZh = bLang.includes("zh") || bLang.includes("CN") ? 0 : 1;
      return aZh - bZh;
    });

    for (const sub of sorted) {
      const url = sub.Url || sub.url;
      if (!url) continue;
      try {
        const subResp = await fetch(url, {
          headers: { "User-Agent": DESKTOP_UA },
        });
        if (!subResp.ok) continue;
        const subText = await subResp.text();
        if (!subText.trim()) continue;

        const parsed = parseSubtitle(subText);
        if (parsed.cues.length > 0) {
          return {
            text: parsed.fullText,
            cues: parsed.cues,
            source: "抖音自动字幕",
          };
        }
      } catch {
        // 继续尝试下一个字幕
      }
    }
  }

  // 方式2：检查 ai_dynamic_subtitle 字段（直接是文本）
  const aiSubtitle = data?.video?.ai_dynamic_subtitle;
  if (typeof aiSubtitle === "string" && aiSubtitle.trim().length > 20) {
    return {
      text: aiSubtitle.trim(),
      cues: [],
      source: "AI 动态字幕",
    };
  }

  // 方式3：检查 caption 字段
  const caption = data?.caption;
  if (typeof caption === "string" && caption.trim().length > 20) {
    return {
      text: caption.trim(),
      cues: [],
      source: "视频字幕",
    };
  }

  return null;
}

/**
 * 主入口：从抖音分享链接提取视频文案/字幕
 */
export async function fetchDouyinTranscript(
  shareText: string
): Promise<DouyinVideoInfo> {
  // 1. 解析分享链接
  const { videoId, shareUrl } = await resolveShareLink(shareText);

  // 2. 获取页面数据
  const routerData = await fetchRouterData(shareUrl);

  // 3. 提取视频信息
  const { data, title } = extractVideoFromRouterData(routerData, videoId);

  // 4. 提取视频 URL 和作者信息
  const videoUrl =
    data?.video?.play_addr?.url_list?.[0]?.replace("playwm", "play") ||
    undefined;
  const author = data?.author?.nickname || undefined;
  const duration = data?.video?.duration
    ? Math.floor(data.video.duration / 1000)
    : undefined;
  const desc = (data.desc || "").trim();

  // 5. 尝试提取字幕
  const subtitle = await tryFetchSubtitle(data);

  return {
    videoId,
    title,
    desc,
    videoUrl,
    author,
    duration,
    subtitleText: subtitle?.text,
    subtitleCues: subtitle?.cues,
    subtitleSource: subtitle?.source,
  };
}
