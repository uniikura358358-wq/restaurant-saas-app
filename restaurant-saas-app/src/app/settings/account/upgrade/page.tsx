"use client";

import { Check, ArrowRight, Instagram, Sparkles, ShieldCheck, Zap, Star, Globe, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/app-sidebar";
import { useRouter } from "next/navigation";

export default function HPUpgradePage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="flex h-screen max-h-screen">
                <AppSidebar activePage="account" />
                <main className="flex-1 overflow-y-auto bg-gradient-to-b from-blue-50/50 to-white">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12 pb-24">
                        <header className="text-center space-y-4">
                            <Badge variant="outline" className="px-4 py-1 border-blue-200 text-blue-600 bg-blue-50 font-bold">
                                HP制作会員様専用
                            </Badge>
                            <h1 className="text-4xl font-extrabold tracking-tight">
                                特別グレードアップのご案内
                            </h1>
                            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
                                ホームページ制作をご利用の会員様だけに、集客を加速させる特別なセットプランをご用意いたしました。上位プランならWeb維持管理費が無料（100%割引）となります。
                            </p>
                        </header>

                        <div className="grid md:grid-cols-2 gap-8 items-stretch">
                            {/* Insta Upgrade Plan */}
                            <Card className="relative overflow-hidden border-2 border-indigo-100 hover:border-indigo-400 transition-all shadow-xl flex flex-col">
                                <div className="absolute top-0 right-0 p-16 bg-indigo-50 rounded-full -mr-8 -mt-8 opacity-50 z-0"></div>
                                <CardHeader className="relative z-10 pb-2">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                                            <Instagram className="w-6 h-6" />
                                        </div>
                                        <Badge className="bg-orange-500 hover:bg-orange-600 border-0">特別価格</Badge>
                                    </div>
                                    <CardTitle className="text-2xl font-bold">インスタ連携アップグレード</CardTitle>
                                    <p className="text-sm text-gray-500 mt-2 font-medium">SNSからの流入とサイト信頼性を両立。</p>
                                </CardHeader>
                                <CardContent className="relative z-10 flex-grow space-y-6 pt-4">
                                    <div className="space-y-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-4xl font-black text-indigo-600">¥9,800</span>
                                            <span className="text-gray-400 text-sm">/月 (税込)</span>
                                        </div>
                                        <p className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded inline-block">
                                            Web維持管理費（¥500 → ¥0）サービスに含まれます
                                        </p>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-gray-100">
                                        <ul className="space-y-3">
                                            <li className="flex gap-3 text-sm font-bold text-gray-700">
                                                <Star className="w-5 h-5 text-orange-500 shrink-0" />
                                                Google口コミ自動返信機能
                                            </li>
                                            <li className="flex gap-3 text-sm font-bold text-gray-700">
                                                <Zap className="w-5 h-5 text-indigo-500 shrink-0" />
                                                Instagram自動キャプション作成
                                            </li>
                                            <li className="flex gap-3 text-sm font-bold text-indigo-600 bg-indigo-50 p-1.5 rounded-lg border border-indigo-100">
                                                <Sparkles className="w-5 h-5 text-purple-500 shrink-0" />
                                                AI画像生成: 60回/月
                                            </li>
                                            <li className="flex gap-3 text-sm font-bold text-gray-700">
                                                <Instagram className="w-5 h-5 text-pink-500 shrink-0" />
                                                インスタ連携・投稿予約サポート
                                            </li>
                                            <li className="flex gap-3 text-sm font-bold text-gray-700">
                                                <Globe className="w-5 h-5 text-blue-500 shrink-0" />
                                                サイト維持管理・ドメイン保守
                                            </li>
                                        </ul>
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                                        <p className="text-xs text-gray-400">
                                            通常：Light ¥2,480 + 維持 ¥500 = ¥2,980
                                        </p>
                                        <p className="text-sm font-bold text-indigo-600 flex items-center gap-1">
                                            <ArrowRight className="w-4 h-4" /> スタンダードなら維持費 ¥0 !!
                                        </p>
                                    </div>

                                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold h-12 shadow-md">
                                        このプランにアップグレード
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Premium Upgrade Plan */}
                            <Card className="relative overflow-hidden border-2 border-primary shadow-2xl flex flex-col transform md:scale-105 z-10">
                                <div className="absolute top-0 inset-x-0 bg-primary/10 py-1 text-center text-[10px] font-black tracking-widest uppercase">
                                    Premium Experience
                                </div>
                                <CardHeader className="pt-8 pb-2">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                            <Sparkles className="w-6 h-6" />
                                        </div>
                                        <Badge className="bg-primary hover:bg-primary border-0">最上位プラン</Badge>
                                    </div>
                                    <CardTitle className="text-2xl font-bold">プレミアム・フルサポート</CardTitle>
                                    <p className="text-sm text-gray-500 mt-2 font-medium">分析から集客まで、AIがお店の経営を支援。</p>
                                </CardHeader>
                                <CardContent className="flex-grow space-y-6 pt-4">
                                    <div className="space-y-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-4xl font-black text-primary">¥12,800</span>
                                            <span className="text-gray-400 text-sm">/月 (税込)</span>
                                        </div>
                                        <p className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded inline-block">
                                            Web維持管理費（¥500 → ¥0）サービスに含まれます
                                        </p>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-gray-100 text-sm">
                                        <ul className="space-y-3">
                                            <li className="flex gap-3 font-bold text-gray-900 bg-primary/5 p-2 rounded-lg">
                                                <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                                                インスタ連携プランの全機能
                                            </li>
                                            <li className="flex gap-3 font-bold text-gray-700">
                                                <Sparkles className="w-5 h-5 text-blue-500 shrink-0" />
                                                AI画像生成: 90回/月 (最上位)
                                            </li>
                                            <li className="flex gap-3 font-bold text-gray-700">
                                                <Zap className="w-5 h-5 text-orange-500 shrink-0" />
                                                POP/メニューAI自動作成ツール
                                            </li>
                                            <li className="flex gap-3 font-bold text-gray-700">
                                                <Check className="w-5 h-5 text-green-500 shrink-0" />
                                                専属チームによる優先サポート
                                            </li>
                                        </ul>
                                    </div>

                                    <div className="bg-primary/5 p-4 rounded-xl space-y-2">
                                        <p className="text-xs text-gray-400">
                                            通常：Light ¥2,480 + 維持 ¥500 = ¥2,980
                                        </p>
                                        <p className="text-sm font-bold text-primary flex items-center gap-1">
                                            <ArrowRight className="w-4 h-4" /> プレミアムなら維持費 ¥0 !!
                                        </p>
                                    </div>

                                    <Button className="w-full bg-primary hover:bg-primary/90 font-bold h-12 shadow-lg">
                                        プレミアムにアップグレード
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex flex-col md:flex-row items-center gap-6">
                            <div className="bg-blue-600 p-4 rounded-full text-white">
                                <Globe className="w-8 h-8" />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="font-bold text-blue-900 text-lg">現在のHP維持手数料は自動的に解除されます</h3>
                                <p className="text-sm text-blue-700 mt-1">
                                    アップグレード後は、Lightプランで発生していたWeb維持費（¥500）は発生いたしません。
                                    すべてプラン料金内でご利用いただけます。
                                </p>
                            </div>
                        </div>

                        <div className="text-center">
                            <Button variant="ghost" onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
                                設定画面に戻る
                            </Button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
