/**
 * 字幕解析器：解析 srt / vtt 字幕为结构化数据。
 * 输入：原始字幕文本字符串
 * 输出：{ cues: { start, end, text }[] }
 */

export interface SubtitleCue {
  /** 开始时间（秒） */
  start: number;
  /** 结束时间（秒） */
  end: number;
  /** 字幕文本 */
  text: string;
}

export interface ParsedSubtitle {
  cues: SubtitleCue[];
  /** 合并后的纯文本（去除时间轴） */
  fullText: string;
}

/**
 * 解析 SRT 格式字幕
 * SRT 结构：
 * 序号
 * 开始 --> 结束
 * 字幕文本（可能多行）
 * 空行
 */
export function parseSRT(raw: string): ParsedSubtitle {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const cues: SubtitleCue[] = [];

  let i = 0;
  // 去掉 BOM
  while (i < lines.length && lines[i].charCodeAt(0) === 0xfeff) {
    lines[i] = lines[i].slice(1);
  }

  while (i < lines.length) {
    // 跳过空行
    if (!lines[i].trim()) {
      i++;
      continue;
    }
    // 跳过序号行（纯数字）
    if (/^\d+$/.test(lines[i].trim())) {
      i++;
      continue;
    }
    // 时间轴行：00:01:02,345 --> 00:01:05,678
    const timeMatch = lines[i].match(
      /(\d+):(\d+):(\d+)[.,](\d+)\s*-->\s*(\d+):(\d+):(\d+)[.,](\d+)/
    );
    if (timeMatch) {
      const start =
        parseInt(timeMatch[1]) * 3600 +
        parseInt(timeMatch[2]) * 60 +
        parseInt(timeMatch[3]) +
        parseInt(timeMatch[4]) / 1000;
      const end =
        parseInt(timeMatch[5]) * 3600 +
        parseInt(timeMatch[6]) * 60 +
        parseInt(timeMatch[7]) +
        parseInt(timeMatch[8]) / 1000;
      i++;
      // 收集多行文本
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim()) {
        // 去掉 HTML 标签（SRT 允许少量格式）
        textLines.push(lines[i].replace(/<[^>]+>/g, "").trim());
        i++;
      }
      const text = textLines.join(" ").trim();
      if (text) {
        cues.push({ start, end, text });
      }
    } else {
      // 非标准行，跳过
      i++;
    }
  }

  return {
    cues,
    fullText: cues.map((c) => c.text).join("\n"),
  };
}

/**
 * 解析 VTT 格式字幕
 * VTT 结构与 SRT 类似，但头部有 "WEBVTT" 标记
 * 时间格式：00:01:02.345 --> 00:01:05.678（点号分隔毫秒）
 */
export function parseVTT(raw: string): ParsedSubtitle {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const cues: SubtitleCue[] = [];

  let i = 0;
  // 跳过头部的 WEBVTT 及元数据
  while (i < lines.length && !lines[i].includes("-->")) {
    i++;
  }

  while (i < lines.length) {
    if (!lines[i].trim()) {
      i++;
      continue;
    }
    // 跳过序号（有时存在）
    if (/^\d+$/.test(lines[i].trim())) {
      i++;
      continue;
    }
    // 时间轴：00:01:02.345 --> 00:01:05.678
    const timeMatch = lines[i].match(
      /(\d+):(\d+):(\d+)[.,](\d+)\s*-->\s*(\d+):(\d+):(\d+)[.,](\d+)/
    );
    if (timeMatch) {
      const start =
        parseInt(timeMatch[1]) * 3600 +
        parseInt(timeMatch[2]) * 60 +
        parseInt(timeMatch[3]) +
        parseInt(timeMatch[4]) / 1000;
      const end =
        parseInt(timeMatch[5]) * 3600 +
        parseInt(timeMatch[6]) * 60 +
        parseInt(timeMatch[7]) +
        parseInt(timeMatch[8]) / 1000;
      i++;
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() && !lines[i].includes("-->")) {
        textLines.push(lines[i].replace(/<[^>]+>/g, "").trim());
        i++;
      }
      const text = textLines.join(" ").trim();
      if (text) {
        cues.push({ start, end, text });
      }
    } else {
      i++;
    }
  }

  return {
    cues,
    fullText: cues.map((c) => c.text).join("\n"),
  };
}

/**
 * 自动检测格式并解析字幕
 */
export function parseSubtitle(raw: string, filename?: string): ParsedSubtitle {
  const trimmed = raw.trim();
  if (filename?.toLowerCase().endsWith(".txt")) {
    return parsePlainTextSubtitle(trimmed);
  }
  // 通过头部检测格式
  if (trimmed.startsWith("WEBVTT")) {
    return parseVTT(trimmed);
  }
  // 如果有 .vtt 后缀
  if (filename?.toLowerCase().endsWith(".vtt")) {
    return parseVTT(trimmed);
  }
  // 默认按 SRT 解析
  return parseSRT(trimmed);
}

export function parsePlainTextSubtitle(raw: string): ParsedSubtitle {
  const lines = raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const text = lines.join("\n").trim();
  if (!text) return { cues: [], fullText: "" };

  return {
    cues: [{ start: 0, end: 0, text }],
    fullText: text,
  };
}
