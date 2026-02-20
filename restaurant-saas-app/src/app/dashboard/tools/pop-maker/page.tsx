"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePlanGuard } from "@/hooks/usePlanGuard";
import { AppSidebar } from "@/components/app-sidebar";
import { getPublicStorageUrl } from "@/lib/storage-utils";
import "./fonts.css";
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
    Minus,
    Heart,
    Upload,
    Star,
    Trash2,
    Wand2,
    RotateCcw,
    Eraser,
    Type as TypeIcon,
    AArrowUp,
    AArrowDown,
    Mic,
    MicOff,
    Send,
    MessageCircle,
    Paperclip,
    ArrowRight
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { chatWithPopAssistant } from "@/app/actions/pop-ai";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { generatePopCopy, generateReviewCopy, suggestFontFromImage } from "@/app/actions/tools";
import { QRCodeCanvas } from "qrcode.react";

type PopCategory = "japanese" | "western" | "others";
type MenuItem = { name: string; price: string };
type CurrencyUnit = "円" | "￥" | "$";

export default function PopMakerPage() {
    const { user, loading: authLoading } = useAuth();
    const { hasFeature, planName } = usePlanGuard();
    const [generating, setGenerating] = useState(false);

    // UI States
    const [category, setCategory] = useState<PopCategory>("japanese");
    const [sizeFilter, setSizeFilter] = useState<"all" | "large" | "a4">("all");
    const [style, setStyle] = useState<string>("pro-jp-1");
    const [fontFamily, setFontFamily] = useState<string>("font-noto-sans");
    const [fontTab, setFontTab] = useState<"jp" | "en">("jp");
    const [fontScale, setFontScale] = useState(100);

    // AI Chat States
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<{ role: "user" | "model"; content: string; images?: string[] }[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [chatUploadedImages, setChatUploadedImages] = useState<string[]>([]);
    const chatFileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [baseFontSize, setBaseFontSize] = useState(16);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([{ name: "", price: "" }]);
    const [currencyUnit, setCurrencyUnit] = useState<CurrencyUnit>("￥");
    const [itemCategory, setItemCategory] = useState("メインディッシュ");
    const [features, setFeatures] = useState("");

    // 通貨フォーマット関数
    const formatPrice = (raw: string): string => {
        if (!raw) return "";
        const num = raw.replace(/[^0-9]/g, "");
        if (!num) return "";
        const formatted = Number(num).toLocaleString();
        if (currencyUnit === "円") return `${formatted}円`;
        if (currencyUnit === "$") return `$${formatted}`;
        return `￥${formatted}`;
    };

    // 後方互換ヘルパー（AI・レンダリング用）
    const productName = menuItems[0]?.name || "";
    const price = formatPrice(menuItems[0]?.price || "");

    // 商品追加/削除/更新
    const addMenuItem = () => {
        if (menuItems.length >= 10) return;
        pushHistory();
        setMenuItems(prev => [...prev, { name: "", price: "" }]);
    };
    const removeMenuItem = (index: number) => {
        if (menuItems.length <= 1) return;
        pushHistory();
        setMenuItems(prev => prev.filter((_, i) => i !== index));
    };
    const updateMenuItem = (index: number, field: keyof MenuItem, value: string) => {
        setMenuItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    // AI Output States
    const [catchphrase, setCatchphrase] = useState("本日の極上メニュー");
    const [description, setDescription] = useState("こだわりの素材を使用した、職人自慢の一品です。");

    // V2 New States
    const [productImage, setProductImage] = useState<string | null>(null);
    const [backgroundCustomImage, setBackgroundCustomImage] = useState<string | null>(null);
    const [favorites, setFavorites] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<"create" | "favorites">("create");
    const [aiLayout, setAiLayout] = useState<{
        styleType: string;
        recommendedColor: string;
        recommendedBgColor?: string;
        productLayout?: { x: number; y: number; scale: number; zIndex?: number };
        layout: {
            [key: string]: { x: number; y: number; fontSize: number; align: "left" | "center" | "right" };
        };
        suggestedFontId?: string;
        photoAreas?: { x: number; y: number; scale: number; zIndex?: number }[];
        detectedStyle?: string;
    } | null>(null);

    // AIテンプレート解析実行
    const handleAnalyzeTemplate = async (bgImage: string) => {
        setGenerating(true);
        const loadingToast = toast.loading("テンプレートをAIで解析中...");
        try {
            const response = await fetch('/api/ai/detect-template-areas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ backgroundImage: bgImage }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("API Error Data:", errorData);
                throw new Error(errorData.error || "解析に失敗しました");
            }
            const data = await response.json();

            if (data && data.photoAreas) {
                setAiLayout(prev => ({
                    ...prev,
                    photoAreas: data.photoAreas,
                    detectedStyle: data.detectedStyle,
                    styleType: data.detectedStyle || prev?.styleType || 'modern',
                    recommendedColor: prev?.recommendedColor || '#000',
                    layout: prev?.layout || {}
                } as any));
                toast.success(`${data.photoAreas.length}箇所の写真枠を検出しました！`, { id: loadingToast });
            }
        } catch (error: any) {
            console.error("Template Analysis Error:", error);
            toast.error("テンプレートの解析に失敗しました", { id: loadingToast });
        } finally {
            setGenerating(false);
        }
    };
    const [outputSize, setOutputSize] = useState<"a4" | "poster" | "sns">("a4");
    const [externalUrl, setExternalUrl] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const [manualPositions, setManualPositions] = useState<Record<string, { x: number, y: number }>>({});
    const [verticalText, setVerticalText] = useState<Record<string, boolean>>({});
    const [selectedElement, setSelectedElement] = useState<string | null>(null);
    const [elementScales, setElementScales] = useState<Record<string, number>>({});
    const [reviewText, setReviewText] = useState("");
    const [qrContent, setQrContent] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bgInputRef = useRef<HTMLInputElement>(null);
    const [dragOverProduct, setDragOverProduct] = useState(false);
    const [dragOverBg, setDragOverBg] = useState(false);
    const isDroppingRef = useRef(false);

    // Pro Template Toggle
    const [showTextOverlay, setShowTextOverlay] = useState<"all" | "price-only" | "none">("all");
    const popRef = useRef<HTMLDivElement>(null);

    // History for Undo
    const [history, setHistory] = useState<any[]>([]);

    const getCurrentState = () => ({
        menuItems, currencyUnit, itemCategory, features, catchphrase, description,
        productImage, backgroundCustomImage, fontFamily, fontScale, aiLayout,
        manualPositions, verticalText, style, elementScales
    });

    const pushHistory = () => {
        const currentState = getCurrentState();
        setHistory(prev => [...prev.slice(-19), currentState]); // Max 20 steps
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const prevState = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1));

        setMenuItems(prevState.menuItems || [{ name: prevState.productName || "", price: prevState.price || "" }]);
        if (prevState.currencyUnit) setCurrencyUnit(prevState.currencyUnit);
        setItemCategory(prevState.itemCategory);
        setFeatures(prevState.features);
        setCatchphrase(prevState.catchphrase);
        setDescription(prevState.description);
        setProductImage(prevState.productImage);
        setBackgroundCustomImage(prevState.backgroundCustomImage);
        setFontFamily(prevState.fontFamily);
        setFontScale(prevState.fontScale);
        setAiLayout(prevState.aiLayout);
        setManualPositions(prevState.manualPositions);
        setVerticalText(prevState.verticalText);
        setStyle(prevState.style);
        setElementScales(prevState.elementScales || {});
    };

    const handleElementScaleChange = (id: string, delta: number) => {
        pushHistory();
        setElementScales(prev => ({
            ...prev,
            [id]: Math.max(0.1, (prev[id] || 1.0) + delta)
        }));
    };

    const handleStyleChange = (newStyle: string) => {
        pushHistory();
        setStyle(newStyle);
    };

    const handleFontChange = (newFont: string) => {
        pushHistory();
        setFontFamily(newFont);
    };

    const STYLE_GROUPS: Record<PopCategory, { id: string, label: string, thumbnail?: string, size: "large" | "a4" | "all" }[]> = {
        japanese: [],
        western: [],
        others: []
    };

    /** Canvaテンプレート等の画像ベースのレイアウト設定 */
    const PRO_LAYOUT_CONFIG: Record<string, any> = {
        "default": { bg: "", productName: { top: "40%", left: "50%", transform: "translateX(-50%)", width: "80%" }, price: { bottom: "15%", left: "50%", transform: "translateX(-50%)" } }
    };

    const handleAiDesignAssistant = async () => {
        if (!productImage && !productName) {
            toast.warning("写真アップロードまたは商品名の入力が必要です");
            return;
        }

        setGenerating(true);
        try {
            const response = await fetch('/api/ai/analyze-layout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: productImage,
                    backgroundImage: backgroundCustomImage || null,
                    productName,
                    price,
                    description,
                    catchphrase,
                    planName: 'pro'
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            setAiLayout(data.layout);
            if (data.styleType) setCategory(data.styleType as any);
            if (data.suggestedFontId) setFontFamily(data.suggestedFontId);

            // コピーが空で、AIが何か提案していれば埋める（API側プロンプト要調整だが現時点ではレイアウト重視）
            toast.success("AIが最適なレイアウトを提案しました！");
        } catch (error: any) {
            console.error('AI Design Assistant Error:', error);
            toast.error("AIデザインの提案に失敗しました");
        } finally {
            setGenerating(false);
        }
    };

    const handleSyncToWebsite = async () => {
        if (!popRef.current) return;

        setGenerating(true);
        try {
            const { toPng } = await import("html-to-image");
            const dataUrl = await toPng(popRef.current, { pixelRatio: 2, quality: 1 });

            const response = await fetch('/api/tools/pop/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: dataUrl, tenantId: user?.uid })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            toast.success("WEBサイトとの同期に成功しました！", {
                description: "公開URLも発行されました。"
            });
        } catch (error) {
            console.error("Sync Error:", error);
            toast.error("WEBサイトへの同期に失敗しました");
            setGenerating(false);
        }
    };

    const handleGenerateFromReview = async () => {
        if (!reviewText) return;
        setGenerating(true);
        try {
            const result = await generateReviewCopy({
                review: reviewText,
                productName
            });
            setCatchphrase(result.catchphrase);
            setDescription(result.description);
            toast.success("クチコミを販促コピーに変換しました！");
        } catch (error) {
            toast.error("変換に失敗しました");
        } finally {
            setGenerating(false);
        }
    };

    // 音声認識のセットアップ
    const startListening = () => {
        if (!('webkitSpeechRecognition' in window)) {
            toast.error("お使いのブラウザは音声入力に対応していません");
            return;
        }

        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.lang = 'ja-JP';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setChatInput(prev => prev + transcript);
        };

        recognition.start();
    };

    // チャットでの画像アップロード
    const handleChatImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setChatUploadedImages(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    // チャット送信
    const handleSendChatMessage = async () => {
        if (!chatInput.trim() && chatUploadedImages.length === 0) return;

        const userMessage = {
            role: "user" as const,
            content: chatInput,
            images: chatUploadedImages
        };

        const newMessages = [...chatMessages, userMessage];
        setChatMessages(newMessages);
        setChatInput("");
        setChatUploadedImages([]);
        setGenerating(true);

        try {
            const result = await chatWithPopAssistant({
                messages: newMessages,
                currentPopState: {
                    productName,
                    price,
                    description,
                    catchphrase,
                    style,
                    fontFamily,
                    menuItems,
                    aiLayout
                }
            });

            if (result.success) {
                setChatMessages(prev => [...prev, { role: "model", content: result.content }]);

                // JSONが含まれていれば抽出して適用
                const jsonMatch = result.content.match(/```json\n([\s\S]*?)\n```/) || result.content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        const data = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                        applyAiDesign(data);
                    } catch (e) {
                        console.error("Failed to parse design JSON from chat", e);
                    }
                }
            } else {
                toast.error("AIからの返信に失敗しました");
            }
        } catch (error) {
            toast.error("エラーが発生しました");
        } finally {
            setGenerating(false);
            // スクロールダウン
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }, 100);
        }
    };

    const applyAiDesign = (data: any) => {
        if (data.productName) setMenuItems([{ name: data.productName, price: data.price || "" }]);
        if (data.catchphrase) setCatchphrase(data.catchphrase);
        if (data.description) setDescription(data.description);
        if (data.style) setStyle(data.style);
        if (data.fontFamily) setFontFamily(data.fontFamily);
        if (data.aiLayout) setAiLayout(data.aiLayout);
        toast.success("AIの提案をデザインに反映しました！");
    };

    const handleSuggestFont = async () => {
        const targetImage = backgroundCustomImage || (aiLayout?.bg);
        if (!targetImage) {
            toast.error("背景画像が見つかりません");
            return;
        }

        setGenerating(true);
        try {
            const fontKey = await suggestFontFromImage(targetImage);
            setFontFamily(fontKey);
            toast.success("AIが画像に合うフォントを提案しました！");
        } catch (error) {
            toast.error("解析に失敗しました");
        } finally {
            setGenerating(false);
        }
    };

    const toggleVertical = (elementId: string) => {
        setVerticalText(prev => ({
            ...prev,
            [elementId]: !prev[elementId]
        }));
    };

    const handleDragEnd = (elementId: string, event: any, info: any) => {
        const container = popRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        // コンテナ内での相対的な移動距離（px）を取得し、パーセンテージに換算
        // 実際の座標＝(info.point.x - rect.left) / rect.width * 100
        const x = ((info.point.x - rect.left) / rect.width) * 100;
        const y = ((info.point.y - rect.top) / rect.height) * 100;

        setManualPositions(prev => ({
            ...prev,
            [elementId]: { x, y }
        }));
    };

    const handleResetLayout = () => {
        setManualPositions({});
        setVerticalText({});
        toast.info("レイアウトをリセットしました");
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

    const handleImportFromUrl = async () => {
        if (!externalUrl) return;
        setIsImporting(true);
        try {
            const proxyUrl = `/api/tools/pop/proxy?url=${encodeURIComponent(externalUrl)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error("画像の取り込みに失敗しました");

            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
                setBackgroundCustomImage(reader.result as string);
                setExternalUrl("");
                toast.success("外部からデザインを取り込みました！");
            };
            reader.readAsDataURL(blob);
        } catch (error) {
            console.error("Import Error:", error);
            toast.error("URLからの取り込みに失敗しました。公開設定を確認してください。");
        } finally {
            setIsImporting(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProductImage(reader.result as string);
                toast.success("画像を読み込みました");
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddToFavorite = () => {
        const newFav = {
            id: Date.now().toString(),
            menuItems,
            productName,
            price,
            catchphrase,
            description,
            style,
            fontFamily,
            productImage,
            timestamp: new Date().toISOString()
        };
        setFavorites([newFav, ...favorites]);
        toast.success("お気に入りに登録しました");
    };

    const handleRemoveFavorite = (id: string) => {
        setFavorites(favorites.filter(f => f.id !== id));
        toast.success("お気に入りから削除しました");
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

    // フォントIDからCSS font-family値への変換マップ
    const FONT_FAMILY_MAP: Record<string, string> = {
        'font-meiryo': "'Meiryo', 'MS PGothic', sans-serif",
        'font-noto-sans': "'Noto Sans JP', sans-serif",
        'font-noto-serif': "'Noto Serif JP', serif",
        'font-zen-maru': "'Zen Maru Gothic', sans-serif",
        'font-zen-kaku': "'Zen Kaku Gothic New', sans-serif",
        'font-shippori': "'Shippori Mincho', serif",
        'font-yuji': "'Yuji Syuku', serif",
        'font-yuji-boku': "'Yuji Boku', serif",
        'font-reggae': "'Reggae One', cursive",
        'font-rocknroll': "'RocknRoll One', sans-serif",
        'font-tegomin': "'New Tegomin', serif",
        'font-kurenaido': "'Zen Kurenaido', cursive",
        'font-stick': "'Stick', sans-serif",
        'font-kaisei': "'Kaisei Tokumin', serif",
        'font-dela': "'Dela Gothic One', cursive",
        'font-dot': "'DotGothic16', sans-serif",
        'font-mplus-round': "'M PLUS Rounded 1c', sans-serif",
        'font-inter': "'Inter', sans-serif",
        'font-montserrat': "'Montserrat', sans-serif",
        'font-playfair': "'Playfair Display', serif",
        'font-oswald': "'Oswald', sans-serif",
        'font-pacifico': "'Pacifico', cursive",
        'font-caveat': "'Caveat', cursive",
        'font-lobster': "'Lobster', cursive",
        'font-bebas': "'Bebas Neue', cursive",
        'font-abril': "'Abril Fatface', cursive",
        'font-dancing': "'Dancing Script', cursive",
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
        const getFontSize = (ratio: number, elementId?: string) => {
            const individualScale = elementId ? elementScales[elementId] || 1.0 : 1.0;
            return `${baseFontSize * ratio * (fontScale / 100) * individualScale}px`;
        };

        return (
            <div
                className={`relative w-full ${aspectClass} overflow-hidden bg-white shadow-2xl pop-container`}
                style={{ fontFamily: FONT_FAMILY_MAP[fontFamily] || "'Noto Sans JP', sans-serif" }}
            >
                {/* 背景レイヤー */}
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: `url(${backgroundCustomImage || getPublicStorageUrl(config.bg)})`,
                        backgroundColor: aiLayout?.recommendedBgColor || '#fff'
                    }}
                />

                {/* 商品写真レイヤー (AI自動配置 or 単一配置) */}
                {aiLayout?.photoAreas && aiLayout.photoAreas.length > 0 ? (
                    // AIで検出された枠に配置
                    aiLayout.photoAreas.map((area, index) => {
                        const item = menuItems[index % menuItems.length];
                        const image = item.image || productImage; // 個別画像がなければ共通画像
                        if (!image) return null;
                        return (
                            <motion.div
                                key={`photo-area-${index}`}
                                drag
                                dragMomentum={false}
                                onDragEnd={(e, info) => handleDragEnd(`photoArea-${index}`, e, info)}
                                className="absolute flex items-center justify-center cursor-move"
                                style={{
                                    top: manualPositions[`photoArea-${index}`]?.y ? `${manualPositions[`photoArea-${index}`].y}%` : `${area.y}%`,
                                    left: manualPositions[`photoArea-${index}`]?.x ? `${manualPositions[`photoArea-${index}`].x}%` : `${area.x}%`,
                                    width: manualPositions[`photoArea-${index}`]?.scale ? `${manualPositions[`photoArea-${index}`].scale}%` : `${area.scale}%`,
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: area.zIndex || 5
                                }}
                            >
                                <img src={image} alt={`Item ${index + 1}`} className="w-full h-auto object-contain drop-shadow-xl" />
                            </motion.div>
                        );
                    })
                ) : (
                    // 従来通りの単一配置（中央優先）
                    productImage && (
                        <motion.div
                            drag
                            dragMomentum={false}
                            onDragEnd={(e, info) => handleDragEnd("productImage", e, info)}
                            className="absolute flex items-center justify-center cursor-move"
                            style={{
                                top: manualPositions.productImage?.y ? `${manualPositions.productImage.y}%` : aiLayout?.productLayout?.y ? `${aiLayout.productLayout.y}%` : '50%',
                                left: manualPositions.productImage?.x ? `${manualPositions.productImage.x}%` : aiLayout?.productLayout?.x ? `${aiLayout.productLayout.x}%` : '50%',
                                width: aiLayout?.productLayout?.scale ? `${aiLayout.productLayout.scale}%` : '60%',
                                transform: 'translate(-50%, -50%)',
                                zIndex: aiLayout?.productLayout?.zIndex || 5
                            }}
                        >
                            <img src={productImage} alt="Product" className="w-full h-auto object-contain drop-shadow-2xl" />
                        </motion.div>
                    )
                )}

                {showTextOverlay === "all" && catchphrase && (config.catchphrase || aiLayout?.catchphrase) && (
                    <motion.div
                        drag
                        dragMomentum={false}
                        onDragEnd={(e, info) => handleDragEnd("catchphrase", e, info)}
                        className="absolute z-10 font-bold cursor-move group h-auto"
                        style={{
                            ...(aiLayout?.catchphrase ? {
                                top: manualPositions.catchphrase?.y ? `${manualPositions.catchphrase.y}%` : `${aiLayout.catchphrase.y}%`,
                                left: manualPositions.catchphrase?.x ? `${manualPositions.catchphrase.x}%` : `${aiLayout.catchphrase.x}%`,
                                transform: aiLayout.catchphrase.align === 'center' ? 'translateX(-50%)' : 'none',
                                textAlign: aiLayout.catchphrase.align,
                                color: aiLayout.recommendedColor || config.catchphrase?.color || '#000'
                            } : config.catchphrase),
                            fontSize: getFontSize(1.2 * (aiLayout?.catchphrase?.fontSize / 10 || 1), "catchphrase"),
                            writingMode: verticalText.catchphrase ? 'vertical-rl' : 'horizontal-tb',
                            textOrientation: verticalText.catchphrase ? 'upright' : 'mixed'
                        }}
                    >
                        <div className="relative group">
                            {catchphrase}
                            <div className="absolute -top-10 -right-10 opacity-0 group-hover:opacity-100 flex gap-1 z-30 no-print">
                                <Button
                                    onClick={(e) => { e.stopPropagation(); toggleVertical("catchphrase"); }}
                                    className="bg-white shadow-xl border border-slate-100 rounded-full p-2 text-slate-500 hover:text-indigo-600 size-8 transition-all"
                                    title="縦書き切替"
                                >
                                    <TypeIcon className="size-4" />
                                </Button>
                                <Button
                                    onClick={(e) => { e.stopPropagation(); handleElementScaleChange("catchphrase", -0.1); }}
                                    className="bg-white shadow-xl border border-slate-100 rounded-full p-2 text-slate-500 hover:text-indigo-600 size-8 transition-all"
                                    title="縮小"
                                >
                                    <Minus className="size-4" />
                                </Button>
                                <Button
                                    onClick={(e) => { e.stopPropagation(); handleElementScaleChange("catchphrase", 0.1); }}
                                    className="bg-white shadow-xl border border-slate-100 rounded-full p-2 text-slate-500 hover:text-indigo-600 size-8 transition-all"
                                    title="拡大"
                                >
                                    <Plus className="size-4" />
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
                {/* 商品名・価格レイヤー：1商品=従来大きめ / 複数=メニューリスト */}
                {showTextOverlay === "all" && menuItems.length === 1 && productName && (config.productName || aiLayout?.productName) && (
                    <motion.div
                        drag
                        dragMomentum={false}
                        onDragEnd={(e, info) => handleDragEnd("productName", e, info)}
                        className="absolute z-10 font-black cursor-move group"
                        style={{
                            ...(aiLayout?.productName ? {
                                top: manualPositions.productName?.y ? `${manualPositions.productName.y}%` : `${aiLayout.productName.y}%`,
                                left: manualPositions.productName?.x ? `${manualPositions.productName.x}%` : `${aiLayout.productName.x}%`,
                                transform: aiLayout.productName.align === 'center' ? 'translateX(-50%)' : 'none',
                                textAlign: aiLayout.productName.align,
                                color: aiLayout.recommendedColor || config.productName?.color || '#000',
                                width: verticalText.productName ? 'auto' : '80%'
                            } : config.productName),
                            fontSize: getFontSize(3.5 * (aiLayout?.productName?.fontSize / 25 || 1), "productName"),
                            writingMode: verticalText.productName ? 'vertical-rl' : 'horizontal-tb',
                            textOrientation: verticalText.productName ? 'upright' : 'mixed'
                        }}
                    >
                        <div className="relative group">
                            {productName}
                            <div className="absolute -top-10 -right-10 opacity-0 group-hover:opacity-100 flex gap-1 z-30 no-print">
                                <Button onClick={(e) => { e.stopPropagation(); toggleVertical("productName"); }} className="bg-white shadow-xl border border-slate-100 rounded-full p-2 text-slate-500 hover:text-indigo-600 size-8 transition-all" title="縦書き切替"><TypeIcon className="size-4" /></Button>
                                <Button onClick={(e) => { e.stopPropagation(); handleElementScaleChange("productName", -0.1); }} className="bg-white shadow-xl border border-slate-100 rounded-full p-2 text-slate-500 hover:text-indigo-600 size-8 transition-all" title="縮小"><Minus className="size-4" /></Button>
                                <Button onClick={(e) => { e.stopPropagation(); handleElementScaleChange("productName", 0.1); }} className="bg-white shadow-xl border border-slate-100 rounded-full p-2 text-slate-500 hover:text-indigo-600 size-8 transition-all" title="拡大"><Plus className="size-4" /></Button>
                            </div>
                        </div>
                    </motion.div>
                )}
                {
                    showTextOverlay === "all" && description && (config.description || aiLayout?.description) && (
                        <motion.div
                            drag
                            dragMomentum={false}
                            onDragEnd={(e, info) => handleDragEnd("description", e, info)}
                            className="absolute z-10 leading-relaxed font-medium cursor-move group"
                            style={{
                                ...(aiLayout?.description ? {
                                    top: manualPositions.description?.y ? `${manualPositions.description.y}%` : `${aiLayout.description.y}%`,
                                    left: manualPositions.description?.x ? `${manualPositions.description.x}%` : `${aiLayout.description.x}%`,
                                    transform: aiLayout.description.align === 'center' ? 'translateX(-50%)' : 'none',
                                    textAlign: aiLayout.description.align,
                                    color: aiLayout.recommendedColor || config.description?.color || '#333',
                                    width: verticalText.description ? 'auto' : '75%'
                                } : config.description),
                                fontSize: getFontSize(1.0 * (aiLayout?.description?.fontSize / 12 || 1), "description"),
                                writingMode: verticalText.description ? 'vertical-rl' : 'horizontal-tb',
                                textOrientation: verticalText.description ? 'upright' : 'mixed'
                            }}
                        >
                            <div className="relative group">
                                {description}
                                <div className="absolute -top-8 -right-8 opacity-0 group-hover:opacity-100 flex gap-1 z-30 no-print">
                                    <Button onClick={(e) => { e.stopPropagation(); toggleVertical("description"); }} className="bg-white shadow-xl border border-slate-100 rounded-full p-1.5 text-slate-500 hover:text-indigo-600 size-7" title="縦書き切替"><TypeIcon className="size-3" /></Button>
                                    <Button onClick={(e) => { e.stopPropagation(); handleElementScaleChange("description", -0.1); }} className="bg-white shadow-xl border border-slate-100 rounded-full p-1.5 text-slate-500 hover:text-indigo-600 size-7" title="縮小"><Minus className="size-3" /></Button>
                                    <Button onClick={(e) => { e.stopPropagation(); handleElementScaleChange("description", 0.1); }} className="bg-white shadow-xl border border-slate-100 rounded-full p-1.5 text-slate-500 hover:text-indigo-600 size-7" title="拡大"><Plus className="size-3" /></Button>
                                </div>
                            </div>
                        </motion.div>
                    )
                }
                {/* 1商品時の価格表示 */}
                {showTextOverlay !== "none" && menuItems.length === 1 && price && (config.price || aiLayout?.price) && (
                    <motion.div
                        drag
                        dragMomentum={false}
                        onDragEnd={(e, info) => handleDragEnd("price", e, info)}
                        className="absolute z-10 font-black cursor-move group"
                        style={{
                            ...(aiLayout?.price ? {
                                top: manualPositions.price?.y ? `${manualPositions.price.y}%` : `${aiLayout.price.y}%`,
                                left: manualPositions.price?.x ? `${manualPositions.price.x}%` : `${aiLayout.price.x}%`,
                                transform: aiLayout.price.align === 'center' ? 'translateX(-50%)' : 'none',
                                textAlign: aiLayout.price.align,
                                color: aiLayout.recommendedColor || config.price?.color || '#b45309'
                            } : config.price),
                            fontSize: getFontSize(2.8 * (aiLayout?.price?.fontSize / 20 || 1), "price"),
                            writingMode: verticalText.price ? 'vertical-rl' : 'horizontal-tb',
                            textOrientation: verticalText.price ? 'upright' : 'mixed'
                        }}
                    >
                        <div className="relative group">
                            {price}
                            <div className="absolute -top-10 -right-10 opacity-0 group-hover:opacity-100 flex gap-1 z-30 no-print">
                                <Button onClick={(e) => { e.stopPropagation(); toggleVertical("price"); }} className="bg-white shadow-xl border border-slate-100 rounded-full p-2 text-slate-500 hover:text-indigo-600 size-8" title="縦書き切替"><TypeIcon className="size-4" /></Button>
                                <Button onClick={(e) => { e.stopPropagation(); handleElementScaleChange("price", -0.1); }} className="bg-white shadow-xl border border-slate-100 rounded-full p-2 text-slate-500 hover:text-indigo-600 size-8" title="縮小"><Minus className="size-4" /></Button>
                                <Button onClick={(e) => { e.stopPropagation(); handleElementScaleChange("price", 0.1); }} className="bg-white shadow-xl border border-slate-100 rounded-full p-2 text-slate-500 hover:text-indigo-600 size-8" title="拡大"><Plus className="size-4" /></Button>
                            </div>
                        </div>
                    </motion.div>
                )}
                {/* 複数商品時のメニューリスト表示 */}
                {showTextOverlay !== "none" && menuItems.length > 1 && menuItems.some(item => item.name) && (
                    <motion.div
                        drag
                        dragMomentum={false}
                        onDragEnd={(e, info) => handleDragEnd("menuList", e, info)}
                        className="absolute z-10 cursor-move group"
                        style={{
                            top: manualPositions.menuList?.y ? `${manualPositions.menuList.y}%` : aiLayout?.productName?.y ? `${aiLayout.productName.y}%` : '30%',
                            left: manualPositions.menuList?.x ? `${manualPositions.menuList.x}%` : '50%',
                            transform: 'translateX(-50%)',
                            width: '85%',
                            color: aiLayout?.recommendedColor || config.productName?.color || '#000'
                        }}
                    >
                        <div className="relative group">
                            <div className="space-y-1">
                                {menuItems.filter(item => item.name).map((item, idx) => {
                                    const sizeRatio = menuItems.length <= 3 ? 2.0 : menuItems.length <= 5 ? 1.5 : menuItems.length <= 7 ? 1.2 : 1.0;
                                    return (
                                        <div key={idx} className="flex items-baseline justify-between gap-2" style={{ fontSize: getFontSize(sizeRatio, "menuList") }}>
                                            <span className="font-black truncate">{item.name}</span>
                                            <span className="shrink-0 border-b border-dotted border-current opacity-30 flex-1 mx-1" />
                                            {item.price && <span className="font-black shrink-0 text-amber-700" style={{ color: aiLayout?.recommendedColor || config.price?.color || '#b45309' }}>{formatPrice(item.price)}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="absolute -top-10 -right-10 opacity-0 group-hover:opacity-100 flex gap-1 z-30 no-print">
                                <Button onClick={(e) => { e.stopPropagation(); handleElementScaleChange("menuList", -0.1); }} className="bg-white shadow-xl border border-slate-100 rounded-full p-2 text-slate-500 hover:text-indigo-600 size-8 transition-all" title="縮小"><Minus className="size-4" /></Button>
                                <Button onClick={(e) => { e.stopPropagation(); handleElementScaleChange("menuList", 0.1); }} className="bg-white shadow-xl border border-slate-100 rounded-full p-2 text-slate-500 hover:text-indigo-600 size-8 transition-all" title="拡大"><Plus className="size-4" /></Button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* QRコードレイヤー (V6: Superiority) */}
                {
                    qrContent && (
                        <motion.div
                            drag
                            dragMomentum={false}
                            onDragEnd={(e, info) => handleDragEnd("qr", e, info)}
                            className="absolute z-20 bg-white p-2 rounded-lg shadow-xl border border-slate-200 cursor-move group no-print-bg"
                            style={{
                                top: manualPositions.qr?.y ? `${manualPositions.qr.y}%` : '80%',
                                left: manualPositions.qr?.x ? `${manualPositions.qr.x}%` : '85%',
                                transform: 'translate(-50%, -50%)'
                            }}
                        >
                            <QRCodeCanvas value={qrContent} size={64} level="H" />
                        </motion.div>
                    )
                }
            </div >
        );
    };

    if (authLoading) return null;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="flex h-screen max-h-screen">
                <AppSidebar activePage="pop" user={user} />

                <main className="flex-1 overflow-y-auto bg-slate-50/50">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
                        {/* ヘッダーエリア */}
                        <header className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                            <div>
                                <h1 className="text-4xl font-black tracking-tighter text-slate-900 mb-2 flex items-center gap-3">
                                    <Sparkles className="size-8 text-indigo-500" />
                                    AIPOP Maker <span className="text-indigo-500 text-2xl">V2</span>
                                </h1>
                                <p className="text-slate-500 font-medium tracking-tight">
                                    写真をアップして、AIと一緒に最高の一枚を。
                                </p>
                            </div>
                            <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200 w-fit">
                                <button
                                    onClick={() => setActiveTab("create")}
                                    className={`px-6 py-2 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === "create" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"}`}
                                >
                                    <Wand2 className="size-4" /> デザイン作成
                                </button>
                                <button
                                    onClick={() => setActiveTab("favorites")}
                                    className={`px-6 py-2 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === "favorites" ? "bg-pink-500 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"}`}
                                >
                                    <Heart className="size-4" /> お気に入り
                                </button>
                            </div>
                        </header>

                        {!hasFeature('ai_pop') ? (
                            <Card className="border-dashed border-2 py-20 text-center bg-white shadow-xl rounded-3xl">
                                {/* ... 制限表示は維持 ... */}
                                <div className="max-w-md mx-auto space-y-6">
                                    <div className="inline-flex p-4 bg-slate-100 rounded-full">
                                        <Lock className="size-10 text-slate-400" />
                                    </div>
                                    <h2 className="text-2xl font-black">Proプラン限定機能です</h2>
                                    <p className="text-slate-500 font-medium">
                                        AI POP作成 V2は、より高度な販促支援を行う上位プラン専用のツールです。
                                    </p>
                                    <Button className="font-black bg-indigo-600 hover:bg-indigo-700 h-14 px-8 rounded-2xl shadow-xl shadow-indigo-200" onClick={() => window.location.href = '/plans'}>
                                        プランをアップグレード
                                    </Button>
                                </div>
                            </Card>
                        ) : activeTab === "create" ? (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {/* ステップガイド */}
                                <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-3xl overflow-hidden p-8 bg-white">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                        {/* STEP 1: 画像アップロード */}
                                        <div className="lg:col-span-4 space-y-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="inline-flex items-center justify-center size-6 rounded-full bg-indigo-600 text-white text-[10px] font-black shrink-0">1</span>
                                                <Label className="text-sm font-black text-slate-800">テンプレート・商品画像をアップ</Label>
                                            </div>
                                            <Label className="text-sm font-black text-slate-800 flex items-center gap-2">
                                                <ImageIcon className="size-4 text-indigo-500" /> 商品写真
                                            </Label>
                                            <div
                                                onClick={() => { if (!isDroppingRef.current) fileInputRef.current?.click(); }}
                                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverProduct(true); }}
                                                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) setDragOverProduct(false); }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    isDroppingRef.current = true;
                                                    setTimeout(() => { isDroppingRef.current = false; }, 100);
                                                    setDragOverProduct(false);
                                                    const file = e.dataTransfer.files?.[0];
                                                    const ext = file?.name?.toLowerCase()?.split('.').pop() || '';
                                                    const isImage = file && (file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext));
                                                    if (isImage) {
                                                        pushHistory();
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setProductImage(reader.result as string);
                                                            toast.success("画像を読み込みました");
                                                        };
                                                        reader.readAsDataURL(file);
                                                    } else if (file) {
                                                        toast.error("画像ファイルをドロップしてください");
                                                    }
                                                }}
                                                className={`aspect-square rounded-2xl border-2 border-dashed ${dragOverProduct ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' : 'border-slate-200 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50'} flex flex-col items-center justify-center cursor-pointer transition-all group relative overflow-hidden`}
                                            >
                                                {productImage ? (
                                                    <div className="relative w-full h-full">
                                                        <img src={productImage} alt="Preview" className="w-full h-full object-cover" />
                                                        <Button
                                                            variant="destructive"
                                                            size="icon"
                                                            className="absolute top-2 right-2 size-8 rounded-full shadow-lg z-10"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                pushHistory();
                                                                setProductImage(null);
                                                            }}
                                                        >
                                                            <Eraser className="size-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="text-center p-6">
                                                        <div className="size-12 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                                            <Plus className="size-6 text-indigo-500" />
                                                        </div>
                                                        <p className="text-xs font-black text-slate-500">写真をアップロード</p>
                                                    </div>
                                                )}
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    onChange={(e) => {
                                                        pushHistory();
                                                        handleImageUpload(e);
                                                    }}
                                                    className="hidden"
                                                    accept="image/*"
                                                />
                                            </div>

                                            <div className="flex items-center justify-between pt-2">
                                                <Label className="text-sm font-black text-slate-800 flex items-center gap-2 whitespace-nowrap">
                                                    <LayoutIcon className="size-4 text-slate-400" /> 背景（テンプレート）
                                                </Label>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-3 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                        onClick={() => window.open('https://www.canva.com/', '_blank')}
                                                    >
                                                        Canva
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-3 text-xs font-bold text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                                        onClick={() => window.open('https://new.express.adobe.com/', '_blank')}
                                                    >
                                                        Adobe
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-3 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                        onClick={() => window.open('https://marketingkit.withgoogle.com/', '_blank')}
                                                    >
                                                        Google
                                                    </Button>
                                                </div>
                                            </div>
                                            <div
                                                onClick={() => { if (!isDroppingRef.current) bgInputRef.current?.click(); }}
                                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverBg(true); }}
                                                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) setDragOverBg(false); }}
                                                onDrop={async (e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    isDroppingRef.current = true;
                                                    setTimeout(() => { isDroppingRef.current = false; }, 100);
                                                    setDragOverBg(false);
                                                    const file = e.dataTransfer.files?.[0];
                                                    if (!file) return;
                                                    const ext = file.name?.toLowerCase()?.split('.').pop() || '';
                                                    const isPdf = file.type === 'application/pdf' || ext === 'pdf';
                                                    const isImage = file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext);
                                                    pushHistory();
                                                    if (isPdf) {
                                                        const loadingToast = toast.loading("PDFを画像に変換中...");
                                                        try {
                                                            // @ts-ignore
                                                            const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
                                                            const VERSION = "5.4.624";
                                                            pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${VERSION}/build/pdf.worker.min.mjs`;
                                                            const arrayBuffer = await file.arrayBuffer();
                                                            const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
                                                            const page = await pdf.getPage(1);
                                                            const viewport = page.getViewport({ scale: 3.0 });
                                                            const canvas = document.createElement('canvas');
                                                            const context = canvas.getContext('2d');
                                                            if (!context) throw new Error("Canvas context is not available");
                                                            canvas.height = viewport.height;
                                                            canvas.width = viewport.width;
                                                            await page.render({ canvasContext: context, viewport }).promise;
                                                            setBackgroundCustomImage(canvas.toDataURL('image/png'));
                                                            toast.success("PDFからデザインを取り込みました！", { id: loadingToast });
                                                        } catch (error: any) {
                                                            toast.error(`PDFの変換に失敗しました: ${error.message || "不明なエラー"}`, { id: loadingToast });
                                                        }
                                                    } else if (isImage) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setBackgroundCustomImage(reader.result as string);
                                                            toast.success("画像を背景として設定しました");
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                                className={`aspect-[4/3] rounded-2xl border-2 border-dashed ${dragOverBg ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' : 'border-slate-200 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'} flex flex-col items-center justify-center cursor-pointer transition-all group relative overflow-hidden`}
                                            >
                                                {backgroundCustomImage ? (
                                                    <div className="relative w-full h-full" >
                                                        <img src={backgroundCustomImage} alt="Background Preview" className="w-full h-full object-cover opacity-60" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                className="bg-white/90 hover:bg-white text-indigo-600 font-black h-8"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleAnalyzeTemplate(backgroundCustomImage);
                                                                }}
                                                            >
                                                                <Sparkles className="size-3.5 mr-1.5" />
                                                                AIで枠を検出
                                                            </Button>
                                                        </div>
                                                        <Button
                                                            variant="destructive"
                                                            size="icon"
                                                            className="absolute top-2 right-2 size-8 rounded-full shadow-lg z-10"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                pushHistory();
                                                                setBackgroundCustomImage(null);
                                                                // AIレイアウトもリセット
                                                                setAiLayout(null);
                                                            }}
                                                        >
                                                            <Eraser className="size-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="text-center p-4">
                                                        <Upload className="size-6 text-slate-400 mx-auto mb-2" />
                                                        <p className="text-[10px] font-bold text-slate-400">画像 または PDF をアップ</p>
                                                    </div>
                                                )}
                                                <input
                                                    type="file"
                                                    ref={bgInputRef}
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;

                                                        pushHistory();

                                                        if (file.type === "application/pdf") {
                                                            const loadingToast = toast.loading("PDFを画像に変換中...");
                                                            try {
                                                                // pdfjs-dist v5 系では動的インポートの挙動に注意が必要
                                                                // @ts-ignore
                                                                const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
                                                                const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.mjs');

                                                                // ワーカーの設定（CDN経由で安定化を図る）
                                                                const VERSION = "5.4.624"; // package.json に合わせる
                                                                pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${VERSION}/build/pdf.worker.min.mjs`;

                                                                const arrayBuffer = await file.arrayBuffer();
                                                                const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
                                                                const page = await pdf.getPage(1);

                                                                // 高画質化のためスケール3倍（A4等で文字がボケないように）
                                                                const viewport = page.getViewport({ scale: 3.0 });
                                                                const canvas = document.createElement('canvas');
                                                                const context = canvas.getContext('2d');

                                                                if (!context) throw new Error("Canvas context is not available");

                                                                canvas.height = viewport.height;
                                                                canvas.width = viewport.width;

                                                                const renderTask = page.render({
                                                                    canvasContext: context,
                                                                    viewport: viewport
                                                                });

                                                                await renderTask.promise;

                                                                // 背景画像としてセット
                                                                setBackgroundCustomImage(canvas.toDataURL('image/png'));
                                                                toast.success("PDFからデザインを取り込みました！", { id: loadingToast });
                                                            } catch (error: any) {
                                                                console.error("PDF Conversion Error:", error);
                                                                toast.error(`PDFの変換に失敗しました: ${error.message || "不明なエラー"}`, { id: loadingToast });
                                                            }
                                                        } else {
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => {
                                                                setBackgroundCustomImage(reader.result as string);
                                                                toast.success("画像を背景として設定しました");
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                    className="hidden"
                                                    accept="image/*,.pdf"
                                                />
                                            </div>

                                            {/* 外部URLインポート */}
                                            <div className="space-y-2">
                                                <div className="flex gap-2">
                                                    <Input
                                                        value={externalUrl}
                                                        onChange={(e) => setExternalUrl(e.target.value)}
                                                        placeholder="Google Drive 等の画像URL"
                                                        className="h-9 text-xs rounded-lg border-slate-200"
                                                    />
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        className="h-9 px-3 font-bold text-xs shrink-0"
                                                        onClick={handleImportFromUrl}
                                                        disabled={isImporting || !externalUrl}
                                                    >
                                                        {isImporting ? <Loader2 className="size-3 animate-spin" /> : "取込"}
                                                    </Button>
                                                </div>
                                                <p className="text-[9px] text-slate-400 leading-tight">
                                                    ※外部ツールの共有リンク（公開設定）を貼り付けると背景として即座に反映されます。
                                                </p>
                                            </div>
                                        </div>

                                        {/* STEP 2: テキスト入力 */}
                                        <div className="lg:col-span-8 flex flex-col justify-between py-2">
                                            <div className="flex items-center gap-2 mb-4">
                                                <span className="inline-flex items-center justify-center size-6 rounded-full bg-indigo-600 text-white text-[10px] font-black shrink-0">2</span>
                                                <Label className="text-sm font-black text-slate-800">商品名・価格を入れる</Label>
                                            </div>
                                            {/* 通貨単位セレクター */}
                                            <div className="flex items-center gap-1.5 mb-3">
                                                <span className="text-[10px] font-black text-slate-400 mr-1">通貨</span>
                                                {(["￥", "円", "$"] as CurrencyUnit[]).map((unit) => (
                                                    <button
                                                        key={unit}
                                                        onClick={() => setCurrencyUnit(unit)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${currencyUnit === unit
                                                            ? "bg-indigo-600 text-white shadow-md"
                                                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                            }`}
                                                    >
                                                        {unit}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="space-y-2">
                                                {menuItems.map((item, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black text-slate-400 w-4 text-right shrink-0">{idx + 1}</span>
                                                        <Input
                                                            value={item.name}
                                                            onChange={e => updateMenuItem(idx, "name", e.target.value)}
                                                            placeholder={idx === 0 ? "例: 特製黒毛和牛ハンバーグ" : "商品名"}
                                                            className="h-10 rounded-lg border-slate-200 font-bold text-sm flex-1"
                                                        />
                                                        <div className="relative w-32 shrink-0">
                                                            <Input
                                                                value={item.price}
                                                                onChange={e => {
                                                                    const v = e.target.value.replace(/[^0-9]/g, "");
                                                                    updateMenuItem(idx, "price", v);
                                                                }}
                                                                inputMode="numeric"
                                                                placeholder={idx === 0 ? "1500" : "価格"}
                                                                className="h-10 rounded-lg border-slate-200 font-black text-indigo-600 text-sm w-full pr-8"
                                                            />
                                                            {item.price && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">{currencyUnit}</span>}
                                                        </div>
                                                        {menuItems.length > 1 && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-8 shrink-0 text-slate-400 hover:text-red-500"
                                                                onClick={() => removeMenuItem(idx)}
                                                            >
                                                                <Minus className="size-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}
                                                {menuItems.length < 10 && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={addMenuItem}
                                                        className="w-full h-9 rounded-lg border-dashed border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 gap-1.5 text-xs font-bold"
                                                    >
                                                        <Plus className="size-3.5" /> 商品を追加（{menuItems.length}/10）
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="space-y-2 mt-4">
                                                <Label className="text-xs font-black text-slate-600">ポイント・こだわり</Label>
                                                <Textarea
                                                    value={features}
                                                    onChange={e => setFeatures(e.target.value)}
                                                    placeholder="例: 24時間煮込んだ特製デミグラスソース。肉汁が溢れ出します。"
                                                    className="rounded-xl border-slate-200 font-medium resize-none min-h-[80px] text-sm"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                                                <Button
                                                    onClick={handleAiDesignAssistant}
                                                    disabled={generating}
                                                    className="bg-indigo-600 hover:bg-indigo-700 h-16 rounded-2xl text-lg font-black shadow-xl shadow-indigo-100 gap-3 transition-all active:scale-95"
                                                >
                                                    {generating ? <Loader2 className="size-6 animate-spin" /> : <Wand2 className="size-6" />}
                                                    AIにおまかせ
                                                </Button>

                                                <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            className="border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 h-16 rounded-2xl text-lg font-black gap-3 transition-all active:scale-95 text-indigo-700"
                                                        >
                                                            <MessageCircle className="size-6" />
                                                            AIと相談しながら作る
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col p-0 overflow-hidden bg-slate-50 border-none rounded-3xl">
                                                        <DialogHeader className="p-6 bg-white border-b shrink-0">
                                                            <DialogTitle className="flex items-center gap-2 text-indigo-600 font-black">
                                                                <Wand2 className="size-5" />
                                                                AIデザイン・コンシェルジュ
                                                            </DialogTitle>
                                                        </DialogHeader>

                                                        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
                                                            <div className="space-y-4">
                                                                {chatMessages.length === 0 && (
                                                                    <div className="text-center py-10 space-y-4">
                                                                        <div className="size-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
                                                                            <Sparkles className="size-8 text-indigo-600" />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <p className="font-black text-slate-800">今日はどんなPOPを作りますか？</p>
                                                                            <p className="text-xs text-slate-500">「もっと高級感を出して」「写真を左に寄せて」「短いキャッチコピーにして」など、自由にお伝えください。</p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {chatMessages.map((msg, i) => (
                                                                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                                                        <div className={`max-w-[85%] rounded-2xl p-4 text-sm shadow-sm ${msg.role === "user"
                                                                                ? "bg-indigo-600 text-white rounded-tr-none"
                                                                                : "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                                                                            }`}>
                                                                            {msg.images && msg.images.length > 0 && (
                                                                                <div className="grid grid-cols-2 gap-2 mb-2">
                                                                                    {msg.images.map((img, idx) => (
                                                                                        <img key={idx} src={img} className="rounded-lg w-full h-24 object-cover border border-white/20" />
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                            <p className="whitespace-pre-wrap leading-relaxed">
                                                                                {msg.content.replace(/```json[\s\S]*?```/, "").trim() || "新しいデザインを提案しました。"}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {generating && (
                                                                    <div className="flex justify-start">
                                                                        <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
                                                                            <Loader2 className="size-4 animate-spin text-indigo-500" />
                                                                            <span className="text-xs font-bold text-slate-400">AIが思考中...</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </ScrollArea>

                                                        <div className="p-4 bg-white border-t shrink-0">
                                                            {chatUploadedImages.length > 0 && (
                                                                <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                                                                    {chatUploadedImages.map((img, i) => (
                                                                        <div key={i} className="relative shrink-0">
                                                                            <img src={img} className="size-16 rounded-xl object-cover border-2 border-indigo-100 shadow-sm" />
                                                                            <button
                                                                                onClick={() => setChatUploadedImages(prev => prev.filter((_, idx) => idx !== i))}
                                                                                className="absolute -top-1 -right-1 bg-slate-900 text-white rounded-full size-5 flex items-center justify-center text-[10px]"
                                                                            >
                                                                                ×
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <div className="flex items-end gap-2">
                                                                <div className="flex-1 bg-slate-100 rounded-2xl p-2 focus-within:ring-2 ring-indigo-500/20 transition-all">
                                                                    <textarea
                                                                        value={chatInput}
                                                                        onChange={e => setChatInput(e.target.value)}
                                                                        onKeyDown={e => {
                                                                            if (e.key === "Enter" && !e.shiftKey) {
                                                                                e.preventDefault();
                                                                                handleSendChatMessage();
                                                                            }
                                                                        }}
                                                                        placeholder="どうしたいか教えてください..."
                                                                        className="w-full bg-transparent border-none focus:ring-0 text-sm p-2 resize-none h-10 max-h-32"
                                                                    />
                                                                    <div className="flex items-center justify-between px-1 pt-1 border-t border-slate-200/50 mt-1">
                                                                        <div className="flex gap-1">
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="size-8 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-white"
                                                                                onClick={() => chatFileInputRef.current?.click()}
                                                                            >
                                                                                <Paperclip className="size-4" />
                                                                            </Button>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className={`size-8 rounded-full ${isListening ? "bg-red-50 text-red-500" : "text-slate-400 hover:text-indigo-600 hover:bg-white"}`}
                                                                                onClick={startListening}
                                                                            >
                                                                                {isListening ? <Mic className="size-4 animate-pulse" /> : <Mic className="size-4" />}
                                                                            </Button>
                                                                        </div>
                                                                        <input
                                                                            type="file"
                                                                            ref={chatFileInputRef}
                                                                            className="hidden"
                                                                            multiple
                                                                            accept="image/*"
                                                                            onChange={handleChatImageUpload}
                                                                        />
                                                                        <Button
                                                                            size="sm"
                                                                            className="bg-indigo-600 hover:bg-indigo-700 h-8 rounded-xl px-4 font-black gap-2 transition-all active:scale-95"
                                                                            onClick={handleSendChatMessage}
                                                                            disabled={generating || (!chatInput.trim() && chatUploadedImages.length === 0)}
                                                                        >
                                                                            送信 <Send className="size-3" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </div>
                                    </div>
                                </Card >

                                {hasFeature('ai_pop') && activeTab === "create" && (
                                    <div className="flex gap-4 mb-2">
                                        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-fit">
                                            {(["a4", "poster", "sns"] as const).map((s) => (
                                                <button
                                                    key={s}
                                                    onClick={() => setOutputSize(s)}
                                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${outputSize === s ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600"}`}
                                                >
                                                    {s === "a4" && "A4印刷"}
                                                    {s === "poster" && "ポスター"}
                                                    {s === "sns" && "SNS(正方形)"}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )
                                }

                                {/* Step 2: プレビュー & カスタマイズ */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
                                    {/* 左側: プレビュー — STEP 4: 配置 & STEP 5: サイズ調整 */}
                                    <div className="lg:col-span-7 space-y-4">
                                        <div className="flex items-center justify-between px-2">
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center justify-center size-6 rounded-full bg-indigo-600 text-white text-[10px] font-black shrink-0">4</span>
                                                <Label className="text-sm font-black text-slate-800 flex items-center gap-2">
                                                    <Sparkles className="size-4 text-indigo-500" /> 文字や価格を配置する
                                                </Label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center justify-center size-6 rounded-full bg-indigo-600 text-white text-[10px] font-black shrink-0">5</span>
                                                <Button size="icon" variant="outline" className="rounded-full size-8" onClick={() => { pushHistory(); setFontScale(s => Math.max(50, s - 10)); }} title="文字を小さく">
                                                    <AArrowDown className="size-4" />
                                                </Button>
                                                <div className="w-10 text-center text-xs font-black leading-8">{fontScale}%</div>
                                                <Button size="icon" variant="outline" className="rounded-full size-8" onClick={() => { pushHistory(); setFontScale(s => Math.min(200, s + 10)); }} title="文字を大きく">
                                                    <AArrowUp className="size-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-400 px-2 -mt-2">※プレビュー上の文字をドラッグして好きな位置に移動できます</p>
                                        <p className="text-[10px] text-slate-400 px-2 -mt-1 flex items-center gap-1.5">
                                            <span className="inline-flex items-center justify-center size-4 rounded-full bg-indigo-600 text-white text-[8px] font-black shrink-0">6</span>
                                            文字にカーソルを合わせると＋/−ボタンで個別にサイズ調整できます
                                        </p>
                                        <div className="bg-white rounded-[40px] p-6 shadow-2xl border-8 border-slate-100/50 relative">
                                            <div ref={popRef} className="rounded-2xl overflow-hidden shadow-inner bg-slate-50">
                                                {renderPop()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 右側: 調整 & アクション */}
                                    <div className="lg:col-span-5 space-y-6">
                                        {/* フォント選択 - タブ切替方式 */}
                                        <Card className="border-0 shadow-xl rounded-2xl p-6 bg-white">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="inline-flex items-center justify-center size-6 rounded-full bg-indigo-600 text-white text-[10px] font-black shrink-0">3</span>
                                                <Label className="text-sm font-black text-slate-800">フォントを決める</Label>
                                            </div>

                                            {/* 日本語 / 英字 タブボタン */}
                                            <div className="flex bg-slate-100 p-1 rounded-xl mb-3 w-fit">
                                                <button
                                                    onClick={() => setFontTab("jp")}
                                                    className={`px-5 py-1.5 rounded-lg text-xs font-black transition-all ${fontTab === "jp" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                                                >
                                                    日本語
                                                </button>
                                                <button
                                                    onClick={() => setFontTab("en")}
                                                    className={`px-5 py-1.5 rounded-lg text-xs font-black transition-all ${fontTab === "en" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                                                >
                                                    英字
                                                </button>
                                            </div>

                                            {/* 和文フォント */}
                                            {fontTab === "jp" && (
                                                <div className="grid grid-cols-2 gap-1.5">
                                                    {[
                                                        { id: "font-meiryo", label: "メイリオ", cls: "font-meiryo" },
                                                        { id: "font-noto-sans", label: "Noto Sans ゴシック", cls: "font-noto-sans" },
                                                        { id: "font-noto-serif", label: "Noto Serif 明朝", cls: "font-noto-serif" },
                                                        { id: "font-zen-maru", label: "Zen 丸ゴシック", cls: "font-zen-maru" },
                                                        { id: "font-zen-kaku", label: "Zen 角ゴシック", cls: "font-zen-kaku" },
                                                        { id: "font-shippori", label: "しっぽり明朝", cls: "font-shippori" },
                                                        { id: "font-yuji", label: "游字 筆文字", cls: "font-yuji" },
                                                        { id: "font-yuji-boku", label: "本格筆文字 (墨)", cls: "font-yuji-boku" },
                                                        { id: "font-reggae", label: "Reggae インパクト", cls: "font-reggae" },
                                                        { id: "font-rocknroll", label: "RocknRoll ポップ", cls: "font-rocknroll" },
                                                        { id: "font-tegomin", label: "手書き明朝", cls: "font-tegomin" },
                                                        { id: "font-kurenaido", label: "手書きサイン風", cls: "font-kurenaido" },
                                                        { id: "font-stick", label: "Stick エッジ", cls: "font-stick" },
                                                        { id: "font-kaisei", label: "解星 装飾", cls: "font-kaisei" },
                                                        { id: "font-dela", label: "Dela Gothic 極太", cls: "font-dela" },
                                                        { id: "font-dot", label: "ドットゴシック", cls: "font-dot" },
                                                        { id: "font-mplus-round", label: "M+ Rounded", cls: "font-mplus-round" },
                                                    ].map((f) => (
                                                        <button
                                                            key={f.id}
                                                            onClick={() => handleFontChange(f.id)}
                                                            className={`px-2.5 py-2 rounded-lg text-[11px] text-left transition-all border ${f.cls} ${fontFamily === f.id
                                                                ? "bg-indigo-50 border-indigo-500 text-indigo-700 font-bold shadow-sm"
                                                                : "bg-white border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                                                }`}
                                                        >
                                                            {f.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* 欧文フォント */}
                                            {fontTab === "en" && (
                                                <div className="grid grid-cols-2 gap-1.5">
                                                    {[
                                                        { id: "font-inter", label: "Inter Modern", cls: "font-inter" },
                                                        { id: "font-montserrat", label: "Montserrat", cls: "font-montserrat" },
                                                        { id: "font-playfair", label: "Playfair Display", cls: "font-playfair" },
                                                        { id: "font-oswald", label: "Oswald Bold", cls: "font-oswald" },
                                                        { id: "font-bebas", label: "Bebas Neue", cls: "font-bebas" },
                                                        { id: "font-abril", label: "Abril Fatface", cls: "font-abril" },
                                                        { id: "font-lobster", label: "Lobster", cls: "font-lobster" },
                                                        { id: "font-pacifico", label: "Pacifico", cls: "font-pacifico" },
                                                        { id: "font-caveat", label: "Caveat", cls: "font-caveat" },
                                                        { id: "font-dancing", label: "Dancing Script", cls: "font-dancing" },
                                                    ].map((f) => (
                                                        <button
                                                            key={f.id}
                                                            onClick={() => handleFontChange(f.id)}
                                                            className={`px-2.5 py-2 rounded-lg text-[11px] text-left transition-all border ${f.cls} ${fontFamily === f.id
                                                                ? "bg-indigo-50 border-indigo-500 text-indigo-700 font-bold shadow-sm"
                                                                : "bg-white border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                                                }`}
                                                        >
                                                            {f.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </Card>

                                        {/* Google超えセクション: クチコミ & QR (V6) */}
                                        <Card className="border-0 shadow-xl rounded-2xl p-6 bg-gradient-to-br from-indigo-50 to-white border-l-4 border-indigo-500">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Label className="text-sm font-black text-slate-800">集客を強化する (V6)</Label>
                                                <Badge className="bg-indigo-500 text-[10px] h-4">Google超え</Badge>
                                            </div>
                                            <div className="space-y-4">
                                                <div>
                                                    <Label className="text-[10px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                                                        <Star className="size-3 text-orange-400 fill-orange-400" /> Googleのクチコミをコピーに変換
                                                    </Label>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            value={reviewText}
                                                            onChange={(e) => setReviewText(e.target.value)}
                                                            placeholder="良いクチコミを貼り付け..."
                                                            className="text-xs h-9 rounded-lg"
                                                        />
                                                        <Button
                                                            size="sm"
                                                            onClick={handleGenerateFromReview}
                                                            disabled={generating || !reviewText}
                                                            className="bg-indigo-600 hover:bg-indigo-700 h-9 px-3"
                                                        >
                                                            {generating ? <Loader2 className="size-3 animate-spin" /> : <Wand2 className="size-3" />}
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label className="text-[10px] font-bold text-slate-500 mb-1.5">誘導先URL (QRコード)</Label>
                                                    <Input
                                                        value={qrContent}
                                                        onChange={(e) => setQrContent(e.target.value)}
                                                        placeholder="https://instabio.cc/your-store"
                                                        className="text-xs h-9 rounded-lg"
                                                    />
                                                    <p className="text-[8px] text-slate-400 mt-1">※QRはドラッグして好きな場所に配置できます</p>
                                                </div>
                                            </div>
                                        </Card>

                                        {/* AIフォント提案 */}
                                        <Card className="border-0 shadow-xl rounded-2xl p-4 bg-gradient-to-r from-indigo-50 to-white">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                                                    <Sparkles className="size-3.5 text-indigo-500" /> AIがフォントを提案
                                                </Label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleSuggestFont}
                                                    disabled={generating || (!backgroundCustomImage && !aiLayout?.bg)}
                                                    className="h-7 px-3 text-[10px] font-black text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg"
                                                >
                                                    {generating ? <Loader2 className="size-3 animate-spin" /> : "画像から解析"}
                                                </Button>
                                            </div>
                                            <p className="text-[9px] text-slate-400 mt-1">※背景画像をアップロード後に利用可能</p>
                                        </Card>

                                        {/* アクションボタン */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <Button
                                                variant="outline"
                                                onClick={handleAddToFavorite}
                                                className="h-16 rounded-2xl border-2 border-pink-100 hover:border-pink-200 hover:bg-pink-50 text-pink-500 font-bold gap-2 transition-all active:scale-95"
                                            >
                                                <Heart className={`size-5 ${favorites.length > 0 ? "fill-pink-500" : ""}`} /> お気に入り
                                            </Button>
                                            <Button
                                                onClick={handlePrint}
                                                className="h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold gap-2 transition-all active:scale-95"
                                            >
                                                <Printer className="size-5" /> 印刷 / 保存
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div >
                        ) : (
                            /* お気に入りタブ */
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {favorites.length === 0 ? (
                                    <div className="text-center py-32 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                        <div className="size-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Star className="size-8 text-slate-300" />
                                        </div>
                                        <p className="text-slate-400 font-bold">お気に入りのデザインはまだありません</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                        {favorites.map((fav) => (
                                            <Card key={fav.id} className="group overflow-hidden rounded-2xl border-0 shadow-lg hover:shadow-2xl transition-all h-fit">
                                                <div className="aspect-[1/1.414] bg-slate-100 relative">
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                                                        <p className="text-[10px] font-black text-slate-800 line-clamp-1">{fav.productName}</p>
                                                        <p className="text-[8px] text-slate-500 mt-1">{fav.timestamp}</p>
                                                    </div>
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4">
                                                        <Button
                                                            size="sm"
                                                            className="w-full bg-white text-slate-900 hover:bg-slate-100 font-black"
                                                            onClick={() => {
                                                                setMenuItems(fav.menuItems || [{ name: fav.productName || "", price: fav.price || "" }]);
                                                                setCatchphrase(fav.catchphrase);
                                                                setDescription(fav.description);
                                                                setStyle(fav.style);
                                                                setFontFamily(fav.fontFamily);
                                                                setProductImage(fav.productImage);
                                                                setActiveTab("create");
                                                                toast.success("デザインを復元しました");
                                                            }}
                                                        >
                                                            編集
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            className="w-full font-black"
                                                            onClick={() => handleRemoveFavorite(fav.id)}
                                                        >
                                                            削除
                                                        </Button>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div >
                </main >
                <div className="sticky top-8">
                    <div className="flex items-center justify-between mb-4 bg-muted/30 p-2 rounded-xl">
                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-2">Preview</span>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={handlePrint} className="h-8 gap-1.5 font-bold text-xs bg-white">
                                <Printer className="size-3.5" /> 印刷
                            </Button>
                            <Button size="sm" variant="default" className="h-8 gap-1.5 font-bold text-xs bg-indigo-600" onClick={handleSyncToWebsite} disabled={generating}>
                                {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />} WEBサイトへ同期
                            </Button>
                            <Button size="sm" variant="default" className="h-8 gap-1.5 font-bold text-xs bg-slate-900">
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

                </div>
            </div >
        </div >
    );
}
