'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { STRIPE_PLANS } from '@/lib/stripe/config';
import { toast } from 'sonner';
import { Check, Loader2, Star, ShieldCheck, Sparkles, MessageSquare, Bot, Instagram, Globe, Zap, X, ExternalLink, CheckCircle2, CalendarDays, Camera, FileText, TrendingUp, AlertTriangle, MapPin, MousePointerClick, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
export default function PlansPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
            < PlansContent />
        </Suspense>
    );
}

function PlansContent() {
    const router = useRouter();
    const { user } = useAuth();
    const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('month');
    const [activeMode, setActiveMode] = useState<'saas' | 'hp'>('saas');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const searchParams = useSearchParams();

    // Handle Cancel State
    useEffect(() => {
        if (searchParams.get('canceled')) {
            toast.info('いつでもお待ちしております', {
                description: '決済はキャンセルされました。料金は発生していません。',
                duration: 5000,
            });
        }
    }, [searchParams]);

    const handleCheckout = async (priceId: string, planName: string) => {
        if (!user) {
            toast.error('ログインが必要です');
            router.push('/login?redirect=/plans');
            return;
        }

        setProcessingId(priceId);
        toast.info('Stripe 決済ページへ安全に遷移します...');

        try {
            const response = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId,
                    userId: user.uid,
                    planName,
                    billingCycle
                }),
            });

            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error('決済URLの取得に失敗しました');
            }
        } catch (error) {
            console.error(error);
            toast.error('決済への遷移に失敗しました');
            setProcessingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-20 overflow-x-hidden">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <h1
                        className="text-xl font-black bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent cursor-pointer"
                        onClick={() => router.push('/')}
                    >
                        MogMog Plans
                    </h1>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="font-bold text-gray-600">
                            ダッシュボードへ戻る
                        </Button>
                    </div>
                </div>
            </div>

            <div className={`mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12 transition-all duration-500 ${activeMode === 'saas' ? 'max-w-7xl' : 'max-w-[1440px]'}`}>
                {/* Mode Selector Toggle */}
                <div className="flex flex-col items-center gap-8 mb-16">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl px-4">
                        <button
                            onClick={() => setActiveMode('saas')}
                            className={`group relative px-6 py-6 rounded-2xl text-lg font-black transition-all flex items-center justify-center gap-3 border-2 ${activeMode === 'saas'
                                ? 'bg-blue-600 text-white border-blue-700 shadow-[0_8px_0_0_#1e40af] -translate-y-1'
                                : 'bg-white text-blue-600 border-blue-400 hover:bg-blue-50 shadow-[0_4px_0_0_#dbeafe] hover:shadow-[0_6px_0_0_#dbeafe] hover:-translate-y-0.5'
                                }`}
                        >
                            <Zap className={`w-6 h-6 flex-shrink-0 ${activeMode === 'saas' ? 'animate-pulse' : 'text-blue-500'}`} />
                            <div className="flex flex-col items-start leading-tight">
                                <span className="text-xl whitespace-nowrap">集客に特化した自動AIサービス</span>
                                <span className={`text-base font-black whitespace-nowrap ${activeMode === 'saas' ? 'text-blue-100' : 'text-blue-600'}`}>
                                    口コミ返信・インスタ投稿・分析
                                </span>
                            </div>
                        </button>

                        <button
                            onClick={() => setActiveMode('hp')}
                            className={`group relative px-6 py-6 rounded-2xl text-lg font-black transition-all flex items-center justify-center gap-3 border-2 ${activeMode === 'hp'
                                ? 'bg-orange-500 text-white border-orange-600 shadow-[0_8px_0_0_#c2410c] -translate-y-1'
                                : 'bg-white text-orange-600 border-orange-400 hover:bg-orange-50 shadow-[0_4px_0_0_#ffedd5] hover:shadow-[0_6px_0_0_#ffedd5] hover:-translate-y-0.5'
                                }`}
                        >
                            <Globe className={`w-6 h-6 flex-shrink-0 ${activeMode === 'hp' ? 'animate-spin-slow' : 'text-orange-500'}`} />
                            <div className="flex flex-col items-start leading-tight">
                                <span className="text-xl whitespace-nowrap">HP制作パッケージはこちらをクリック</span>
                                <span className={`text-base font-black whitespace-nowrap ${activeMode === 'hp' ? 'text-orange-100' : 'text-orange-600'}`}>
                                    初回39800円/維持管理費2980円～
                                </span>
                            </div>
                        </button>
                    </div>

                </div>

                {/* --- View A: 集客に特化した自動AIサービス --- */}
                {activeMode === 'saas' && (
                    <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                        {/* Billing Toggle */}
                        <div className="flex justify-center mb-12">
                            <div className="flex items-center gap-6 bg-gray-100 rounded-full p-1.5 border border-gray-200 shadow-inner">
                                <button
                                    onClick={() => setBillingCycle('month')}
                                    className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all ${billingCycle === 'month' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    月払い
                                </button>
                                <button
                                    onClick={() => setBillingCycle('year')}
                                    className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${billingCycle === 'year' ? 'bg-orange-500 text-white shadow-md' : 'text-orange-600 hover:text-orange-700'}`}
                                >
                                    年払い
                                    <span className={`text-xs px-2 py-1 rounded-full ${billingCycle === 'year' ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-700'}`}>
                                        最大17%お得
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6 items-stretch mb-8">
                            {/* Standard Plan (Old Light Plan Name modified) */}
                            <div className="bg-white rounded-[2.5rem] shadow-2xl border-2 border-blue-600 flex flex-col min-h-[820px] overflow-hidden transition-all hover:shadow-2xl group relative scale-[1.01]">
                                <div className="p-10 pb-6 flex flex-col items-center text-center">
                                    <h3 className="text-2xl font-black text-gray-900 mb-2">Standard</h3>
                                    <Badge className="mb-6 bg-blue-50 text-blue-600 border-blue-100 font-black px-4 py-1 text-xs">飲食店経営 3大必須パック</Badge>
                                    <div className="mb-8 flex flex-col items-center">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-black text-gray-900 tracking-tighter"><span className="mr-1">¥</span>{billingCycle === 'year' ? '43,780' : '3,980'}</span>
                                            <span className="text-gray-400 font-bold text-sm">/{billingCycle === 'year' ? '年' : '月'}</span>
                                        </div>
                                        {billingCycle === 'year' && (
                                            <Badge className="mt-2 bg-green-500 text-white border-none font-black px-3 py-0.5 text-[10px] shadow-sm animate-bounce-subtle">月払いより1ヶ月分お得！</Badge>
                                        )}
                                    </div>
                                    <Button
                                        className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-lg shadow-lg shadow-blue-100"
                                        onClick={() => handleCheckout(billingCycle === 'year' ? STRIPE_PLANS.LIGHT.yearly.id : STRIPE_PLANS.LIGHT.id, 'Standard')}
                                        disabled={!!processingId}
                                    >
                                        選択する
                                    </Button>
                                </div>
                                <div className="px-10 pb-10 flex-1 flex flex-col gap-6 pt-4">
                                    {/* Feature 1: Google Review & MEO */}
                                    <div className="flex flex-col gap-4 text-blue-700 bg-blue-50/50 p-6 rounded-2xl border border-blue-200 shadow-sm relative overflow-hidden transition-all hover:bg-blue-100/50">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                                                <MessageSquare className="w-7 h-7 text-blue-600" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="bg-red-500 text-white text-[10px] px-2.5 py-0.5 rounded-md font-black w-fit mb-1 shadow-sm">目玉機能 ①</span>
                                                <span className="text-[17px] font-black text-blue-800 leading-tight uppercase tracking-tight">Google口コミ自動化</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 pl-1">
                                            <div className="flex items-center gap-2 text-[11px] text-gray-600 font-bold">
                                                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                                                <span className="text-blue-700 font-black">MEO対策でマップ検索順位を向上</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[11px] text-gray-600 font-bold">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                                                <span>AI自動返信・一元管理</span>
                                            </div>
                                            <div className="flex items-start gap-2 text-[12px] text-red-600 font-black leading-tight bg-white/60 p-2 rounded-lg border border-red-100 animate-pulse">
                                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                                <span>星1.2の低評価投稿を<br />緊急通知でお知らせ</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Feature 2: AI Receipt Throwing */}
                                    <div className="flex items-center gap-5 text-emerald-700 bg-emerald-50/50 p-6 rounded-2xl border-2 border-emerald-500 shadow-md relative overflow-hidden transition-all hover:bg-emerald-100/50">
                                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                                            <Camera className="w-7 h-7 text-emerald-600" />
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="flex gap-1.5 mb-1">
                                                <span className="bg-emerald-600 text-white text-[10px] px-2.5 py-0.5 rounded-md font-black w-fit">目玉機能 ②</span>
                                                <span className="bg-orange-500 text-white text-[10px] px-2.5 py-0.5 rounded-md font-black w-fit animate-pulse shadow-sm">2026年最新対応</span>
                                            </div>
                                            <span className="text-[17px] font-black text-emerald-800 leading-tight uppercase tracking-tight">AI領収書丸投げ機能</span>
                                            <span className="text-[11px] text-gray-500 font-bold tracking-tighter mt-0.5">最新インボイス制度に完全対応</span>
                                        </div>
                                    </div>

                                    {/* Feature 3: Sales & Accounting Management */}
                                    <div className="flex items-center gap-5 text-emerald-700 bg-emerald-50/50 p-6 rounded-2xl border border-emerald-200 shadow-sm relative overflow-hidden transition-all hover:bg-emerald-100/50">
                                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                                            <TrendingUp className="w-7 h-7 text-emerald-600" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="bg-emerald-600 text-white text-[10px] px-2.5 py-0.5 rounded-md font-black w-fit mb-1">目玉機能 ③</span>
                                            <span className="text-[17px] font-black text-emerald-800 leading-tight uppercase tracking-tight">売上・収支管理</span>
                                            <span className="text-[11px] text-gray-500 font-bold tracking-tighter mt-0.5">自動集計・帳簿作成を自動化</span>
                                        </div>
                                    </div>

                                    {/* Extra Value: AI Image Generation */}
                                    <div className="flex items-center gap-4 text-gray-900 font-bold px-2 mt-2">
                                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                                            <Sparkles className="w-6 h-6 text-indigo-500" />
                                        </div>
                                        <div className="flex flex-col leading-tight">
                                            <span className="text-sm font-black">AI料理画像生成 (60枚/月)</span>
                                            <span className="text-[10px] text-gray-400">販促POPやHP素材に使い放題</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Pro Plan (SaaS) - Instagram Focused */}
                            <div className="bg-white rounded-[2.5rem] shadow-2xl border-4 border-orange-500 flex flex-col min-h-[820px] overflow-hidden transition-all hover:scale-[1.02] relative z-10 group">
                                <div className="absolute top-4 -right-8 bg-amber-400 text-amber-950 text-[10px] font-black py-1 px-10 rotate-45 shadow-sm">人気No.1</div>
                                <div className="p-10 pb-6 flex flex-col items-center text-center">
                                    <h3 className="text-2xl font-black text-gray-900 mb-2">Pro</h3>
                                    <Badge className="mb-6 bg-orange-50 text-orange-600 border-none font-black px-4 py-1 text-xs">SNS集客特化 ＋ 全自動投稿支援</Badge>
                                    <div className="mb-8 flex flex-col items-center">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-5xl font-black text-orange-600 tracking-tighter"><span className="mr-1">¥</span>{billingCycle === 'year' ? '98,000' : '9,800'}</span>
                                            <span className="text-gray-400 font-bold text-sm">/{billingCycle === 'year' ? '年' : '月'}</span>
                                        </div>
                                        {billingCycle === 'year' && (
                                            <Badge className="mt-2 bg-green-500 text-white border-none font-black px-3 py-0.5 text-[10px] shadow-sm animate-bounce-subtle">月払いより17%お得！</Badge>
                                        )}
                                    </div>
                                    <Button
                                        className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl text-lg shadow-xl shadow-orange-100"
                                        onClick={() => handleCheckout(billingCycle === 'year' ? STRIPE_PLANS.BUSINESS.yearly.id : STRIPE_PLANS.BUSINESS.id, 'Pro')}
                                        disabled={!!processingId}
                                    >
                                        今すぐ始める
                                    </Button>
                                </div>
                                <div className="px-10 pb-10 flex-1 flex flex-col gap-5 bg-gray-50/50 pt-6">
                                    <div className="flex flex-col items-center gap-1 text-blue-700 font-black border-b border-blue-100 pb-2 mb-2">
                                        <div className="flex items-center justify-center gap-4 text-lg">
                                            <Star className="w-5 h-5 fill-blue-600" />
                                            Standardの全機能
                                        </div>
                                        <div className="text-2xl font-black">＋</div>
                                    </div>

                                    {/* Pro Main Feature: Instagram Integration */}
                                    <div className="flex flex-col gap-4 text-gray-900 bg-white p-5 rounded-[1.5rem] border-2 border-pink-500 shadow-lg relative overflow-hidden group/item transition-all hover:bg-pink-50/30">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
                                                <Instagram className="w-7 h-7 text-white" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="bg-pink-600 text-white text-[10px] px-2.5 py-0.5 rounded-md font-black w-fit mb-0.5">Proプラン最大の見玉</span>
                                                <span className="text-[17px] font-black leading-tight uppercase">Instagram連携</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3 mt-1">
                                            <div className="flex items-start gap-3">
                                                <div className="bg-pink-100 p-1.5 rounded-lg shrink-0 mt-0.5">
                                                    <ImagePlus className="w-4 h-4 text-pink-600" />
                                                </div>
                                                <div className="flex flex-col leading-tight">
                                                    <span className="text-[13px] font-black text-gray-800">AI画像解析 ＆ 自動文章作成</span>
                                                    <span className="text-[10px] text-gray-500 font-medium">写真を撮るだけでAIが魅力的なキャプションを生成。ハッシュタグ選びも不要。</span>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3">
                                                <div className="bg-pink-100 p-1.5 rounded-lg shrink-0 mt-0.5">
                                                    <MousePointerClick className="w-4 h-4 text-pink-600" />
                                                </div>
                                                <div className="flex flex-col leading-tight">
                                                    <span className="text-[13px] font-black text-gray-800">ボタン一つで即投稿</span>
                                                    <span className="text-[10px] text-gray-500 font-medium">承認ボタンを押すだけでお店の公式SNSへ即配信。投稿の手間を9割削減します。</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-2 bg-gradient-to-r from-pink-50 to-orange-50 p-3 rounded-xl border border-pink-100 shadow-inner">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Sparkles className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
                                                <span className="text-[11px] font-black text-pink-700">攻めの集客サイクルを実現</span>
                                            </div>
                                            <p className="text-[10px] text-gray-700 leading-relaxed font-bold tracking-tighter">
                                                料理を撮影 ➔ AIが魅力を言語化 ➔ スマホからワンタップで投稿完了。SNS運用の常識が変わります。
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-gray-900 font-bold px-2 mt-1">
                                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                                            <Sparkles className="w-6 h-6 text-indigo-500" />
                                        </div>
                                        <div className="flex flex-col leading-tight">
                                            <span className="text-sm font-black">AI料理画像生成 (200枚/月)</span>
                                            <span className="text-[10px] text-gray-400">高品質な宣伝用素材を自動作成</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Premium Plan (SaaS) */}
                            <div className="bg-white rounded-[2.5rem] shadow-xl border-4 border-amber-400 flex flex-col min-h-[820px] overflow-hidden transition-all hover:shadow-2xl group relative">
                                <div className="p-10 pb-6 flex flex-col items-center text-center">
                                    <h3 className="text-2xl font-black text-gray-900 mb-2">Pro Premium</h3>
                                    <Badge className="mb-6 bg-amber-50 text-amber-700 border-amber-100 font-black px-4 py-1 text-xs">AI経営トータルサポート</Badge>
                                    <div className="mb-8 flex flex-col items-center">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-black text-gray-900 tracking-tighter"><span className="mr-1">¥</span>{billingCycle === 'year' ? '148,000' : '14,800'}</span>
                                            <span className="text-gray-400 font-bold text-sm">/{billingCycle === 'year' ? '年' : '月'}</span>
                                        </div>
                                        {billingCycle === 'year' && (
                                            <Badge className="mt-2 bg-green-500 text-white border-none font-black px-3 py-0.5 text-[10px] shadow-sm animate-bounce-subtle">月払いより17%お得！</Badge>
                                        )}
                                    </div>
                                    <Button
                                        className="w-full h-14 bg-amber-400 hover:bg-amber-500 text-amber-950 font-black rounded-2xl text-lg shadow-lg shadow-amber-100"
                                        onClick={() => handleCheckout(billingCycle === 'year' ? STRIPE_PLANS.BUSINESS_PREMIUM.yearly.id : STRIPE_PLANS.BUSINESS_PREMIUM.id, 'Pro Premium')}
                                        disabled={!!processingId}
                                    >
                                        プレミアムで始める
                                    </Button>
                                </div>
                                <div className="px-10 pb-10 flex-1 flex flex-col gap-6">
                                    <div className="flex flex-col items-center gap-1 text-amber-600 font-black border-b border-amber-100 pb-2 mb-2">
                                        <div className="flex items-center justify-center gap-4">
                                            <Star className="w-4 h-4 fill-amber-500" />
                                            STANDARD PLANの全機能
                                        </div>
                                        <div className="text-2xl font-black">＋</div>
                                    </div>
                                    <div className="flex items-center gap-4 text-gray-900 font-black">
                                        <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Bot className="w-5 h-5 text-orange-500" />
                                        </div>
                                        <span>AI売上・経営分析</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-gray-900 font-black">
                                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Sparkles className="w-5 h-5 text-amber-600" />
                                        </div>
                                        <span>AI画像生成 (300枚/月)</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-gray-900 font-black">
                                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Check className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <span>POP/メニューAI自動作成</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-gray-900 font-black">
                                        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <ShieldCheck className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <span className="text-xs">ライバル店AI監視 (5店舗)</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {/* FAQ Section */}
                <div id="faq" className="mt-24 max-w-4xl mx-auto px-4 scroll-mt-20 border-t border-gray-200 pt-20">
                    <h2 className="text-3xl font-black text-center text-gray-900 mb-12 flex items-center justify-center gap-4">
                        <MessageSquare className="w-8 h-8 text-blue-600" />
                        よくあるご質問
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white p-8 rounded-3xl border-2 border-gray-100 shadow-sm hover:border-blue-200 transition-colors">
                            <h3 className="font-black text-gray-900 mb-4 text-lg">Q. 未経験でもAIを使って返信や投稿はできますか？</h3>
                            <p className="text-gray-600 leading-relaxed font-medium">
                                はい、特別な知識は不要です。ボタン一つでAIがプラン上の制限に従い、最適な返信文や投稿案を自動作成します。
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border-2 border-gray-100 shadow-sm hover:border-orange-200 transition-colors">
                            <h3 className="font-black text-gray-900 mb-4 text-lg">Q. 解約金や契約期間の縛りはありますか？</h3>
                            <p className="text-gray-600 leading-relaxed font-medium">
                                いいえ、最低利用期間の制限はありません。いつでも管理画面から解約・プラン変更が可能で、違約金も一切かかりません。
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border-2 border-gray-100 shadow-sm hover:border-blue-200 transition-colors">
                            <h3 className="font-black text-gray-900 mb-4 text-lg">Q. HP制作にはどれくらいの期間がかかりますか？</h3>
                            <p className="text-gray-600 leading-relaxed font-medium">
                                必要な情報が揃ってから、最短3営業日でプレビュー公開、1週間程度で納品可能です。お急ぎの場合もご相談ください。
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border-2 border-gray-100 shadow-sm hover:border-orange-200 transition-colors">
                            <h3 className="font-black text-gray-900 mb-4 text-lg">Q. パソコンがないのですが、スマホだけで運用できますか？</h3>
                            <p className="text-gray-600 leading-relaxed font-medium">
                                はい、全ての機能はスマートフォンから操作可能です。外出先や調理の合間、移動中に口コミ返信や投稿予約が完結します。
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border-2 border-gray-100 shadow-sm hover:border-blue-200 transition-colors">
                            <h3 className="font-black text-gray-900 mb-4 text-lg">Q. 既存のホームページから移行することは可能ですか？</h3>
                            <p className="text-gray-600 leading-relaxed font-medium">
                                はい、可能です。ドメインの引き継ぎ設定などもサポートいたします。既存サイトの情報をAIが学習して制作を効率化することも可能です。
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border-2 border-gray-100 shadow-sm hover:border-orange-200 transition-colors">
                            <h3 className="font-black text-gray-900 mb-4 text-lg">Q. 悪い口コミがついた時の通知はありますか？</h3>
                            <p className="text-gray-600 leading-relaxed font-medium">
                                はい。低評価がついた際に即時通知する機能（ライトプラン以上）があり、風評被害を最小限に抑える迅速な対応を支援します。
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border-2 border-gray-100 shadow-sm hover:border-orange-200 transition-colors">
                            <h3 className="font-black text-gray-900 mb-4 text-lg">Q. 2026年最新インボイス制度に対応していますか？</h3>
                            <p className="text-gray-600 leading-relaxed font-medium">
                                はい、全ての集客SaaSプラン（Standard以上）でAI経費丸投げ機能によるインボイス対応帳簿管理が標準搭載されています。
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border-2 border-gray-100 shadow-sm hover:border-orange-200 transition-colors">
                            <h3 className="font-black text-gray-900 mb-4 text-lg">Q. 年払いから月払いへの変更はできますか？</h3>
                            <p className="text-gray-600 leading-relaxed font-medium">
                                契約更新（1年ごと）のタイミングでのお切り替えが可能です。プランのアップグレードはいつでも即時に反映されます。
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
