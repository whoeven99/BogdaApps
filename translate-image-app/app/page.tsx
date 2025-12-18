// src/app/page.tsx
"use client";  // ← 必须加这行！变成客户端组件
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight,
  Sparkles,
  Zap,
  Image,
  Languages,
  Shield,
  MessageCircle
} from "lucide-react";
import { useTranslation } from 'react-i18next';

export default function Home() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="py-20 px-4 text-center">
        <div className="container mx-auto max-w-4xl">
          {/* <Badge variant="secondary" className="mb-6">{t("AI Image Translator")}</Badge> */}
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-blue-600 mb-6">
            {t("AI Image Translator")}
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-3xl mx-auto">
            将图片内的文字翻译成全球100+语言，支持翻译100+全球语言，保持图片原始布局，适用于跨境电商、漫画、社交媒体等多个场景，让您的工作效率提升10倍
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/translator">
                立即开始翻译 <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline">
              <Sparkles className="mr-2 h-5 w-5" />
              体验微信小程序
            </Button>
          </div>
        </div>
      </section>

      {/* 合作伙伴图标（可替换真实图标） */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto text-center">
          <p className="text-muted-foreground mb-6">
            支持众多AI翻译模型，支持批量翻译
          </p>
          <div className="flex flex-wrap justify-center gap-8 opacity-70">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="h-12 w-12 bg-gray-200 border-2 border-dashed rounded-xl"
              />
            ))}
          </div>
        </div>
      </section>

      {/* 功能卡片 */}
      <section className="py-20 px-4">
        <div className="container mx-auto grid md:grid-cols-3 gap-8 max-w-5xl">
          <Card className="p-8 text-center hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Languages className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-semibold mb-3">100+种语言</h3>
            <p className="text-muted-foreground">
              支持全球主流语言的高精准识别与翻译
            </p>
          </Card>

          <Card className="p-8 text-center hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-semibold mb-3">多种AI模型支持</h3>
            <p className="text-muted-foreground">
              AI加速处理，翻译结果即刻呈现
            </p>
          </Card>

          <Card className="p-8 text-center hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Image className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-semibold mb-3">保留原图排版</h3>
            <p className="text-muted-foreground">
              智能保持原图样式，无缝替换翻译文本
            </p>
          </Card>
        </div>
      </section>

      {/* 浮动聊天按钮 */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 rounded-full shadow-2xl h-14 w-14 p-0"
      >
        <MessageCircle className="h-7 w-7" />
      </Button>
    </div>
  );
}
