// src/lib/model-languages.ts
import { commonLanguages } from "@/lib/languages";

// 定义每个模型专属的支持语言
export const modelSupportedLanguages = {
  deepseek: {  // ← 改成 deepseek（或你想用的 key）
    name: "DeepSeek 翻译",
    icon: "🫘",
    description: "综合翻译效果最佳",
    tag: "推荐",
    sourceLanguages: [
      { value: "auto", label: "自动识别", flag: "🔍" },
      { value: "zh", label: "中文", flag: "🇨🇳" },
      { value: "en", label: "英语", flag: "🇺🇸" },
      { value: "ja", label: "日语", flag: "🇯🇵" },
      { value: "ko", label: "韩语", flag: "🇰🇷" },
      // 根据实际支持补充
    ],
    targetLanguages: [
      { value: "zh", label: "中文", flag: "🇨🇳" },
      { value: "en", label: "英语", flag: "🇺🇸" },
      { value: "ja", label: "日语", flag: "🇯🇵" },
      { value: "ko", label: "韩语", flag: "🇰🇷" },
    ],
  },

  volcano: {
    name: "火山翻译",
    icon: "🌋",
    description: "字节跳动出品",
    sourceLanguages: [
      { value: "auto", label: "自动识别", flag: "🔍" },
      { value: "zh", label: "中文", flag: "🇨🇳" },
      { value: "en", label: "英语", flag: "🇺🇸" },
      { value: "fr", label: "法语", flag: "🇫🇷" },
      { value: "de", label: "德语", flag: "🇩🇪" },
    ],
    targetLanguages: [
      { value: "zh", label: "中文", flag: "🇨🇳" },
      { value: "en", label: "英语", flag: "🇺🇸" },
      { value: "fr", label: "法语", flag: "🇫🇷" },
      { value: "es", label: "西班牙语", flag: "🇪🇸" },
    ],
  },

  doubao: {
    name: "豆包翻译",
    icon: "🫘",
    description: "豆包翻译模型，综合翻译效果最佳",
    tag: "New",
    sourceLanguages: [
      { value: "auto", label: "自动识别", flag: "🔍" },
      { value: "zh", label: "中文", flag: "🇨🇳" },
      { value: "en", label: "英语", flag: "🇺🇸" },
      // 豆包支持的语言
    ],
    targetLanguages: [
      { value: "zh", label: "中文", flag: "🇨🇳" },
      { value: "en", label: "英语", flag: "🇺🇸" },
    ],
  },

  gpt4: {
    name: "GPT-4o（推荐）",
    icon: "🤖",
    description: "OpenAI 最强模型，支持100+语言",
    sourceLanguages: commonLanguages,
    targetLanguages: commonLanguages.filter((l) => l.value !== "auto"),
  },
};

// 导出模型列表（value 必须和上面 key 完全一致！）
export const models = [
  {
    value: "deepseek",
    label: "DeepSeek 翻译",
    icon: "🫘",
    description: "综合翻译效果最佳",
    tag: "推荐",
    tagVariant: "default" as const,
  },
  {
    value: "volcano",
    label: "火山翻译",
    icon: "🌋",
    description: "字节跳动出品",
  },
  {
    value: "doubao",
    label: "豆包翻译",
    icon: "🫘",
    description: "豆包翻译模型，综合翻译效果最佳",
    tag: "New",
    tagVariant: "secondary" as const,
  },
  {
    value: "gpt4",
    label: "GPT-4o（推荐）",
    icon: "🤖",
    description: "OpenAI 最强模型，支持100+语言",
  },
];

export type ModelKey = keyof typeof modelSupportedLanguages;