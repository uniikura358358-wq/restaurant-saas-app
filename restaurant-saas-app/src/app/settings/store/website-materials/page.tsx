"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePlanGuard } from "@/hooks/usePlanGuard";
import { Lock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle2, AlertCircle, Loader2, Sparkles, Plus, Trash2, CalendarDays, Camera, RefreshCcw, X, Smartphone, Instagram } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { saveStoreSettings, getUserProfile } from "@/app/actions/settings";
import { AppSidebar } from "@/components/app-sidebar";

export default function MaterialsPage() {
    const { user, getToken, loading: authLoading } = useAuth();
    const router = useRouter();
    const { hasFeature, loading: planLoading, refreshPlan } = usePlanGuard();
    const [useGoogleData, setUseGoogleData] = useState(true);
    const [catchCopy, setCatchCopy] = useState("こだわりの自家製麺と、秘伝のスープをお楽しみください。");
    const [isAdjusting, setIsAdjusting] = useState(false);

    // AI利用状況
    const [aiUsageCount, setAiUsageCount] = useState(0);
    // const MAX_USAGE = 30; // 仮の上限
    const [isSaving, setIsSaving] = useState(false);

    // 基本情報（Firestore StoreDataとマッピング）
    const [basicInfo, setBasicInfo] = useState({ storeName: '', phone: '', address: '', hours: '' });

    // 画像情報（現在はURL文字列として管理）
    const [images, setImages] = useState({ interior: '', menu1: '', menu2: '', menu3: '' }); // menu1-3 for products

    // 曜日別メニュー
    const [scheduledMenus, setScheduledMenus] = useState<any[]>([
        { id: 1, name: '平日限定ランチ', days: [1, 2, 3, 4, 5], image: '' },
        { id: 2, name: '土日限定メニュー', days: [6, 0], image: '' }
    ]);

    // カメラ関連
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraMode, setCameraMode] = useState<'portrait' | 'landscape' | 'insta-square' | 'insta-story'>('landscape');
    const [activeTargetField, setActiveTargetField] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const daysOfWeek = [
        { label: '日', value: 0 },
        { label: '月', value: 1 },
        { label: '火', value: 2 },
        { label: '水', value: 3 },
        { label: '木', value: 4 },
        { label: '金', value: 5 },
        { label: '土', value: 6 },
    ];

    // 内部コスト管理（MVP用）
    const [internalCost, setInternalCost] = useState(0);
    const [currentMaxLimit, setCurrentMaxLimit] = useState(700);

    const today = new Date();
    const isLateInMonth = today.getDate() >= 25;

    // 初期データ取得
    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                const token = await getToken();
                if (!token) return;

                const { success, store, error } = await getUserProfile(token);
                if (success && store) {
                    // StoreDataから状態を復元
                    if (store.storeName) setBasicInfo(prev => ({ ...prev, storeName: store.storeName }));
                    if (store.websiteMaterials) {
                        const wm = store.websiteMaterials;
                        if (wm.catchCopy) setCatchCopy(wm.catchCopy);
                        if (wm.address) setBasicInfo(prev => ({ ...prev, address: wm.address || '' }));
                        if (wm.phone) setBasicInfo(prev => ({ ...prev, phone: wm.phone || '' }));
                        if (wm.businessHours) setBasicInfo(prev => ({ ...prev, hours: wm.businessHours || '' }));

                        if (wm.images) setImages(prev => ({ ...prev, ...wm.images }));
                        if (wm.menus) setScheduledMenus(wm.menus || []);
                    }
                }
            } catch (err) {
                console.error("Fetch Data Error:", err);
                toast.error("データの取得に失敗しました");
            }
        };

        if (!authLoading && user) {
            fetchData();
        }
    }, [user, authLoading, getToken]);


    const handleAIAdjustment = async () => {
        // 利用枠チェック（内部管理）
        if (internalCost >= currentMaxLimit) {
            const message = isLateInMonth
                ? "今月のAI利用枠に達しました。来月の更新をお待ちいただくか、追加枠をご検討ください。"
                : "今月のAI利用目安に達しました。追加オプションで継続してご利用いただけます！";
            toast.error(message);
            return;
        }

        setIsAdjusting(true);
        try {
            // Mock logic for demo
            await new Promise(resolve => setTimeout(resolve, 1500));
            const newCopy = catchCopy + "（AI調整済み）"; // Mock logic

            setCatchCopy(newCopy);
            setInternalCost(prev => prev + 25);
            setAiUsageCount(prev => prev + 1);

            toast.success("AIがキャッチコピーをより魅力的に修正しました！");
        } catch (error) {
            toast.error("AI調整に失敗しました。時間をおいて再試行してください。");
        } finally {
            setIsAdjusting(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const token = await getToken();
            if (!token) throw new Error("認証トークンが取得できません");

            // Firestore保存用のデータ構築
            const storeDataPayload = {
                storeName: basicInfo.storeName,
                // addressなどは websiteMaterials に含めるか、StoreData直下にするか。
                // Firestore.ts定義に合わせて websiteMaterials に集約
                websiteMaterials: {
                    catchCopy,
                    storeName: basicInfo.storeName,
                    address: basicInfo.address,
                    phone: basicInfo.phone,
                    businessHours: basicInfo.hours,
                    images: {
                        interior: images.interior,
                        menu1: images.menu1,
                        menu2: images.menu2,
                        menu3: images.menu3
                    },
                    menus: scheduledMenus
                }
            };

            const result = await saveStoreSettings(token, storeDataPayload);

            if (!result.success) throw new Error(result.error);

            toast.success("保存しました！制作チームへ通知が送信されました。");
        } catch (error: any) {
            console.error('Save error:', error);
            toast.error("保存に失敗しました。");
        } finally {
            setIsSaving(false);
        }
    };

    const handleBuyExtension = () => {
        // Stripe連携予定箇所
        setCurrentMaxLimit(prev => prev + 500);
        toast.success("AI利用枠を追加しました！");
    };

    const toggleDay = (menuId: number, dayValue: number) => {
        setScheduledMenus(prev => prev.map(menu => {
            if (menu.id === menuId) {
                const newDays = menu.days.includes(dayValue)
                    ? menu.days.filter((d: number) => d !== dayValue)
                    : [...menu.days, dayValue];
                return { ...menu, days: newDays };
            }
            return menu;
        }));
    };

    const addMenuSlot = () => {
        const newId = Math.max(0, ...scheduledMenus.map(m => m.id)) + 1;
        setScheduledMenus([...scheduledMenus, { id: newId, name: '', days: [], image: '' }]);
    };

    const removeMenuSlot = (id: number) => {
        setScheduledMenus(scheduledMenus.filter(m => m.id !== id));
    };

    const setPreset = (menuId: number, type: 'weekdays' | 'weekends') => {
        const days = type === 'weekdays' ? [1, 2, 3, 4, 5] : [6, 0];
        setScheduledMenus(prev => prev.map(menu =>
            menu.id === menuId ? { ...menu, days } : menu
        ));
    };

    // カメラ機能（変更なし・クライアントサイドのみで完結するため）
    const startCamera = async (targetField: string, initialMode: 'portrait' | 'landscape' | 'insta-square' | 'insta-story') => {
        setActiveTargetField(targetField);
        setCameraMode(initialMode);
        setIsCameraOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            toast.error("カメラの起動に失敗しました。設定を確認してください。");
            setIsCameraOpen(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        setIsCameraOpen(false);
        setActiveTargetField(null);
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                // const dataUrl = canvas.toDataURL('image/jpeg');
                // ここで本来はStorageへアップロード処理が入る
                // MVPではDataURLをそのまま使うか、モックとして成功のみ返す

                toast.success("写真をキャプチャしました！枠に合わせて保存します。");
                stopCamera();
            }
        }
    };

    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // 認証ロード中などの表示調整
    if (authLoading) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="flex min-h-screen bg-background text-foreground overflow-hidden">
            <AppSidebar activePage="hp" user={user} />
            <main className="flex-1 overflow-y-auto">
                <div className="container mx-auto py-10 px-4 max-w-4xl">
                    <h1 className="text-3xl font-bold mb-2">HP制作・素材管理</h1>
                    <p className="text-gray-600 mb-8">
                        ホームページ制作に必要な写真やお店の情報をこちらから登録・更新できます。
                    </p>

                    <div className="grid gap-8">
                        {/* 1. 店舗基本情報 */}
                        <Card>
                            <CardHeader>
                                <CardTitle>1. 店舗基本情報</CardTitle>
                                <CardDescription>
                                    お店の住所や連絡先など、HPに掲載する基本情報です。
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center space-x-2 border p-4 rounded-lg bg-blue-50">
                                    <Switch
                                        id="google-sync"
                                        checked={useGoogleData}
                                        onCheckedChange={setUseGoogleData}
                                    />
                                    <Label htmlFor="google-sync" className="cursor-pointer flex-1">
                                        <span className="font-bold">Googleマップ（ビジネスプロフィール）の情報を流用する</span>
                                        <p className="text-sm text-gray-500 font-normal">
                                            ONにすると、Google上の住所・営業時間・電話番号をそのままHPに使用します。入力の手間が省けます。
                                        </p>
                                    </Label>
                                </div>

                                {!useGoogleData && (
                                    <div className="grid gap-4 mt-4 pl-4 border-l-2 border-gray-200">
                                        <div className="grid gap-2">
                                            <Label>店舗名</Label>
                                            <Input
                                                placeholder="例: 銀座ラーメン 太郎"
                                                value={basicInfo.storeName}
                                                onChange={(e) => setBasicInfo({ ...basicInfo, storeName: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>住所</Label>
                                            <Input
                                                placeholder="〒104-0061 東京都中央区銀座..."
                                                value={basicInfo.address}
                                                onChange={(e) => setBasicInfo({ ...basicInfo, address: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>電話番号</Label>
                                            <Input
                                                placeholder="03-1234-5678"
                                                value={basicInfo.phone}
                                                onChange={(e) => setBasicInfo({ ...basicInfo, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* 2. 写真素材 */}
                        <Card>
                            <CardHeader>
                                <CardTitle>2. 写真素材のアップロード</CardTitle>
                                <CardDescription>
                                    スマホで撮影した写真で構いません。明るい場所で撮影したものを推奨します。
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-10 py-10">
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="border-2 border-dashed rounded-2xl py-16 px-8 text-center bg-white hover:bg-gray-50 transition-all cursor-pointer group hover:border-blue-200">
                                            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-100 transition-colors">
                                                <Upload className="w-8 h-8 text-gray-400 group-hover:text-blue-500" />
                                            </div>
                                            <h3 className="font-bold text-xl text-gray-800">店内・外観の写真</h3>
                                            <p className="text-sm text-gray-400 mt-2">横向き撮影を推奨（16:9）</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="lg"
                                            className="w-full gap-3 text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-50 h-14 text-base font-bold"
                                            onClick={() => startCamera('interior', 'landscape')}
                                        >
                                            <Camera className="w-5 h-5" /> ガイド付カメラで撮る
                                        </Button>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="border-2 border-dashed rounded-2xl py-16 px-8 text-center bg-white hover:bg-gray-50 transition-all cursor-pointer group hover:border-blue-200">
                                            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-100 transition-colors">
                                                <Upload className="w-8 h-8 text-gray-400 group-hover:text-blue-500" />
                                            </div>
                                            <h3 className="font-bold text-xl text-gray-800">メニュー表の全体写真</h3>
                                            <p className="text-sm text-gray-400 mt-2">縦向き撮影を推奨（4:5）</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="lg"
                                            className="w-full gap-3 text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-50 h-14 text-base font-bold"
                                            onClick={() => startCamera('menu', 'portrait')}
                                        >
                                            <Camera className="w-5 h-5" /> ガイド付カメラで撮る
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-8 pt-10 border-t border-gray-100">
                                    <div className="flex flex-col gap-1">
                                        <Label className="text-base font-bold text-gray-800">イチオシ商品（最大3つまで）</Label>
                                        <p className="text-[11px] text-gray-500 leading-relaxed">
                                            ※HPの表示枠は合計3枠です。「メニュー表1枚 + 商品2枚」または「商品のみ3枚」など、お店に合わせて自由にご登録ください。
                                        </p>
                                    </div>
                                    <div className="grid md:grid-cols-3 gap-8">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="border rounded-2xl p-6 bg-white space-y-4 shadow-sm">
                                                <div
                                                    className="bg-gray-50 border-2 border-dashed h-40 rounded-xl flex flex-col items-center justify-center bg-white hover:bg-gray-50 transition cursor-pointer"
                                                >
                                                    <Upload className="w-6 h-6 text-gray-300 mb-1" />
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase">画像アップロード</span>
                                                    <span className="text-[9px] text-blue-500 underline mt-1">画像をアップロード</span>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full h-10 text-xs gap-2 text-blue-600 border-blue-100 bg-blue-50/30 hover:bg-blue-50 font-bold"
                                                    onClick={() => startCamera(`product${i}`, 'portrait')}
                                                >
                                                    <Camera className="w-4 h-4" /> ガイド付カメラ
                                                </Button>
                                                <div className="space-y-3 pt-2">
                                                    <div className="grid gap-1.5">
                                                        <Label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">商品名</Label>
                                                        <Input placeholder={`例: 極み醤油ラーメン ${i}`} className="text-sm border-gray-100 focus:border-blue-400 h-10" />
                                                    </div>
                                                    <div className="grid gap-1.5">
                                                        <Label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">価格 (税込)</Label>
                                                        <Input placeholder="例: 980" className="text-sm border-gray-100 focus:border-blue-400 h-10" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 3. キャッチコピー (AI調整機能付き) */}
                        <Card className="border-indigo-100 overflow-hidden">
                            <CardHeader className="bg-indigo-50/50">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            3. お店のキャッチコピー・紹介文
                                            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                                                AI微調整OK
                                            </Badge>
                                        </CardTitle>
                                        <CardDescription>
                                            HPのトップに表示される重要な文章です。AIがより魅力的な表現に磨き上げます。
                                        </CardDescription>
                                    </div>
                                    <div className="text-right text-xs">
                                        <p className="text-gray-500">AI利用状況</p>
                                        <div className="font-bold text-indigo-600">
                                            ご利用可能です
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <Textarea
                                    className="min-h-[120px] text-lg"
                                    value={catchCopy}
                                    onChange={(e) => setCatchCopy(e.target.value)}
                                />
                                <div className="flex justify-end">
                                    <Button
                                        variant="outline"
                                        className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                        onClick={handleAIAdjustment}
                                        disabled={isAdjusting}
                                    >
                                        {isAdjusting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                AIが魅力を引き出し中...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="mr-2 h-4 w-4 text-indigo-500" />
                                                AIでより魅力的にする
                                            </>
                                        )}
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-400 text-center mt-2 font-medium">
                                    お店の個性を活かしつつ、集客に効果的な文章へ微調整します。
                                </p>
                                <div className="bg-blue-50 p-3 rounded text-xs text-blue-800 flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <p>
                                            AIを使用して、お店の魅力を集客効果の高いフレーズで提案します。
                                            <br />
                                            ※月間の画像更新やチャット対応の回数に応じてご利用いただけます。
                                        </p>
                                    </div>

                                    {internalCost >= currentMaxLimit - 100 && !isLateInMonth && (
                                        <Button
                                            size="sm"
                                            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                                            onClick={handleBuyExtension}
                                        >
                                            <Sparkles className="w-3 h-3 mr-2" />
                                            AI利用枠を追加する
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* 4. 曜日別・自動差し替えメニュー設定 */}
                        <Card className="border-blue-100 shadow-sm">
                            <CardHeader className="bg-blue-50/30">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <CalendarDays className="w-6 h-6 text-blue-600" />
                                            4. 曜日別・自動差し替えメニュー設定
                                        </CardTitle>
                                        <CardDescription>
                                            一度設定すれば、曜日や平日に合わせてHPの画像を自動で切り替えます。
                                        </CardDescription>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={addMenuSlot} className="bg-white">
                                        <Plus className="w-4 h-4 mr-1" />
                                        パターンを追加
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                {scheduledMenus.length === 0 && (
                                    <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-xl">
                                        設定されたパターンはありません。「パターンを追加」から作成してください。
                                    </div>
                                )}

                                {scheduledMenus.map((menu, index) => (
                                    <div key={menu.id} className="relative p-6 rounded-xl border border-gray-100 bg-gray-50/50 space-y-4">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                                            onClick={() => removeMenuSlot(menu.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>

                                        <div className="grid md:grid-cols-5 gap-6">
                                            <div className="md:col-span-2">
                                                <div className="border-2 border-dashed rounded-lg h-32 flex flex-col items-center justify-center bg-white hover:bg-gray-50 transition cursor-pointer">
                                                    <Upload className="w-6 h-6 text-gray-300 mb-1" />
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase">メニュー画像</span>
                                                    <span className="text-[9px] text-blue-500 underline mt-1">画像をアップロード</span>
                                                </div>
                                            </div>

                                            <div className="md:col-span-3 space-y-4">
                                                <div className="grid gap-2">
                                                    <Label className="text-xs text-gray-500 font-bold uppercase tracking-wider">パターン名称</Label>
                                                    <Input
                                                        placeholder="例: 平日日替わり、水曜サービスなど"
                                                        value={menu.name}
                                                        onChange={(e) => {
                                                            const updated = [...scheduledMenus];
                                                            updated[index].name = e.target.value;
                                                            setScheduledMenus(updated);
                                                        }}
                                                        className="bg-white"
                                                    />
                                                </div>

                                                <div className="grid gap-2">
                                                    <div className="flex justify-between items-center">
                                                        <Label className="text-xs text-gray-500 font-bold uppercase tracking-wider">表示する曜日</Label>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 px-2 text-[10px] text-blue-600 hover:bg-blue-50"
                                                                onClick={() => setPreset(menu.id, 'weekdays')}
                                                            >
                                                                平日のみ
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 px-2 text-[10px] text-blue-600 hover:bg-blue-50"
                                                                onClick={() => setPreset(menu.id, 'weekends')}
                                                            >
                                                                土日のみ
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                                        {daysOfWeek.map((day) => (
                                                            <button
                                                                key={day.value}
                                                                onClick={() => toggleDay(menu.id, day.value)}
                                                                className={`w-9 h-9 rounded-full text-sm font-bold transition-all border ${menu.days.includes(day.value)
                                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                                    : 'bg-white text-gray-400 border-gray-200 hover:border-blue-300'
                                                                    }`}
                                                            >
                                                                {day.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <div className="bg-amber-50 rounded-lg p-4 flex gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                    <div className="text-[11px] text-amber-800 leading-relaxed">
                                        <span className="font-bold underline">自動切り替えのルール:</span><br />
                                        ・現在の日付の曜日に合う設定が自動的にHPに反映されます。<br />
                                        ・複数の項目が同じ曜日に設定されている場合、上の項目が優先されます。<br />
                                        ・「平日のみ」を選択すると月〜金、「土日のみ」を選択すると土日が自動でセットされます。
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 5. Instagram連携・素材収集 */}
                        <Card className="border-pink-200 bg-gradient-to-br from-white to-pink-50/30">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Instagram className="w-5 h-5 text-pink-600" />
                                    <CardTitle>5. Instagram連携半自動投稿システム・素材収集</CardTitle>
                                </div>
                                <CardDescription>
                                    インスタの規格に合わせた写真撮影が可能です。AIが投稿文を作成する際の参考画像になります。
                                </CardDescription>
                            </CardHeader>
                            <div className="relative">
                                {!hasFeature('instagram') && (
                                    <div className="absolute inset-0 z-10 backdrop-blur-[2px] bg-background/50 flex flex-col items-center justify-center text-center p-6 rounded-lg border border-dashed border-muted-foreground/20">
                                        <div className="p-3 bg-muted rounded-full mb-4">
                                            <Lock className="size-6 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-lg font-bold mb-2">Standardプラン以上で利用可能</h3>
                                        <p className="text-sm text-muted-foreground mb-6 max-w-[300px]">
                                            Instagram素材収集機能を使用するには、プランのアップグレードが必要です。
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <Button
                                                className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold shadow-lg hover:shadow-xl transition-all"
                                                onClick={() => router.push('/plans')}
                                            >
                                                プランを確認する
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="gap-2"
                                                onClick={() => refreshPlan()}
                                                disabled={planLoading}
                                            >
                                                <RefreshCcw className={`size-4 ${planLoading ? 'animate-spin' : ''}`} />
                                                プラン情報を更新
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                <CardContent className={!hasFeature('instagram') ? "opacity-50 pointer-events-none select-none filter blur-[1px]" : ""}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <Label className="text-sm font-bold flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-pink-500" />
                                                通常フィード用 (1:1 正方形)
                                            </Label>
                                            <div className="border-2 border-dashed border-pink-200 rounded-2xl h-48 flex flex-col items-center justify-center bg-white/50 group hover:border-pink-400 transition-colors">
                                                <Button
                                                    variant="outline"
                                                    className="mb-2 border-pink-200 text-pink-600 hover:bg-pink-50"
                                                    onClick={() => startCamera('insta_feed', 'insta-square')}
                                                >
                                                    <Camera className="w-4 h-4 mr-2" />
                                                    ガイド付カメラ起動
                                                </Button>
                                                <p className="text-[10px] text-pink-400">料理の接写や看板に最適</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <Label className="text-sm font-bold flex items-center gap-2">
                                                <Smartphone className="w-4 h-4 text-purple-500" />
                                                ストーリーズ・リール用 (9:16 縦長)
                                            </Label>
                                            <div className="border-2 border-dashed border-purple-200 rounded-2xl h-48 flex flex-col items-center justify-center bg-white/50 group hover:border-purple-400 transition-colors">
                                                <Button
                                                    variant="outline"
                                                    className="mb-2 border-purple-200 text-purple-600 hover:bg-purple-50"
                                                    onClick={() => startCamera('insta_story', 'insta-story')}
                                                >
                                                    <Camera className="w-4 h-4 mr-2" />
                                                    ガイド付カメラ起動
                                                </Button>
                                                <p className="text-[10px] text-purple-400">店内の雰囲気や動画素材に最適</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </div>
                        </Card>

                        <div className="flex justify-center pt-6 pb-20">
                            <Button size="lg" className="w-full max-w-md text-lg font-bold" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                                この内容で保存・更新する
                            </Button>
                        </div>
                    </div>

                    {/* Camera Overlay Modal (Unchanged from original structure, mostly) */}
                    {isCameraOpen && (
                        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
                            <div className="absolute top-4 left-0 right-0 px-6 flex justify-between items-center z-[110]">
                                <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                    <span className="text-white text-xs font-bold uppercase tracking-widest">Guide Mode: {cameraMode}</span>
                                </div>
                                <Button variant="ghost" className="text-white hover:bg-white/20 rounded-full" onClick={stopCamera}>
                                    <X className="w-8 h-8" />
                                </Button>
                            </div>

                            <div className="relative w-full h-full max-w-lg aspect-[9/16] bg-gray-900 overflow-hidden flex items-center justify-center">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="w-full h-full grid grid-cols-3 grid-rows-3 opacity-30">
                                        <div className="border-r border-b border-white/50"></div>
                                        <div className="border-r border-b border-white/50"></div>
                                        <div className="border-b border-white/50"></div>
                                        <div className="border-r border-b border-white/50"></div>
                                        <div className="border-r border-b border-white/50"></div>
                                        <div className="border-b border-white/50"></div>
                                        <div className="border-r border-white/50"></div>
                                        <div className="border-r border-white/50"></div>
                                        <div></div>
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center p-8">
                                        <div className={`border-2 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-300 w-full ${cameraMode === 'landscape' ? 'aspect-video' :
                                            cameraMode === 'insta-square' ? 'aspect-square' :
                                                cameraMode === 'insta-story' ? 'aspect-[9/16]' :
                                                    'aspect-[3/4]'
                                            }`}>
                                            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-white"></div>
                                            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-white"></div>
                                            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-white"></div>
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-white"></div>

                                            {cameraMode === 'insta-story' && (
                                                <div className="absolute inset-x-0 top-10 bottom-20 border-y border-white/20 pointer-events-none">
                                                    <div className="absolute top-0 left-2 text-[8px] text-white/40 uppercase">Safe Zone</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute bottom-32 left-0 right-0 text-center px-4">
                                    <p className="text-white text-xs font-bold bg-black/60 py-2 inline-block rounded-full px-6 backdrop-blur-sm border border-white/20">
                                        青い枠の中にバランスよく収めてください
                                    </p>
                                </div>
                            </div>

                            <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-6 z-[110] px-4">
                                <div className="grid grid-cols-4 gap-2 bg-black/40 backdrop-blur-md p-2 rounded-2xl border border-white/10">
                                    <Button
                                        size="sm"
                                        variant={cameraMode === 'landscape' ? 'default' : 'ghost'}
                                        className="text-[10px] h-12 flex-col gap-1 text-white"
                                        onClick={() => setCameraMode('landscape')}
                                    >
                                        <RefreshCcw className="w-3 h-3 rotate-90" />
                                        横
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={cameraMode === 'portrait' ? 'default' : 'ghost'}
                                        className="text-[10px] h-12 flex-col gap-1 text-white"
                                        onClick={() => setCameraMode('portrait')}
                                    >
                                        <RefreshCcw className="w-3 h-3" />
                                        縦
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={cameraMode === 'insta-square' ? 'default' : 'ghost'}
                                        className="text-[10px] h-12 flex-col gap-1 text-white"
                                        onClick={() => setCameraMode('insta-square')}
                                    >
                                        <Instagram className="w-3 h-3" />
                                        正方形
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={cameraMode === 'insta-story' ? 'default' : 'ghost'}
                                        className="text-[10px] h-12 flex-col gap-1 text-white"
                                        onClick={() => setCameraMode('insta-story')}
                                    >
                                        <Smartphone className="w-3 h-3" />
                                        9:16
                                    </Button>
                                </div>

                                <button
                                    className="w-20 h-20 rounded-full bg-white border-4 border-gray-400 p-1 active:scale-90 transition-transform flex-shrink-0"
                                    onClick={capturePhoto}
                                >
                                    <div className="w-full h-full rounded-full border-2 border-gray-900"></div>
                                </button>
                                <div className="w-[140px]"></div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

