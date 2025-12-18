// src/components/LoginDialog.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";

type LoginDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToRegister: () => void;
};

export function LoginDialog({ open, onOpenChange, onSwitchToRegister }: LoginDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-8">
        <DialogHeader className="text-center mb-6">
          <DialogTitle className="text-3xl font-bold">登录免费赠送积分</DialogTitle>
          <DialogDescription className="text-lg mt-2">
            扫码登录更便捷
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* 左侧二维码区域 */}
          <div className="flex flex-col items-center justify-center">
            <div className="mb-6">
              <div className="w-48 h-48 bg-gray-100 border-2 border-dashed rounded-2xl flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <p className="text-base font-medium">微信扫码登录</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              加入AI图片翻译器官方群
            </p>
          </div>

          {/* 右侧表单 */}
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="login-email" className="text-base">邮箱</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="130297969@qq.com"
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="login-password" className="text-base">密码</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                className="h-12 text-base"
              />
            </div>

            <Button className="w-full h-12 text-lg font-medium">
              登录
            </Button>

            <div className="text-center">
              <Link href="#" className="text-primary hover:underline text-sm">
                忘记密码？
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p className="mb-4">其他登录方式</p>
          <div className="flex justify-center gap-4">
            <Button variant="outline" size="icon" className="w-12 h-12">
              <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white font-bold text-lg">
                微
              </div>
            </Button>
          </div>

          <p className="mt-6">
            登录即代表同意
            <Link href="#" className="text-primary hover:underline mx-1">
              《用户协议》
            </Link>
            和
            <Link href="#" className="text-primary hover:underline mx-1">
              《隐私政策》
            </Link>
          </p>

          <p className="mt-4">
            还没有账号？
            <Button variant="link" className="p-0 h-auto font-medium text-base ml-1" onClick={onSwitchToRegister}>
              立即注册
            </Button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}