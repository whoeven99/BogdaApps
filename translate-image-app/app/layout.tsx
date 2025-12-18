// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "./components/I18nProvider";
// import '@/i18n';
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI 图片翻译器",
  description: "支持100+语言的AI图片文字翻译工具",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body className={`${inter.className} min-h-screen bg-background`}>
        <I18nProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Toaster />
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
