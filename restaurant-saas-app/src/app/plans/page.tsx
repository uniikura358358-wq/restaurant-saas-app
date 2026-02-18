'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { STRIPE_PLANS } from '@/lib/stripe/config';
import { toast } from 'sonner';
import { Check, Loader2, Star, ShieldCheck, Sparkles, MessageSquare, Bot, Instagram, Globe, Zap, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CustomerSupportChat } from '@/components/CustomerSupportChat';

export default function PlansPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
            <PlansContent />
            <CustomerSupportChat />
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

            <div className={`mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12 transition-all duration-500 ${activeMode === 'saas' ? 'max-w-6xl' : 'max-w-[1440px]'}`}>
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

                    {/* Billing Toggle (Shown for both) */}
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

                {/* --- View A: 集客に特化した自動AIサービス --- */}
                {activeMode === 'saas' && (
                    <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                        <div className="grid md:grid-cols-3 gap-8 items-stretch mb-8">
                            {/* Light Plan (SaaS) */}
                            <div className="bg-white rounded-[2.5rem] shadow-md border-2 border-blue-600 flex flex-col min-h-[660px] overflow-hidden transition-all hover:shadow-2xl group relative">
                                <div className="p-10 pb-6 flex flex-col items-center text-center">
                                    <h3 className="text-2xl font-black text-gray-900 mb-2">Light Plan</h3>
                                    <Badge className="mb-6 bg-blue-50 text-blue-600 border-blue-100 font-black px-4 py-1 text-xs">MEO・口コミ対策特化</Badge>
                                    <div className="mb-8 flex flex-col items-center">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-black text-gray-900 tracking-tighter"><span className="mr-1">¥</span>{billingCycle === 'year' ? '39,800' : '3,980'}</span>
                                            <span className="text-gray-400 font-bold text-sm">/{billingCycle === 'year' ? '年' : '月'}</span>
                                        </div>
                                        {billingCycle === 'year' && (
                                            <Badge className="mt-2 bg-green-500 text-white border-none font-black px-3 py-0.5 text-[10px] shadow-sm animate-bounce-subtle">月払いより2ヶ月分お得！</Badge>
                                        )}
                                    </div>
                                    <Button
                                        className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-lg shadow-lg shadow-blue-100"
                                        onClick={() => handleCheckout(billingCycle === 'year' ? STRIPE_PLANS.LIGHT.yearly.id : STRIPE_PLANS.LIGHT.id, 'Light Plan')}
                                        disabled={!!processingId}
                                    >
                                        選択する
                                    </Button>
                                </div>
                                <div className="px-10 pb-10 flex-1 flex flex-col gap-6">
                                    <div className="flex items-center gap-4 text-gray-700 font-bold">
                                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <MessageSquare className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <span>Google口コミ一元管理</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-gray-700 font-bold">
                                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Bot className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <span>AI自動返信 / 半自動返信</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-gray-700 font-bold">
                                        <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <ShieldCheck className="w-5 h-5 text-red-500" />
                                        </div>
                                        <span>低評価緊急通知機能</span>
                                    </div>
                                </div>
                            </div>

                            {/* Standard Plan (SaaS) */}
                            <div className="bg-white rounded-[2.5rem] shadow-2xl border-4 border-orange-500 flex flex-col min-h-[660px] overflow-hidden transition-all hover:scale-[1.02] relative z-10 group">
                                <div className="absolute top-4 -right-8 bg-amber-400 text-amber-950 text-[10px] font-black py-1 px-10 rotate-45 shadow-sm">人気No.1</div>
                                <div className="p-10 pb-6 flex flex-col items-center text-center">
                                    <h3 className="text-2xl font-black text-gray-900 mb-2">Standard Plan</h3>
                                    <Badge className="mb-6 bg-orange-50 text-orange-600 border-none font-black px-4 py-1 text-xs">SNS集客パック</Badge>
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
                                        onClick={() => handleCheckout(billingCycle === 'year' ? STRIPE_PLANS.BUSINESS.yearly.id : STRIPE_PLANS.BUSINESS.id, 'Standard Plan')}
                                        disabled={!!processingId}
                                    >
                                        今すぐ始める
                                    </Button>
                                </div>
                                <div className="px-10 pb-10 flex-1 flex flex-col gap-6 bg-gray-50/50">
                                    <div className="flex flex-col items-center gap-1 text-blue-700 font-black border-b border-blue-100 pb-2">
                                        <div className="flex items-center justify-center gap-4 text-lg">
                                            <Star className="w-5 h-5 fill-blue-600" />
                                            LIGHT PLANの全機能
                                        </div>
                                        <div className="text-2xl font-black">＋</div>
                                    </div>
                                    <div className="flex items-center gap-4 text-gray-900 font-black">
                                        <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                                            <Instagram className="w-6 h-6 text-pink-500" />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-lg leading-tight"><span className="text-orange-500 text-2xl">Instagram</span>連携</span>
                                            <span className="text-lg leading-tight">AI自動投稿支援</span>
                                            <span className="text-xs bg-red-600 text-white px-2.5 py-1 rounded-full shadow-sm animate-pulse whitespace-nowrap w-fit mt-1">
                                                ボタンを押すだけ!!
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-gray-900 font-black">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                                            <Sparkles className="w-6 h-6 text-indigo-500" />
                                        </div>
                                        <span className="text-lg">AI画像生成 (60枚/月)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Premium Plan (SaaS) */}
                            <div className="bg-white rounded-[2.5rem] shadow-xl border-4 border-amber-400 flex flex-col min-h-[660px] overflow-hidden transition-all hover:shadow-2xl group relative">
                                <div className="p-10 pb-6 flex flex-col items-center text-center">
                                    <h3 className="text-2xl font-black text-gray-900 mb-2">Premium Plan</h3>
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
                                        onClick={() => handleCheckout(billingCycle === 'year' ? STRIPE_PLANS.BUSINESS_PREMIUM.yearly.id : STRIPE_PLANS.BUSINESS_PREMIUM.id, 'Premium Plan')}
                                        disabled={!!processingId}
                                    >
                                        プレミアムで始める
                                    </Button>
                                </div>
                                <div className="px-10 pb-10 flex-1 flex flex-col gap-6">
                                    <div className="flex flex-col items-center gap-1 text-amber-600 font-black border-b border-amber-100 pb-2">
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
                                        <span>AI画像生成 (90枚/月)</span>
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

                        {/* Huge Global Link Button */}
                        <div className="mt-4 group cursor-pointer" onClick={() => setActiveMode('hp')}>
                            <div className="bg-gradient-to-r from-orange-400 to-red-500 rounded-[2rem] p-1 shadow-2xl transition-transform hover:scale-[1.01] active:scale-[0.99]">
                                <div className="bg-white/10 backdrop-blur-sm rounded-[1.9rem] p-8 md:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
                                    <Globe className="absolute -left-10 -bottom-10 w-48 h-48 text-white/10" />
                                    <div className="text-center md:text-left relative z-10">
                                        <h3 className="text-2xl md:text-3xl font-black mb-2 flex items-center gap-3 justify-center md:justify-start whitespace-nowrap">
                                            お店の魅力を伝える公式HPも作りませんか？
                                            <Globe className="w-8 h-8 animate-pulse text-orange-200" />
                                        </h3>
                                        <p className="text-orange-50 font-bold text-lg whitespace-nowrap">初期費用 ¥39,800 (初回制作費) ＋ 月額プラン (維持管理費込)</p>
                                    </div>
                                    <div className="bg-white text-orange-600 px-10 py-5 rounded-2xl font-black text-xl shadow-xl flex items-center gap-3 relative z-10 transition-colors group-hover:bg-orange-50">
                                        HP制作セットプランはこちら
                                        <Zap className="w-6 h-6 fill-orange-500" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- View B: HP制作パッケージ --- */}
                {activeMode === 'hp' && (
                    <div className="animate-in fade-in slide-in-from-right-10 duration-500">
                        {/* HP Creation Initial Cost Banner */}
                        <div className="mb-8 bg-orange-500 rounded-3xl p-6 md:p-8 shadow-lg border border-orange-400 relative overflow-hidden">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-white relative z-10">
                                <div className="flex flex-col md:flex-row items-center gap-4">
                                    <Badge className="bg-white text-orange-600 font-black px-4 py-1 text-sm border-none shadow-sm space-x-1">
                                        <span>WEB制作</span>
                                        <span className="text-orange-300">＋</span>
                                        <span>維持管理</span>
                                    </Badge>
                                    <p className="text-xl md:text-2xl font-black tracking-tight whitespace-nowrap">
                                        初期費用 <span className="text-3xl md:text-4xl text-white drop-shadow-sm">¥39,800</span> (初回制作費) <span className="text-orange-200 mx-1">＋</span> 月額プラン (維持管理費込)
                                    </p>
                                </div>
                                <a
                                    href="https://mogmog-ai-sample.vercel.app/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border-2 border-white/40 px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-xl whitespace-nowrap"
                                >
                                    見本のWEBサイトを見る
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                            <Globe className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 items-start mb-8">
                            {/* 1. WEB会員 */}
                            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden transition-all hover:shadow-xl group">
                                <div className="p-8 pb-4 flex flex-col items-center text-center">
                                    <h3 className="text-xl font-black text-gray-900 mb-2">WEB会員</h3>
                                    <Badge className="mb-6 bg-gray-50 text-gray-500 border-gray-100 font-black px-4 py-1 text-xs tracking-tighter">HP作成 ＋ 維持管理のみ</Badge>
                                    <div className="mb-6 flex flex-col items-center">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-black text-gray-900 tracking-tighter">
                                                <span className="mr-1">¥</span>{billingCycle === 'year' ? '32,800' : '3,280'}
                                            </span>
                                            <span className="text-gray-400 font-bold text-sm">/{billingCycle === 'year' ? '年' : '月'}</span>
                                        </div>
                                        {billingCycle === 'year' && (
                                            <Badge className="mt-2 bg-green-500 text-white border-none font-black px-3 py-0.5 text-[10px] shadow-sm animate-bounce-subtle">月払いより17%お得！</Badge>
                                        )}
                                        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 rounded-full">
                                            <Check className="w-3 h-3 text-green-600" />
                                            <span className="text-[10px] text-green-700 font-black">HP維持・サーバー管理費 込</span>
                                        </div>
                                    </div>
                                    <Button variant="outline" className="w-full h-12 border-2 border-gray-200 text-gray-600 font-black rounded-xl hover:bg-gray-50 transition-colors">選択する</Button>
                                </div>
                                <div className="px-8 pb-8 flex-1 flex flex-col gap-5 pt-4">
                                    <div className="flex items-start gap-3 text-sm font-bold text-gray-700">
                                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                                        <span>1ページの公式Webサイト制作</span>
                                    </div>
                                    <div className="flex items-start gap-3 text-sm font-bold text-gray-700">
                                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                                        <span>ドメイン・サーバー維持管理</span>
                                    </div>
                                </div>
                            </div>

                            {/* 2. WEBライト */}
                            <div className="bg-white rounded-[2rem] shadow-md border-2 border-blue-600 flex flex-col h-full overflow-hidden transition-all hover:shadow-2xl relative group">
                                <div className="p-8 pb-4 flex flex-col items-center text-center">
                                    <h3 className="text-xl font-black text-gray-900 mb-2">WEBライト</h3>
                                    <Badge className="mb-6 bg-blue-50 text-blue-600 border-none font-black px-4 py-1 text-xs">HP ＋ Google口コミ対策</Badge>
                                    <div className="mb-6 flex flex-col items-center">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-black text-blue-700 tracking-tighter">
                                                <span className="mr-1">¥</span>{billingCycle === 'year' ? '39,800' : '3,980'}
                                            </span>
                                            <span className="text-gray-400 font-bold text-sm">/{billingCycle === 'year' ? '年' : '月'}</span>
                                        </div>
                                        {billingCycle === 'year' && (
                                            <Badge className="mt-2 bg-green-500 text-white border-none font-black px-3 py-0.5 text-[10px] shadow-sm animate-bounce-subtle">月払いより2ヶ月分お得！</Badge>
                                        )}
                                        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 rounded-full">
                                            <Check className="w-3 h-3 text-blue-600" />
                                            <span className="text-[10px] text-blue-700 font-black">HP維持・サーバー管理費 込</span>
                                        </div>
                                    </div>
                                    <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-100">選択する</Button>
                                </div>
                                <div className="px-8 pb-8 flex-1 flex flex-col gap-5 pt-4">
                                    <div className="flex items-start gap-3 text-sm font-black text-gray-900">
                                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0"><Globe className="w-4 h-4 text-blue-600" /></div>
                                        <span>公式HP制作・維持管理</span>
                                    </div>
                                    <div className="flex items-start gap-3 text-sm font-black text-gray-900">
                                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0"><MessageSquare className="w-4 h-4 text-blue-600" /></div>
                                        <span>Google口コミ自動返信機能</span>
                                    </div>
                                </div>
                            </div>

                            {/* 3. WEBスタンダード */}
                            <div className="bg-white rounded-[2rem] shadow-2xl border-4 border-orange-500 flex flex-col h-full overflow-hidden transition-all hover:scale-[1.03] relative z-10 group">
                                <div className="absolute top-4 -right-8 bg-amber-400 text-amber-950 text-[10px] font-black py-1 px-10 rotate-45 shadow-sm">オトク！</div>
                                <div className="p-8 pb-4 flex flex-col items-center text-center">
                                    <h3 className="text-xl font-black text-gray-900 mb-2">WEBスタンダード</h3>
                                    <Badge className="mb-6 bg-orange-50 text-orange-600 border-none font-black px-4 py-1 text-xs">HP ＋ SNS集客 ＋ AI画像</Badge>
                                    <div className="mb-6 flex flex-col items-center">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-black text-orange-600 tracking-tighter">
                                                <span className="mr-1">¥</span>{billingCycle === 'year' ? '98,000' : '9,800'}
                                            </span>
                                            <span className="text-gray-400 font-bold text-sm">/{billingCycle === 'year' ? '年' : '月'}</span>
                                        </div>
                                        {billingCycle === 'year' && (
                                            <Badge className="mt-2 bg-green-500 text-white border-none font-black px-3 py-0.5 text-[10px] shadow-sm animate-bounce-subtle">月払いより17%お得！</Badge>
                                        )}
                                        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 rounded-full border border-amber-200">
                                            <Star className="w-3 h-3 text-amber-600 fill-amber-500" />
                                            <span className="text-[10px] text-amber-800 font-black italic">HP維持費 実質 ¥ 0！</span>
                                        </div>
                                    </div>
                                    <Button className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl shadow-xl shadow-orange-100">今すぐ始める</Button>
                                </div>
                                <div className="px-8 pb-8 flex-1 flex flex-col gap-5 pt-4 bg-orange-50/30">
                                    <div className="flex items-start gap-3 text-sm font-black text-gray-900">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"><Globe className="w-5 h-5 text-orange-500" /></div>
                                        <span>公式HP制作・維持管理</span>
                                    </div>
                                    <div className="flex items-start gap-3 text-sm font-black text-gray-900">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"><Instagram className="w-5 h-5 text-pink-500" /></div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm leading-tight"><span className="text-orange-500 text-lg">Instagram</span>連携</span>
                                            <span className="text-sm leading-tight">AI自動投稿支援</span>
                                            <span className="bg-red-600 text-white px-2 py-0.5 rounded-md shadow-sm text-[10px] w-fit mt-0.5">
                                                ボタンを押すだけ!!
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 text-sm font-black text-gray-900">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"><Sparkles className="w-5 h-5 text-indigo-500" /></div>
                                        <span>AI画像生成 (60枚/月)</span>
                                    </div>
                                </div>
                            </div>

                            {/* 4. WEBプレミアム */}
                            <div className="bg-white rounded-[2rem] shadow-xl border-4 border-amber-400 flex flex-col h-full overflow-hidden transition-all hover:shadow-2xl relative group">
                                <div className="p-8 pb-4 flex flex-col items-center text-center">
                                    <h3 className="text-xl font-black text-gray-900 mb-2">WEBプレミアム</h3>
                                    <Badge className="mb-6 bg-amber-50 text-amber-700 border-none font-black px-4 py-1 text-xs">HP ＋ 全AI機能パッケージ</Badge>
                                    <div className="mb-6 flex flex-col items-center">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-black text-amber-600 tracking-tighter">
                                                <span className="mr-1">¥</span>{billingCycle === 'year' ? '148,000' : '14,800'}
                                            </span>
                                            <span className="text-gray-400 font-bold text-sm">/{billingCycle === 'year' ? '年' : '月'}</span>
                                        </div>
                                        {billingCycle === 'year' && (
                                            <Badge className="mt-2 bg-green-500 text-white border-none font-black px-3 py-0.5 text-[10px] shadow-sm animate-bounce-subtle">月払いより17%お得！</Badge>
                                        )}
                                        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 rounded-full border border-amber-200">
                                            <Star className="w-3 h-3 text-amber-600 fill-amber-500" />
                                            <span className="text-[10px] text-amber-800 font-black italic">HP維持費 実質 ¥ 0！</span>
                                        </div>
                                    </div>
                                    <Button className="w-full h-12 bg-amber-400 hover:bg-amber-500 text-amber-950 font-black rounded-xl">プレミアムで始める</Button>
                                </div>
                                <div className="px-8 pb-8 flex-1 flex flex-col gap-5 pt-4 bg-amber-50/30">
                                    <div className="flex items-start gap-3 text-sm font-black text-gray-900">
                                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"><Check className="w-4 h-4 text-amber-600" /></div>
                                        <span>公式HP制作・維持管理</span>
                                    </div>
                                    <div className="flex items-start gap-3 text-sm font-black text-gray-900">
                                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"><Check className="w-4 h-4 text-amber-600" /></div>
                                        <span>すべてのAI機能利用可能</span>
                                    </div>
                                    <div className="flex items-start gap-3 text-sm font-black text-gray-900">
                                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"><Check className="w-4 h-4 text-amber-600" /></div>
                                        <span>売上・経営分析AI</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Huge Global Back Link Button */}
                        <div className="mt-4 group cursor-pointer" onClick={() => setActiveMode('saas')}>
                            <div className="bg-blue-600 rounded-[2rem] p-1 shadow-2xl transition-transform hover:scale-[1.01] active:scale-[0.99]">
                                <div className="bg-blue-500 rounded-[1.9rem] p-8 md:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative border border-blue-400">
                                    <Bot className="absolute -right-10 -bottom-10 w-48 h-48 text-white/5" />
                                    <div className="text-center md:text-left relative z-10">
                                        <h3 className="text-2xl md:text-3xl font-black mb-2 flex items-center gap-3 justify-center md:justify-start">
                                            HPは既にお持ちですか？
                                            <Bot className="w-8 h-8 text-blue-200" />
                                        </h3>
                                        <p className="text-blue-50 font-bold text-lg">集客機能だけを利用して、コストを最小限に抑えたい方はこちら。</p>
                                    </div>
                                    <div className="bg-white text-blue-600 px-10 py-5 rounded-2xl font-black text-xl shadow-xl flex items-center gap-3 relative z-10 transition-all group-hover:bg-blue-50 hover:scale-105 active:scale-95">
                                        集客に特化した自動AIサービスはこちら
                                        <Zap className="w-6 h-6 text-blue-500 fill-blue-500" />
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
                            <h3 className="font-black text-gray-900 mb-4 text-lg">Q. 「維持管理手数料」とは何ですか？</h3>
                            <p className="text-gray-600 leading-relaxed font-medium">
                                Webサイトを公開し続けるために必要なサーバー代やドメイン代、およびシステムの保守費用です。
                                **「HP制作セットプラン」では全ての月額料金にこの費用が含まれています。**
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border-2 border-gray-100 shadow-sm hover:border-blue-200 transition-colors">
                            <h3 className="font-black text-gray-900 mb-4 text-lg">Q. 他社からの乗り換えは可能ですか？</h3>
                            <p className="text-gray-600 leading-relaxed font-medium">
                                はい！すでに他社でHPをお持ちの場合でも、そのURLをAIが読み取って初期制作をサポートします。Googleマップの口コミデータ等もそのまま引き継いでAI運用を開始できます。
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border-2 border-gray-100 shadow-sm hover:border-orange-200 transition-colors">
                            <h3 className="font-black text-gray-900 mb-4 text-lg">Q. 初期費用 ¥39,800 はいつ発生しますか？</h3>
                            <p className="text-gray-600 leading-relaxed font-medium">
                                Webサイト制作をご依頼いただく際、初回のみ頂戴しております。以降は選択したプランの月額料金のみとなります。**集客AIサービスのみの利用では初期費用は ¥0 です。**
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border-2 border-gray-100 shadow-sm hover:border-orange-200 transition-colors">
                            <h3 className="font-black text-gray-900 mb-4 text-lg">Q. 解約はいつでもできますか？</h3>
                            <p className="text-gray-600 leading-relaxed font-medium">
                                はい、契約期間の縛りはありませんので、いつでも管理画面から解約可能です。違約金も一切かかりませんのでご安心ください。
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <CustomerSupportChat />
        </div >
    );
}
