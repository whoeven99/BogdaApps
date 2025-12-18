// src/components/RegisterDialog.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Link from "next/link";

type RegisterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToLogin: () => void;
};

export function RegisterDialog({ open, onOpenChange, onSwitchToLogin }: RegisterDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-8">
        <DialogHeader className="text-center mb-6">
          <DialogTitle className="text-3xl font-bold">创建账户</DialogTitle>
          <DialogDescription className="text-lg mt-2">
            开始体验顶尖的图片翻译服务
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* 左侧二维码区域 */}
          <div className="flex flex-col items-center justify-center">
            <div className="mb-6">
              <div className="w-48 h-48 bg-gray-100 border-2 border-dashed rounded-2xl flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <p className="text-base font-medium">微信扫码注册</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              扫一扫快速加入官方群
            </p>
          </div>

          {/* 右侧表单 */}
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="reg-email" className="text-base">
                邮箱地址 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="130297969@qq.com"
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="reg-password" className="text-base">
                密码 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="reg-password"
                type="password"
                placeholder="••••••••"
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="reg-confirm" className="text-base">
                确认密码 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="reg-confirm"
                type="password"
                placeholder="请再次输入密码"
                className="h-12 text-base"
              />
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox id="agree" />
              <label htmlFor="agree" className="text-sm text-muted-foreground leading-normal">
                我已阅读并同意
                <Link href="#" className="text-primary hover:underline mx-1">
                  《用户协议》
                </Link>
                和
                <Link href="#" className="text-primary hover:underline mx-1">
                  《隐私政策》
                </Link>
              </label>
            </div>

            <Button className="w-full h-12 text-lg font-medium">
              我发送验证码
            </Button>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p className="mb-4">其他注册方式</p>
          <div className="flex justify-center gap-4">
            <Button variant="outline" size="icon" className="w-12 h-12">
              <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white font-bold text-lg">
                微
              </div>
            </Button>
          </div>

          <p className="mt-6">
            已有账号？
            <Button variant="link" className="p-0 h-auto font-medium text-base ml-1" onClick={onSwitchToLogin}>
              立即登录
            </Button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}