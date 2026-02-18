"use client";

import { Check, ArrowRight, Instagram, Sparkles, ShieldCheck, Zap, Star, Globe, Smartphone, MessageSquare, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/app-sidebar";
import { useRouter } from "next/navigation";
import { usePlanGuard, PLAN_NAMES } from "@/hooks/usePlanGuard";

const ALL_UPGRADE_PLANS = [
    {
        id: PLAN_NAMES.LIGHT,
        name: "web Standard",
        price: "3,980",
        description: "Googleマップ対策を自動化し、新規来店を促進。",
        icon: <Star className="w-6 h-6" />,
        color: "blue",
        features: [
            { text: "Google口コミ一元管理", icon: <MessageSquare className="w-5 h-5 text-blue-600" />, highlight: false },
            { text: "AI自動返信 / 半自動返信", icon: <Bot className="w-5 h-5 text-blue-600" />, highlight: false },
            { text: "低評価への緊急通知機能", icon: <ShieldCheck className="w-5 h-5 text-red-500" />, highlight: false },
            { text: "サイト維持管理・ドメイン保守", icon: <Globe className="w-5 h-5 text-blue-500" />, highlight: false }
        ],
        comparison: "基本機能でGoogle検索の順位を向上!!"
    },
    {
        id: PLAN_NAMES.STANDARD,
        name: "web Pro",
        price: "9,800",
        description: "SNSからの流入とサイト信頼性を両立。",
        icon: <Instagram className="w-6 h-6" />,
        color: "indigo",
        badge: "特別価格",
        features: [
            { text: "Google口コミ自動返信機能", icon: <Star className="w-5 h-5 text-orange-500" />, highlight: false },
            { text: "Instagram自動投稿支援", icon: <Zap className="w-5 h-5 text-indigo-500" />, highlight: false },
            { text: "AI画像生成: 60枚/月", icon: <Sparkles className="w-5 h-5 text-purple-500" />, highlight: true },
            { text: "インスタ連携・投稿予約", icon: <Instagram className="w-5 h-5 text-pink-500" />, highlight: false },
            { text: "サイト維持管理・ドメイン保守", icon: <Globe className="w-5 h-5 text-blue-500" />, highlight: false }
        ],
        comparison: "web Proなら維持費 ¥0 !!"
    },
    {
        id: PLAN_NAMES.PREMIUM,
        name: "web Pro Premium",
        price: "14,800",
        description: "分析から集客まで、AIがお店の経営を支援。",
        icon: <Sparkles className="w-6 h-6" />,
        color: "primary",
        badge: "最上位プラン",
        isPremium: true,
        features: [
            { text: "上位プラン全機能（インスタ連携含む）", icon: <ShieldCheck className="w-5 h-5 text-primary" />, highlight: true },
            { text: "AI画像生成: 90枚/月 (最上位)", icon: <Sparkles className="w-5 h-5 text-blue-500" />, highlight: false },
            { text: "AI売上・経営分析レポート", icon: <Bot className="w-5 h-5 text-orange-500" />, highlight: false },
            { text: "POP/メニューAI自動作成ツール", icon: <Zap className="w-5 h-5 text-orange-500" />, highlight: false },
            { text: "専属チームによる優先サポート", icon: <Check className="w-5 h-5 text-green-500" />, highlight: false }
        ],
        comparison: "web Pro Premiumなら維持費 ¥0 !!"
    }
];

export default function HPUpgradePage() {
    const router = useRouter();
    const { planName, loading } = usePlanGuard();

    // 現在のプランインデックスを取得
    const planOrder = [PLAN_NAMES.FREE, PLAN_NAMES.LIGHT, PLAN_NAMES.STANDARD, PLAN_NAMES.PREMIUM];
    const currentPlanIndex = planOrder.indexOf(planName as any);

    // 1つ上と2つ上のプランを抽出
    const upgradeOptions = ALL_UPGRADE_PLANS.filter(plan => {
        const targetIndex = planOrder.indexOf(plan.id as any);
        return targetIndex === currentPlanIndex + 1 || targetIndex === currentPlanIndex + 2;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

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

                        <div className={`grid ${upgradeOptions.length === 1 ? 'max-w-md mx-auto' : 'md:grid-cols-2'} gap-8 items-stretch`}>
                            {upgradeOptions.map((plan, idx) => (
                                <Card key={plan.id} className={`relative overflow-hidden border-2 transition-all flex flex-col ${plan.isPremium
                                    ? 'border-primary shadow-2xl transform md:scale-105 z-10'
                                    : 'border-indigo-100 hover:border-indigo-400 shadow-xl'
                                    }`}>
                                    {plan.isPremium && (
                                        <div className="absolute top-0 inset-x-0 bg-primary/10 py-1 text-center text-[10px] font-black tracking-widest uppercase">
                                            Premium Experience
                                        </div>
                                    )}
                                    {!plan.isPremium && (
                                        <div className="absolute top-0 right-0 p-16 bg-indigo-50 rounded-full -mr-8 -mt-8 opacity-50 z-0"></div>
                                    )}

                                    <CardHeader className={`relative z-10 pb-2 ${plan.isPremium ? 'pt-8' : ''}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`p-2 rounded-lg ${plan.isPremium ? 'bg-primary/10 text-primary' : 'bg-indigo-100 text-indigo-600'}`}>
                                                {plan.icon}
                                            </div>
                                            {plan.badge && (
                                                <Badge className={`${plan.id === PLAN_NAMES.STANDARD ? 'bg-orange-500 hover:bg-orange-600' : 'bg-primary'} border-0`}>
                                                    {plan.badge}
                                                </Badge>
                                            )}
                                        </div>
                                        <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                                        <p className="text-sm text-gray-500 mt-2 font-medium">{plan.description}</p>
                                    </CardHeader>

                                    <CardContent className="relative z-10 flex-grow space-y-6 pt-4">
                                        <div className="space-y-1">
                                            <div className="flex items-baseline gap-2">
                                                <span className={`text-4xl font-black ${plan.isPremium ? 'text-primary' : 'text-indigo-600'}`}>¥{plan.price}</span>
                                                <span className="text-gray-400 text-sm">/月 (税込)</span>
                                            </div>
                                            <p className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded inline-block">
                                                Web維持管理費（￥3280→￥0）サービスに含まれます
                                            </p>
                                        </div>

                                        <div className={`space-y-4 pt-4 border-t border-gray-100 ${plan.isPremium ? 'text-sm' : ''}`}>
                                            <ul className="space-y-3">
                                                {plan.features.map((feature, fIdx) => (
                                                    <li key={fIdx} className={`flex gap-3 ${plan.isPremium ? '' : 'text-sm'} font-bold ${feature.highlight
                                                        ? plan.isPremium ? 'text-gray-900 bg-primary/5 p-2 rounded-lg' : 'text-indigo-600 bg-indigo-50 p-1.5 rounded-lg border border-indigo-100'
                                                        : 'text-gray-700'
                                                        }`}>
                                                        <span className="shrink-0">{feature.icon}</span>
                                                        {feature.text}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className={`${plan.isPremium ? 'bg-primary/5' : 'bg-gray-50'} p-4 rounded-xl space-y-2`}>
                                            <p className={`text-sm font-bold flex items-center gap-1 ${plan.isPremium ? 'text-primary' : 'text-indigo-600'}`}>
                                                <ArrowRight className="w-4 h-4" /> {plan.comparison}
                                            </p>
                                        </div>

                                        <Button className={`w-full font-bold h-12 shadow-md ${plan.isPremium ? 'bg-primary hover:bg-primary/90 shadow-lg' : 'bg-indigo-600 hover:bg-indigo-700'
                                            }`}>
                                            このプランにアップグレード
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}

                            {upgradeOptions.length === 0 && (
                                <Card className="border-2 border-dashed border-gray-200 bg-gray-50 py-12 flex flex-col items-center justify-center text-center col-span-full">
                                    <div className="bg-gray-100 p-4 rounded-full mb-4">
                                        <Check className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">最上位プランをご利用中です</h3>
                                    <p className="text-gray-500 mt-2">
                                        いつも MogMog をご利用いただきありがとうございます。<br />
                                        現在、すべての機能が開放されています。
                                    </p>
                                </Card>
                            )}
                        </div>

                        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex flex-col md:flex-row items-center gap-6">
                            <div className="bg-blue-600 p-4 rounded-full text-white">
                                <Globe className="w-8 h-8" />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="font-bold text-blue-900 text-lg">現在のHP維持手数料は自動的に解除されます</h3>
                                <p className="text-sm text-blue-700 mt-1">
                                    アップグレード後は、以前発生していたWeb維持費（￥3280）は発生いたしません。
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
