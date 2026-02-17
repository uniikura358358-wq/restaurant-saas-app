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
import type { ReplyConfig } from "@/lib/review-handler";
import { AppSidebar } from "@/components/app-sidebar";

/** 設定データの型（DBカラムと対応） */
export interface ToneConfigData {
    store_name: string;
    store_area: string;
    ai_tone: string;
    default_signature: string;
    emoji_level: number;
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
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { user, getToken } = useAuth();
    const { hasFeature, loading: planLoading, refreshPlan } = usePlanGuard();
    const router = useRouter();

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

    // activeModelName related code removed

    // 設定を取得
    const fetchConfig = useCallback(async () => {
        try {
            const token = await getToken();
            if (!token) return; // Wait for token

            const response = await fetch("/api/settings/get", {
                cache: "no-store",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error("設定の取得に失敗しました");
            const data = await response.json();

            setConfig({
                store_name: data.store_name || "",
                store_area: data.store_area || "",
                ai_tone: data.ai_tone || "polite",
                default_signature: data.default_signature || "",
                emoji_level: data.emoji_level ?? 2,
                reply_config: data.reply_config ?? DEFAULT_CONFIG.reply_config,
                reply_templates: data.reply_templates || DEFAULT_CONFIG.reply_templates,
            });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "設定の取得に失敗しました");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

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

        try {
            setInstaPosting(true);
            const token = await getToken();
            if (!token) throw new Error("認証が必要です");

            const response = await fetch("/api/instagram/post", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    imageUrl: "https://images.unsplash.com/photo-1552566626-52f8b828add9", // 実機検証用の仮URL
                    caption: instaCaption
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "投稿に失敗しました");
            }

            toast.success("Instagram に投稿しました！");
            setInstaAnalysis(null);
            setInstaCaption("");
            setInstaFile(null);
            setInstaPreviewUrl(null);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setInstaPosting(false);
        }
    };

    // handleInstagramPost removed as it was unused and caused lint errors

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="flex h-screen max-h-screen">
                <AppSidebar activePage="store" />

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
                                    <TabsList className="w-full justify-start bg-muted/50 rounded-2xl p-1 h-auto gap-2">
                                        <TabsTrigger
                                            value="general"
                                            className="flex items-center gap-2 rounded-xl px-4 py-2 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:bg-muted/60 hover:text-foreground transition-all duration-200"
                                        >
                                            <Settings2 className="size-4" />
                                            基本設定
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="features"
                                            className="group relative overflow-hidden flex items-center gap-2 rounded-xl px-4 py-2 transition-all duration-500
                                            data-[state=active]:bg-[#84cc16] data-[state=active]:text-white data-[state=active]:shadow-md
                                            data-[state=inactive]:bg-background/80 data-[state=inactive]:ring-2 data-[state=inactive]:ring-indigo-400/50 data-[state=inactive]:shadow-[0_0_15px_rgba(99,102,241,0.25)]
                                            hover:data-[state=inactive]:ring-indigo-500 hover:data-[state=inactive]:shadow-[0_0_25px_rgba(99,102,241,0.4)]"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 data-[state=inactive]:opacity-100 transition-opacity" />
                                            <MessageSquareShare className="size-4 text-indigo-600 data-[state=active]:text-current z-10" />
                                            <span className="font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent data-[state=active]:text-current z-10">
                                                口コミ・SNS設定
                                            </span>
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

                                    <TabsContent value="features">
                                        <div className="space-y-8">
                                            <Card className="shadow-sm">
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2">
                                                        <Star className="size-5 text-yellow-500" />
                                                        Google 口コミ返信設定
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-8">
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

                                                    <div className="pt-6 border-t">
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <FileText className="size-5 text-blue-500" />
                                                                <h3 className="font-semibold text-base">署名設定</h3>
                                                            </div>
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
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="shadow-sm border-orange-200">
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2 text-orange-500">
                                                        <Instagram className="size-5" />
                                                        Instagram連携
                                                    </CardTitle>
                                                </CardHeader>
                                                <div className="relative">
                                                    {/* ロックオーバーレイ */}
                                                    {!hasFeature('instagram') && (
                                                        <div className="absolute inset-0 z-10 backdrop-blur-[2px] bg-background/50 flex flex-col items-center justify-center text-center p-6 rounded-lg border border-dashed border-muted-foreground/20">
                                                            <div className="p-3 bg-muted rounded-full mb-4">
                                                                <Lock className="size-6 text-muted-foreground" />
                                                            </div>
                                                            <h3 className="text-lg font-bold mb-2">Standardプラン以上で利用可能</h3>
                                                            <p className="text-sm text-muted-foreground mb-6 max-w-[300px]">
                                                                Instagram連携機能を使用するには、プランのアップグレードが必要です。
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
                                                                        <p className="text-sm font-bold">クリックして画像を選択</p>
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

                                            <Card className="shadow-sm">
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2 text-blue-600">
                                                        <Sparkles className="size-5" />
                                                        AI返信テスト
                                                    </CardTitle>
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
                                                        {aiTestLoading ? "生成中..." : "AI返信テスト"}
                                                    </Button>

                                                    {aiTestReply && (
                                                        <div className="space-y-2">
                                                            <Label className="text-xs text-muted-foreground">生成結果</Label>
                                                            <Textarea value={aiTestReply} readOnly className="min-h-[140px]" />
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
        </div>
    );
}
