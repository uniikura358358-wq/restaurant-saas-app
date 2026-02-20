"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePlanGuard } from "@/hooks/usePlanGuard";
// createClient import removed
import { toast } from "sonner";
import {
    Star,
    Loader2,
    Save,
    MessageCircle,
    FileText,
    Sparkles,
    Instagram,
    Settings2,
    MessageSquareShare,
    Lock,
    RefreshCcw,
    Building2,
    Clock,
    Users,
    Percent,
    CalendarDays,
    Camera,
    Smartphone,
    X,
    CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { useRef } from "react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { ReplyConfig } from "@/lib/review-handler";
import { AppSidebar } from "@/components/app-sidebar";

/** 設定データの型（DBカラムと対応） */
export interface ToneConfigData {
    store_name: string;
    store_area: string;
    ai_tone: string;
    default_signature: string;
    emoji_level: number;
    auto_reply_delay_minutes: number;
    reply_config: ReplyConfig;
    reply_templates: Record<string, { title: string; body: string }>;
}

/** 絵文字レベルのラベルマッピング */
const EMOJI_LEVEL_LABELS: Record<number, string> = {
    0: "なし",
    1: "控えめ",
    2: "普通",
    3: "多め",
};

/** 星ラベル（日本語） */
const STAR_LABELS: Record<string, string> = {
    "1": "星1（苦情・改善要望）",
    "2": "星2（不満足）",
    "3": "星3（普通）",
    "4": "星4（満足）",
    "5": "星5（絶賛）",
};

/** デフォルト設定値 */
const DEFAULT_CONFIG: ToneConfigData = {
    store_name: "",
    store_area: "",
    ai_tone: "polite",
    default_signature: "",
    emoji_level: 2,
    auto_reply_delay_minutes: 30,
    reply_config: {
        "1": "manual",
        "2": "manual",
        "3": "auto",
        "4": "auto",
        "5": "auto",
    },
    reply_templates: {
        "5": {
            title: "感動の共有と再来店の歓迎",
            body: "{お客様名}様、心のこもった温かいお言葉をいただき、スタッフ一同大変感激しております！✨😭 {店舗名}でのひとときを楽しんでいただけたようで、何より嬉しく思います😊 これからも{お客様名}様のご期待に添えるよう、精一杯おもてなしさせていただきます🌈 またのご来店を心よりお待ちしております！🎉"
        },
        "4": {
            title: "高評価への感謝とさらなる向上",
            body: "{お客様名}様、ご来店ならびに高評価をいただき、誠にありがとうございます😊✨ {店舗名}でのお食事にご満足いただけたようで光栄です！美味しい料理と心地よい空間を提供できるよう、これからも努力してまいります💪 もし何か気になった点がございましたら、ぜひ次回お聞かせください😌 またのお越しをお待ちしております！"
        },
        "3": {
            title: "来店への感謝と期待への対応",
            body: "{お客様名}様、この度は{店舗名}をご利用いただきありがとうございます🙇‍♂️ ご期待に沿う部分もあれば、至らぬ点もあったかと存じます。いただいた評価を真摯に受け止め、よりご満足いただけるお店づくりに励んでまいります😌 またのご来店を心よりお待ちしております。"
        },
        "2": {
            title: "不手際のお詫びと改善意欲",
            body: "{お客様名}様、この度はご期待に沿えず申し訳ございませんでした🙇‍♂️💦 せっかく足をお運びいただいたにも関わらず、残念な思いをさせてしまったことを深くお詫び申し上げます。いただいたご意見をスタッフ全員で共有し、早急に改善に努めます。貴重なご指摘をありがとうございました😔"
        },
        "1": {
            title: "深刻な謝罪と誠心誠意の対応",
            body: "{お客様名}様、この度は大変不快な思いをさせてしまい、誠に申し訳ございませんでした🙇‍♂️💦 {店舗名}を代表して深くお詫び申し上げます。今回のご指摘を重く受け止め、二度と同じ過ちを繰り返さぬよう、サービスの根本から見直しを行います⚠️ もしよろしければ、直接お話を伺う機会をいただけないでしょうか。重ねてお詫び申し上げます。"
        },
    },
};

export default function StoreSettingsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="size-8 animate-spin text-primary/50" />
            </div>
        }>
            <StoreSettingsContent />
        </Suspense>
    );
}

