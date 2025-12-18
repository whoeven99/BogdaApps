// app/profile/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  CreditCard, 
  FileText, 
  ClipboardList, 
  Settings, 
  LogOut,
  Upload,
  Mail,
  Calendar,
  Edit2,
  Lock
} from "lucide-react";
import Link from "next/link";

const menuItems = [
  { icon: User, label: "个人资料", active: true },
  { icon: CreditCard, label: "积分余额" },
  { icon: FileText, label: "翻译记录" },
  { icon: ClipboardList, label: "我的订单" },
];

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-2xl font-bold mb-8">个人资料</h1>
        <p className="text-muted-foreground mb-8">管理您的账户信息和设置</p>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 左侧导航 */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-0">
                {menuItems.map((item, index) => (
                  <Button
                    key={index}
                    variant={item.active ? "default" : "ghost"}
                    className="w-full justify-start rounded-none h-12"
                    asChild={!item.active}
                  >
                    {item.active ? (
                      <div className="flex items-center gap-3 px-4">
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </div>
                    ) : (
                      <Link href="#" className="flex items-center gap-3 px-4">
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </Link>
                    )}
                  </Button>
                ))}
                <Separator />
                <Button variant="ghost" className="w-full justify-start rounded-none h-12 text-muted-foreground hover:text-foreground px-4 gap-3">
                  <Settings className="h-5 w-5" />
                  设置
                </Button>
                <Button variant="ghost" className="w-full justify-start rounded-none h-12 text-destructive hover:text-destructive px-4 gap-3">
                  <LogOut className="h-5 w-5" />
                  退出登录
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* 右侧个人信息 */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">个人资料</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* 头像区 */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarFallback className="text-2xl bg-blue-600 text-white">
                        1
                      </AvatarFallback>
                    </Avatar>
                    <Button size="icon" className="absolute bottom-0 right-0 rounded-full h-8 w-8">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      更换头像
                    </Button>
                    <p className="text-sm text-muted-foreground mt-2">
                      支持 JPG、PNG、GIF、WebP 格式，最大 2MB
                    </p>
                  </div>
                </div>

                <Separator />

                {/* 表单字段 */}
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium">用户名</label>
                    <div className="mt-2 flex items-center justify-between">
                      <input
                        type="text"
                        value="15159210793"
                        readOnly
                        className="flex-1 px-3 py-2 border rounded-md bg-muted"
                      />
                      <Button variant="ghost" size="sm" className="ml-4">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      邮箱
                    </label>
                    <div className="mt-2 flex items-center justify-between">
                      <input
                        type="email"
                        value="15159210793@163.com"
                        readOnly
                        className="flex-1 px-3 py-2 border rounded-md bg-muted"
                      />
                      <Button variant="ghost" size="sm" className="ml-4">
                        <Lock className="h-4 w-4" />
                        修改
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      邮箱地址不可修改
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      注册时间
                    </label>
                    <input
                      type="text"
                      value="2025/11/19 13:51:19"
                      readOnly
                      className="mt-2 px-3 py-2 border rounded-md bg-muted w-full max-w-md"
                    />
                  </div>
                </div>

                <Separator />

                {/* 操作按钮 */}
                <div className="flex gap-4">
                  <Button>保存</Button>
                  <Button variant="outline">修改密码</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}