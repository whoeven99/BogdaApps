// src/components/Header.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MessageCircle, Coins, Globe, LogIn, UserPlus } from "lucide-react";
import { LoginDialog } from "./LoginDialog";
import { RegisterDialog } from "./RegisterDialog";

export function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  const openLogin = () => {
    setRegisterOpen(false);
    setLoginOpen(true);
  };

  const openRegister = () => {
    setLoginOpen(false);
    setRegisterOpen(true);
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setLoginOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 mx-auto">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-12 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              AI
            </div>
            <span className="text-xl font-bold">AI 图片翻译器</span>
          </Link>

          {/* 导航 */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
            {/* ... 你的导航链接 */}
          </nav>

          {/* 右侧 */}
          <div className="flex items-center space-x-4">
            {!isLoggedIn ? (
              <>
                <Button variant="ghost" size="sm" onClick={openLogin}>
                  <LogIn className="h-4 w-4 mr-2" />
                  登录
                </Button>
                <Button size="sm" onClick={openRegister}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  注册
                </Button>
              </>
            ) : (
              <>
                {/* 已登录内容：积分、语言、头像 */}
                {/* ... 你的已登录 UI */}
              </>
            )}
          </div>
        </div>
      </header>

      {/* 登录弹窗 */}
      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onSwitchToRegister={openRegister}
      />

      {/* 注册弹窗 */}
      <RegisterDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        onSwitchToLogin={openLogin}
      />
    </>
  );
}