"use client";

import { Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    User,
    Store,
    ShieldCheck,
    ArrowRight,
    Loader2,
    Settings,
    BellRing,
    CreditCard
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="flex h-screen max-h-screen">
                <AppSidebar activePage="settings" />
                <main className="flex-1 overflow-y-auto">
                    <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>}>
                        <SettingsContent />
                    </Suspense>
                </main>
            </div>
        </div>
    );
}

function SettingsContent() {
    const router = useRouter();

    const sections = [
        {
            title: "店舗設定",
            description: "AIのトーン、署名、通知などの店舗基本情報を設定します。",
            icon: <Store className="size-5 text-orange-500" />,
            link: "/settings/store",
            action: "設定を開く"
        },
        {
            title: "アカウント設定",
            description: "メールアドレスの確認、パスワード、通知の宛先を管理します。",
            icon: <User className="size-5 text-blue-500" />,
            link: "/settings/account",
            action: "アカウント管理"
        },
        {
            title: "料金プラン・決済",
            description: "現在のプランの確認、アップグレード、お支払い情報の管理を行います。",
            icon: <CreditCard className="size-5 text-indigo-500" />,
            link: "/plans",
            action: "プランを見る"
        }
    ];

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
            <header className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Settings className="size-4" />
                    <span className="text-sm font-medium">設定</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">設定ダッシュボード</h1>
                <p className="text-muted-foreground text-sm">
                    アカウントと店舗に関するすべての設定をここから管理できます。
                </p>
            </header>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sections.map((section, idx) => (
                    <Card key={idx} className="hover:shadow-md transition-shadow group cursor-pointer border-muted-foreground/10" onClick={() => router.push(section.link)}>
                        <CardHeader>
                            <div className="mb-2 p-2 w-fit rounded-lg bg-muted group-hover:bg-accent transition-colors">
                                {section.icon}
                            </div>
                            <CardTitle className="text-lg">{section.title}</CardTitle>
                            <CardDescription className="text-xs">{section.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="ghost" className="w-full justify-between p-0 h-auto font-bold text-xs hover:bg-transparent group-hover:text-primary transition-colors">
                                {section.action}
                                <ArrowRight className="size-3 transform group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Links / Support */}
            <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h4 className="font-bold text-sm flex items-center gap-2">
                            <ShieldCheck className="size-4 text-green-600" />
                            困ったときは？
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            設定方法やプランについてのご質問は、カスタマーサポートへお気軽にお問い合わせください。
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => router.push('/plans#faq')}>
                        よくある質問 (FAQ)
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
