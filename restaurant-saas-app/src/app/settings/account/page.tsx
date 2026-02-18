"use client";

import { useAuth } from "@/hooks/useAuth";
import { AppSidebar } from "@/components/app-sidebar";
import { useState, useEffect } from "react";
import { getDashboardStats } from "@/app/actions/dashboard";
import { DashboardStats } from "@/types/firestore";
import {
    Shield,
    Mail,
    Smartphone,
    Lock,
    ArrowLeft,
    ShieldCheck,
    AlertCircle
} from "lucide-react";
import { Announcement } from "@/types/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { TwoFactorSetup } from "@/components/two-factor-setup";

export default function AccountSettingsPage() {
    const { user, getToken } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [announcements, setAnnouncements] = useState<Announcement[]>([
        {
            id: "1",
            title: "システムメンテナンスのお知らせ",
            content: "2026年3月1日午前2:00〜4:00まで、データベースのアップグレードに伴いサービスを一時停止いたします。",
            createdAt: new Date(),
            isRead: false
        },
        {
            id: "2",
            title: "新機能：AI返信の自動修正機能が追加されました",
            content: "生成された返信案をさらに自然な日本語に修正するAIアドバイザー機能がプレミアムプランで利用可能になりました。",
            createdAt: new Date(Date.now() - 86400000),
            isRead: true
        }
    ]);
    const [is2faEnabled, setIs2faEnabled] = useState(false);
    const [showSetup, setShowSetup] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            if (!user) return;
            try {
                const token = await getToken();
                if (token) {
                    const data = await getDashboardStats(token);
                    setStats(data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [user, getToken]);

    const handleBack = () => router.push("/dashboard");

    return (
        <div className="min-h-screen bg-background text-foreground tracking-tight">
            <div className="flex h-screen max-h-screen">
                <AppSidebar
                    activePage="account"
                    user={user}
                    stats={stats}
                    announcements={announcements}
                />

                <main className="flex-1 overflow-y-auto bg-muted/20 pb-20">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
                        {/* Header */}
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full">
                                <ArrowLeft className="size-5" />
                            </Button>
                            <h1 className="text-3xl font-black">アカウント設定</h1>
                        </div>

                        {/* Profile Info */}
                        <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-indigo-50/20">
                                <CardTitle className="text-lg font-bold">基本情報</CardTitle>
                                <CardDescription>あなたのアカウントの詳細情報を管理します</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">お名前</p>
                                        <p className="font-bold text-foreground">{user?.displayName || "未設定"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">メールアドレス</p>
                                        <p className="font-bold text-foreground flex items-center gap-2">
                                            {user?.email}
                                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none text-[9px] font-bold">確認済み</Badge>
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Security / 2FA Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-1">
                                <Shield className="size-5 text-indigo-500" />
                                <h2 className="text-xl font-black">セキュリティ</h2>
                            </div>

                            <Card className="border-none shadow-sm rounded-3xl border-l-4 border-l-indigo-500">
                                <CardContent className="pt-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                        <div className="space-y-1.5 flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-lg">2段階認証 (MFA)</h3>
                                                {is2faEnabled ? (
                                                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-none flex items-center gap-1 text-[10px] font-bold">
                                                        <ShieldCheck className="size-3" /> 有効化済み
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px] font-bold border-border text-muted-foreground">未設定</Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                ログイン時にパスワードに加えて、追加の確認コードを要求することでアカウントを強力に保護します。
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-foreground">{is2faEnabled ? "オン" : "オフ"}</span>
                                            <Switch
                                                checked={is2faEnabled}
                                                onCheckedChange={(val) => {
                                                    if (val) setShowSetup(true);
                                                    else setIs2faEnabled(false);
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <TwoFactorSetup
                                        open={showSetup}
                                        onOpenChange={(open) => {
                                            setShowSetup(open);
                                            if (!open && is2faEnabled === false) {
                                                // もし完了せずに閉じた場合はオフのまま（ここではデモ的にオンにするか検討）
                                            }
                                        }}
                                        email={user?.email}
                                    />

                                    {is2faEnabled && (
                                        <div className="mt-8 pt-8 border-t border-dashed border-border space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="p-4 rounded-3xl border-2 border-indigo-100 bg-indigo-50/30 space-y-4 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 p-3 opacity-10">
                                                        <Smartphone className="size-16" />
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-indigo-500 rounded-xl text-white">
                                                            <Smartphone className="size-5" />
                                                        </div>
                                                        <span className="font-bold text-foreground">認証アプリ (Google/Authy)</span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        認証アプリから生成される6桁のコードを使用します。最も推奨される方法です。
                                                    </p>
                                                    <Button variant="outline" onClick={() => setShowSetup(true)} className="w-full rounded-xl font-bold bg-white" size="sm">
                                                        再設定
                                                    </Button>
                                                </div>

                                                <div className="p-4 rounded-3xl border border-border bg-muted/50 space-y-4 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 p-3 opacity-10">
                                                        <Mail className="size-16" />
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-muted-foreground/30 rounded-xl text-foreground">
                                                            <Mail className="size-5" />
                                                        </div>
                                                        <span className="font-bold text-foreground">メールアドレス</span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        登録済みのメールアドレスに届く認証コードを使用します。
                                                    </p>
                                                    <Button variant="outline" className="w-full rounded-xl font-bold bg-white" size="sm">
                                                        設定する
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="flex gap-3 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                                                <AlertCircle className="size-5 text-orange-500 shrink-0" />
                                                <div className="space-y-1">
                                                    <p className="text-xs font-bold text-orange-900">バックアップコードをご用意ください</p>
                                                    <p className="text-[10px] text-orange-800/80 leading-relaxed">
                                                        スマートフォンを紛失した場合に備え、リカバリーコードを生成して安全な場所に保管することを強くお勧めします。
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-sm rounded-3xl">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-muted rounded-xl text-muted-foreground">
                                                <Lock className="size-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-foreground">パスワード更新</span>
                                                <span className="text-[10px] text-muted-foreground font-medium">最後に変更: 3ヶ月前</span>
                                            </div>
                                        </div>
                                        <Button variant="outline" className="rounded-xl font-bold" size="sm">
                                            変更
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
