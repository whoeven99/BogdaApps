// src/components/TranslationControls.tsx
"use client";

import { LanguageSelect } from "../components/LanguageSelect";
import { ModelSelect } from "../components/ModelSelect";
import { modelSupportedLanguages, models } from "@/lib/model-languages";

type TranslationControlsProps = {
  sourceLang: string;
  setSourceLang: (v: string) => void;
  targetLang: string;
  setTargetLang: (v: string) => void;
  model: string;
  setModel: (v: string) => void;
};

export function TranslationControls({
  sourceLang,
  setSourceLang,
  targetLang,
  setTargetLang,
  model,
  setModel,
}: TranslationControlsProps) {
  const current = modelSupportedLanguages[model as keyof typeof modelSupportedLanguages] || modelSupportedLanguages.gpt4;

  // 切换模型时自动重置语言为安全值
  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    // 可选：重置为推荐默认
    setSourceLang("auto");
    setTargetLang("en");
  };

  return (
    <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
      <LanguageSelect
        triggerLabel="源语言"
        value={sourceLang}
        onValueChange={setSourceLang}
        languages={current.sourceLanguages}
        placeholder="自动识别"
      />

      <LanguageSelect
        triggerLabel="目标语言"
        value={targetLang}
        onValueChange={setTargetLang}
        languages={current.targetLanguages}
        placeholder="选择目标语言"
      />

      <ModelSelect
        value={model}
        onValueChange={handleModelChange}
        models={models}
      />
    </div>
  );
}