function StoreSettingsContent() {
    const [config, setConfig] = useState<ToneConfigData>(DEFAULT_CONFIG);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isBusinessConfigSaving, setIsBusinessConfigSaving] = useState(false);
    const { user, getToken } = useAuth();
    const { hasFeature, loading: planLoading, refreshPlan } = usePlanGuard();
    const router = useRouter();

    // --- Business Config States ---
    const [businessConfig, setBusinessConfig] = useState({
        is24h: false,
        hasBreakTime: true,
        lunchStart: '11:00',
        lunchEnd: '15:00',
        dinnerStart: '17:00',
        dinnerEnd: '23:00',
        regularHolidays: [] as number[],
        seats: 30,
        targetFoodCost: 35
    });

    /** textareaの参照（タグ挿入用） */
    const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
    /** Accordionの開閉状態 */
    const [accordionValue, setAccordionValue] = useState("");

    const [aiTestReviewText, setAiTestReviewText] = useState("");
    const [aiTestStarRating, setAiTestStarRating] = useState(5);
    const [aiTestCustomerName, setAiTestCustomerName] = useState("");
    const [aiTestLoading, setAiTestLoading] = useState(false);
    const [aiTestReply, setAiTestReply] = useState("");

    // --- Instagram States ---
    const [instaFile, setInstaFile] = useState<File | null>(null);
    const [instaAnalysis, setInstaAnalysis] = useState<any>(null);
    const [instaCaption, setInstaCaption] = useState("");
    const [instaAnalyzing, setInstaAnalyzing] = useState(false);
    const [instaPosting, setInstaPosting] = useState(false);
    const [instaPreviewUrl, setInstaPreviewUrl] = useState<string | null>(null);

    // --- Camera States ---
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraMode, setCameraMode] = useState<'portrait' | 'landscape' | 'insta-square' | 'insta-story'>('landscape');
    const [activeTargetField, setActiveTargetField] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // activeModelName related code removed

    // 設定を取得
    const fetchConfig = useCallback(async () => {
        try {
            const token = await getToken();
            if (!token) return; // Wait for token

            const { getDashboardStats } = await import("@/app/actions/dashboard");
            const [settingsRes, statsData] = await Promise.all([
                fetch("/api/settings/get", {
                    cache: "no-store",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                }),
                getDashboardStats(token)
            ]);

            if (!settingsRes.ok) throw new Error("設定の取得に失敗しました");
            const data = await settingsRes.json();
            setStats(statsData);

            setConfig({
                store_name: data.store_name || "",
                store_area: data.store_area || "",
                ai_tone: data.ai_tone || "polite",
                default_signature: data.default_signature || "",
                emoji_level: data.emoji_level ?? 2,
                auto_reply_delay_minutes: data.auto_reply_delay_minutes ?? 30,
                reply_config: data.reply_config ?? DEFAULT_CONFIG.reply_config,
                reply_templates: data.reply_templates || DEFAULT_CONFIG.reply_templates,
            });

            // 既存のビジネス設定があれば反映 (DBキー名の不一致に対応)
            const bConfig = data.businessConfig || data.business_config;
            if (bConfig) {
                setBusinessConfig(prev => ({ ...prev, ...bConfig }));
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "設定の取得に失敗しました");
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    // 基本情報の保存 (Business Config)
    const handleBusinessConfigSave = async () => {
        try {
            setIsBusinessConfigSaving(true);
            const token = await getToken();
            if (!token) throw new Error("認証が必要です");

            const response = await fetch("/api/settings/save", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                // 他の設定と混ざらないよう、business_config キーでラップ
                body: JSON.stringify({ business_config: businessConfig }),
            });

            if (!response.ok) throw new Error("基本情報の保存に失敗しました");
            toast.success("基本情報を保存しました。AI分析の精度が向上します。");
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsBusinessConfigSaving(false);
        }
    };

    // 設定を保存
    const handleSave = async () => {
        if (!config.store_name.trim()) {
            toast.warning("店舗名を入力してください");
            return;
        }

        try {
            setSaving(true);
            const token = await getToken();
            if (!token) throw new Error("認証が必要です");

            const response = await fetch("/api/settings/save", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(config),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "設定の保存に失敗しました");
            }
            toast.success("設定を保存しました");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "設定の保存に失敗しました");
        } finally {
            setSaving(false);
        }
    };

    const handleAiReplyTest = async () => {
        if (!aiTestReviewText.trim()) {
            toast.warning("口コミ本文を入力してください");
            return;
        }

        try {
            setAiTestLoading(true);
            setAiTestReply("");

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 45000); // 45秒 (Server Max 40s + Buffer)

            const token = await getToken();
            if (!token) throw new Error("認証が必要です");

            const res = await fetch("/api/generate-reply", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    reviewText: aiTestReviewText,
                    starRating: aiTestStarRating,
                    customerName: aiTestCustomerName || undefined,
                    config,
                }),
                signal: controller.signal,
            }).finally(() => clearTimeout(timeoutId));

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(typeof data?.error === "string" ? data.error : "AI返信の生成に失敗しました");
            }

            if (typeof data?.reply !== "string") {
                throw new Error("AI返信の生成に失敗しました");
            }

            setAiTestReply(data.reply);
            toast.success("AI返信を生成しました");
        } catch (error) {
            console.error("AI Generation Error:", error);
            toast.error("AIサーバーでエラーが発生しました。時間をおいて再度お試しください。");
        } finally {
            setAiTestLoading(false);
        }
    };

    const handleToggle = (star: keyof ReplyConfig, checked: boolean) => {
        setConfig((prev) => ({
            ...prev,
            reply_config: { ...prev.reply_config, [star]: checked ? "auto" : "manual" },
        }));
    };

    const insertTag = (star: string, tag: string) => {
        const textarea = textareaRefs.current[star];
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentBody = config.reply_templates[star]?.body || "";
        const nextBody = currentBody.substring(0, start) + tag + currentBody.substring(end);

        setConfig((prev) => ({
            ...prev,
            reply_templates: {
                ...prev.reply_templates,
                [star]: { ...prev.reply_templates[star], body: nextBody },
            },
        }));

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + tag.length, start + tag.length);
        }, 10);
    };

    const handleInstagramAnalyze = async () => {
        if (!instaFile) {
            toast.warning("画像を選択してください");
            return;
        }

        try {
            setInstaAnalyzing(true);

            const formData = new FormData();
            formData.append("image", instaFile);

            const token = await getToken();
            if (!token) throw new Error("認証に失敗しました。再ログインしてください。");

            const res = await fetch("/api/instagram/analyze", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData,
            });

            if (!res.ok) throw new Error("画像解析に失敗しました");
            const data = await res.json();
            setInstaAnalysis(data.result);

            // キャプション案の初期値セット
            setInstaCaption(`${data.result.dish_name}\n\n${data.result.visual_features}\n\n#${data.result.dish_name} #グルメ`);
            toast.success("画像を解析しました");
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setInstaAnalyzing(false);
        }
    };

    const handleInstagramPost = async () => {
        if (!instaCaption.trim()) {
            toast.warning("キャプションを入力してください");
            return;
        }

        if (!instaFile) {
            toast.warning("投稿する画像がありません");
            return;
        }

        setInstaPosting(true);
        try {
            // 1. 画像を Firebase Storage にアップロード
            const fileExt = instaFile.name.split('.').pop();
            const fileName = `${user?.uid}_${Date.now()}.${fileExt}`;
            const storageRef = ref(storage, `instagram_uploads/${user?.uid}/${fileName}`);

            toast.info("画像をアップロード中...");
            const uploadSnapshot = await uploadBytes(storageRef, instaFile);
            const downloadUrl = await getDownloadURL(uploadSnapshot.ref);

            // 2. Instagram API を呼び出し
            const token = await getToken();
            const response = await fetch("/api/instagram/post", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    caption: instaCaption,
                    imageUrl: downloadUrl,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "投稿に失敗しました");
            }

            toast.success("Instagram に投稿しました！");

            // 投稿成功後のリセット
            setInstaFile(null);
            setInstaPreviewUrl(null);
            setInstaAnalysis(null);
            setInstaCaption("");
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Instagram 投稿エラー");
        } finally {
            setInstaPosting(false);
        }
    };

    // --- Camera Functions ---
    const startCamera = async (targetField: string, initialMode: 'portrait' | 'landscape' | 'insta-square' | 'insta-story') => {
        setActiveTargetField(targetField);
        setCameraMode(initialMode);
        setIsCameraOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
            streamRef.current = stream;
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }, 100);
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
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], "captured-photo.jpg", { type: "image/jpeg" });
                        setInstaFile(file);
                        setInstaPreviewUrl(URL.createObjectURL(blob));
                        toast.success("写真をキャプチャしました！");
                    }
                }, 'image/jpeg');
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

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="flex h-screen max-h-screen">
                <AppSidebar activePage="store" stats={stats} user={user} />

                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
                        <header className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <h1 className="text-2xl font-bold">店舗設定</h1>
                            </div>
                        </header>

                        {loading ? (
                            <div className="flex items-center justify-center py-24">
                                <Loader2 className="size-8 animate-spin text-primary/50" />
                            </div>
                        ) : (
                            <div className="space-y-6 pb-24">
                                <Tabs defaultValue="general">
                                    <TabsList className="w-full justify-start bg-muted/30 border-2 border-primary/20 rounded-2xl p-1.5 h-auto gap-1.5 mb-8 shadow-sm">
                                        <TabsTrigger
                                            value="general"
                                            className="rounded-xl px-4 py-2 gap-2 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-primary/50 transition-all duration-200 font-medium"
                                        >
                                            <Settings2 className="size-4" />
                                            <span>共通設定</span>
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="reviews"
                                            className="rounded-xl px-4 py-2 gap-2 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-primary/50 transition-all duration-200 font-medium"
                                        >
                                            <Star className="size-4 text-yellow-500" />
                                            <span>Google口コミ</span>
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="instagram"
                                            className="rounded-xl px-4 py-2 gap-2 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-primary/50 transition-all duration-200 font-medium"
                                        >
                                            <Instagram className="size-4 text-orange-500" />
                                            <span>Instagram</span>
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="business"
                                            className="rounded-xl px-4 py-2 gap-2 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-primary/50 transition-all duration-200 font-medium"
                                        >
                                            <Building2 className="size-4 text-emerald-500" />
                                            <span>基本情報</span>
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="pos"
                                            className="rounded-xl px-4 py-2 gap-2 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-primary/50 transition-all duration-200 font-medium"
                                        >
                                            <RefreshCcw className="size-4 text-indigo-500" />
                                            <span>POS連携</span>
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="testing"
                                            className="rounded-xl px-4 py-2 gap-2 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-primary/50 transition-all duration-200 font-medium"
                                        >
                                            <Sparkles className="size-4 text-blue-500" />
                                            <span>動作確認</span>
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="general">
                                        <div className="space-y-8">
                                            <Card className="shadow-sm">
                                                <CardHeader className="space-y-1">
                                                    <CardTitle className="flex items-center gap-2">
                                                        <MessageCircle className="size-5 text-primary" />
                                                        店舗情報
                                                    </CardTitle>
                                                    <div className="text-sm text-muted-foreground">
                                                        お店の名称・所在地は、返信文やハッシュタグ生成にも活用されます。
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-8">
                                                    <div className="space-y-3">
                                                        <Label htmlFor="store_name" className="text-foreground">店舗名 *</Label>
                                                        <Input
                                                            id="store_name"
                                                            value={config.store_name}
                                                            onChange={(e) => setConfig({ ...config, store_name: e.target.value })}
                                                            className="max-w-md h-11"
                                                        />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <Label htmlFor="store_area" className="text-foreground">店舗所在地（エリア）</Label>
                                                        <div className="text-xs text-muted-foreground">
                                                            例: 銀座 / 新宿 / 横浜駅前 など
                                                        </div>
                                                        <Input
                                                            id="store_area"
                                                            value={config.store_area}
                                                            onChange={(e) => setConfig({ ...config, store_area: e.target.value })}
                                                            placeholder="銀座、新宿、横浜駅前など"
                                                            className="max-w-md h-11"
                                                        />
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="shadow-sm">
                                                <CardHeader className="space-y-1">
                                                    <CardTitle className="flex items-center gap-2">
                                                        <Sparkles className="size-5 text-primary" />
                                                        表現スタイル
                                                    </CardTitle>
                                                    <div className="text-sm text-muted-foreground">
                                                        文章の雰囲気を統一して、ブランドの印象を整えます。
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-8">
                                                    <div className="space-y-3">
                                                        <Label htmlFor="ai_tone" className="text-foreground">AIの回答トーン *</Label>
                                                        <Select
                                                            value={config.ai_tone}
                                                            onValueChange={(v) => setConfig({ ...config, ai_tone: v })}
                                                        >
                                                            <SelectTrigger className="max-w-md h-11">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="polite">誠実・丁寧</SelectItem>
                                                                <SelectItem value="friendly">フレンドリー</SelectItem>
                                                                <SelectItem value="energetic">元気・活気</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <Label className="text-foreground">絵文字レベル: {EMOJI_LEVEL_LABELS[config.emoji_level]}</Label>
                                                        <Slider
                                                            value={[config.emoji_level]}
                                                            onValueChange={(v) => setConfig({ ...config, emoji_level: v[0] })}
                                                            max={3}
                                                            step={1}
                                                            className="max-w-md"
                                                        />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="reviews">
                                        <div className="space-y-8">
                                            <Card className="shadow-sm border-blue-100 bg-blue-50/10">
                                                <CardHeader className="flex flex-row items-center justify-between">
                                                    <div>
                                                        <CardTitle className="flex items-center gap-2">
                                                            <Star className="size-5 text-yellow-500" />
                                                            自動返信の対象設定
                                                        </CardTitle>
                                                        <div className="text-sm text-muted-foreground mt-1">
                                                            特定の評価（星数）に対して自動返信を有効にします。
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div className="bg-white/50 border border-blue-200 rounded-lg p-3 mb-4 text-[11px] text-blue-800 leading-relaxed">
                                                        <p className="font-bold flex items-center gap-1 mb-1">
                                                            <Sparkles className="size-3" />
                                                            Google 審査準拠のセーフティガード
                                                        </p>
                                                        AIによる自動返信は、お客様とのトラブルを避けるため、高評価（星3以上）に限定することを推奨しています。星2以下の低評価については、店主様による内容の最終確認を推奨するため、デフォルトでは「手動」に設定されています。
                                                    </div>
                                                    <div className="divide-y">
                                                        {(["5", "4", "3", "2", "1"] as const).map((star) => (
                                                            <div key={star} className="flex items-center justify-between py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex">
                                                                        {Array.from({ length: Number(star) }).map((_, i) => (
                                                                            <Star key={i} className="size-4 text-yellow-400 fill-yellow-400" />
                                                                        ))}
                                                                    </div>
                                                                    <div className="text-sm font-medium">{STAR_LABELS[star]}</div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-muted-foreground">{config.reply_config[star] === "auto" ? "自動" : "手動"}</span>
                                                                    <Switch
                                                                        checked={config.reply_config[star] === "auto"}
                                                                        onCheckedChange={(c) => handleToggle(star, c)}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="shadow-sm border-primary/20 bg-primary/5">
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2 text-blue-600">
                                                        <RefreshCcw className="size-5" />
                                                        自動返信のタイムラグ設定
                                                    </CardTitle>
                                                    <div className="text-sm text-muted-foreground">
                                                        口コミ投稿からAIが返信するまでの待機時間を設定します。即座に返信せず時間を置くことで、より自然な対応になります。
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-6">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <Label className="text-base font-bold">待機時間: {
                                                                config.auto_reply_delay_minutes >= 60
                                                                    ? `${Math.floor(config.auto_reply_delay_minutes / 60)}時間`
                                                                    : `${config.auto_reply_delay_minutes}分`
                                                            }</Label>
                                                            <div className="flex gap-2">
                                                                {[10, 30, 60, 180, 1440].map((mins) => (
                                                                    <Button
                                                                        key={mins}
                                                                        variant={config.auto_reply_delay_minutes === mins ? "default" : "outline"}
                                                                        size="sm"
                                                                        className="h-8 text-[11px] px-2"
                                                                        onClick={() => setConfig({ ...config, auto_reply_delay_minutes: mins })}
                                                                    >
                                                                        {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                                                                    </Button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <Slider
                                                            value={[config.auto_reply_delay_minutes]}
                                                            onValueChange={(v) => setConfig({ ...config, auto_reply_delay_minutes: v[0] })}
                                                            max={1440}
                                                            step={10}
                                                            className="py-4"
                                                        />
                                                        <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                                                            <span>短い（10分）</span>
                                                            <span>長い（24時間）</span>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="shadow-sm">
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2">
                                                        <FileText className="size-5 text-primary" />
                                                        返信テンプレート設定
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <Accordion
                                                        type="single"
                                                        collapsible
                                                        className="w-full"
                                                        value={accordionValue}
                                                        onValueChange={(value) => setAccordionValue(value)}
                                                    >
                                                        {(["5", "4", "3", "2", "1"] as const).map((star) => (
                                                            <AccordionItem key={star} value={star} className="border-b">
                                                                <AccordionTrigger className="hover:no-underline py-4 w-full text-left">
                                                                    <div className="flex items-center gap-3 w-full">
                                                                        <div className="flex items-center gap-1 min-w-[100px]">
                                                                            {Array.from({ length: Number(star) }).map((_, i) => (
                                                                                <Star key={i} className="size-4 text-yellow-500 fill-yellow-500" />
                                                                            ))}
                                                                            <span className="text-sm font-medium ml-1">星{star}</span>
                                                                        </div>
                                                                        <span className="text-sm text-muted-foreground font-normal">
                                                                            {config.reply_templates[star]?.title || "未設定"}
                                                                        </span>
                                                                    </div>
                                                                </AccordionTrigger>
                                                                <AccordionContent className="space-y-4 pt-4 pb-6 px-1">
                                                                    <div className="space-y-2">
                                                                        <Label className="text-xs text-muted-foreground">テンプレートタイトル</Label>
                                                                        <Input
                                                                            value={config.reply_templates[star]?.title || ""}
                                                                            onChange={(e) => setConfig(prev => ({
                                                                                ...prev,
                                                                                reply_templates: {
                                                                                    ...prev.reply_templates,
                                                                                    [star]: { ...prev.reply_templates[star], title: e.target.value }
                                                                                }
                                                                            }))}
                                                                            placeholder="例：絶賛への感謝"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label className="text-xs text-muted-foreground">本文（タグをクリックして挿入）</Label>
                                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                                            {["お客様名", "店舗名", "評価"].map(tag => (
                                                                                <Button
                                                                                    key={tag}
                                                                                    type="button"
                                                                                    variant="secondary"
                                                                                    size="sm"
                                                                                    className="h-7 text-[11px] px-2"
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        insertTag(star, `{${tag}}`);
                                                                                    }}
                                                                                >
                                                                                    <Sparkles className="size-3 mr-1" />
                                                                                    {tag}
                                                                                </Button>
                                                                            ))}
                                                                        </div>
                                                                        <Textarea
                                                                            ref={el => { textareaRefs.current[star] = el }}
                                                                            value={config.reply_templates[star]?.body || ""}
                                                                            onChange={(e) => setConfig(prev => ({
                                                                                ...prev,
                                                                                reply_templates: {
                                                                                    ...prev.reply_templates,
                                                                                    [star]: { ...prev.reply_templates[star], body: e.target.value }
                                                                                }
                                                                            }))}
                                                                            rows={6}
                                                                            className="resize-none focus-visible:ring-blue-500"
                                                                            placeholder="ここに返信文を入力してください..."
                                                                        />
                                                                    </div>
                                                                </AccordionContent>
                                                            </AccordionItem>
                                                        ))}
                                                    </Accordion>
                                                </CardContent>
                                            </Card>

                                            <Card className="shadow-sm">
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2">
                                                        <FileText className="size-5 text-blue-500" />
                                                        署名設定
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-3">
                                                    <Label htmlFor="default_signature" className="text-foreground">署名（任意）</Label>
                                                    <div className="text-xs text-muted-foreground">
                                                        Google口コミ返信の末尾に付けたい場合に設定してください。
                                                    </div>
                                                    <Input
                                                        id="default_signature"
                                                        value={config.default_signature}
                                                        onChange={(e) => setConfig({ ...config, default_signature: e.target.value })}
                                                        placeholder="例: 〇〇店 店長"
                                                        className="max-w-md h-11"
                                                    />
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="instagram">
                                        <div className="space-y-8">
                                            <Card className="shadow-sm border-orange-200">
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2 text-orange-500">
                                                        <Instagram className="size-5" />
                                                        Instagram連携
                                                    </CardTitle>
                                                </CardHeader>
                                                <div className="relative">
                                                    {!hasFeature('instagram') && (
                                                        <div className="absolute inset-0 z-10 backdrop-blur-[2px] bg-background/50 flex flex-col items-center justify-center text-center p-6 rounded-lg border border-dashed border-muted-foreground/20">
                                                            <div className="p-3 bg-muted rounded-full mb-4">
                                                                <Lock className="size-6 text-muted-foreground" />
                                                            </div>
                                                            <h3 className="text-lg font-bold mb-2">Proプラン以上で利用可能</h3>
                                                            <p className="text-sm text-muted-foreground mb-6 max-w-[300px]">
                                                                Instagram連携・素材収集機能を使用するには、プランのアップグレードが必要です。
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

                                                    <CardContent className="space-y-6 pt-4">
                                                        <div className="space-y-4">
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <Button
                                                                    variant="outline"
                                                                    className="h-16 flex flex-col items-center gap-1 border-pink-200 text-pink-600 hover:bg-pink-50 hover:border-pink-300 transition-all rounded-xl"
                                                                    onClick={() => startCamera('insta_feed', 'insta-square')}
                                                                >
                                                                    <Camera className="size-5" />
                                                                    <span className="text-[10px] font-bold">フィード用ガイド</span>
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    className="h-16 flex flex-col items-center gap-1 border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 transition-all rounded-xl"
                                                                    onClick={() => startCamera('insta_story', 'insta-story')}
                                                                >
                                                                    <Smartphone className="size-5" />
                                                                    <span className="text-[10px] font-bold">ストーリー用ガイド</span>
                                                                </Button>
                                                            </div>

                                                            <div className="group flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-2xl p-8 hover:bg-muted/30 transition-all cursor-pointer relative overflow-hidden"
                                                                onClick={() => document.getElementById('insta-upload')?.click()}
                                                            >
                                                                {instaPreviewUrl ? (
                                                                    <div className="relative">
                                                                        <img src={instaPreviewUrl} alt="Preview" className="max-h-64 rounded-xl shadow-lg transition-transform group-hover:scale-[1.02]" />
                                                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                                                                            <RefreshCcw className="size-8 text-white animate-pulse" />
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col items-center gap-2 text-muted-foreground animate-in fade-in zoom-in duration-300">
                                                                        <div className="p-4 bg-muted rounded-full mb-2 group-hover:bg-primary/10 transition-colors">
                                                                            <Instagram className="size-10 group-hover:text-primary transition-colors" />
                                                                        </div>
                                                                        <p className="text-sm font-bold">または画像を選択</p>
                                                                        <p className="text-[10px] opacity-70">JPG, PNG (最大5MB)</p>
                                                                    </div>
                                                                )}
                                                                <input
                                                                    id="insta-upload"
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) {
                                                                            setInstaFile(file);
                                                                            setInstaPreviewUrl(URL.createObjectURL(file));
                                                                        }
                                                                    }}
                                                                />
                                                            </div>

                                                            <Button
                                                                className="w-full h-11 bg-primary shadow-md hover:shadow-lg transition-all"
                                                                onClick={handleInstagramAnalyze}
                                                                disabled={!instaFile || instaAnalyzing}
                                                            >
                                                                {instaAnalyzing ? <Loader2 className="size-4 animate-spin mr-2" /> : <Sparkles className="size-4 mr-2" />}
                                                                {instaAnalyzing ? "解析中..." : "AIで解析・キャプション作成"}
                                                            </Button>

                                                            {instaAnalysis && (
                                                                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                                                    <div className="space-y-2">
                                                                        <div className="flex items-center justify-between">
                                                                            <Label className="text-xs font-bold text-muted-foreground">キャプション案</Label>
                                                                            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">AI生成済</span>
                                                                        </div>
                                                                        <Textarea
                                                                            value={instaCaption}
                                                                            onChange={(e) => setInstaCaption(e.target.value)}
                                                                            className="min-h-[160px] text-sm leading-relaxed focus:ring-primary/20"
                                                                        />
                                                                    </div>
                                                                    <Button
                                                                        className="w-full bg-gradient-to-r from-purple-500 to-orange-500 text-white font-bold h-12 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                                                                        onClick={handleInstagramPost}
                                                                        disabled={instaPosting}
                                                                    >
                                                                        {instaPosting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Instagram className="size-4 mr-2" />}
                                                                        {instaPosting ? "投稿中..." : "Instagram に今すぐ投稿"}
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                </div>
                                            </Card>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="pos">
                                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <Card className="shadow-md border-indigo-100 bg-indigo-50/5 overflow-hidden">
                                                <CardHeader className="bg-indigo-50/30 border-b border-indigo-100/50">
                                                    <CardTitle className="flex items-center gap-2 text-indigo-700">
                                                        <RefreshCcw className="size-5" />
                                                        POSレジ外部連携設定
                                                    </CardTitle>
                                                    <div className="text-sm text-indigo-600/80 mt-1">
                                                        AirレジやSquareと連携することで、売上データを自動取得しAI分析を強化します。
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="pt-8 space-y-8">
                                                    {/* Airレジ連携 */}
                                                    <div className="flex items-center justify-between p-6 bg-white rounded-2xl border-2 border-indigo-50 shadow-sm hover:border-indigo-100 transition-all group">
                                                        <div className="flex items-center gap-4">
                                                            <div className="size-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold group-hover:scale-110 transition-transform">
                                                                Air
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-gray-800">Airレジ（リクルート）</h4>
                                                                <p className="text-xs text-gray-500">売上、客数、客単価データを同期します。</p>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            className="border-blue-200 text-blue-600 hover:bg-blue-50 font-bold"
                                                            onClick={() => toast.info("Airレジ連携機能を準備中です")}
                                                        >
                                                            連携を開始
                                                        </Button>
                                                    </div>

                                                    {/* Square連携 */}
                                                    <div className="flex items-center justify-between p-6 bg-white rounded-2xl border-2 border-indigo-50 shadow-sm hover:border-indigo-100 transition-all group">
                                                        <div className="flex items-center gap-4">
                                                            <div className="size-12 rounded-xl bg-gray-900 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                                                <Smartphone className="size-6" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-gray-800">Square</h4>
                                                                <p className="text-xs text-gray-500">決済データと在庫情報を同期します。</p>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            className="border-gray-300 text-gray-700 hover:bg-gray-50 font-bold"
                                                            onClick={() => toast.info("Square連携機能を準備中です")}
                                                        >
                                                            連携を開始
                                                        </Button>
                                                    </div>

                                                    <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl flex gap-4">
                                                        <div className="bg-white p-3 rounded-full shadow-sm self-start">
                                                            <Lock className="size-5 text-amber-500" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <h4 className="text-sm font-bold text-amber-900">セキュリティ・機密情報の取り扱い</h4>
                                                            <p className="text-xs text-amber-800/70 leading-relaxed">
                                                                外部サービスとの連携はOAuth2.0による安全な認証方式を採用しています。
                                                                お客様のパスワードを当サービスが保存することはありません。
                                                            </p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="business">
                                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <Card className="shadow-md border-emerald-100 bg-emerald-50/5 overflow-hidden">
                                                <CardHeader className="bg-emerald-50/30 border-b border-emerald-100/50">
                                                    <CardTitle className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2 text-emerald-700">
                                                            <Building2 className="size-5" />
                                                            店舗の基本スペック設定
                                                        </div>
                                                        <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 shadow-sm transition-all hover:bg-emerald-100">
                                                            <Label htmlFor="24h-mode" className="text-[11px] font-bold text-emerald-700 cursor-pointer whitespace-nowrap">24時間営業</Label>
                                                            <Switch
                                                                id="24h-mode"
                                                                checked={businessConfig.is24h}
                                                                onCheckedChange={(c) => setBusinessConfig({ ...businessConfig, is24h: c, hasBreakTime: !c })}
                                                            />
                                                        </div>
                                                    </CardTitle>
                                                    <div className="text-sm text-emerald-600/80 mt-1">
                                                        AIがお店の経営状態を正確に分析するために必要な情報です。
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="pt-8 space-y-10">
                                                    {/* 営業時間セクション */}
                                                    <div className="grid gap-6">
                                                        <div className="flex items-center gap-2 border-b pb-2">
                                                            <Clock className="size-4 text-emerald-500" />
                                                            <h3 className="font-bold text-gray-700">標準的な営業時間</h3>
                                                        </div>

                                                        {!businessConfig.is24h ? (
                                                            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                                                <div className="flex items-center justify-between bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                                                    <div className="space-y-0.5">
                                                                        <Label className="text-sm font-bold text-gray-700">中休み（アイドルタイム）あり</Label>
                                                                        <p className="text-[10px] text-gray-400">ランチとディナーで営業を分ける場合にONにします。</p>
                                                                    </div>
                                                                    <Switch
                                                                        checked={businessConfig.hasBreakTime}
                                                                        onCheckedChange={(c) => setBusinessConfig({ ...businessConfig, hasBreakTime: c })}
                                                                    />
                                                                </div>

                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-2">
                                                                    <div className="space-y-3 p-4 bg-orange-50/20 rounded-xl border border-orange-100/50">
                                                                        <Label className="text-xs font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1">
                                                                            <Sparkles className="size-3" /> {businessConfig.hasBreakTime ? 'ランチ営業' : '開店時間'}
                                                                        </Label>
                                                                        <div className="flex items-center gap-3">
                                                                            <Input
                                                                                type="time"
                                                                                value={businessConfig.lunchStart}
                                                                                onChange={(e) => setBusinessConfig({ ...businessConfig, lunchStart: e.target.value })}
                                                                                className="h-12 text-lg font-medium bg-white"
                                                                            />
                                                                            <span className="text-gray-400">〜</span>
                                                                            <Input
                                                                                type="time"
                                                                                value={businessConfig.lunchEnd}
                                                                                onChange={(e) => setBusinessConfig({ ...businessConfig, lunchEnd: e.target.value })}
                                                                                className="h-12 text-lg font-medium bg-white"
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {businessConfig.hasBreakTime && (
                                                                        <div className="space-y-3 p-4 bg-indigo-50/20 rounded-xl border border-indigo-100/50 animate-in zoom-in-95 duration-200">
                                                                            <Label className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                                                                                <Sparkles className="size-3" /> ディナー営業
                                                                            </Label>
                                                                            <div className="flex items-center gap-3">
                                                                                <Input
                                                                                    type="time"
                                                                                    value={businessConfig.dinnerStart}
                                                                                    onChange={(e) => setBusinessConfig({ ...businessConfig, dinnerStart: e.target.value })}
                                                                                    className="h-12 text-lg font-medium bg-white"
                                                                                />
                                                                                <span className="text-gray-400">〜</span>
                                                                                <Input
                                                                                    type="time"
                                                                                    value={businessConfig.dinnerEnd}
                                                                                    onChange={(e) => setBusinessConfig({ ...businessConfig, dinnerEnd: e.target.value })}
                                                                                    className="h-12 text-lg font-medium bg-white"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="bg-emerald-50/50 border-2 border-dashed border-emerald-200 rounded-2xl p-10 text-center animate-in zoom-in-95 duration-300">
                                                                <Sparkles className="size-10 text-emerald-400 mx-auto mb-3" />
                                                                <p className="text-emerald-700 text-lg font-bold">24時間営業モード</p>
                                                                <p className="text-sm text-emerald-600/70 mt-1">AIは全時間帯をピークとして、切れ目なくデータを集計・分析します。</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* 定休日セクション */}
                                                    <div className="grid gap-4">
                                                        <div className="flex items-center gap-2 border-b pb-2">
                                                            <CalendarDays className="size-4 text-emerald-500" />
                                                            <h3 className="font-bold text-gray-700">定休日（AI分析除外日）</h3>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 pl-2">
                                                            {[
                                                                { label: '日', value: 0 },
                                                                { label: '月', value: 1 },
                                                                { label: '火', value: 2 },
                                                                { label: '水', value: 3 },
                                                                { label: '木', value: 4 },
                                                                { label: '金', value: 5 },
                                                                { label: '土', value: 6 },
                                                            ].map((day) => (
                                                                <button
                                                                    key={day.value}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const holidays = businessConfig.regularHolidays.includes(day.value)
                                                                            ? businessConfig.regularHolidays.filter(d => d !== day.value)
                                                                            : [...businessConfig.regularHolidays, day.value];
                                                                        setBusinessConfig({ ...businessConfig, regularHolidays: holidays });
                                                                    }}
                                                                    className={`w-12 h-12 rounded-xl text-sm font-bold transition-all border-2 ${businessConfig.regularHolidays.includes(day.value)
                                                                        ? 'bg-red-500 text-white border-red-500 shadow-md transform scale-105'
                                                                        : 'bg-white text-gray-400 border-gray-100 hover:border-emerald-200'
                                                                        }`}
                                                                >
                                                                    {day.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <p className="text-[11px] text-gray-400 pl-2">※定休日に売上があった場合、AIが「イレギュラー営業」として特別分析を行います。</p>
                                                    </div>

                                                    {/* キャパシティ・目標セクション */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                        <div className="space-y-4">
                                                            <div className="flex items-center gap-2 border-b pb-2">
                                                                <Users className="size-4 text-emerald-500" />
                                                                <h3 className="font-bold text-gray-700">客席数（キャパシティ）</h3>
                                                            </div>
                                                            <div className="pl-2 space-y-2">
                                                                <div className="flex items-end gap-2">
                                                                    <Input
                                                                        type="number"
                                                                        value={businessConfig.seats}
                                                                        onChange={(e) => setBusinessConfig({ ...businessConfig, seats: Number(e.target.value) })}
                                                                        placeholder="30"
                                                                        className="h-12 text-2xl font-bold w-32"
                                                                    />
                                                                    <span className="text-gray-500 font-medium pb-2">席</span>
                                                                </div>
                                                                <p className="text-[11px] text-gray-400">※満席時や回転率の計算に使用します。</p>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <div className="flex items-center gap-2 border-b pb-2">
                                                                <Percent className="size-4 text-emerald-500" />
                                                                <h3 className="font-bold text-gray-700">目標原価率 (Food Cost)</h3>
                                                            </div>
                                                            <div className="pl-2 space-y-2">
                                                                <div className="flex items-end gap-2">
                                                                    <Input
                                                                        type="number"
                                                                        value={businessConfig.targetFoodCost}
                                                                        onChange={(e) => setBusinessConfig({ ...businessConfig, targetFoodCost: Number(e.target.value) })}
                                                                        placeholder="35"
                                                                        className="h-12 text-2xl font-bold w-32"
                                                                    />
                                                                    <span className="text-gray-500 font-medium pb-2">%</span>
                                                                </div>
                                                                <p className="text-[11px] text-gray-400">※AIが仕入れ金額の異常を検知する基準になります。</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-4">
                                                        <div className="bg-white p-3 rounded-full shadow-sm self-start">
                                                            <Sparkles className="size-5 text-blue-500" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <h4 className="text-sm font-bold text-blue-900">AIからのアドバイス準備</h4>
                                                            <p className="text-xs text-blue-800/70 leading-relaxed">
                                                                これらの基本情報を入力することで、AIはあなたの店舗を「一人の経営パートナー」として深く理解します。
                                                                売上目標の達成状況や、原価の無駄を自動で見つけ出し、チャットで報告できるようになります。
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-center pt-4">
                                                        <Button
                                                            size="lg"
                                                            className="w-full max-w-xs bg-emerald-600 hover:bg-emerald-700 font-bold gap-2"
                                                            onClick={handleBusinessConfigSave}
                                                            disabled={isBusinessConfigSaving}
                                                        >
                                                            {isBusinessConfigSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                                                            店舗情報を確定する
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="testing">
                                        <div className="space-y-8">
                                            <Card className="shadow-sm">
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2 text-blue-600">
                                                        <Sparkles className="size-5" />
                                                        AI返信テスト
                                                    </CardTitle>
                                                    <div className="text-sm text-muted-foreground">
                                                        現在の設定（トーン、絵文字、テンプレート）でAIがどのような回答を作成するか試せます。
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-6">
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-muted-foreground">星</Label>
                                                            <Select
                                                                value={String(aiTestStarRating)}
                                                                onValueChange={(v) => setAiTestStarRating(Number(v))}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="5">星5</SelectItem>
                                                                    <SelectItem value="4">星4</SelectItem>
                                                                    <SelectItem value="3">星3</SelectItem>
                                                                    <SelectItem value="2">星2</SelectItem>
                                                                    <SelectItem value="1">星1</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-1 sm:col-span-2">
                                                            <Label className="text-xs text-muted-foreground">お客様名（任意）</Label>
                                                            <Input
                                                                className="h-11"
                                                                value={aiTestCustomerName}
                                                                onChange={(e) => setAiTestCustomerName(e.target.value)}
                                                                placeholder="例: 山田太郎"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-muted-foreground">口コミ本文</Label>
                                                        <Textarea
                                                            value={aiTestReviewText}
                                                            onChange={(e) => setAiTestReviewText(e.target.value)}
                                                            placeholder="例: 料理がとても美味しかったです。また来ます。"
                                                            className="min-h-[140px]"
                                                        />
                                                    </div>

                                                    <Button
                                                        type="button"
                                                        onClick={handleAiReplyTest}
                                                        disabled={aiTestLoading}
                                                        className="w-full"
                                                    >
                                                        {aiTestLoading ? "生成中..." : "AI返信テストを実行"}
                                                    </Button>

                                                    {aiTestReply && (
                                                        <div className="space-y-2 animate-in fade-in duration-500">
                                                            <Label className="text-xs text-muted-foreground font-bold">生成された返信文（プレビュー）</Label>
                                                            <Textarea value={aiTestReply} readOnly className="min-h-[140px] bg-muted/30 border-dashed" />
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </TabsContent>
                                </Tabs>

                                <div className="sticky bottom-0 -mx-4 z-50 border-t bg-background/70 px-4 py-3 shadow-[0_-12px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
                                    <div className="flex justify-end">
                                        <Button onClick={handleSave} disabled={saving} className="gap-2 min-w-[140px]">
                                            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                                            {saving ? "保存中..." : "設定を保存"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Camera Overlay Modal */}
            {isCameraOpen && (
                <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
                    <div className="absolute top-4 left-0 right-0 px-6 flex justify-between items-center z-[110]">
                        <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-white text-[10px] font-black uppercase tracking-widest leading-none">
                                Guide: {cameraMode === 'insta-square' ? 'Square' : 'Stories'}
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20 rounded-full"
                            onClick={stopCamera}
                        >
                            <X className="size-8" />
                        </Button>
                    </div>

                    <div className="relative w-full h-full max-w-lg flex items-center justify-center bg-gray-950">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 pointer-events-none">
                            {/* Grid Lines */}
                            <div className="w-full h-full grid grid-cols-3 grid-rows-3 opacity-20">
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

                            {/* Main Guide Frame */}
                            <div className="absolute inset-0 flex items-center justify-center p-8">
                                <div className={`border-2 border-primary shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)] transition-all duration-300 w-full ${cameraMode === 'insta-square' ? 'aspect-square' :
                                    cameraMode === 'insta-story' ? 'aspect-[9/16]' :
                                        'aspect-[3/4]'
                                    }`}>
                                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white"></div>
                                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white"></div>
                                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white"></div>
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-12 left-0 right-0 flex justify-center items-center z-[110]">
                        <Button
                            size="icon"
                            className="size-20 rounded-full bg-white hover:bg-gray-100 shadow-2xl border-4 border-gray-200 active:scale-90 transition-all p-0"
                            onClick={capturePhoto}
                        >
                            <div className="size-16 rounded-full border-2 border-gray-300"></div>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
