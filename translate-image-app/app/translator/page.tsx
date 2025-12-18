// src/app/translator/page.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Upload,
  Image as ImageIcon,
  Sparkles,
  X,
  Loader2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TranslationControls } from "@/app/components/TranslationControls";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export default function Translator() {
  // 上传的文件列表（File 对象）
  const [files, setFiles] = useState<File[]>([]);
  // 翻译状态：idle | translating | done
  // 最佳写法：明确类型，但包含所有值
  const [translationStatus, setTranslationStatus] = useState<
    "idle" | "translating" | "done"
  >("idle");
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  // 翻译后的图片 URL（模拟，实际应来自后端）
  const [translatedResults, setTranslatedResults] = useState<
    (string | undefined)[]
  >([]);
  const [currentIndex, setCurrentIndex] = useState(0); // 当前显示的图片索引
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("en");
  const [model, setModel] = useState("gpt4"); // 或你的默认模型
  // 处理文件上传（支持点击和拖拽）
  const handleFiles = useCallback((newFiles: File[]) => {
    const validFiles = newFiles.filter((file) =>
      ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)
    );

    setFiles((prev) => {
      const combined = [...prev, ...validFiles].slice(0, 10); // 最多10张
      return combined;
    });
  }, []);
  useEffect(() => {
    if (files.length === 0 && translatedResults.length === 0) {
      setCurrentIndex(0);
    } else {
      // 优先以 files 为准（上传的原图数量决定最大索引）
      const maxIndex = Math.max(files.length, translatedResults.length) - 1;
      setCurrentIndex((prev) => Math.max(0, Math.min(prev, maxIndex)));
    }
  }, [files, translatedResults]);
  // 处理点击上传
  const handleClickUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "image/jpeg,image/png,image/webp,image/gif";
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files) {
        handleFiles(Array.from(target.files));
      }
    };
    input.click();
  };

  // 处理拖拽
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (e.dataTransfer.files) {
        handleFiles(Array.from(e.dataTransfer.files));
      }
    },
    [handleFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // 移除图片
  const removeFile = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== indexToRemove));
    setTranslatedResults((prev) => prev.filter((_, i) => i !== indexToRemove));

    // currentIndex 会由 useEffect 自动调整，无需手动处理
  };
  // 清空所有
  const clearAll = () => {
    setFiles([]);
    setTranslatedResults([]);
    setTranslationStatus("idle");
  };

  // 开始翻译（模拟，后续替换成真实 API）
  // 修改 startTranslation 函数（替换原来的模拟翻译逻辑）
  const startTranslation = async () => {
    if (files.length === 0) return;

    // 如果所有图片都已翻译完成，直接结束
    if (
      translatedResults.length === files.length &&
      translatedResults.every((r) => r !== undefined)
    ) {
      setTranslationStatus("done");
      return;
    }

    setTranslationStatus("translating");

    // 初始化结果数组（保持长度一致，未翻译为 undefined）
    if (translatedResults.length < files.length) {
      setTranslatedResults((prev) => {
        const newResults = [...prev];
        // 补齐新增图片的位置
        while (newResults.length < files.length) {
          newResults.push(undefined);
        }
        return newResults;
      });
    }

    // 只翻译未翻译的图片（translatedResults[i] === undefined）
    for (let i = 0; i < files.length; i++) {
      if (translatedResults[i] !== undefined) {
        continue; // 已翻译，跳过
      }
      console.log("i", i);

      try {
        // 真实 API 调用（后续替换）
        // const formData = new FormData();
        // formData.append("image", files[i]);
        // formData.append("sourceLang", sourceLang);
        // formData.append("targetLang", targetLang);
        // formData.append("model", model);
        // const response = await fetch("/api/translate", { method: "POST", body: formData });
        // const blob = await response.blob();
        // const url = URL.createObjectURL(blob);

        // 模拟翻译（用原图占位）
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 + Math.random() * 1000)
        );

        const reader = new FileReader();
        const url = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(files[i]);
        });
        // console.log("url", url);

        // 更新对应索引的结果
        setTranslatedResults((prev) => {
          const newResults = [...prev];
          newResults[i] = url;

          // 检查是否全部完成
          if (newResults.every((r) => r !== undefined)) {
            setTranslationStatus("done");
          }

          return newResults;
        });
      } catch (error) {
        console.error(`第 ${i + 1} 张翻译失败`, error);
        // 可选：标记失败状态
        setTranslatedResults((prev) => {
          const newResults = [...prev];
          newResults[i] = "/error-placeholder.png"; // 或 null 表示失败
          return newResults;
        });
      }
    }

    // 确保最终状态为 done
    setTranslationStatus("done");
  };
  // 点击图片放大函数（左右通用）
  const openEnlargedView = (src: string) => {
    setEnlargedImage(src);
  };

  const closeEnlargedView = () => {
    setEnlargedImage(null);
  };
  return (
    <div className="container mx-auto py-12 px-4 max-w-7xl">
      {/* 控制栏 */}
      <div className="flex justify-end mb-12">
        <TranslationControls
          sourceLang={sourceLang}
          setSourceLang={setSourceLang}
          targetLang={targetLang}
          setTargetLang={setTargetLang}
          model={model}
          setModel={setModel}
        />
      </div>

      {/* 上传 + 结果 两栏 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
        {/* // 左侧：上传区（替换原来的左侧 Card） */}
        <Card className="p-8 overflow-hidden">
          <div className="flex flex-col h-full min-h-96">
            {/* 标题 + 计数 */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Upload className="w-5 h-5" />
                上传图片
              </h3>
              <span className="text-sm text-muted-foreground">
                {files.length}/10 张
              </span>
            </div>

            {files.length === 0 ? (
              // 未上传状态
              <div
                className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl bg-muted/20"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <div className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                  <Upload className="w-10 h-10 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-8">
                  支持 JPG、PNG、JPEG、WEBP、GIF 格式
                </p>
                <Button size="lg" onClick={handleClickUpload}>
                  选择图片
                </Button>
                <p className="text-sm text-muted-foreground mt-4">
                  最多10张 · 拖拽上传
                </p>
              </div>
            ) : (
              <>
                {/* 大图显示区 */}
                {/* 左侧大图显示区（只保留这一个 div） */}
                {/* 左侧大图显示区 */}
                {files.length > 0 && files[currentIndex] && (
                  <div className="relative flex-1 min-h-96 bg-muted/10 rounded-xl overflow-hidden mb-4">
                    <Image
                      src={URL.createObjectURL(files[currentIndex]!)}
                      alt="当前图片"
                      fill
                      className="object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() =>
                        openEnlargedView(
                          URL.createObjectURL(files[currentIndex]!)
                        )
                      }
                    />

                    {/* 动态标签：待处理 或 已翻译 */}
                    <div className="absolute top-4 left-4">
                      {translatedResults[currentIndex] ? (
                        <Badge
                          variant="default"
                          className="bg-green-500 text-white"
                        >
                          已翻译
                        </Badge>
                      ) : (
                        <Badge variant="secondary">待处理</Badge>
                      )}
                    </div>

                    {/* 删除按钮 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(currentIndex);
                      }}
                      className="absolute top-4 right-4 bg-background/80 rounded-full p-2 hover:bg-background transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    {/* 左右箭头 */}
                    {files.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentIndex(
                              (i) => (i - 1 + files.length) % files.length
                            );
                          }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-2 hover:bg-background transition-colors"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentIndex((i) => (i + 1) % files.length);
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-2 hover:bg-background transition-colors"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                      </>
                    )}

                    {/* 页码 */}
                    {files.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 rounded-full px-3 py-1 text-sm">
                        {currentIndex + 1} / {files.length}
                      </div>
                    )}
                  </div>
                )}

                {/* 缩略图条 + 添加按钮 */}
                <div className="flex items-center gap-3">
                  {/* 缩略图 */}
                  <div className="flex gap-2 overflow-x-auto py-2 flex-1">
                    {files.map((file, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={cn(
                          "relative shrink-0 rounded-lg overflow-hidden border-2 transition-all",
                          index === currentIndex
                            ? "border-primary"
                            : "border-transparent"
                        )}
                      >
                        <Image
                          src={URL.createObjectURL(file)}
                          alt={`缩略图 ${index + 1}`}
                          width={64}
                          height={64}
                          className="object-cover w-16 h-16"
                        />
                        {index === currentIndex && (
                          <div className="absolute inset-0 bg-primary/20" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* 添加按钮 */}
                  {files.length < 10 && (
                    <button
                      onClick={handleClickUpload}
                      className="shrink-0 w-16 h-16 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center hover:border-muted-foreground/60 transition-colors"
                    >
                      <Plus className="w-6 h-6 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </Card>
        {/* 右侧：翻译结果区 */}
        <Card className="p-8 overflow-hidden">
          <div className="flex flex-col h-full min-h-96">
            {/* 标题 + 操作按钮 */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-600" />
                翻译结果
              </h3>
              {translationStatus === "done" &&
                translatedResults.some((r) => r !== undefined) && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <ImageIcon className="w-4 h-4 mr-2" />
                      图片编辑
                    </Button>
                    <Button variant="outline" size="sm">
                      下载
                    </Button>
                    <Button variant="outline" size="sm">
                      批量下载
                    </Button>
                  </div>
                )}
            </div>

            {/* 空闲状态 */}
            {translationStatus === "idle" && (
              <div className="flex-1 flex items-center justify-center text-center">
                <div>
                  <ImageIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    {files.length === 0
                      ? "等待上传图片"
                      : "点击下方按钮开始翻译"}
                  </p>
                </div>
              </div>
            )}

            {/* 翻译中全局 loading */}
            {translationStatus === "translating" && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
                  <p className="text-lg">翻译中，请稍候...</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    正在处理 {files.length} 张图片
                  </p>
                </div>
              </div>
            )}

            {/* 翻译完成状态 */}
            {translationStatus === "done" && files.length > 0 && (
              <>
                {/* 大图显示区 */}
                <div className="relative flex-1 bg-muted/10 rounded-xl overflow-hidden mb-4">
                  {translatedResults[currentIndex] ? (
                    <Image
                      src={translatedResults[currentIndex]!}
                      alt="翻译结果"
                      fill
                      className="object-contain"
                      onClick={() =>
                        openEnlargedView(translatedResults[currentIndex]!)
                      }
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      {/* 圆形时钟图标 */}
                      <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center mb-6">
                        {/* 使用 lucide-react 的 Clock 图标（静态） */}
                        <Clock className="w-10 h-10 text-orange-500" />
                      </div>

                      {/* 主文字 */}
                      <h3 className="text-xl font-medium text-foreground mb-2">
                        准备处理
                      </h3>

                      {/* 副文字 */}
                      <p className="text-sm text-muted-foreground">
                        点击开始处理
                      </p>
                    </div>
                  )}

                  {/* 左右箭头 + 页码 */}
                  {files.length > 1 && (
                    <>
                      <button
                        onClick={() =>
                          setCurrentIndex(
                            (i) => (i - 1 + files.length) % files.length
                          )
                        }
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-2 hover:bg-background transition-colors"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() =>
                          setCurrentIndex((i) => (i + 1) % files.length)
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-2 hover:bg-background transition-colors"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>

                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 rounded-full px-3 py-1 text-sm">
                        {currentIndex + 1} / {files.length}
                      </div>
                    </>
                  )}
                </div>

                {/* 缩略图条 - 显示翻译进度 */}
                <div className="flex gap-3 overflow-x-auto py-2">
                  {translatedResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={cn(
                        "relative shrink-0 rounded-lg overflow-hidden border-2 transition-all",
                        index === currentIndex
                          ? "border-primary"
                          : "border-transparent"
                      )}
                    >
                      {result ? (
                        <Image
                          src={result}
                          alt={`翻译结果 ${index + 1}`}
                          width={80}
                          height={80}
                          className="object-cover w-20 h-20"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-muted flex items-center justify-center">
                          <div className="text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            <p className="text-xs mt-1">处理中</p>
                          </div>
                        </div>
                      )}
                      {/* 当前选中高亮 */}
                      {index === currentIndex && (
                        <div className="absolute inset-0 bg-primary/20 pointer-events-none" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* 底部按钮 */}
      <div className="flex justify-center gap-6 mb-20">
        <Button
          size="lg"
          className="px-12"
          onClick={startTranslation}
          disabled={files.length === 0 || translationStatus === "translating"}
        >
          {translationStatus === "translating" ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              翻译中...
            </>
          ) : (
            "开始翻译"
          )}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="px-12"
          onClick={clearAll}
        >
          清空所有
        </Button>
      </div>
      {/* 如何使用 */}
      <div className="mb-20">
        <h2 className="text-3xl font-bold text-center mb-4">如何使用</h2>
        <p className="text-center text-muted-foreground mb-12">
          简单四步，轻松完成图片翻译
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              num: "01",
              icon: "✨",
              title: "选择语言",
              desc: "选择源语言和目标语言，以及AI翻译模型",
            },
            {
              num: "02",
              icon: "↑",
              title: "上传图片",
              desc: "点击上传或拖拽图片到指定位置",
            },
            {
              num: "03",
              icon: "→",
              title: "开始翻译",
              desc: "点击'开始翻译'按钮，AI自动处理图片",
            },
            {
              num: "04",
              icon: "↓",
              title: "下载结果",
              desc: "翻译完成后下载或编辑翻译结果",
            },
          ].map((step, i) => (
            <Card
              key={i}
              className="p-6 text-center hover:shadow-md transition-shadow"
            >
              <div className="text-4xl font-bold text-primary mb-4">
                {step.num}
              </div>
              <div className="text-5xl mb-4">{step.icon}</div>
              <h3 className="font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* 常见问题 */}
      <div>
        <h2 className="text-3xl font-bold text-center mb-4">常见问题</h2>
        <p className="text-center text-muted-foreground mb-12">
          解答你可能遇到的疑问
        </p>

        <Accordion type="single" collapsible className="max-w-3xl mx-auto">
          <AccordionItem value="item-1">
            <AccordionTrigger>翻译一次扣除多少积分？</AccordionTrigger>
            <AccordionContent>
              对于普通模型，翻译一张图片扣除 2 积分；
              <br />
              对于 DeepSeek、OpenAI、Gemini 等高级模型，翻译一张图片扣除 5
              积分。
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2">
            <AccordionTrigger>带有 ✨ 徽标的按钮是什么意思？</AccordionTrigger>
            <AccordionContent>
              带有 ✨
              徽标的按钮表示该功能需要付费用户或者购买积分包的用户才能使用。
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3">
            <AccordionTrigger>支持哪些图片格式？</AccordionTrigger>
            <AccordionContent>
              支持 JPG、PNG、GIF、WebP 等常见图片格式，建议图片大小不超过 10MB。
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4">
            <AccordionTrigger>翻译准确度如何？</AccordionTrigger>
            <AccordionContent>
              我们使用多种先进的AI模型，翻译准确度高达 95% 以上，支持 100+
              种语言。
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5">
            <AccordionTrigger>是否支持批量翻译？</AccordionTrigger>
            <AccordionContent>
              支持，一次最多可上传 10 张图片进行批量翻译，大大提高工作效率。
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      {/* 如何使用 + 常见问题（保持不变） */}
      {/* ... 你原来的代码 ... */}
      {/* （为了篇幅省略，你保留原来的即可） */}
      {/* 全屏图片查看器 Modal */}
      <Dialog
        open={!!enlargedImage}
        onOpenChange={(open) => !open && closeEnlargedView()}
      >
        <DialogContent className="max-w-6xl w-full h-[90vh] p-0 overflow-hidden bg-black">
          <VisuallyHidden>
            <DialogTitle>图片放大查看</DialogTitle>
          </VisuallyHidden>

          <div className="relative w-full h-full flex items-center justify-center">
            {enlargedImage && (
              <Image
                src={enlargedImage}
                alt="放大查看"
                fill
                className="object-contain"
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full"
              onClick={closeEnlargedView}
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
