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
    ArrowRight,
    Zap
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

import { MenuItem, PopLayout, ManualPosition, PopState, FavoritePop, ChatMessage, CurrencyUnit, PopCategory } from "@/types/pop-maker";

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
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [chatUploadedImages, setChatUploadedImages] = useState<string[]>([]);
    const chatFileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isFirstVisit, setIsFirstVisit] = useState(true);
    const [isWizardMode, setIsWizardMode] = useState(false);
    const [wizardStep, setWizardStep] = useState(0); // 0:なし, 1:商品写真, 2:テンプレート, 3:基本情報案内
    const [wizardCompleted, setWizardCompleted] = useState(false);
    const [promisedProductImage, setPromisedProductImage] = useState(false);
    const [promisedBgTemplate, setPromisedBgTemplate] = useState(false);
    const [wizardPurpose, setWizardPurpose] = useState<"menu" | "info">("menu");
    const [promisedItemCount, setPromisedItemCount] = useState(1);
    const [wizardStyle, setWizardStyle] = useState<"washoku" | "pop" | "modern">("modern");
    const [isTextOnly, setIsTextOnly] = useState(false);
    const [promisedAiImageCount, setPromisedAiImageCount] = useState(0);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
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
        setMenuItems((prev: MenuItem[]) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    // AI Output States
    const [catchphrase, setCatchphrase] = useState("本日の極上メニュー");
    const [description, setDescription] = useState("こだわりの素材を使用した、職人自慢の一品です。");

    // V2 New States
    const [productImage, setProductImage] = useState<string | null>(null);
    const [backgroundCustomImage, setBackgroundCustomImage] = useState<string | null>(null);
    const [favorites, setFavorites] = useState<FavoritePop[]>([]);
    const [activeTab, setActiveTab] = useState<"create" | "favorites">("create");
    const [aiLayout, setAiLayout] = useState<PopLayout | null>(null);

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
                setAiLayout((prev) => ({
                    ...prev,
                    photoAreas: data.photoAreas,
                    detectedStyle: data.detectedStyle,
                    styleType: data.detectedStyle || prev?.styleType || 'modern',
                    recommendedColor: prev?.recommendedColor || '#000',
                    layout: prev?.layout || {}
                } as PopLayout));
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
    const [manualPositions, setManualPositions] = useState<Record<string, ManualPosition>>({});
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
    const [history, setHistory] = useState<PopState[]>([]);

    const getCurrentState = (): PopState => ({
        menuItems, currencyUnit, itemCategory, features, catchphrase, description,
        productImage, backgroundCustomImage, fontFamily, fontScale, aiLayout,
        manualPositions, verticalText, style, elementScales
    });

    const pushHistory = () => {
        const currentState = getCurrentState();
        setHistory((prev) => [...prev.slice(-19), currentState]); // Max 20 steps
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const prevState = history[history.length - 1];
        setHistory((prev) => prev.slice(0, -1));

        setMenuItems(prevState.menuItems);
        setCurrencyUnit(prevState.currencyUnit);
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
        setElementScales((prev: Record<string, number>) => ({
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
        const hasProductImage = !!productImage;
        const hasBgTemplate = !!backgroundCustomImage;

        const currentName = productName || menuItems[0]?.name;
        const currentPrice = price || menuItems[0]?.price;
        const currentFeatures = features || description;

        const hasName = !!currentName;
        const hasPrice = !!currentPrice;
        const hasFeatures = !!currentFeatures;

        // ウィザード未完了なら開始
        if (!wizardCompleted) {
            setPromisedProductImage(false);
            setPromisedBgTemplate(false);
            setIsChatOpen(true);
            setIsWizardMode(true);
            setWizardStep(1);
            setChatMessages([
                {
                    role: "model",
                    content: "AIデザイン・コンシェルジュへようこそ！最高の一枚を作るために、いくつか教えてください。\n\nまず、**商品（料理）の写真**はありますか？"
                }
            ]);
            return;
        }

        // ウィザード完了後のバリデーションチェック
        const missingItems: string[] = [];
        if (!hasName) missingItems.push("商品名");
        if (!hasPrice) missingItems.push("価格");
        if (!hasFeatures) missingItems.push("こだわりポイント");
        if (promisedProductImage && !hasProductImage) missingItems.push("商品写真");
        if (promisedBgTemplate && !hasBgTemplate) missingItems.push("テンプレート画像");

        if (missingItems.length > 0) {
            toast.error("AIデザインを実行できません", {
                description: `${missingItems.join(" と ")} を入力してください`,
                duration: 5000,
            });
            return;
        }

        // すべて揃っている、または追加素材なしで進行可能な場合に解析を実行
        setGenerating(true);

        // シナリオ判定
        let aiScenario: 'product-only' | 'template-only' | 'text-only' = 'product-only';
        if (hasProductImage) aiScenario = 'product-only';
        else if (hasBgTemplate) aiScenario = 'template-only';
        else aiScenario = 'text-only';

        try {
            const response = await fetch('/api/ai/analyze-layout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: productImage || null,
                    backgroundImage: backgroundCustomImage || null,
                    productName: currentName,
                    price: currentPrice,
                    description: currentFeatures,
                    catchphrase,
                    planName: planName || undefined,
                    aiScenario,
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            applyAiDesign(data);
            // 成功したらリセット (任意だが、再度丸投げしたい場合のためにリセット)
            // setWizardCompleted(false); 
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
                    setChatUploadedImages((prev: string[]) => [...prev, reader.result as string]);
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

        const newMessages: ChatMessage[] = [...chatMessages, userMessage];
        setChatMessages(newMessages);
        setChatInput("");
        setChatUploadedImages([]);
        setGenerating(true);

        try {
            const result = await chatWithPopAssistant({
                messages: newMessages,
                currentPopState: getCurrentState(),
                planName: planName || undefined
            });

            if (result.success) {
                setChatMessages((prev: any[]) => [...prev, { role: "model", content: result.content }]);

                // JSONが含まれていれば抽出して適用 (JSONの抽出を堅牢化)
                const jsonMatch = result.content.match(/```json\s*([\s\S]*?)\s*```/) || result.content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        const data = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                        if (result.generatedBackground) {
                            data.generatedBackground = result.generatedBackground;
                        }
                        applyAiDesign(data);
                    } catch (e) {
                        console.error("Failed to parse design JSON from chat", e);
                    }
                }
            } else {
                toast.error("AIからの返信に失敗しました");
            }
        } catch (error) {
            console.error("AI chat error", error);
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
        pushHistory(); // 変更前に履歴を追加するように修正
        if (data.productName) setMenuItems([{ name: data.productName, price: data.price || "" }]);
        if (data.catchphrase) setCatchphrase(data.catchphrase);
        if (data.description) setDescription(data.description);
        if (data.style) setStyle(data.style);
        if (data.fontFamily) setFontFamily(data.fontFamily);
        if (data.generatedBackground) setBackgroundCustomImage(data.generatedBackground);

        // aiLayoutの適用（正規化）
        const normalizedLayout: PopLayout = data.aiLayout || (data.layout ? { ...data, ...data.layout } : null);
        if (normalizedLayout) {
            // 安全策：色が極端な場合に備えた最終ガード
            if (!normalizedLayout.recommendedColor) normalizedLayout.recommendedColor = "#000000";
            if (!normalizedLayout.recommendedBgColor) normalizedLayout.recommendedBgColor = "#FFFFFF";
            setAiLayout(normalizedLayout);
        }
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
        setVerticalText((prev: Record<string, boolean>) => ({
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

        setManualPositions((prev: any) => ({
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
        const currentState = getCurrentState();
        const newFav: FavoritePop = {
            ...currentState,
            id: Date.now().toString(),
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
        // fontSizeスケール（1〜5）→ 実際のpx変換
        // scale 1=最小(0.5rem相当), 5=最大(3rem相当)
        const FONT_SCALE_MAP: Record<number, number> = { 1: 0.7, 2: 0.9, 3: 1.2, 4: 1.7, 5: 2.2 };
        const getFontSize = (ratio: number, elementId?: string) => {
            const individualScale = elementId ? elementScales[elementId] || 1.0 : 1.0;
            return `${baseFontSize * ratio * (fontScale / 100) * individualScale}px`;
        };
        // AI ゾーン型レイアウト: zone名 → CSS座標に変換
        // productBoundingBox を参照して写真エリアを完全に避ける
        const getZoneStyle = (
            zone: string,
            elementKey: string,
            align: 'left' | 'center' | 'right' = 'center',
            fontSize: number = 3,
            glass: boolean = false
        ): React.CSSProperties => {
            const bb = aiLayout?.productBoundingBox;
            // バウンディングボックスがない場合のデフォルト（写真が中央60%を占める想定）
            const safeTop = bb ? Math.max(0, bb.top - 2) : 20;
            const safeBottom = bb ? Math.min(100, bb.bottom + 2) : 80;
            const safeLeft = bb ? Math.max(0, bb.left - 2) : 15;
            const safeRight = bb ? Math.min(100, bb.right + 2) : 85;

            const fsPx = `${baseFontSize * (FONT_SCALE_MAP[Math.min(5, Math.max(1, Math.round(fontSize)))] || 1.4) * (fontScale / 100) * (elementScales[elementKey] || 1.0)}px`;
            const textColor = aiLayout?.recommendedColor || '#000000';
            const glassBg: React.CSSProperties = glass ? {
                backgroundColor: 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(6px)',
                padding: '0.3em 0.8em',
                borderRadius: '0.4em',
                WebkitBackdropFilter: 'blur(6px)',
            } : {};

            const manualPos = manualPositions[elementKey];
            // 手動ドラッグ位置を最優先
            if (manualPos?.x !== undefined && manualPos?.y !== undefined) {
                return {
                    position: 'absolute' as const,
                    top: `${manualPos.y}%`,
                    left: `${manualPos.x}%`,
                    transform: align === 'center' ? 'translate(-50%, -50%)' : 'translate(0, -50%)',
                    textAlign: align,
                    maxWidth: '88%',
                    fontSize: fsPx,
                    color: textColor,
                    ...glassBg,
                };
            }

            let top: string, left: string, transform: string;

            switch (zone) {
                case 'top':
                    // 写真の上方エリア（safeTop% の半分の位置）
                    top = `${safeTop / 2}%`;
                    left = align === 'center' ? '50%' : (align === 'right' ? '90%' : '5%');
                    transform = align === 'center' ? 'translate(-50%, -50%)' : 'translate(0, -50%)';
                    break;
                case 'bottom':
                    // 写真の下方エリア
                    top = `${safeBottom + (100 - safeBottom) / 2}%`;
                    left = align === 'center' ? '50%' : (align === 'right' ? '90%' : '5%');
                    transform = align === 'center' ? 'translate(-50%, -50%)' : 'translate(0, -50%)';
                    break;
                case 'left':
                    // 写真の左側エリア
                    top = '50%';
                    left = `${safeLeft / 2}%`;
                    transform = 'translate(-50%, -50%)';
                    break;
                case 'right':
                    // 写真の右側エリア
                    top = '50%';
                    left = `${safeRight + (100 - safeRight) / 2}%`;
                    transform = 'translate(-50%, -50%)';
                    break;
                case 'overlay-top':
                    // 写真の上部に被せる（glass推奨）
                    top = `${bb ? bb.top + 5 : 15}%`;
                    left = '50%';
                    transform = 'translate(-50%, 0)';
                    break;
                case 'overlay-bottom':
                default:
                    // 写真の下部に被せる（glass推奨）
                    top = `${bb ? bb.bottom - 15 : 72}%`;
                    left = '50%';
                    transform = 'translate(-50%, 0)';
                    break;
            }

            return {
                position: 'absolute' as const,
                top,
                left,
                transform,
                textAlign: align,
                maxWidth: '88%',
                fontSize: fsPx,
                color: textColor,
                ...glassBg,
            };
        };

        // プレミアムエフェクト生成ヘルパー
        const getPremiumStyles = (id: string, base: any) => {
            const ai = aiLayout?.[id];
            if (!ai) return base;
            return {
                ...base,
                textShadow: ai.shadow || (ai.style === 'luxury' ? '2px 2px 10px rgba(0,0,0,0.5)' : 'none'),
                WebkitTextStroke: ai.stroke || 'none',
                letterSpacing: ai.letterSpacing || 'normal',
                lineHeight: ai.lineHeight || '1.2',
                ...(ai.glass && {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(8px)',
                    padding: '0.5rem 1rem',
                    borderRadius: '1rem',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                })
            };
        };

        return (
            <div
                className={`relative w-full ${aspectClass} overflow-hidden bg-white shadow-2xl pop-container select-none`}
                style={{ fontFamily: FONT_FAMILY_MAP[fontFamily] || "'Noto Sans JP', sans-serif" }}
            >
                {/* 背景レイヤー */}
                <div
                    className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
                    style={{
                        backgroundImage: `url(${backgroundCustomImage || getPublicStorageUrl(config.bg)})`,
                        backgroundColor: aiLayout?.recommendedBgColor || '#fff'
                    }}
                />

                {/* 装飾レイヤー (背景と写真の間) */}
                {aiLayout?.decorations?.filter((d: any) => d.layer === 'back').map((dec: any, i: number) => (
                    <div
                        key={`dec-back-${i}`}
                        className="absolute pointer-events-none"
                        style={{
                            top: `${dec.y}%`,
                            left: `${dec.x}%`,
                            transform: `translate(-50%, -50%) rotate(${dec.rotate || 0}deg) scale(${dec.scale || 1})`,
                            zIndex: 2,
                        }}
                    >
                        {dec.type === 'brush' && <div className="w-[300px] h-[60px] opacity-40 bg-current blur-md rounded-full" style={{ color: dec.color || aiLayout.recommendedColor }} />}
                        {dec.type === 'circle' && <div className="size-20 rounded-full border-4 border-dashed border-current opacity-20" style={{ color: dec.color || aiLayout.recommendedColor }} />}
                    </div>
                ))}

                {/* 商品写真レイヤー */}
                {aiLayout?.photoAreas && aiLayout.photoAreas.length > 0 ? (
                    aiLayout.photoAreas.map((area: any, index: number) => {
                        const item = menuItems[index % menuItems.length];
                        const image = item.image || productImage;
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
                                <img src={image} alt={`Item ${index + 1}`} className="w-full h-auto object-contain drop-shadow-2xl filter saturate-[1.1] contrast-[1.05]" />
                            </motion.div>
                        );
                    })
                ) : (
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
                            <img src={productImage} alt="Product" className="w-full h-auto object-contain drop-shadow-2xl filter saturate-[1.1]" />
                        </motion.div>
                    )
                )}

                {/* 前面装飾レイヤー (リボン・バッジ) */}
                {aiLayout?.decorations?.filter((d: any) => d.layer !== 'back').map((dec: any, i: number) => (
                    <div
                        key={`dec-front-${i}`}
                        className="absolute pointer-events-none z-20"
                        style={{
                            top: `${dec.y}%`,
                            left: `${dec.x}%`,
                            transform: `translate(-50%, -50%) rotate(${dec.rotate || 0}deg) scale(${dec.scale || 1})`,
                        }}
                    >
                        {dec.type === 'ribbon' && (
                            <div className="relative px-6 py-2 bg-red-600 text-white font-black text-xs shadow-xl flex items-center justify-center min-w-[120px]">
                                {dec.text}
                                <div className="absolute top-0 -left-3 border-t-[16px] border-t-transparent border-b-[16px] border-b-transparent border-r-[12px] border-r-red-800 -z-10" />
                                <div className="absolute top-0 -right-3 border-t-[16px] border-t-transparent border-b-[16px] border-b-transparent border-l-[12px] border-l-red-800 -z-10" />
                            </div>
                        )}
                        {dec.type === 'seal' && (
                            <div className="size-16 rounded-full bg-amber-400 border-4 border-white shadow-xl flex items-center justify-center text-center p-2 leading-tight">
                                <span className="text-[10px] font-black text-amber-900">{dec.text}</span>
                            </div>
                        )}
                        {dec.type === 'badge' && (
                            <div className="px-3 py-1 bg-slate-900 text-white rounded-full text-[10px] font-black shadow-lg">
                                {dec.text}
                            </div>
                        )}
                    </div>
                ))}

                {showTextOverlay === "all" && catchphrase && (config.catchphrase || aiLayout?.catchphrase) && (
                    <motion.div
                        drag
                        dragMomentum={false}
                        onDragEnd={(e, info) => handleDragEnd("catchphrase", e, info)}
                        className="absolute z-10 font-bold cursor-move group h-auto"
                        style={{
                            // ゾーン型 or レガシー座標にフォールバック
                            ...(aiLayout?.catchphrase?.zone
                                ? getZoneStyle(aiLayout.catchphrase.zone, 'catchphrase', aiLayout.catchphrase.align, aiLayout.catchphrase.fontSize, aiLayout.catchphrase.glass)
                                : getPremiumStyles("catchphrase", aiLayout?.catchphrase ? {
                                    top: manualPositions.catchphrase?.y ? `${manualPositions.catchphrase.y}%` : `${aiLayout.catchphrase.y ?? 10}%`,
                                    left: manualPositions.catchphrase?.x ? `${manualPositions.catchphrase.x}%` : `${aiLayout.catchphrase.x ?? 50}%`,
                                    transform: aiLayout.catchphrase.align === 'center' ? 'translateX(-50%)' : 'none',
                                    textAlign: aiLayout.catchphrase.align || 'center',
                                    color: aiLayout.recommendedColor || '#000',
                                    maxWidth: '88%',
                                    fontSize: getFontSize(1.2, 'catchphrase'),
                                } : config.catchphrase)),
                            writingMode: verticalText.catchphrase ? 'vertical-rl' : 'horizontal-tb',
                            textOrientation: verticalText.catchphrase ? 'upright' : 'mixed',
                        }}
                    >
                        <div className="relative group">
                            {catchphrase}
                            <div className="absolute -top-10 -right-10 opacity-0 group-hover:opacity-100 flex gap-1 z-30 no-print">
                                <Button onClick={(e) => { e.stopPropagation(); toggleVertical("catchphrase"); }} className="bg-white shadow-xl border border-slate-100 rounded-full p-2 text-slate-500 hover:text-indigo-600 size-8 transition-all"><TypeIcon className="size-4" /></Button>
                                <Button onClick={(e) => { e.stopPropagation(); handleElementScaleChange("catchphrase", -0.1); }} className="bg-white shadow-xl border border-slate-100 rounded-full p-2 text-slate-500 hover:text-indigo-600 size-8 transition-all"><Minus className="size-4" /></Button>
                                <Button onClick={(e) => { e.stopPropagation(); handleElementScaleChange("catchphrase", 0.1); }} className="bg-white shadow-xl border border-slate-100 rounded-full p-2 text-slate-500 hover:text-indigo-600 size-8 transition-all"><Plus className="size-4" /></Button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {showTextOverlay === "all" && menuItems.length === 1 && productName && (config.productName || aiLayout?.productName) && (
                    <motion.div
                        drag
                        dragMomentum={false}
                        onDragEnd={(e, info) => handleDragEnd("productName", e, info)}
                        className="absolute z-10 font-black cursor-move group"
                        style={{
                            ...(aiLayout?.productName?.zone
                                ? getZoneStyle(aiLayout.productName.zone, 'productName', aiLayout.productName.align, aiLayout.productName.fontSize, aiLayout.productName.glass)
                                : getPremiumStyles("productName", aiLayout?.productName ? {
                                    top: manualPositions.productName?.y ? `${manualPositions.productName.y}%` : `${aiLayout.productName.y ?? 80}%`,
                                    left: manualPositions.productName?.x ? `${manualPositions.productName.x}%` : `${aiLayout.productName.x ?? 50}%`,
                                    transform: aiLayout.productName.align === 'center' ? 'translateX(-50%)' : 'none',
                                    textAlign: aiLayout.productName.align || 'center',
                                    color: aiLayout.recommendedColor || '#000',
                                    maxWidth: '88%',
                                    fontSize: getFontSize(2.0, 'productName'),
                                } : config.productName)),
                            writingMode: verticalText.productName ? 'vertical-rl' : 'horizontal-tb',
                            textOrientation: verticalText.productName ? 'upright' : 'mixed',
                        }}
                    >
                        <div className="relative group text-balance">
                            {productName}
                            <div className="absolute -top-10 -right-10 opacity-0 group-hover:opacity-100 flex gap-1 z-30 no-print">
                                <Button onClick={(e) => { e.stopPropagation(); toggleVertical("productName"); }} className="bg-white shadow-xl border border-slate-100 rounded-full p-2 text-slate-500 hover:text-indigo-600 size-8 transition-all"><TypeIcon className="size-4" /></Button>
                                <Button onClick={(e) => { e.stopPropagation(); handleElementScaleChange("productName", -0.1); }} className="bg-white shadow-xl border border-slate-100 rounded-full p-2 text-slate-500 hover:text-indigo-600 size-8 transition-all"><Minus className="size-4" /></Button>
                                <Button onClick={(e) => { e.stopPropagation(); handleElementScaleChange("productName", 0.1); }} className="bg-white shadow-xl border border-slate-100 rounded-full p-2 text-slate-500 hover:text-indigo-600 size-8 transition-all"><Plus className="size-4" /></Button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {showTextOverlay === "all" && description && (config.description || aiLayout?.description) && (
                    <motion.div
                        drag
                        dragMomentum={false}
                        onDragEnd={(e, info) => handleDragEnd("description", e, info)}
                        className="absolute z-10 leading-relaxed font-medium cursor-move group"
                        style={{
                            ...(aiLayout?.description?.zone
                                ? getZoneStyle(aiLayout.description.zone, 'description', aiLayout.description.align, aiLayout.description.fontSize, aiLayout.description.glass)
                                : getPremiumStyles("description", aiLayout?.description ? {
                                    top: manualPositions.description?.y ? `${manualPositions.description.y}%` : `${aiLayout.description.y ?? 85}%`,
                                    left: manualPositions.description?.x ? `${manualPositions.description.x}%` : `${aiLayout.description.x ?? 50}%`,
                                    transform: aiLayout.description.align === 'center' ? 'translateX(-50%)' : 'none',
                                    textAlign: aiLayout.description.align || 'center',
                                    color: aiLayout.recommendedColor || '#333',
                                    maxWidth: '88%',
                                    fontSize: getFontSize(0.8, 'description'),
                                } : config.description)),
                            writingMode: verticalText.description ? 'vertical-rl' : 'horizontal-tb',
                            textOrientation: verticalText.description ? 'upright' : 'mixed',
                        }}
                    >
                        <div className="relative group">
                            {description}
                            <div className="absolute -top-8 -right-8 opacity-0 group-hover:opacity-100 flex gap-1 z-30 no-print">
                                <Button onClick={(e) => { e.stopPropagation(); toggleVertical("description"); }} className="bg-white shadow-xl border border-slate-100 rounded-full p-1.5 text-slate-500 hover:text-indigo-600 size-7"><TypeIcon className="size-3" /></Button>
                                <Button onClick={(e) => { e.stopPropagation(); handleElementScaleChange("description", -0.1); }} className="bg-white shadow-xl border border-slate-100 rounded-full p-1.5 text-slate-500 hover:text-indigo-600 size-7"><Minus className="size-3" /></Button>
                                <Button onClick={(e) => { e.stopPropagation(); handleElementScaleChange("description", 0.1); }} className="bg-white shadow-xl border border-slate-100 rounded-full p-1.5 text-slate-500 hover:text-indigo-600 size-7"><Plus className="size-3" /></Button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {showTextOverlay !== "none" && menuItems.length === 1 && price && (config.price || aiLayout?.price) && (
                    <motion.div
                        drag
                        dragMomentum={false}
                        onDragEnd={(e, info) => handleDragEnd("price", e, info)}
                        className="absolute z-10 font-black cursor-move group"
                        style={{
                            ...(aiLayout?.price?.zone
                                ? getZoneStyle(aiLayout.price.zone, 'price', aiLayout.price.align, aiLayout.price.fontSize, aiLayout.price.glass)
                                : getPremiumStyles("price", aiLayout?.price ? {
                                    top: manualPositions.price?.y ? `${manualPositions.price.y}%` : `${aiLayout.price.y ?? 88}%`,
                                    left: manualPositions.price?.x ? `${manualPositions.price.x}%` : `${aiLayout.price.x ?? 50}%`,
                                    transform: aiLayout.price.align === 'center' ? 'translateX(-50%)' : 'none',
                                    textAlign: aiLayout.price.align || 'center',
                                    color: aiLayout.recommendedColor || '#b45309',
                                    maxWidth: '88%',
                                    fontSize: getFontSize(1.6, 'price'),
                                } : config.price)),
                            writingMode: verticalText.price ? 'vertical-rl' : 'horizontal-tb',
                            textOrientation: verticalText.price ? 'upright' : 'mixed',
                        }}
                    >
                        <div className="relative group">
                            {price}
                            <div className="absolute -top-10 -right-10 opacity-0 group-hover:opacity-100 flex gap-1 z-30 no-print">
                                <Button onClick={(e) => { e.stopPropagation(); toggleVertical("price"); }} className="bg-white shadow-xl border border-slate-100 rounded-full p-2 text-slate-500 hover:text-indigo-600 size-8"><TypeIcon className="size-4" /></Button>
                                <Button onClick={(e) => { e.stopPropagation(); handleElementScaleChange("price", -0.1); }} className="bg-white shadow-xl border border-slate-100 rounded-full p-2 text-slate-500 hover:text-indigo-600 size-8"><Minus className="size-4" /></Button>
                                <Button onClick={(e) => { e.stopPropagation(); handleElementScaleChange("price", 0.1); }} className="bg-white shadow-xl border border-slate-100 rounded-full p-2 text-slate-500 hover:text-indigo-600 size-8"><Plus className="size-4" /></Button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {showTextOverlay !== "none" && menuItems.length > 1 && menuItems.some((item: MenuItem) => item.name) && (
                    <motion.div
                        drag
                        dragMomentum={false}
                        onDragEnd={(e, info) => handleDragEnd("menuList", e, info)}
                        className="absolute z-10 cursor-move group"
                        style={getPremiumStyles("menuList", {
                            top: manualPositions.menuList?.y ? `${manualPositions.menuList.y}%` : aiLayout?.productName?.y ? `${aiLayout.productName.y}%` : '30%',
                            left: manualPositions.menuList?.x ? `${manualPositions.menuList.x}%` : '50%',
                            transform: 'translateX(-50%)',
                            width: '85%',
                            color: aiLayout?.recommendedColor || config.productName?.color || '#000'
                        })}
                    >
                        <div className="relative group">
                            <div className="space-y-1">
                                {menuItems.filter((item: MenuItem) => item.name).map((item: MenuItem, idx: number) => {
                                    const sizeRatio = menuItems.length <= 3 ? 2.0 : menuItems.length <= 5 ? 1.5 : menuItems.length <= 7 ? 1.2 : 1.0;
                                    return (
                                        <div key={idx} className="flex items-baseline justify-between gap-2" style={{ fontSize: getFontSize(sizeRatio, "menuList") }}>
                                            <span className="font-black truncate">{item.name}</span>
                                            <span className="shrink-0 border-b border-dotted border-current opacity-30 flex-1 mx-1" />
                                            {item.price && <span className="font-black shrink-0" style={{ color: aiLayout?.recommendedColor || config.price?.color || '#b45309' }}>{formatPrice(item.price)}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="absolute -top-10 -right-10 opacity-0 group-hover:opacity-100 flex gap-1 z-30 no-print">
                                <Button onClick={(e) => { e.stopPropagation(); handleElementScaleChange("menuList", -0.1); }} className="bg-white shadow-xl border border-slate-100 rounded-full p-2 text-slate-500 hover:text-indigo-600 size-8 transition-all"><Minus className="size-4" /></Button>
                                <Button onClick={(e) => { e.stopPropagation(); handleElementScaleChange("menuList", 0.1); }} className="bg-white shadow-xl border border-slate-100 rounded-full p-2 text-slate-500 hover:text-indigo-600 size-8 transition-all"><Plus className="size-4" /></Button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {qrContent && (
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
                )}
            </div>
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
                                <Dialog open={isGuideOpen} onOpenChange={setIsGuideOpen}>
                                    <DialogTrigger asChild>
                                        <button
                                            className="px-6 py-2 rounded-xl text-sm font-black transition-all flex items-center gap-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50"
                                        >
                                            <Sparkles className="size-4" /> 使い方ガイド
                                        </button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-slate-50 border-none rounded-3xl p-0">
                                        <div className="p-8 space-y-8">
                                            <DialogHeader>
                                                <DialogTitle className="text-3xl font-black text-indigo-600 flex items-center gap-3">
                                                    <Wand2 className="size-8" />
                                                    AI POP作成 V2 ガイド
                                                </DialogTitle>
                                                <p className="text-slate-500 font-bold mt-2">
                                                    AIの力を借りて、わずか数分でプロ品質の販促POPを作成しましょう。
                                                </p>
                                            </DialogHeader>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <Card className="p-6 bg-white border-0 shadow-sm rounded-2xl space-y-3">
                                                    <div className="size-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black shadow-lg shadow-indigo-200">1</div>
                                                    <h3 className="font-black text-slate-800">素材をアップロード</h3>
                                                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                                        商品写真をアップするか、Canva等で作ったデザイン（画像/PDF）を背景として読み込みます。<b>「AIで枠を検出」</b>ボタンを使えば写真は自動配置されます。
                                                    </p>
                                                </Card>

                                                <Card className="p-6 bg-white border-0 shadow-sm rounded-2xl space-y-3">
                                                    <div className="size-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black shadow-lg shadow-indigo-200">2</div>
                                                    <h3 className="font-black text-slate-800">こだわりを伝える</h3>
                                                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                                        「AIでおまかせ」でコピーを作るのも良いですが、<b>「AIと相談」</b>ボタンからチャットや音声で要望（「もっと高級に」等）を伝えると、デザインまで調整してくれます。
                                                    </p>
                                                </Card>

                                                <Card className="p-6 bg-white border-0 shadow-sm rounded-2xl space-y-3">
                                                    <div className="size-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black shadow-lg shadow-indigo-200">3</div>
                                                    <h3 className="font-black text-slate-800">直感的にアレンジ</h3>
                                                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                                        プレビュー上の文字は<b>直接ドラッグ</b>で好きな位置に。カーソルを合わせれば<b>「+/-」でサイズ調整</b>や<b>縦書き切替</b>も個別に行えます。
                                                    </p>
                                                </Card>

                                                <Card className="p-6 bg-white border-0 shadow-sm rounded-2xl space-y-3">
                                                    <div className="size-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black shadow-lg shadow-indigo-200">4</div>
                                                    <h3 className="font-black text-slate-800">保存・印刷・同期</h3>
                                                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                                        「印刷 / 保存」で書き出しが可能です。<b>「WEBサイトへ同期」</b>を使えば、作成したPOPを店舗HPに即座に掲載して公開できます。
                                                    </p>
                                                </Card>
                                            </div>

                                            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl">
                                                <h3 className="text-xl font-black mb-4 flex items-center gap-2">
                                                    <Sparkles className="size-6" /> AIだけの特別な機能
                                                </h3>
                                                <ul className="space-y-3">
                                                    <li className="flex items-start gap-3">
                                                        <Check className="size-5 shrink-0 mt-0.5 text-indigo-200" />
                                                        <div className="text-sm"><b>クチコミをコピーに変換:</b> Googleマップの良いクチコミを貼り付けるだけで、お客様の声を活かした「売れるコピー」へ瞬時に変換。</div>
                                                    </li>
                                                    <li className="flex items-start gap-3">
                                                        <Check className="size-5 shrink-0 mt-0.5 text-indigo-200" />
                                                        <div className="text-sm"><b>画像からフォント提案:</b> 背景画像のデザインをAIが読み取り、雰囲気にピッタリなフォントを自動でチョイスします。</div>
                                                    </li>
                                                </ul>
                                            </div>

                                            <div className="text-center pt-4">
                                                <DialogTrigger asChild>
                                                    <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl px-12 h-14 font-black shadow-xl transition-all active:scale-95">
                                                        さっそく作成を始める
                                                    </Button>
                                                </DialogTrigger>
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
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
                                {/* 初期選択ダイアログ */}
                                <Dialog open={isFirstVisit} onOpenChange={setIsFirstVisit}>
                                    <DialogContent className="sm:max-w-[750px] bg-slate-50 border-none rounded-[40px] p-0 overflow-hidden shadow-2xl">
                                        <div className="p-10 space-y-10 text-center">
                                            <div className="space-y-4">
                                                <div className="inline-flex items-center justify-center size-16 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-200 mb-2">
                                                    <Wand2 className="size-8 text-white" />
                                                </div>
                                                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">
                                                    最高の一枚を、どう作りますか？
                                                </h2>
                                                <p className="text-slate-500 font-bold">
                                                    あなたのスタイルに合わせて、AIが最適なサポートをいたします。
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                                {/* 1. 作り方を教わる */}
                                                <button
                                                    onClick={() => {
                                                        setIsFirstVisit(false);
                                                        setIsGuideOpen(true);
                                                    }}
                                                    className="group flex flex-col items-center p-6 bg-white rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all border-2 border-transparent hover:border-indigo-500 text-center"
                                                >
                                                    <div className="size-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 transition-colors">
                                                        <Sparkles className="size-6 text-indigo-600 group-hover:text-white" />
                                                    </div>
                                                    <h3 className="font-black text-slate-800 mb-2">① 作り方を教わる</h3>
                                                    <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                                                        まずは基本から。<br />ステップ形式のガイドで<br />操作方法をマスター。
                                                    </p>
                                                </button>

                                                {/* 2. 相談しながら作る */}
                                                <button
                                                    onClick={() => {
                                                        setIsFirstVisit(false);
                                                        setIsChatOpen(true);
                                                    }}
                                                    className="group flex flex-col items-center p-6 bg-white rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all border-2 border-transparent hover:border-indigo-500 text-center"
                                                >
                                                    <div className="size-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 transition-colors">
                                                        <MessageCircle className="size-6 text-indigo-600 group-hover:text-white" />
                                                    </div>
                                                    <h3 className="font-black text-slate-800 mb-2">② 相談しながら</h3>
                                                    <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                                                        AIと会話しながら、<br />こだわりを形に。<br />納得のいくまで。
                                                    </p>
                                                </button>

                                                {/* 3. AIに丸投げする */}
                                                <button
                                                    onClick={() => {
                                                        setIsFirstVisit(false);
                                                        handleAiDesignAssistant();
                                                    }}
                                                    className="group flex flex-col items-center p-6 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-200 hover:-translate-y-2 transition-all text-center"
                                                >
                                                    <div className="size-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                                                        <Wand2 className="size-6 text-white" />
                                                    </div>
                                                    <h3 className="font-black text-white mb-2">③ AIに丸投げ</h3>
                                                    <p className="text-[10px] text-indigo-100 font-bold leading-relaxed">
                                                        時間がない時も安心。<br />写真1枚からAIが<br />すべて自動デザイン。
                                                    </p>
                                                </button>

                                                {/* 4. 一人でできるもん */}
                                                <button
                                                    onClick={() => setIsFirstVisit(false)}
                                                    className="group flex flex-col items-center p-6 bg-white rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all border-2 border-transparent hover:border-slate-900 text-center"
                                                >
                                                    <div className="size-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-slate-900 transition-colors">
                                                        <Zap className="size-6 text-slate-400 group-hover:text-white" />
                                                    </div>
                                                    <h3 className="font-black text-slate-800 mb-2">④ 独力で作る</h3>
                                                    <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                                                        ガイドもAIも不要。<br />己のセンスのみで<br />道を切り拓く。
                                                    </p>
                                                </button>
                                            </div>

                                            <div className="pt-4">
                                                <p className="text-xs text-slate-400 font-bold">
                                                    ※ どのボタンを選んでも、後から自由に変更・やり直しが可能です。
                                                </p>
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
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
                                                                // ワーカー設定（CDN経由で安定化）
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
                                                                {isWizardMode && (
                                                                    <div className="flex flex-col gap-3 py-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                                                        <div className="flex flex-wrap gap-2 justify-center">
                                                                            {wizardStep === 1 && (
                                                                                <>
                                                                                    <Button
                                                                                        onClick={() => {
                                                                                            setWizardPurpose("menu");
                                                                                            setChatMessages(prev => [...prev, { role: "user", content: "新メニュー・おすすめ料理" }, { role: "model", content: "楽しみですね！掲載する商品（項目）の数はいくつですか？" }]);
                                                                                            setWizardStep(2);
                                                                                        }}
                                                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 rounded-xl h-12 shadow-lg"
                                                                                    >
                                                                                        新メニュー・おすすめ料理
                                                                                    </Button>
                                                                                    <Button
                                                                                        onClick={() => {
                                                                                            setWizardPurpose("info");
                                                                                            setChatMessages(prev => [...prev, { role: "user", content: "店内の案内・お知らせ" }, { role: "model", content: "承知しました！掲載する項目（タイトルなど）の数はいくつですか？" }]);
                                                                                            setWizardStep(2);
                                                                                        }}
                                                                                        variant="outline"
                                                                                        className="border-2 border-indigo-200 text-indigo-600 font-black px-6 rounded-xl h-12"
                                                                                    >
                                                                                        店内の案内・お知らせ
                                                                                    </Button>
                                                                                </>
                                                                            )}

                                                                            {wizardStep === 2 && (
                                                                                <>
                                                                                    {[1, 2, "3〜10"].map(num => (
                                                                                        <Button
                                                                                            key={num}
                                                                                            onClick={() => {
                                                                                                const count = typeof num === 'string' ? 3 : num;
                                                                                                setPromisedItemCount(count);
                                                                                                setChatMessages(prev => [...prev, { role: "user", content: `${num}点` }, { role: "model", content: `かしこまりました。次に、商品写真はありますか？` }]);
                                                                                                setWizardStep(3);
                                                                                            }}
                                                                                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 rounded-xl h-12 shadow-lg"
                                                                                        >
                                                                                            {num}点
                                                                                        </Button>
                                                                                    ))}
                                                                                </>
                                                                            )}

                                                                            {wizardStep === 3 && (
                                                                                <div className="flex flex-col gap-2 w-full max-w-sm mx-auto">
                                                                                    <Button
                                                                                        onClick={() => {
                                                                                            setPromisedProductImage(true);
                                                                                            setIsTextOnly(false);
                                                                                            setPromisedAiImageCount(0);
                                                                                            setChatMessages(prev => [...prev, { role: "user", content: "自分で用意した写真を使う" }, { role: "model", content: "ありがとうございます！後ほどアップロードしてくださいね。\n\n最後にデザインの雰囲気を選んでください。" }]);
                                                                                            setWizardStep(4);
                                                                                        }}
                                                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl h-12 shadow-lg"
                                                                                    >
                                                                                        自分で用意した写真を使う
                                                                                    </Button>
                                                                                    <Button
                                                                                        onClick={() => {
                                                                                            setPromisedProductImage(false);
                                                                                            setIsTextOnly(true);
                                                                                            setPromisedAiImageCount(0);
                                                                                            setChatMessages(prev => [...prev, { role: "user", content: "写真はない（文字だけで作る）" }, { role: "model", content: "シンプルで読みやすいデザインにしますね。\n\n最後にデザインの雰囲気を選んでください。" }]);
                                                                                            setWizardStep(4);
                                                                                        }}
                                                                                        variant="outline"
                                                                                        className="border-2 border-indigo-200 text-indigo-600 font-black rounded-xl h-12"
                                                                                    >
                                                                                        写真はない（文字だけで作る）
                                                                                    </Button>
                                                                                    <Button
                                                                                        onClick={() => {
                                                                                            setPromisedProductImage(false);
                                                                                            setIsTextOnly(false);
                                                                                            setChatMessages(prev => [...prev, { role: "user", content: "写真はない（AIに画像を作らせる）" }, { role: "model", content: "AIがイメージ画像を生成します！何枚作成しますか？" }]);
                                                                                            setWizardStep(3.5);
                                                                                        }}
                                                                                        variant="outline"
                                                                                        className="border-2 border-indigo-200 text-indigo-600 font-black rounded-xl h-12"
                                                                                    >
                                                                                        写真はない（AIに画像を作らせる）
                                                                                    </Button>
                                                                                </div>
                                                                            )}

                                                                            {wizardStep === 3.5 && (
                                                                                <>
                                                                                    {[1, 2].filter(n => n <= promisedItemCount).map(n => (
                                                                                        <Button
                                                                                            key={n}
                                                                                            onClick={() => {
                                                                                                setPromisedAiImageCount(n);
                                                                                                setChatMessages(prev => [...prev, { role: "user", content: `${n}枚` }, { role: "model", content: `${n}枚生成しますね。最後にデザインの雰囲気を選んでください。` }]);
                                                                                                setWizardStep(4);
                                                                                            }}
                                                                                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 rounded-xl h-12 shadow-lg"
                                                                                        >
                                                                                            {n}枚
                                                                                        </Button>
                                                                                    ))}
                                                                                </>
                                                                            )}

                                                                            {wizardStep === 4 && (
                                                                                <>
                                                                                    <Button
                                                                                        onClick={() => {
                                                                                            setWizardStyle("washoku");
                                                                                            setChatMessages(prev => [...prev, { role: "user", content: "和風・高級感" }, { role: "model", content: "落ち着いた上品なデザインに仕上げます。\n\nこれで準備は万端です！下の「OK」で閉じて、情報を入力してください。" }]);
                                                                                            setWizardStep(5);
                                                                                        }}
                                                                                        className="bg-slate-800 hover:bg-slate-900 text-white font-black px-4 rounded-xl h-12 shadow-lg"
                                                                                    >
                                                                                        和風・高級感
                                                                                    </Button>
                                                                                    <Button
                                                                                        onClick={() => {
                                                                                            setWizardStyle("pop");
                                                                                            setChatMessages(prev => [...prev, { role: "user", content: "ポップ・賑やか" }, { role: "model", content: "元気で目立つデザインにしますね！\n\nこれで準備は万端です！下の「OK」で閉じて、情報を入力してください。" }]);
                                                                                            setWizardStep(5);
                                                                                        }}
                                                                                        className="bg-pink-500 hover:bg-pink-600 text-white font-black px-4 rounded-xl h-12 shadow-lg"
                                                                                    >
                                                                                        ポップ・賑やか
                                                                                    </Button>
                                                                                    <Button
                                                                                        onClick={() => {
                                                                                            setWizardStyle("modern");
                                                                                            setChatMessages(prev => [...prev, { role: "user", content: "モダン・シンプル" }, { role: "model", content: "スッキリとおしゃれなデザインにします。\n\nこれで準備は万端です！下の「OK」で閉じて、情報を入力してください。" }]);
                                                                                            setWizardStep(5);
                                                                                        }}
                                                                                        className="bg-indigo-500 hover:bg-indigo-600 text-white font-black px-4 rounded-xl h-12 shadow-lg"
                                                                                    >
                                                                                        モダン・シンプル
                                                                                    </Button>
                                                                                </>
                                                                            )}

                                                                            {wizardStep === 5 && (
                                                                                <Button
                                                                                    onClick={() => {
                                                                                        setWizardCompleted(true);
                                                                                        setIsChatOpen(false);
                                                                                        setIsWizardMode(false);
                                                                                        setWizardStep(0);
                                                                                    }}
                                                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-12 rounded-xl h-12 shadow-lg"
                                                                                >
                                                                                    OK
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-[10px] text-center text-slate-400 font-bold">
                                                                            {wizardStep === 5 ? "画面を閉じて、素材や情報の入力へ進みます" : "選択すると次のステップへ進みます"}
                                                                        </p>
                                                                    </div>
                                                                )}

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
