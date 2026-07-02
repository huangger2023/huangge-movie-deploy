import type { MimoTtsMode } from "@/lib/mimo-voices";

export class MimoTtsError extends Error {
  status: number;
  detail: string;
  isRateLimited: boolean;

  constructor(message: string, status: number, detail: string, isRateLimited = false) {
    super(message);
    this.name = "MimoTtsError";
    this.status = status;
    this.detail = detail;
    this.isRateLimited = isRateLimited;
  }
}

export function getTtsConcurrencyForMode(mode: MimoTtsMode) {
  if (mode === "preset") return 2;
  return 1;
}

export function getTtsRetryDelaysForMode(mode: MimoTtsMode) {
  return mode === "clone" ? [1200, 3000, 6000] : [800, 2000];
}

export function isMimoRateLimit(status: number, detail: string) {
  return (
    status === 429 ||
    /too many requests/i.test(detail) ||
    /limitation/i.test(detail) ||
    /rate.?limit/i.test(detail)
  );
}

export function createMimoTtsError(status: number, detail: string) {
  if (isMimoRateLimit(status, detail)) {
    return new MimoTtsError(
      "MiMo TTS 当前请求过于频繁或账号额度受限，请稍等 1-2 分钟后重试；音色复刻模型比普通音色更容易触发限流。",
      status,
      detail,
      true,
    );
  }

  return new MimoTtsError(`MiMo TTS 请求失败 (${status})`, status, detail);
}
