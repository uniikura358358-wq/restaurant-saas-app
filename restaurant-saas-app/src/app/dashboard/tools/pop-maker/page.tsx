"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePlanGuard } from "@/hooks/usePlanGuard";
import { AppSidebar } from "@/components/app-sidebar";
import { getPublicStorageUrl } from "@/lib/storage-utils";
import {
    Sparkles,
    Printer,
    Download,
    Layout as LayoutIcon,
    Type,
    Palette,
    Check,
    Loader2,
    Image as ImageIcon,
    Lock,
    Plus,
    Minus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { generatePopCopy } from "@/app/actions/tools";

type PopCategory = "japanese" | "western" | "chinese" | "others";

export default function PopMakerPage() {
    const { user, loading: authLoading } = useAuth();
    const { hasFeature, planName } = usePlanGuard();
    const [generating, setGenerating] = useState(false);

    // UI States
    const [category, setCategory] = useState<PopCategory>("japanese");
    const [sizeFilter, setSizeFilter] = useState<"all" | "large" | "a4">("all");
    const [style, setStyle] = useState<string>("pro-jp-1");
    const [fontFamily, setFontFamily] = useState<"font-sans" | "font-serif" | "font-zen">("font-sans");
    const [fontScale, setFontScale] = useState(100);
    const [baseFontSize, setBaseFontSize] = useState(16);
    const [productName, setProductName] = useState("");
    const [itemCategory, setItemCategory] = useState("メインディッシュ");
    const [price, setPrice] = useState("¥1,200");
    const [features, setFeatures] = useState("");

    // AI Output States
    const [catchphrase, setCatchphrase] = useState("本日の極上メニュー");
    const [description, setDescription] = useState("こだわりの素材を使用した、職人自慢の一品です。");

    // Pro Template Toggle
    const [showTextOverlay, setShowTextOverlay] = useState<"all" | "price-only" | "none">("all");
    const popRef = useRef<HTMLDivElement>(null);

    const STYLE_GROUPS: Record<PopCategory, { id: string, label: string, thumbnail?: string, size: "large" | "a4" | "all" }[]> = {
        japanese: [
            { id: "pro-jp-1", label: "和風: 寿司・懐石（金和紙）", thumbnail: getPublicStorageUrl("/images/templates/pop/a4/ゴールド 黒 白 和紙 和風 寿司屋 ランチ チラシ.png"), size: "a4" },
            { id: "pro-jp-2", label: "和風: 飲食店メニュー（金白黒）", thumbnail: getPublicStorageUrl("/images/templates/pop/a4/金 白 黒 和風 飲食店 メニュー.png"), size: "a4" },
            { id: "pro-jp-3", label: "和風: 居酒屋ドリンク", thumbnail: getPublicStorageUrl("/images/templates/pop/a4/居酒屋　飲み物　メニュー　チラシ　A4.png"), size: "a4" },
            { id: "pro-jp-4", label: "和風: ラーメン極（黒金）", thumbnail: getPublicStorageUrl("/images/templates/pop/a4/黒と金 オシャレ 日本 ラーメン A4 チラシ 縦.png"), size: "a4" },
            { id: "pro-jp-5", label: "SNS: 和食紹介", thumbnail: getPublicStorageUrl("/images/templates/pop/large/写真　和食メニュー紹介　インスタグラムの投稿(45).png"), size: "large" },
        ],
        western: [
            { id: "pro-we-1", label: "洋風: シンプルポスター（茶）", thumbnail: getPublicStorageUrl("/images/templates/pop/a4/ブラウン　シンプル　飲食店　食べ物　メニュー　ポスター.png"), size: "a4" },
            { id: "pro-we-2", label: "洋風: ブランチメニュー", thumbnail: getPublicStorageUrl("/images/templates/pop/a4/ベージュ 茶色 カフェ 飲食店 シンプル ブランチメニュー A4 チラシ.png"), size: "a4" },
            { id: "pro-we-3", label: "洋風: キッチンカー（黒板）", thumbnail: getPublicStorageUrl("/images/templates/pop/a4/黒 白 黒板 チョーク 飲食店 キッチンカー メニュー A4.png"), size: "a4" },
            { id: "pro-we-4", label: "洋風: トラットリア ", thumbnail: getPublicStorageUrl("/images/templates/pop/a4/黒 金 赤 シンプル カフェ レストラン トラットリア チラシ A4.png"), size: "a4" },
            { id: "pro-we-5", label: "洋風: パスタランチ（オレンジ）", thumbnail: getPublicStorageUrl("/images/templates/pop/a4/オレンジと白のシンプル パスタ ランチ チラシ.png"), size: "a4" },
            { id: "pro-we-6", label: "洋風: キッチンカーポスター", thumbnail: getPublicStorageUrl("/images/templates/pop/a4/黒 白 シンプル キッチンカー メぬー ポスター.png"), size: "a4" },
            { id: "pro-we-7", label: "SNS: カフェメニュー（緑）", thumbnail: getPublicStorageUrl("/images/templates/pop/large/緑 ベージュ シンプル 飲食店 カフェ メニュー Instagramの投稿.png"), size: "large" },
            { id: "pro-we-8", label: "SNS: ミートボール販促", thumbnail: getPublicStorageUrl("/images/templates/pop/large/Restaurant and Eatery New Menu Meatball Promotion Simple Instagram Post.png"), size: "large" },
            { id: "pro-we-9", label: "SNS: ブラウンモダン", thumbnail: getPublicStorageUrl("/images/templates/pop/large/Brown Modern New Menu Promotion Instagram Post.png"), size: "large" },
        ],
        chinese: [
            { id: "pro-ch-1", label: "本格ラーメン（赤・黒）", thumbnail: getPublicStorageUrl("/images/templates/pop/a4/黒と金 オシャレ 日本 ラーメン A4 チラシ 縦.png"), size: "a4" },
            { id: "pro-ch-2", label: "中華居酒屋メニュー", thumbnail: getPublicStorageUrl("/images/templates/pop/a4/居酒屋　飲み物　メニュー　チラシ　A4.png"), size: "a4" },
        ],
        others: [
            { id: "pro-ot-1", label: "モダンミニマル（横向き）", thumbnail: getPublicStorageUrl("/images/templates/pop/a4/_Modern Minimalist Menu (Menu (Landscape)).png"), size: "a4" },
            { id: "pro-ot-2", label: "カフェおしゃれ（横向き）", thumbnail: getPublicStorageUrl("/images/templates/pop/a4/ベージュ  カフェ おしゃれ メニュー A4（横）.png"), size: "a4" },
            { id: "pro-ot-3", label: "ランチメニュー（グレー）", thumbnail: getPublicStorageUrl("/images/templates/pop/a4/黒　白　グレー　シンプル　ランチメニュー　カフェ　飲食店　A4  チラシ　縦.png"), size: "a4" },
            { id: "pro-ot-4", label: "写真イラストチラシ", thumbnail: getPublicStorageUrl("/images/templates/pop/a4/ベージュ　シンプル　食べ物　飲食店　写真　イラスト　A4チラシ.png"), size: "a4" },
            { id: "pro-ot-5", label: "SNS: 営業再開", thumbnail: getPublicStorageUrl("/images/templates/pop/large/ベージュ 赤 シンプル 営業再開 お知らせ インスタグラム of the post.png"), size: "large" },
            { id: "pro-ot-6", label: "SNS: 求人広告", thumbnail: getPublicStorageUrl("/images/templates/pop/large/白 ブラウン シンプル 飲食店 求人広告 インスタグラム投稿（正方形）.png"), size: "large" },
            { id: "pro-ot-7", label: "SNS: スタッフ募集", thumbnail: getPublicStorageUrl("/images/templates/pop/large/青　黄色　シンプル　スタッフ募集　求人　インスタグラムの投稿.png"), size: "large" },
        ]
    };

    /** Canvaテンプレート等の画像ベースのレイアウト設定 */
    const PRO_LAYOUT_CONFIG: Record<string, any> = {
        // --- A4 Portrait ---
        "pro-jp-1": { bg: "/images/templates/pop/a4/ゴールド 黒 白 和紙 和風 寿司屋 ランチ チラシ.png", productName: { top: "32%", left: "50%", transform: "translateX(-50%)", color: "#000", width: "80%" }, price: { bottom: "28%", left: "50%", transform: "translateX(-50%)", color: "#b45309" } },
        "pro-jp-2": { bg: "/images/templates/pop/a4/金 白 黒 和風 飲食店 メニュー.png", productName: { top: "35%", left: "50%", transform: "translateX(-50%)", color: "#000", width: "85%" }, price: { bottom: "15%", left: "50%", transform: "translateX(-50%)", color: "#000" } },
        "pro-jp-3": { bg: "/images/templates/pop/a4/居酒屋　飲み物　メニュー　チラシ　A4.png", productName: { top: "25%", left: "50%", transform: "translateX(-50%)", color: "#fff", width: "70%" }, price: { bottom: "20%", left: "50%", transform: "translateX(-50%)", color: "#fbbf24" } },
        "pro-jp-4": { bg: "/images/templates/pop/a4/黒と金 オシャレ 日本 ラーメン A4 チラシ 縦.png", catchphrase: { top: "12%", left: "50%", transform: "translateX(-50%)", color: "#fbbf24" }, productName: { top: "30%", left: "50%", transform: "translateX(-50%)", color: "#fff", fontWeight: "900", width: "80%" }, price: { bottom: "12%", left: "50%", transform: "translateX(-50%)", color: "#fbbf24" } },
        "pro-we-1": { bg: "/images/templates/pop/a4/ブラウン　シンプル　飲食店　食べ物　メニュー　ポスター.png", catchphrase: { top: "10%", left: "50%", transform: "translateX(-50%)", color: "#fff" }, productName: { top: "35%", left: "50%", transform: "translateX(-50%)", color: "#fff", width: "80%" }, price: { bottom: "15%", left: "50%", transform: "translateX(-50%)", color: "#fff" } },
        "pro-we-2": { bg: "/images/templates/pop/a4/ベージュ 茶色 カフェ 飲食店 シンプル ブランチメニュー A4 チラシ.png", productName: { top: "40%", left: "50%", transform: "translateX(-50%)", color: "#451a03", width: "80%" }, price: { bottom: "15%", left: "50%", transform: "translateX(-50%)", color: "#78350f" } },
        "pro-we-3": { bg: "/images/templates/pop/a4/黒 白 黒板 チョーク 飲食店 キッチンカー メメニュー A4.png", productName: { top: "35%", left: "50%", transform: "translateX(-50%)", color: "#fff", width: "80%" }, price: { bottom: "15%", left: "50%", transform: "translateX(-50%)", color: "#fff" } },
        "pro-we-4": { bg: "/images/templates/pop/a4/黒 金 赤 シンプル カフェ レストラン トラットリア チラシ A4.png", productName: { top: "40%", left: "50%", transform: "translateX(-50%)", color: "#fff", width: "80%" }, price: { bottom: "15%", left: "50%", transform: "translateX(-50%)", color: "#f59e0b" } },
        "pro-we-5": { bg: "/images/templates/pop/a4/オレンジと白のシンプル パスタ ランチ チラシ.png", productName: { top: "35%", left: "50%", transform: "translateX(-50%)", color: "#000", width: "80%" }, price: { bottom: "15%", left: "50%", transform: "translateX(-50%)", color: "#c2410c" } },
        "pro-we-6": { bg: "/images/templates/pop/a4/黒 白 シンプル キッチンカー メニュー ポスター.png", productName: { top: "35%", left: "50%", transform: "translateX(-50%)", color: "#000", width: "80%" }, price: { bottom: "15%", left: "50%", transform: "translateX(-50%)", color: "#000" } },
        "pro-ot-3": { bg: "/images/templates/pop/a4/黒　白　グレー　シンプル　ランチメニュー　カフェ　飲食店　A4  チラシ　縦.png", productName: { top: "35%", left: "50%", transform: "translateX(-50%)", color: "#000", width: "80%" }, price: { bottom: "15%", left: "50%", transform: "translateX(-50%)", color: "#000" } },
        "pro-ot-4": { bg: "/images/templates/pop/a4/ベージュ　シンプル　食べ物　飲食店　写真　イラスト　A4チラシ.png", productName: { top: "35%", left: "50%", transform: "translateX(-50%)", color: "#451a03", width: "80%" }, price: { bottom: "15%", left: "50%", transform: "translateX(-50%)", color: "#000" } },
        "pro-ch-1": { bg: "/images/templates/pop/a4/黒と金 オシャレ 日本 ラーメン A4 チラシ 縦.png", catchphrase: { top: "12%", left: "50%", transform: "translateX(-50%)", color: "#fbbf24" }, productName: { top: "30%", left: "50%", transform: "translateX(-50%)", color: "#fff", fontWeight: "900", width: "80%" }, price: { bottom: "12%", left: "50%", transform: "translateX(-50%)", color: "#fbbf24" } },
        "pro-ch-2": { bg: "/images/templates/pop/a4/居酒屋　飲み物　メニュー　チラシ　A4.png", productName: { top: "25%", left: "50%", transform: "translateX(-50%)", color: "#fff", width: "70%" }, price: { bottom: "20%", left: "50%", transform: "translateX(-50%)", color: "#fbbf24" } },

        // --- A4 Landscape ---
        "pro-ot-1": { bg: "/images/templates/pop/a4/_Modern Minimalist Menu (Menu (Landscape)).png", orientation: "landscape", productName: { top: "40%", left: "50%", transform: "translateX(-50%)", color: "#000", width: "80%" }, price: { bottom: "15%", left: "50%", transform: "translateX(-50%)", color: "#000" } },
        "pro-ot-2": { bg: "/images/templates/pop/a4/ベージュ  カフェ おしゃれ メニュー A4（横）.png", orientation: "landscape", productName: { top: "40%", left: "50%", transform: "translateX(-50%)", color: "#451a03", width: "80%" }, price: { bottom: "15%", left: "50%", transform: "translateX(-50%)", color: "#000" } },

        // --- SNS Square (Large) ---
        "pro-jp-5": { bg: "/images/templates/pop/large/写真　和食メニュー紹介　インスタグラムの投稿(45).png", orientation: "square", catchphrase: { top: "20%", left: "50%", transform: "translateX(-50%)", color: "#fff" }, productName: { top: "40%", left: "50%", transform: "translateX(-50%)", color: "#fff", width: "80%" }, price: { bottom: "25%", left: "50%", transform: "translateX(-50%)", color: "#fff" } },
        "pro-we-7": { bg: "/images/templates/pop/large/緑 ベージュ シンプル 飲食店 カフェ メニュー Instagramの投稿.png", orientation: "square", productName: { top: "40%", left: "50%", transform: "translateX(-50%)", color: "#064e3b", width: "80%" }, price: { bottom: "15%", left: "50%", transform: "translateX(-50%)", color: "#065f46" } },
        "pro-we-8": { bg: "/images/templates/pop/large/Restaurant and Eatery New Menu Meatball Promotion Simple Instagram Post.png", orientation: "square", productName: { top: "35%", right: "10%", textAlign: "right", color: "#000", width: "50%" }, price: { bottom: "10%", right: "10%", color: "#dc2626" } },
        "pro-we-9": { bg: "/images/templates/pop/large/Brown Modern New Menu Promotion Instagram Post.png", orientation: "square", catchphrase: { top: "15%", left: "50%", transform: "translateX(-50%)", color: "#fff" }, productName: { top: "45%", left: "50%", transform: "translateX(-50%)", color: "#fff", width: "80%" }, price: { bottom: "15%", left: "50%", transform: "translateX(-50%)", color: "#fbbf24" } },
        "pro-ot-5": { bg: "/images/templates/pop/large/ベージュ 赤 シンプル 営業再開 お知らせ インスタグラムの投稿.png", orientation: "square", productName: { top: "45%", left: "50%", transform: "translateX(-50%)", color: "#000", width: "80%" }, price: { bottom: "15%", left: "50%", transform: "translateX(-50%)", color: "#dc2626" } },
        "pro-ot-6": { bg: "/images/templates/pop/large/白 ブラウン シンプル 飲食店 求人広告 インスタグラム投稿（正方形）.png", orientation: "square", productName: { top: "40%", left: "50%", transform: "translateX(-50%)", color: "#000" }, price: { bottom: "15%", left: "50%", transform: "translateX(-50%)", color: "#000" } },
        "pro-ot-7": { bg: "/images/templates/pop/large/青　黄色　シンプル　スタッフ募集　求人　インスタグラムの投稿.png", orientation: "square", productName: { top: "40%", left: "50%", transform: "translateX(-50%)", color: "#fff" }, price: { bottom: "20%", left: "50%", transform: "translateX(-50%)", color: "#fff" } },

        "default": { bg: "/images/templates/pop/a4/ブラウン　シンプル　飲食店　食べ物　メニュー　ポスター.png", productName: { top: "40%", left: "50%", transform: "translateX(-50%)", width: "80%" }, price: { bottom: "15%", left: "50%", transform: "translateX(-50%)" } }
    };

    const handleGenerate = async () => {
        if (!productName) {
            toast.warning("商品名を入力してください");
            return;
        }

        setGenerating(true);
        try {
            const result = await generatePopCopy({
                productName,
                category: itemCategory,
                price,
                features,
                style
            });
            setCatchphrase(result.catchphrase);
            setDescription(result.description);
            toast.success("AIコピーを生成しました");
        } catch (error) {
            toast.error("生成に失敗しました");
        } finally {
            setGenerating(false);
        }
    };

    const handlePrint = () => {
        const content = popRef.current;
        if (!content) return;

        const config = PRO_LAYOUT_CONFIG[style] || PRO_LAYOUT_CONFIG["default"];
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Print POP - ${productName}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&family=Noto+Serif+JP:wght@400;700;900&family=Zen+Maru+Gothic:wght@400;700;900&display=swap" rel="stylesheet">
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        @media print {
                            body { margin: 0; padding: 0; }
                            .no-print { display: none; }
                        }
                        .font-sans { font-family: 'Noto Sans JP', sans-serif; }
                        .font-serif { font-family: 'Noto Serif JP', serif; }
                        .font-zen { font-family: 'Zen Maru Gothic', sans-serif; }
                    </style>
                </head>
                <body class="flex items-center justify-center min-h-screen bg-white">
                    <div style="${config.orientation === 'landscape' ? 'width: 700px; height: 500px;' : config.orientation === 'square' ? 'width: 500px; height: 500px;' : 'width: 500px; height: 707px;'}">
                        ${content.outerHTML}
                    </div>
                    <script>
                        window.onload = () => {
                            window.print();
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const renderPop = () => {
        const styleId = style || "pro-jp-1";
        const config = PRO_LAYOUT_CONFIG[styleId] || PRO_LAYOUT_CONFIG["default"];

        let aspectClass = "aspect-[1/1.414]";
        if (config.orientation === "landscape") {
            aspectClass = "aspect-[1.414/1]";
        } else if (config.orientation === "square") {
            aspectClass = "aspect-square";
        }

        const baseClass = `w-full ${aspectClass} rounded-sm shadow-2xl overflow-hidden relative flex flex-col items-center justify-center text-center transition-all duration-500 ${fontFamily}`;
        const getFontSize = (ratio: number) => `${baseFontSize * ratio * (fontScale / 100)}px`;

        return (
            <div
                className={`${baseClass} p-0 border-0 bg-stone-100 flex flex-col items-center justify-center`}
                style={{
                    backgroundImage: `url(${getPublicStorageUrl(config.bg)})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            >
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                    <ImageIcon className="size-32" />
                </div>

                {showTextOverlay === "all" && catchphrase && config.catchphrase && (
                    <div className="absolute z-10 font-bold" style={{ ...config.catchphrase, fontSize: getFontSize(1.2) }}>
                        {catchphrase}
                    </div>
                )}
                {showTextOverlay === "all" && productName && config.productName && (
                    <div className="absolute z-10 font-black" style={{ ...config.productName, fontSize: getFontSize(3.5) }}>
                        {productName}
                    </div>
                )}
                {showTextOverlay === "all" && description && config.description && (
                    <div className="absolute z-10 leading-relaxed font-medium" style={{ ...config.description, fontSize: getFontSize(1.0) }}>
                        {description}
                    </div>
                )}
                {showTextOverlay !== "none" && price && config.price && (
                    <div className="absolute z-10 font-black" style={{ ...config.price, fontSize: getFontSize(4.0) }}>
                        {price}
                    </div>
                )}
            </div>
        );
    };

    if (authLoading) return null;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="flex h-screen max-h-screen">
                <AppSidebar activePage="pop" user={user} />

                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                        <header className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-3xl font-black tracking-tight">AI POP作成ツール</h1>
                                <p className="text-muted-foreground text-sm font-medium">
                                    AIが商品の魅力を最大限に引き出すコピーとデザインを提案します
                                </p>
                            </div>
                            <Badge className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 px-3 py-1 font-bold flex items-center gap-1.5 h-auto">
                                <Sparkles className="size-3.5" />
                                <span>{planName} 特典機能</span>
                            </Badge>
                        </header>

                        {!hasFeature('ai_pop') ? (
                            <Card className="border-dashed border-2 p-12 text-center bg-muted/30">
                                <div className="max-w-md mx-auto space-y-4">
                                    <div className="inline-flex p-3 bg-muted rounded-full">
                                        <Lock className="size-8 text-muted-foreground" />
                                    </div>
                                    <h2 className="text-xl font-bold">Proプラン以上で利用可能</h2>
                                    <p className="text-muted-foreground text-sm">
                                        AI POP作成機能は、飲食店の売上アップを支援する上位プラン限定のツールです。
                                    </p>
                                    <Button className="font-bold bg-indigo-600 hover:bg-indigo-700" onClick={() => window.location.href = '/plans'}>
                                        プランを確認する
                                    </Button>
                                </div>
                            </Card>
                        ) : (
                            <div className="flex flex-col gap-6">
                                {/* Step 1: Template Selection */}
                                <Card className="shadow-sm border-indigo-100 overflow-hidden">
                                    <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                                    <CardHeader className="pb-3 pt-4 px-5">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <LayoutIcon className="size-4 text-indigo-500" />
                                                <span>Step 1 — テンプレートを選ぶ</span>
                                            </CardTitle>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                                    {STYLE_GROUPS[category].find(s => s.id === style)?.label ?? "未選択"}
                                                </span>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="px-5 pb-5">
                                        <div className="flex flex-wrap gap-3 mb-4">
                                            <div className="flex bg-muted/40 p-1 rounded-lg border">
                                                {(["japanese", "western", "chinese", "others"] as PopCategory[]).map((cat) => (
                                                    <button
                                                        key={cat}
                                                        onClick={() => {
                                                            setCategory(cat);
                                                            const filtered = STYLE_GROUPS[cat].filter(s => sizeFilter === "all" || s.size === sizeFilter);
                                                            setStyle(filtered.length > 0 ? filtered[0].id : STYLE_GROUPS[cat][0].id);
                                                        }}
                                                        className={`px-4 py-1.5 rounded-md text-xs font-black transition-all ${category === cat ? "bg-indigo-600 text-white shadow-md" : "text-muted-foreground hover:bg-white"}`}
                                                    >
                                                        {cat === "japanese" && "🍣 和食"}
                                                        {cat === "western" && "🍝 洋食"}
                                                        {cat === "chinese" && "🍜 中華"}
                                                        {cat === "others" && "✨ その他"}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex bg-muted/40 p-1 rounded-lg border">
                                                {(["all", "large", "a4"] as const).map((sub) => (
                                                    <button
                                                        key={sub}
                                                        onClick={() => {
                                                            setSizeFilter(sub);
                                                            const filtered = STYLE_GROUPS[category].filter(s => sub === "all" || s.size === sub);
                                                            if (filtered.length > 0) setStyle(filtered[0].id);
                                                        }}
                                                        className={`px-3 py-1 rounded text-[11px] font-black transition-all ${sizeFilter === sub ? "bg-white text-indigo-600 shadow border border-indigo-100" : "text-muted-foreground hover:text-foreground"}`}
                                                    >
                                                        {sub === "all" ? "すべて" : sub === "large" ? "SNS / 正方形" : "A4 / チラシ"}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                                            {STYLE_GROUPS[category]
                                                .filter(s => sizeFilter === "all" || s.size === sizeFilter)
                                                .map((s) => (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => setStyle(s.id)}
                                                        className={`group relative overflow-hidden rounded-xl border-2 transition-all hover:scale-[1.03] active:scale-95 ${style === s.id ? "border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg" : "border-muted bg-white hover:border-indigo-300 shadow-sm"}`}
                                                    >
                                                        {s.thumbnail ? (
                                                            <div className={`w-full overflow-hidden bg-muted ${s.size === "large" ? "aspect-square" : s.size === "a4" ? "aspect-[3/4]" : "aspect-[4/5]"}`}>
                                                                <img src={getPublicStorageUrl(s.thumbnail)} alt={s.label} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                                                                <div className={`absolute inset-0 flex items-end justify-center pb-2 transition-opacity ${style === s.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                                                                    <span className="text-[9px] text-white font-bold bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
                                                                        {style === s.id ? "✓ 選択中" : "選択"}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className={`aspect-[3/4] flex flex-col items-center justify-center gap-1 ${style === s.id ? "bg-indigo-50" : "bg-muted/30"}`}>
                                                                <Palette className={`size-4 ${style === s.id ? "text-indigo-600" : "text-muted-foreground"}`} />
                                                            </div>
                                                        )}
                                                        {style === s.id && (
                                                            <div className="absolute top-1 right-1 bg-indigo-500 text-white rounded-full p-0.5 shadow-md">
                                                                <Check className="size-2.5" />
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-6">
                                    <div className="space-y-6">
                                        {/* Step 2: Information & AI */}
                                        <Card className="shadow-sm border-indigo-100 overflow-hidden">
                                            <div className="h-1 bg-indigo-500"></div>
                                            <CardHeader>
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <LayoutIcon className="size-5 text-indigo-500" />
                                                    商品情報を入力
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="product" className="text-xs font-bold">商品名</Label>
                                                    <Input
                                                        id="product"
                                                        placeholder="例: 特製黒毛和牛ハンバーグ"
                                                        value={productName}
                                                        onChange={e => setProductName(e.target.value)}
                                                        className="font-bold h-10"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="category" className="text-xs font-bold">カテゴリ</Label>
                                                        <Input
                                                            id="category"
                                                            placeholder="例: メイン"
                                                            value={itemCategory}
                                                            onChange={e => setItemCategory(e.target.value)}
                                                            className="h-9 text-xs"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="price" className="text-xs font-bold">表示価格</Label>
                                                        <Input
                                                            id="price"
                                                            placeholder="例: ¥1,500"
                                                            value={price}
                                                            onChange={e => setPrice(e.target.value)}
                                                            className="h-9 text-xs font-black"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="features" className="text-xs font-bold text-muted-foreground">特徴・こだわり (AI用・任意)</Label>
                                                    <Textarea
                                                        id="features"
                                                        placeholder="例: 24時間煮込んだ特製ソース..."
                                                        value={features}
                                                        onChange={e => setFeatures(e.target.value)}
                                                        rows={2}
                                                        className="resize-none text-xs"
                                                    />
                                                </div>
                                                <Button
                                                    className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 rounded-xl shadow-lg transition-all font-black text-xs gap-2"
                                                    onClick={handleGenerate}
                                                    disabled={generating}
                                                >
                                                    {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                                                    AIにコピー作成を任せる
                                                </Button>

                                                <div className="pt-4 border-t space-y-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold text-indigo-600">フォント</Label>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {(["font-sans", "font-serif", "font-zen"] as const).map((f) => (
                                                                <button
                                                                    key={f}
                                                                    onClick={() => setFontFamily(f)}
                                                                    className={`px-2 py-2 rounded-lg text-[10px] font-black transition-all border-2 ${fontFamily === f ? "border-indigo-500 bg-indigo-50 text-indigo-600" : "border-muted bg-white text-muted-foreground"}`}
                                                                >
                                                                    {f === "font-sans" && "ゴシック"}
                                                                    {f === "font-serif" && "明朝体"}
                                                                    {f === "font-zen" && "丸文字"}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {style.startsWith("pro-") && (
                                                        <div className="space-y-2">
                                                            <Label className="text-xs font-bold text-indigo-600">表示モード</Label>
                                                            <div className="flex bg-muted/40 p-1 rounded-lg border">
                                                                {(["all", "price-only", "none"] as const).map((mode) => (
                                                                    <button
                                                                        key={mode}
                                                                        onClick={() => setShowTextOverlay(mode)}
                                                                        className={`flex-1 py-1.5 rounded-md text-[10px] font-black transition-all ${showTextOverlay === mode ? "bg-white text-indigo-600 shadow-sm" : "text-muted-foreground"}`}
                                                                    >
                                                                        {mode === "all" && "全表示"}
                                                                        {mode === "price-only" && "価格のみ"}
                                                                        {mode === "none" && "背景のみ"}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-between pt-2">
                                                        <Label className="text-xs font-bold text-indigo-600">文字サイズ</Label>
                                                        <div className="flex items-center gap-2">
                                                            <Button size="icon" variant="outline" className="size-7" onClick={() => setFontScale(prev => Math.max(50, prev - 10))}>
                                                                <Minus className="size-3" />
                                                            </Button>
                                                            <span className="text-[10px] font-black w-8 text-center">{fontScale}%</span>
                                                            <Button size="icon" variant="outline" className="size-7" onClick={() => setFontScale(prev => Math.min(200, prev + 10))}>
                                                                <Plus className="size-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Step 3: Copy Fine-tuning */}
                                        <Card className="shadow-sm">
                                            <CardHeader className="py-3">
                                                <CardTitle className="text-sm flex items-center gap-2">
                                                    <Type className="size-4 text-indigo-500" />
                                                    コピーの微調整
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4 pb-4">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">キャッチコピー</Label>
                                                    <Input value={catchphrase} onChange={e => setCatchphrase(e.target.value)} className="h-8 text-xs font-bold" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">紹介文</Label>
                                                    <Textarea
                                                        value={description}
                                                        onChange={e => setDescription(e.target.value)}
                                                        rows={3}
                                                        className="resize-none text-xs leading-relaxed"
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Preview Side */}
                                    <div className="space-y-6">
                                        <div className="sticky top-8">
                                            <div className="flex items-center justify-between mb-4 bg-muted/30 p-2 rounded-xl">
                                                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-2">Preview</span>
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="outline" onClick={handlePrint} className="h-8 gap-1.5 font-bold text-xs bg-white">
                                                        <Printer className="size-3.5" /> 印刷
                                                    </Button>
                                                    <Button size="sm" variant="default" className="h-8 gap-1.5 font-bold text-xs bg-indigo-600">
                                                        <Download className="size-3.5" /> 画像保存
                                                    </Button>
                                                </div>
                                            </div>

                                            <AnimatePresence mode="wait">
                                                <motion.div
                                                    key={style}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    transition={{ duration: 0.4 }}
                                                    ref={popRef}
                                                    className="mx-auto max-w-[500px]"
                                                >
                                                    {renderPop()}
                                                </motion.div>
                                            </AnimatePresence>

                                            <div className="mt-6 text-center text-[10px] text-muted-foreground font-medium flex items-center justify-center gap-2">
                                                <Check className="size-3.5 text-indigo-500" />
                                                Ctrl+P で A4サイズに綺麗に印刷できます
                                            </div>
                                        </div>
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
