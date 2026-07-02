/**
 * 小米 MiMo TTS 音色与模式元数据（客户端安全，无 server-only 依赖）。
 *
 * 可用音色列表来自 MiMo API 实际返回：
 * [mimo_default, 冰糖, 茉莉, 苏打, 白桦, Mia, Chloe, Milo, Dean]
 */

export type MimoTtsMode = "preset" | "design" | "clone";

export interface MimoPresetVoice {
  /** 传给 API 的 voice 标识 */
  id: string;
  /** 展示名 */
  name: string;
  /** 一句话描述 */
  desc: string;
  /** 展示 emoji */
  emoji: string;
}

/**
 * 预置音色清单（MiMo API 实际支持的音色）。
 */
export const MIMO_PRESET_VOICES: MimoPresetVoice[] = [
  { id: "Chloe", name: "Chloe", desc: "清亮女声 · 亲切活泼", emoji: "🌟" },
  { id: "Mia", name: "Mia", desc: "甜美女声 · 温柔可人", emoji: "🎀" },
  { id: "冰糖", name: "冰糖", desc: "清透女声 · 爽朗干脆", emoji: "🧊" },
  { id: "茉莉", name: "茉莉", desc: "优雅女声 · 知性温柔", emoji: "🌸" },
  { id: "苏打", name: "苏打", desc: "清新女声 · 活力俏皮", emoji: "🥤" },
  { id: "Milo", name: "Milo", desc: "温暖男声 · 亲切自然", emoji: "☀️" },
  { id: "Dean", name: "Dean", desc: "磁性男声 · 沉稳有力", emoji: "🎸" },
  { id: "白桦", name: "白桦", desc: "沉稳男声 · 成熟稳重", emoji: "🌲" },
];

/** 默认预置音色 id */
export const MIMO_DEFAULT_PRESET_VOICE = MIMO_PRESET_VOICES[0].id;

export interface MimoTtsModeMeta {
  key: MimoTtsMode;
  label: string;
  desc: string;
  emoji: string;
}

/** 工具页 Tab 用的三模式元数据 */
export const MIMO_TTS_MODES: MimoTtsModeMeta[] = [
  {
    key: "preset",
    label: "预置音色",
    desc: "从内置声线里直接挑，最稳定",
    emoji: "🎙️",
  },
  {
    key: "design",
    label: "音色设计",
    desc: "用自然语言描述想要的音色风格",
    emoji: "🎨",
  },
  {
    key: "clone",
    label: "音色复刻",
    desc: "上传一段参考音频，复刻同款声线",
    emoji: "🧬",
  },
];

/** 音色设计预设：基于电影类型给现成的风格描述，点一下即填入。 */
export interface MimoDesignPreset {
  id: string;
  /** 类目标签 */
  label: string;
  /** 展示 emoji */
  emoji: string;
  /** 填入「音色风格描述」框的提示词 */
  prompt: string;
}

/**
 * 基于电影类型的音色设计预设。点击后会覆盖填进 design 模式的描述框。
 * 提示词直接给 MiMo（mimo-v2.5-tts-voicedesign）当 user message。
 */
export const MIMO_DESIGN_PRESETS: MimoDesignPreset[] = [
  {
    id: "warm",
    label: "温情励志爱情",
    emoji: "🌸",
    prompt:
      "温柔治愈的中青年男声，语调舒缓有温度，节奏中偏慢，带一点克制的深情，像在轻声讲故事，适合温情、励志、爱情类解说。",
  },
  {
    id: "suspense",
    label: "悬疑惊悚恐怖",
    emoji: "🩸",
    prompt:
      "低沉压暗的男声，气息贴近麦克风，语调克制带压抑感，停顿多，关键句略拖长，营造紧张悬疑、毛骨悚然的解说氛围。",
  },
  {
    id: "doc",
    label: "纪录片",
    emoji: "📽️",
    prompt:
      "沉稳磁性的中年男声，咬字清晰端庄，节奏平缓稳健，略带学术感与客观叙事感，类似纪录片旁白，适合历史、人文、科普类内容。",
  },
  {
    id: "action",
    label: "动作犯罪",
    emoji: "🔫",
    prompt:
      "硬朗有力的男声，咬字铿锵带力量，节奏明快利落，语气果断带张力，兼具专业感与现场感，适合动作、犯罪、警匪类快节奏解说。",
  },
];