// app/pricing/page.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check } from "lucide-react";

const plans = [
  {
    name: "入门版",
    monthlyPrice: 29.9,
    yearlyPrice: 299,
    originalMonthly: 49.9,
    originalYearly: 499,
    save: "节省 20%",
    features: [
      "每月 500 积分",
      "高级 AI 翻译模型",
      "原始图片质量",
      "批量翻译",
      "图片编辑",
      "支持 100+ 语言",
    ],
    popular: false,
  },
  {
    name: "高级版",
    monthlyPrice: 49.9,
    yearlyPrice: 499,
    originalMonthly: 99.9,
    originalYearly: 999,
    save: "节省 50%",
    features: [
      "每月 1000 积分",
      "高级 AI 翻译模型",
      "原始图片质量",
      "批量翻译",
      "图片编辑",
      "支持 100+ 语言",
      "所有 AI 工具",
    ],
    popular: true,
  },
  {
    name: "专业版",
    monthlyPrice: 59.9,
    yearlyPrice: 599,
    originalMonthly: 139.9,
    originalYearly: 1399,
    save: "节省 57%",
    features: [
      "每月 2000 积分",
      "高级 AI 翻译模型",
      "原始图片质量",
      "批量翻译",
      "图片编辑",
      "支持 100+ 语言",
      "所有 AI 工具",
    ],
    popular: false,
  },
];

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        {/* 标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            选择适合您的套餐
          </h1>
          <p className="text-xl text-muted-foreground">
            灵活的定价方案，满足不同需求
          </p>
        </div>

        {/* 月付 / 年付切换 */}
        <div className="flex justify-center items-center gap-4 mb-12">
          <span className={`text-lg ${!isYearly ? "font-semibold" : "text-muted-foreground"}`}>
            按月
          </span>
          <Switch
            checked={isYearly}
            onCheckedChange={setIsYearly}
          />
          <span className={`text-lg ${isYearly ? "font-semibold" : "text-muted-foreground"}`}>
            按年
          </span>
          {isYearly && (
            <Badge variant="secondary" className="ml-4">
              年付享更多优惠
            </Badge>
          )}
        </div>

        {/* 套餐卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative overflow-hidden ${plan.popular ? "border-primary shadow-xl" : "border-border"}`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0">
                  <Badge className="rounded-none rounded-bl-lg" variant="default">
                    推荐
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">
                    ¥{isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-muted-foreground">
                    /{isYearly ? "年" : "月"}
                  </span>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  <del>原价 ¥{isYearly ? plan.originalYearly : plan.originalMonthly}</del>
                  <span className="ml-2 text-primary font-medium">
                    {plan.save}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* 支付按钮 */}
                <div className="space-y-3">
                  <Button className="w-full" size="lg">
                    支付宝支付
                  </Button>
                  <Button size="lg" variant="default" className="w-full bg-green-600 hover:bg-green-700">
                    微信支付
                  </Button>
                  <Button variant="outline" className="w-full" size="lg">
                    信用卡支付
                  </Button>
                </div>

                {/* <Separator /> */}

                {/* 功能清单 */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-orange-600 flex items-center gap-2">
                    <span className="text-yellow-500">★</span>
                    包含功能：
                  </p>
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}