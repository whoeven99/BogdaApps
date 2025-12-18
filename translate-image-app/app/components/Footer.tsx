// src/components/Footer.tsx
import Link from "next/link";
import { Mail, MessageCircle, Headphones } from "lucide-react";

export default function Footer() {
  return (
    <>
      {/* 上半部分：三列信息 */}
      <footer className="border-t bg-background">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* 左侧：Logo + 描述 + 社交图标 */}
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                {/* 你可以替换成自己的 Logo */}
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-xl">
                  AI
                </div>
                <span className="text-xl font-bold">AI 图片翻译器</span>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                支持翻译100+种语言，保持图片原始布局，适用于跨境电商、漫画、社交媒体等多个场景，让您的工作效率提升10倍
              </p>

              <div className="flex gap-4 mt-6">
                <Link
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="邮箱"
                >
                  <Mail className="w-5 h-5" />
                </Link>
                <Link
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="微信"
                >
                  <MessageCircle className="w-5 h-5" />
                </Link>
                <Link
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="客服"
                >
                  <Headphones className="w-5 h-5" />
                </Link>
              </div>
            </div>

            {/* 中间：产品链接 */}
            <div className="flex flex-col">
              <h3 className="font-semibold text-lg mb-4">产品</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    AI 图片翻译器
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    浏览器插件
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    即将推出...
                  </Link>
                </li>
              </ul>
            </div>

            {/* 右侧：公司/法律链接 */}
            <div className="flex flex-col">
              <h3 className="font-semibold text-lg mb-4">公司</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    关于我们
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    价格
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    隐私政策
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    服务条款
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Cookie 政策
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 下半部分：版权信息 */}
        <div className="border-t bg-muted/30">
          <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
            <p>© 2025 AI 图片翻译器. All rights reserved.</p>

            <div className="flex items-center gap-2 mt-4 md:mt-0">
              <span className="text-2xl">🇨🇳</span>
              <span>粤ICP备2025443655号-2</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}