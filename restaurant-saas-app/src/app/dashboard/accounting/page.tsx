"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    LayoutDashboard,
    FileText,
    TrendingUp,
    Camera,
    Mic,
    Sparkles,
    ArrowUpRight,
    Plus,
    Calendar,
    ChevronRight,
    Search,
    BarChart3,
    BarChartHorizontal,
    LineChart,
    Settings2,
    Check,
    Download,
    UploadCloud,
    History,
    FileSpreadsheet,
    FileDown,
    RefreshCcw,
    X,
    Loader2,
    CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { saveAccountingEntry, getAccountingEntries } from "@/app/actions/accounting";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function AccountingPage() {
    const { user, getToken } = useAuth();
    const [activeTab, setActiveTab] = useState("overview");
    const [syncing, setSyncing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Camera States ---
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [entries, setEntries] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const handleUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const startCamera = async () => {
        setIsCameraOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
            streamRef.current = stream;
            // 短い遅延を置いてDOMのレンダリングを待つ
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }, 100);
        } catch (err) {
            toast.error("カメラの起動に失敗しました。ブラウザの設定や権限を確認してください。");
            setIsCameraOpen(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraOpen(false);
    };

    const analyzeDocument = async (imageSrc: string) => {
        setIsAnalyzing(true);
        setAnalysisResult(null);
        try {
            const token = await getToken();
            const res = await fetch("/api/accounting/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ image: imageSrc }),
            });

            if (!res.ok) throw new Error("解析に失敗しました");
            const data = await res.json();
            setAnalysisResult(data.result);
            toast.success("解析が完了しました！内容を確認してください。");
        } catch (err: any) {
            toast.error(err.message || "書類の解析中にエラーが発生しました");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg');
                setCapturedImage(dataUrl);
                stopCamera();

                toast.success("書類をキャプチャしました", {
                    description: "AIによる内容解析を開始します。",
                    icon: <Sparkles className="size-4 text-emerald-500" />
                });
                setActiveTab("documents");
                analyzeDocument(dataUrl);
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                setCapturedImage(dataUrl);
                toast.success("ファイルを読み込みました", {
                    description: "AIによる内容解析を開始します。",
                    icon: <Sparkles className="size-4 text-emerald-500" />
                });
                setActiveTab("documents");
                analyzeDocument(dataUrl);
            };
            reader.readAsDataURL(file);
        }
    };

    const fetchEntries = async () => {
        try {
            const token = await getToken();
            if (!token) return;
            const data = await getAccountingEntries(token);
            setEntries(data);
        } catch (err) {
            console.error("Failed to fetch entries:", err);
        }
    };

    const handleSaveEntry = async () => {
        if (!analysisResult) return;
        setIsSaving(true);
        try {
            const token = await getToken();
            if (!token) throw new Error("認証が必要です");

            await saveAccountingEntry(token, {
                merchantName: analysisResult.merchant_name,
                totalAmount: Number(analysisResult.total_amount),
                transactionDate: analysisResult.transaction_date,
                category: analysisResult.category,
                invoiceNumber: analysisResult.invoice_number,
                taxAmount: analysisResult.tax_amount,
                imageUrl: capturedImage || undefined
            });

            toast.success("仕訳データを保存しました");
            setAnalysisResult(null);
            setCapturedImage(null);
            fetchEntries(); // 再取得
        } catch (err: any) {
            toast.error(err.message || "保存に失敗しました");
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchEntries();
        }
    }, [user]);

    const [salesPeriod, setSalesPeriod] = useState<"7d" | "day" | "week" | "month" | "custom" | "this_month" | "last_month" | "this_year" | "last_year" | "dow_this_year" | "dow_last_year">("7d");
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [chartMetric, setChartMetric] = useState<"sales_all" | "sales_lunch" | "sales_dinner" | "sales_comp" | "turnover" | "tsubo_sales">("sales_all");
    const [comparisonMode, setComparisonMode] = useState<"amount" | "percent">("amount");
    const [chartType, setChartType] = useState<"bar" | "horizontal" | "line">("bar");
    const [customRefValue, setCustomRefValue] = useState<number | null>(null);

    const getMetricLabel = (m: string) => {
        switch (m) {
            case "sales_all": return "当日売上";
            case "sales_lunch": return "ランチ営業の売上";
            case "sales_dinner": return "ディナー営業の売上";
            case "sales_comp": return "ランチ・ディナー比較";
            case "turnover": return "平均回転率";
            case "tsubo_sales": return "坪単価売上";
            default: return "売上データ";
        }
    };

    // --- プロフェッショナル仕様：24ヶ月分のリアルなデモンストレーション・データベース ---
    const MOCK_DB = [
        // 2024年度 (創業・成長期)
        { m: "24/01", lunch: 85, dinner: 140, turnover: 1.8, tsubo: 11 },
        { m: "24/02", lunch: 82, dinner: 135, turnover: 1.7, tsubo: 10 },
        { m: "24/03", lunch: 95, dinner: 185, turnover: 2.2, tsubo: 14 },
        { m: "24/04", lunch: 98, dinner: 160, turnover: 2.1, tsubo: 13 },
        { m: "24/05", lunch: 105, dinner: 175, turnover: 2.3, tsubo: 14 },
        { m: "24/06", lunch: 92, dinner: 155, turnover: 1.9, tsubo: 12 },
        { m: "24/07", lunch: 110, dinner: 190, turnover: 2.5, tsubo: 15 },
        { m: "24/08", lunch: 125, dinner: 170, turnover: 2.4, tsubo: 14 },
        { m: "24/09", lunch: 102, dinner: 165, turnover: 2.0, tsubo: 13 },
        { m: "24/10", lunch: 108, dinner: 180, turnover: 2.2, tsubo: 14 },
        { m: "24/11", lunch: 115, dinner: 210, turnover: 2.6, tsubo: 16 },
        { m: "24/12", lunch: 130, dinner: 295, turnover: 3.2, tsubo: 21 },
        // 2025年度 (安定・高収益期)
        { m: "25/01", lunch: 105, dinner: 175, turnover: 2.1, tsubo: 14 },
        { m: "25/02", lunch: 98, dinner: 165, turnover: 1.9, tsubo: 13 },
        { m: "25/03", lunch: 125, dinner: 215, turnover: 2.8, tsubo: 17 },
        { m: "25/04", lunch: 120, dinner: 190, turnover: 2.6, tsubo: 15 },
        { m: "25/05", lunch: 135, dinner: 220, turnover: 2.9, tsubo: 18 },
        { m: "25/06", lunch: 118, dinner: 185, turnover: 2.3, tsubo: 15 },
        { m: "25/07", lunch: 140, dinner: 245, turnover: 3.1, tsubo: 20 },
        { m: "25/08", lunch: 155, dinner: 225, turnover: 3.0, tsubo: 19 },
        { m: "25/09", lunch: 122, dinner: 195, turnover: 2.4, tsubo: 16 },
        { m: "25/10", lunch: 132, dinner: 210, turnover: 2.6, tsubo: 17 },
        { m: "25/11", lunch: 145, dinner: 255, turnover: 3.2, tsubo: 21 },
        { m: "25/12", lunch: 165, dinner: 345, turnover: 3.8, tsubo: 25 },
        // 2026年度 (最新年度 - 2月19日時点)
        { m: "26/01", lunch: 140, dinner: 230, turnover: 2.8, tsubo: 18 },
        { m: "26/02", lunch: 95, dinner: 155, turnover: 2.6, tsubo: 13 }, // 19日時点の累計想定
    ];

    // --- データ生成ヘルパー ---
    const generateDailyData = (year: number, month: number, metric: string) => {
        const data: { label: string, val: number }[] = [];
        const today = new Date(); // 2026-02-19想定
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
        const lastDay = new Date(year, month + 1, 0).getDate();

        for (let d = 1; d <= lastDay; d++) {
            const label = d === 1 ? `${month + 1}/${d}` : `${d}日`;

            // 2026/02/19 以降（未来）のデータは 0 にする
            if (isCurrentMonth && d > today.getDate()) {
                data.push({ label, val: 0 });
                continue;
            }

            const seed = (year * 10000) + (month * 100) + d;
            const base = 250 + Math.sin(seed * 0.1) * 60 + Math.cos(d * 0.5) * 40;
            let val = base;
            if (metric === "sales_lunch") val = base * 0.4;
            else if (metric === "sales_dinner") val = base * 0.6;
            else if (metric === "turnover") val = 2.0 + Math.abs(Math.sin(seed)) * 1.5;
            else if (metric === "tsubo_sales") val = 12 + Math.abs(Math.cos(seed)) * 8;
            else if (metric === "sales_comp") val = 60 + Math.abs(Math.sin(d)) * 10;
            data.push({ label, val });
        }
        return data;
    };

    const generateMonthlyData = (year: number, metric: string) => {
        const yearSuffix = year.toString().slice(-2);
        const data: { label: string, val: number }[] = [];
        const today = new Date(); // 2026-02-19想定
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        for (let m = 0; m < 12; m++) {
            const monthStr = (m + 1).toString().padStart(2, '0');
            const label = `${m + 1}月`;

            // 未来の月（2026/03以降）のデータは 0 にする
            if (year > currentYear || (year === currentYear && m > currentMonth)) {
                data.push({ label, val: 0 });
                continue;
            }

            const match = MOCK_DB.find(db => db.m === `${yearSuffix}/${monthStr}`);
            let val = 0;
            if (match) {
                if (metric === "sales_all") val = match.lunch + match.dinner;
                else if (metric === "sales_lunch") val = match.lunch;
                else if (metric === "sales_dinner") val = match.dinner;
                else if (metric === "turnover") val = match.turnover * 20;
                else if (metric === "tsubo_sales") val = match.tsubo * 4;
                else if (metric === "sales_comp") val = (match.dinner / (match.lunch + match.dinner)) * 100;
            } else {
                const seed = (year * 100) + m;
                const base = 250 + Math.sin(seed * 0.5) * 50;
                val = base;
                if (metric === "sales_lunch") val = base * 0.4;
                else if (metric === "sales_dinner") val = base * 0.6;
                else if (metric === "turnover") val = 2.2 * 20;
                else if (metric === "tsubo_sales") val = 15 * 4;
                else if (metric === "sales_comp") val = 60;
            }
            data.push({ label, val });
        }
        return data;
    };

    const generateDayOfWeekData = (year: number, metric: string) => {
        const days = ["月", "火", "水", "木", "金", "土", "日"];
        return days.map((day, idx) => {
            // 曜日ごとの平均的な傾向を生成 (週末を高く設定)
            const seed = year + idx;
            const base = 280 + (idx >= 4 ? 150 : 0) + Math.sin(seed) * 40;
            let val = base;

            if (metric === "sales_lunch") val = base * 0.42;
            else if (metric === "sales_dinner") val = base * 0.58;
            else if (metric === "turnover") val = 2.1 + (idx >= 4 ? 1.5 : 0) + Math.abs(Math.cos(seed)) * 0.5;
            else if (metric === "tsubo_sales") val = 13 + (idx >= 4 ? 7 : 0) + Math.abs(Math.sin(seed)) * 4;
            else if (metric === "sales_comp") val = 55 + (idx >= 4 ? 15 : 0);

            return { label: day, val };
        });
    };

    const getSalesData = (period: "7d" | "day" | "week" | "month" | "custom" | "this_month" | "last_month" | "this_year" | "last_year" | "dow_this_year" | "dow_last_year", metric: string, mode: "amount" | "percent") => {
        let data: { label: string, val: number }[] = [];
        const today = new Date();

        if (period === "custom") {
            data = generateDailyData(selectedDate.getFullYear(), selectedDate.getMonth(), metric);
        } else if (period === "this_month") {
            data = generateDailyData(today.getFullYear(), today.getMonth(), metric);
        } else if (period === "last_month") {
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            data = generateDailyData(lastMonth.getFullYear(), lastMonth.getMonth(), metric);
        } else if (period === "this_year") {
            data = generateMonthlyData(today.getFullYear(), metric);
        } else if (period === "last_year") {
            data = generateMonthlyData(today.getFullYear() - 1, metric);
        } else if (period === "dow_this_year") {
            data = generateDayOfWeekData(today.getFullYear(), metric);
        } else if (period === "dow_last_year") {
            data = generateDayOfWeekData(today.getFullYear() - 1, metric);
        } else if (period === "7d" || period === "day") {
            const count = period === "7d" ? 6 : 30; // 0含めて7日 or 31日
            for (let i = count; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dayNum = date.getDate();
                const monthNum = date.getMonth() + 1;
                const label = (i === count || dayNum === 1) ? `${monthNum}/${dayNum}` : `${dayNum}日`;
                const base = 250 + Math.sin(i * 0.5) * 50 + Math.random() * 30;
                let val = base;
                if (metric === "sales_lunch") val = base * 0.4;
                else if (metric === "sales_dinner") val = base * 0.6;
                else if (metric === "turnover") val = 2.0 + Math.random() * 1.5;
                else if (metric === "tsubo_sales") val = 12 + Math.random() * 8;
                else if (metric === "sales_comp") val = 60 + Math.random() * 10;
                data.push({ label, val });
            }
        } else if (period === "week") {
            for (let i = 30; i >= 0; i--) {
                const label = `${31 - i}週`;
                const base = 1800 + Math.cos(i * 0.3) * 300 + Math.random() * 200;
                let val = base;
                if (metric === "sales_lunch") val = base * 0.35;
                else if (metric === "sales_dinner") val = base * 0.65;
                else if (metric === "turnover") val = 2.2;
                else if (metric === "tsubo_sales") val = 15;
                else if (metric === "sales_comp") val = 65;
                data.push({ label, val });
            }
        } else {
            // month (直近24ヶ月)
            data = MOCK_DB.map(d => {
                let val = 0;
                if (metric === "sales_all") val = d.lunch + d.dinner;
                else if (metric === "sales_lunch") val = d.lunch;
                else if (metric === "sales_dinner") val = d.dinner;
                else if (metric === "turnover") val = d.turnover;
                else if (metric === "tsubo_sales") val = d.tsubo;
                else if (metric === "sales_comp") val = (d.dinner / (d.lunch + d.dinner)) * 100;
                return { label: d.m, val };
            });
        }

        // ％表示（成長率）の場合は変化率を計算
        if (mode === "percent") {
            return data.map((d, i) => {
                if (i === 0) return { label: d.label, value: 0 };
                const prev = data[i - 1].val;
                const growth = prev === 0 ? 0 : ((d.val - prev) / prev) * 100;
                return { label: d.label, value: Math.round(growth) };
            });
        }

        return data.map(d => ({ label: d.label, value: metric.includes('sales_all') || metric.includes('sales_lunch') || metric.includes('sales_dinner') ? Math.round(d.val) : Number(d.val.toFixed(2)) }));
    };

    const currentSalesData = getSalesData(salesPeriod, chartMetric, comparisonMode);

    // --- プロフェッショナル仕様：動的スケーリング・ロジック (Normalization) ---
    // データセット内の最大値を基準に100%のスケールを算出
    const maxValue = Math.max(...currentSalesData.map(d => d.value), 10);
    const normalizedData = currentSalesData.map(d => ({
        ...d,
        raw: d.value,
        percent: (d.value / maxValue) * 100
    }));

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <AppSidebar
                activePage="accounting"
                activeSubPage={activeTab}
                onSubPageChange={setActiveTab}
                user={user}
            />

            <main className="flex-1 overflow-y-auto">
                <div className="container mx-auto py-8 px-4 sm:px-6 max-w-5xl">
                    <header className="mb-8 space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600">
                                <TrendingUp className="size-6" />
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-800">経営・事務管理</h1>
                        </div>
                        <p className="text-gray-500 pl-11">
                            AIがあなたに代わって「売上・書類・経営分析」をすべて一括管理します。
                        </p>
                    </header>

                    {/* クイックアクション (Mobile/PC両対応) */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10">
                        <Button
                            onClick={startCamera}
                            className="h-24 flex-col gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 border-0 group transition-all hover:scale-[1.02] relative overflow-hidden"
                        >
                            <Badge className="absolute top-2 right-2 bg-white/20 text-white text-[8px] border-0 backdrop-blur-md">AI OCR連携</Badge>
                            <Camera className="size-6 transition-transform group-hover:scale-110" />
                            <span className="font-bold">書類を撮る</span>
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                toast.info("音声解析エンジンを起動中...", {
                                    description: "「今日の大根300円」などの声をそのまま仕訳に変換します。",
                                    icon: <Mic className="size-4 text-indigo-500" />
                                });
                                setTimeout(() => {
                                    toast.success("音声を認識しました", {
                                        description: "「食材仕入：300円」としてAI仕訳に送信しました。"
                                    });
                                }, 2500);
                            }}
                            className="h-24 flex-col gap-2 rounded-2xl border-2 border-indigo-100 hover:bg-indigo-50 text-indigo-700 transition-all hover:scale-[1.02] relative"
                        >
                            <Badge className="absolute top-2 right-2 bg-indigo-500/10 text-indigo-600 text-[8px] border-indigo-200">AI Voice</Badge>
                            <Mic className="size-6" />
                            <span className="font-bold">声で記録</span>
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setActiveTab("sales")}
                            className="h-24 flex-col gap-2 rounded-2xl border-2 border-orange-100 hover:bg-orange-50 text-orange-700 transition-all hover:scale-[1.02]"
                        >
                            <LayoutDashboard className="size-6" />
                            <span className="font-bold">売上入力</span>
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                toast.promise(
                                    new Promise((resolve) => setTimeout(resolve, 3000)),
                                    {
                                        loading: 'AIが未整理の書類24件をスキャン中...',
                                        success: '「食材仕入」「光熱費」など3カテゴリーに自動仕訳しました',
                                        error: '仕訳に失敗しました',
                                    }
                                );
                            }}
                            className="h-24 flex-col gap-2 rounded-2xl border-2 border-purple-100 hover:bg-purple-50 text-purple-700 transition-all hover:scale-[1.02]"
                        >
                            <Sparkles className="size-6 text-purple-500" />
                            <span className="font-bold">AI書類仕訳</span>
                        </Button>
                        {/* PC向け：一括管理・エクスポート */}
                        <Button
                            variant="outline"
                            onClick={() => toast.info("高度な管理機能", {
                                description: "書類の一括ダウンロード、PDF出力、Excel/Googleシートへのエクスポート機能は、現在Proプラン向けに開発中です。"
                            })}
                            className="hidden sm:flex h-24 flex-col gap-2 rounded-2xl border-2 border-emerald-100 hover:bg-emerald-50 text-emerald-700 transition-all hover:scale-[1.02]"
                        >
                            <FileSpreadsheet className="size-6 text-emerald-500" />
                            <span className="font-bold">出力・管理(PC)</span>
                        </Button>

                        {/* 隠しファイル入力要素 */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*,application/pdf"
                            className="hidden"
                        />
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        {/* タブリストはサイドバーに統合されたため非表示 */}
                        {/* <TabsList className="bg-muted/50 p-1 rounded-xl h-auto gap-1 border border-muted-foreground/10 shadow-inner">
                            <TabsTrigger value="overview" className="rounded-lg py-2 px-4 data-[state=active]:bg-card data-[state=active]:shadow-sm">概要</TabsTrigger>
                            <TabsTrigger value="sales" className="rounded-lg py-2 px-4 data-[state=active]:bg-card data-[state=active]:shadow-sm">売上管理</TabsTrigger>
                            <TabsTrigger value="finance" className="rounded-lg py-2 px-4 data-[state=active]:bg-card data-[state=active]:shadow-sm">収支・帳簿</TabsTrigger>
                            <TabsTrigger value="documents" className="rounded-lg py-2 px-4 data-[state=active]:bg-card data-[state=active]:shadow-sm">書類管理</TabsTrigger>
                        </TabsList> */}

                        <TabsContent value="overview" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {/* AI要約パネル */}
                            <Card className="border-2 border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white overflow-hidden shadow-md">
                                <CardContent className="p-6">
                                    <div className="flex gap-4">
                                        <div className="bg-emerald-500 p-3 rounded-2xl text-white shadow-lg shadow-emerald-500/30">
                                            <Sparkles className="size-6 animate-pulse" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-emerald-900">AIデジタル店長の現状分析</h3>
                                                <Badge variant="outline" className="bg-white border-emerald-200 text-emerald-600 text-[10px] font-black uppercase">Realtime</Badge>
                                            </div>
                                            <p className="text-sm text-gray-700 leading-relaxed">
                                                今月の着地予測は <span className="font-black text-emerald-600">¥2,450,000</span> です。先月比で <span className="font-bold">+12%</span> と好調です！
                                                特に水曜日のランチ集客が伸びており、原材料費の比率も目標の35%を下回る <span className="font-bold">32.4%</span> に抑えられています。
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* 確定申告・進捗ステータス */}
                            <Card className="border-purple-100 bg-white shadow-md overflow-hidden ring-1 ring-purple-50">
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row items-center gap-8">
                                        <div className="relative size-32 flex-shrink-0">
                                            <svg className="size-full" viewBox="0 0 36 36">
                                                <path className="stroke-gray-100 stroke-[3]" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                                <motion.path
                                                    initial={{ pathLength: 0 }}
                                                    animate={{ pathLength: 0.78 }}
                                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                                    className="stroke-purple-600 stroke-[3]"
                                                    strokeDasharray="100, 100"
                                                    fill="none"
                                                    strokeLinecap="round"
                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-2xl font-black text-purple-600 leading-none">78<span className="text-xs">%</span></span>
                                                <span className="text-[8px] font-bold text-gray-400 uppercase">Ready</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-4 text-center md:text-left">
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-center md:justify-start gap-2">
                                                    <h3 className="text-lg font-black text-gray-800">2025-2026年度 確定申告の準備状況</h3>
                                                    <Badge className="bg-purple-100 text-purple-600 border-0 hover:bg-purple-100">順調</Badge>
                                                </div>
                                                <p className="text-sm text-gray-500 font-medium">AIが現在の入力状況から確定申告への準備率を算出しました。</p>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">売上同期</div>
                                                    <div className="text-sm font-black text-emerald-600 flex items-center gap-1"><Check className="size-3" /> 完了</div>
                                                </div>
                                                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">経費仕訳</div>
                                                    <div className="text-sm font-black text-orange-500">残り 12件</div>
                                                </div>
                                                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 hidden sm:block">
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">控除書類</div>
                                                    <div className="text-sm font-black text-blue-500">未確認 2件</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full md:w-auto">
                                            <Button className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 font-black px-8 py-6 rounded-2xl shadow-lg shadow-purple-200 text-sm">
                                                申告書類を生成する
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* 主要KPI */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="hover:shadow-lg transition-all duration-300">
                                    <CardHeader className="pb-2">
                                        <CardDescription className="font-bold flex items-center gap-1">
                                            <TrendingUp className="size-3 text-emerald-500" /> 今月の売上
                                        </CardDescription>
                                        <CardTitle className="text-3xl font-black">¥1,854,200</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 inline-flex items-center px-2 py-0.5 rounded-full">+15% from last month</div>
                                    </CardContent>
                                </Card>
                                <Card className="hover:shadow-lg transition-all duration-300">
                                    <CardHeader className="pb-2">
                                        <CardDescription className="font-bold flex items-center gap-1">
                                            <FileText className="size-3 text-blue-500" /> 未処理の書類
                                        </CardDescription>
                                        <CardTitle className="text-3xl font-black">12件</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-[10px] text-gray-400 font-medium">合計: ¥128,400 分の請求</div>
                                    </CardContent>
                                </Card>
                                <Card className="hover:shadow-lg transition-all duration-300">
                                    <CardHeader className="pb-2">
                                        <CardDescription className="font-bold flex items-center gap-1">
                                            <Sparkles className="size-3 text-orange-500" /> 推定営業利益
                                        </CardDescription>
                                        <CardTitle className="text-3xl font-black">¥642,000</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-[10px] text-indigo-600 font-bold bg-indigo-50 inline-flex items-center px-2 py-0.5 rounded-full">利益率: 34.6%</div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* AIデータ統合フィード (最新のAI活動) */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        <Sparkles className="size-5 text-purple-500" />
                                        AIデータ統合フィード
                                    </h3>
                                    <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-600 border-purple-100">Live Processing</Badge>
                                </div>
                                <div className="grid gap-3">
                                    {[
                                        { source: 'Camera', detail: '佐藤精肉店 領収書', action: 'OCR解析完了', category: '食材仕入', amount: '¥24,500', time: '12分前', color: 'bg-emerald-500', icon: <Camera className="size-3" />, invoice: true },
                                        { source: 'Voice', detail: '「大根300円買ったよ」', action: '音声推論完了', category: '食材仕入', amount: '¥300', time: '1時間前', color: 'bg-indigo-500', icon: <Mic className="size-3" />, invoice: false },
                                        { source: 'API', detail: 'Airレジ 売上同期', action: '売上データ統合', category: '売上', amount: '¥142,000', time: '3時間前', color: 'bg-orange-500', icon: <RefreshCcw className="size-3" />, invoice: true },
                                    ].map((feed, i) => (
                                        <div key={i} className="group bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between hover:border-purple-200 hover:shadow-sm transition-all cursor-pointer">
                                            <div className="flex items-center gap-4">
                                                <div className={`size-10 ${feed.color} rounded-xl flex items-center justify-center text-white shadow-lg shadow-gray-200 transition-transform group-hover:scale-110`}>
                                                    {feed.icon}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-sm text-gray-800">{feed.detail}</span>
                                                        {feed.invoice && (
                                                            <Badge className="h-4 px-1.5 text-[8px] bg-blue-50 text-blue-600 border-blue-100 font-bold">インボイス確認済</Badge>
                                                        )}
                                                        <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded uppercase">{feed.source}</span>
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 flex gap-2 font-medium">
                                                        <span className="text-purple-500">{feed.action}</span>
                                                        <span>•</span>
                                                        <span>{feed.category}</span>
                                                        <span>•</span>
                                                        <span>{feed.time}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-black text-sm text-gray-800">{feed.amount}</div>
                                                <div className="text-[9px] text-emerald-500 font-bold flex items-center justify-end gap-1">
                                                    <Check className="size-2.5" /> 帳簿反映済
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Button variant="ghost" className="w-full text-[11px] text-gray-400 hover:bg-gray-50 h-8 font-bold">
                                    すべての処理結果を見る <ChevronRight className="size-3 ml-1" />
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="sales" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {/* 売上入力クイックカード */}
                            <Card className="border-orange-100 bg-orange-50/5 overflow-hidden shadow-sm">
                                <CardHeader className="bg-orange-50/20 border-b border-orange-100/50 p-2.5 px-4">
                                    <CardTitle className="text-[15px] font-black text-orange-800 flex items-center gap-2">
                                        <Plus className="size-4" /> 本日の売上を迅速に記録
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-2 px-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="flex items-center gap-3">
                                            <Label className="text-[9px] font-black text-gray-400 uppercase min-w-[32px]">時間</Label>
                                            <Select defaultValue="lunch">
                                                <SelectTrigger className="h-8 bg-white text-xs py-0">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">当日売上</SelectItem>
                                                    <SelectItem value="lunch">ランチ</SelectItem>
                                                    <SelectItem value="dinner">ディナー</SelectItem>
                                                    <SelectItem value="other">その他</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Label className="text-[9px] font-black text-gray-400 uppercase min-w-[32px]">売上</Label>
                                            <div className="relative flex-1">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[10px]">¥</span>
                                                <Input type="number" placeholder="50,000" className="h-8 pl-6 text-sm font-bold bg-white" />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Label className="text-[9px] font-black text-gray-400 uppercase min-w-[32px]">来客</Label>
                                            <div className="relative flex-1">
                                                <Input type="number" placeholder="20" className="h-8 pr-8 text-sm font-bold bg-white" />
                                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold">名</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-end gap-3 items-center">
                                        <Button variant="ghost" size="sm" className="h-8 text-gray-400 hover:text-gray-600 text-[11px] px-3">クリア</Button>
                                        <Button
                                            size="sm"
                                            disabled={syncing}
                                            onClick={() => {
                                                setSyncing(true);
                                                toast.promise(
                                                    new Promise((resolve) => setTimeout(resolve, 2000)),
                                                    {
                                                        loading: 'データを同期中...',
                                                        success: '本日の売上データを同期しました',
                                                        error: '同期に失敗しました',
                                                        finally: () => setSyncing(false)
                                                    }
                                                );
                                            }}
                                            className="h-10 bg-orange-600 hover:bg-orange-700 font-extrabold px-8 text-xs shadow-md transition-all active:scale-95"
                                        >
                                            {syncing ? (
                                                <RefreshCcw className="size-4 animate-spin mr-2" />
                                            ) : (
                                                <RefreshCcw className="size-4 mr-2" />
                                            )}
                                            同期実行
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-lg border-muted-foreground/10 overflow-hidden col-span-1 md:col-span-2">
                                <CardHeader className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 pb-8">
                                    <div className="flex flex-col items-start gap-4 pb-2 xl:pb-0">
                                        {/* 1段目: Googleシート同期ステータス (Image 2) */}
                                        <div className="flex items-center gap-6 border-b pb-4 border-muted-foreground/10 w-full lg:w-auto hidden lg:flex">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100/50">
                                                    <FileSpreadsheet className="size-5" />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <div className="text-[13px] font-bold text-gray-700 leading-none whitespace-nowrap">Googleシート同期済み</div>
                                                    <div className="text-[10px] text-gray-400 font-medium">最終同期: 2026/02/19 11:30</div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 rounded-lg border-blue-200 bg-blue-50/30 text-blue-600 hover:bg-blue-50 text-[11px] font-bold gap-1 px-3 shadow-sm transition-all"
                                                onClick={() => {
                                                    toast.success("Googleシートを開いています...", {
                                                        description: "最新の売上データが同期されたスプレッドシートを表示します。"
                                                    });
                                                    window.open("https://docs.google.com/spreadsheets/u/0/", "_blank");
                                                }}
                                            >
                                                <ChevronRight className="size-3" /> シートを開く
                                            </Button>
                                        </div>

                                        {/* 2段目: メインタイトル・表示詳細 (Image 1) */}
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                                            <div className="space-y-1.5">
                                                <CardTitle className="text-2xl font-black flex items-center gap-3 text-gray-800 whitespace-nowrap tracking-tight">
                                                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                                                        <BarChart3 className="size-5 text-emerald-500" />
                                                    </div>
                                                    {getMetricLabel(chartMetric)}
                                                </CardTitle>
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 whitespace-nowrap uppercase tracking-[0.2em] pl-1">
                                                    <span className="text-emerald-500/80">{salesPeriod.toUpperCase()} 期間</span>
                                                    <span className="text-muted-foreground/30">|</span>
                                                    <span>{comparisonMode === "amount" ? "金額ベース" : "成長率ベース"}推移</span>
                                                </div>
                                            </div>
                                            <div className="h-10 w-px bg-gray-100 hidden sm:block" />
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="sm" className="h-9 rounded-xl border-emerald-200 bg-emerald-50/30 text-emerald-600 hover:bg-emerald-50 font-black gap-2 px-4 shadow-sm transition-all active:scale-95">
                                                        <Settings2 className="size-4" />
                                                        <span className="text-[11px]">表示詳細</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start" className="w-56 p-2 rounded-xl shadow-2xl border-emerald-100">
                                                    <DropdownMenuLabel className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2 py-1.5">表示メトリクス</DropdownMenuLabel>
                                                    <DropdownMenuSeparator className="bg-emerald-50" />
                                                    <DropdownMenuItem onClick={() => setChartMetric("sales_all")} className="rounded-lg gap-2 cursor-pointer">
                                                        <Check className={`size-4 text-emerald-500 transition-opacity ${chartMetric === 'sales_all' ? 'opacity-100' : 'opacity-0'}`} /> 当日売上
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setChartMetric("sales_lunch")} className="rounded-lg gap-2 cursor-pointer">
                                                        <Check className={`size-4 text-emerald-500 transition-opacity ${chartMetric === 'sales_lunch' ? 'opacity-100' : 'opacity-0'}`} /> ランチ営業
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setChartMetric("sales_dinner")} className="rounded-lg gap-2 cursor-pointer">
                                                        <Check className={`size-4 text-emerald-500 transition-opacity ${chartMetric === 'sales_dinner' ? 'opacity-100' : 'opacity-0'}`} /> ディナー営業
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setChartMetric("turnover")} className="rounded-lg gap-2 cursor-pointer">
                                                        <Check className={`size-4 text-emerald-500 transition-opacity ${chartMetric === 'turnover' ? 'opacity-100' : 'opacity-0'}`} /> 平均回転率
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setChartMetric("tsubo_sales")} className="rounded-lg gap-2 cursor-pointer">
                                                        <Check className={`size-4 text-emerald-500 transition-opacity ${chartMetric === 'tsubo_sales' ? 'opacity-100' : 'opacity-0'}`} /> 坪単価
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-end gap-3 ml-auto">
                                        {/* グラフ形式選択 */}
                                        <div className="flex bg-muted/50 p-1 rounded-lg border border-muted-foreground/5 items-center">
                                            <button onClick={() => setChartType("bar")} className={`p-1.5 rounded-md transition-all ${chartType === 'bar' ? "bg-card shadow-sm text-emerald-600" : "text-muted-foreground"}`} title="縦棒グラフ">
                                                <BarChart3 className="size-4" />
                                            </button>
                                            <button onClick={() => setChartType("horizontal")} className={`p-1.5 rounded-md transition-all ${chartType === 'horizontal' ? "bg-card shadow-sm text-emerald-600" : "text-muted-foreground"}`} title="横棒グラフ">
                                                <BarChartHorizontal className="size-4" />
                                            </button>
                                            <button onClick={() => setChartType("line")} className={`p-1.5 rounded-md transition-all ${chartType === 'line' ? "bg-card shadow-sm text-emerald-600" : "text-muted-foreground"}`} title="折れ線グラフ">
                                                <LineChart className="size-4" />
                                            </button>
                                        </div>

                                        <div className="flex bg-muted/50 p-1 rounded-lg border border-muted-foreground/5 items-center">
                                            <button
                                                onClick={() => setComparisonMode("amount")}
                                                className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${comparisonMode === 'amount' ? 'bg-card shadow-sm text-emerald-600' : 'text-muted-foreground hover:text-foreground'}`}
                                            >
                                                {(chartMetric.includes('sales') && chartMetric !== 'sales_comp') ? '金額ベース' : '実績値'}
                                            </button>
                                            <button
                                                onClick={() => setComparisonMode("percent")}
                                                className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${comparisonMode === 'percent' ? 'bg-card shadow-sm text-emerald-600' : 'text-muted-foreground hover:text-foreground'}`}
                                            >
                                                成長率ベース
                                            </button>
                                        </div>

                                        {/* 期間選択コントロール */}
                                        <div className="flex flex-wrap items-center justify-end gap-2">
                                            {/* 主要期間・カレンダー */}
                                            <div className="flex bg-muted/50 p-1 rounded-lg border border-muted-foreground/5 items-center gap-1">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button
                                                            className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${salesPeriod === 'custom' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                                                        >
                                                            <Calendar className="size-3.5 text-emerald-500" />
                                                            {selectedDate.getFullYear()}年 {selectedDate.getMonth() + 1}月
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="start" className="w-48 p-2 rounded-xl">
                                                        <div className="flex items-center justify-between px-2 py-1 mb-2 border-b border-muted">
                                                            <button onClick={() => setSelectedDate(new Date(selectedDate.setFullYear(selectedDate.getFullYear() - 1)))} className="p-1 hover:bg-muted rounded-md"><ChevronRight className="rotate-180 size-3" /></button>
                                                            <span className="text-[11px] font-bold">{selectedDate.getFullYear()}年</span>
                                                            <button onClick={() => setSelectedDate(new Date(selectedDate.setFullYear(selectedDate.getFullYear() + 1)))} className="p-1 hover:bg-muted rounded-md"><ChevronRight className="size-3" /></button>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-1">
                                                            {Array.from({ length: 12 }).map((_, i) => (
                                                                <DropdownMenuItem
                                                                    key={i}
                                                                    className={`justify-center font-bold text-[10px] rounded-md transition-all ${selectedDate.getMonth() === i ? "bg-emerald-500 text-white focus:bg-emerald-600 focus:text-white" : ""}`}
                                                                    onClick={() => {
                                                                        const newDate = new Date(selectedDate);
                                                                        newDate.setMonth(i);
                                                                        setSelectedDate(newDate);
                                                                        setSalesPeriod("custom");
                                                                    }}
                                                                >
                                                                    {i + 1}月
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </div>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>

                                                {/* 各期間ショートカット */}
                                                {[
                                                    { label: '直近7日', value: '7d' },
                                                    { label: '日次', value: 'day' },
                                                    { label: '週次', value: 'week' },
                                                    { label: '全期間', value: 'month' }
                                                ].map((p) => (
                                                    <button
                                                        key={p.value}
                                                        onClick={() => setSalesPeriod(p.value as any)}
                                                        className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${salesPeriod === p.value
                                                            ? "bg-card text-foreground shadow-sm"
                                                            : "text-muted-foreground hover:text-foreground"
                                                            }`}
                                                    >
                                                        {p.label}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* 特別・分析期間 */}
                                            <div className="flex bg-muted/50 p-1 rounded-lg border border-muted-foreground/5 items-center gap-1">
                                                {[
                                                    { label: '今月', value: 'this_month' },
                                                    { label: '先月', value: 'last_month' },
                                                    { label: '今年', value: 'this_year' },
                                                    { label: '前年', value: 'last_year' },
                                                    { label: '曜日別(今年)', value: 'dow_this_year' },
                                                    { label: '曜日別(前年)', value: 'dow_last_year' }
                                                ].map((p) => (
                                                    <button
                                                        key={p.value}
                                                        onClick={() => setSalesPeriod(p.value as any)}
                                                        className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${salesPeriod === p.value
                                                            ? "bg-card text-foreground shadow-sm"
                                                            : "text-muted-foreground hover:text-foreground"
                                                            }`}
                                                    >
                                                        {p.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className={`h-[580px] relative flex gap-4 px-10 ${chartType === 'horizontal' ? 'flex-col justify-start gap-1 py-4 overflow-y-auto' : 'flex-row items-end'}`}>
                                        {/* 背景グリッド (プロフェッショナルな視覚支援) */}
                                        <div className={`absolute inset-x-0 inset-y-0 flex ${chartType === 'horizontal' ? 'flex-row' : 'flex-col'} justify-between pointer-events-none opacity-[0.03] px-10 py-2`}>
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className={`${chartType === 'horizontal' ? 'h-full border-l' : 'w-full border-t'} border-gray-900`} />
                                            ))}
                                        </div>

                                        {/* データ正規化の計算 */}
                                        {/* currentSalesData はこのコンポーネントのどこかで定義されていると仮定 */}
                                        {/* 例: const currentSalesData = [{ label: 'Jan', value: 50 }, { label: 'Feb', value: 75 }, ...]; */}
                                        {(() => {
                                            const hasNegatives = comparisonMode === 'percent' && currentSalesData.some(d => d.value < 0);
                                            const rawMaxValue = Math.max(...currentSalesData.map(d => Math.abs(d.value)), 1);

                                            const autoRef = comparisonMode === 'percent'
                                                ? (Math.ceil(rawMaxValue / 25) * 25)
                                                : rawMaxValue;

                                            const currentEffectiveMax = customRefValue || autoRef;

                                            const normalizedData = currentSalesData.map(d => {
                                                let percent = 0;
                                                let offset = 0;
                                                let yPos = 0;

                                                if (hasNegatives) {
                                                    // 中央値0のスケール [-effectiveMax, effectiveMax]
                                                    percent = Math.abs(d.value / currentEffectiveMax) * 50;
                                                    offset = d.value >= 0 ? 50 : 50 - percent;
                                                    yPos = 100 - ((d.value / currentEffectiveMax) * 50 + 50);
                                                } else {
                                                    // 底辺0のスケール [0, effectiveMax]
                                                    percent = currentEffectiveMax === 0 ? 0 : (d.value / currentEffectiveMax) * 100;
                                                    offset = 0;
                                                    yPos = 100 - percent;
                                                }

                                                return {
                                                    label: d.label,
                                                    raw: d.value,
                                                    percent,
                                                    offset,
                                                    yPos
                                                };
                                            });

                                            return (
                                                <AnimatePresence mode="wait">
                                                    <motion.div
                                                        key={`${salesPeriod}-${chartMetric}-${chartType}-${comparisonMode}`}
                                                        initial={{ opacity: 0, x: chartType === 'horizontal' ? -10 : 0, y: chartType !== 'horizontal' ? 10 : 0 }}
                                                        animate={{ opacity: 1, x: 0, y: 0 }}
                                                        exit={{ opacity: 0 }}
                                                        className={`flex-1 h-full z-10 flex relative ${chartType === 'horizontal'
                                                            ? 'flex-col w-full gap-1'
                                                            : `items-end`
                                                            }`}
                                                    >
                                                        {/* 基準軸ライン (100%の位置を明示) */}
                                                        {customRefValue && (
                                                            <div
                                                                className={`absolute border-emerald-500/30 border-dashed pointer-events-none z-0 ${chartType === 'horizontal' ? 'inset-y-0 border-l-2' : 'inset-x-0 border-t-2'}`}
                                                                style={chartType === 'horizontal'
                                                                    ? { left: `${customRefValue > 0 ? (customRefValue / currentEffectiveMax) * (hasNegatives ? 50 : 100) + (hasNegatives ? 50 : 0) : (hasNegatives ? 50 : 0)}%` }
                                                                    : { bottom: `${customRefValue > 0 ? (customRefValue / currentEffectiveMax) * (hasNegatives ? 50 : 100) + (hasNegatives ? 50 : 0) : (hasNegatives ? 50 : 0)}%` }
                                                                }
                                                            />
                                                        )}

                                                        {/* ゼロライン (％表示・マイナスあり時) */}
                                                        {hasNegatives && (
                                                            <div
                                                                className={`absolute border-gray-400/40 border-dashed pointer-events-none z-0 ${chartType === 'horizontal' ? 'inset-y-0 border-l' : 'inset-x-0 border-t'}`}
                                                                style={{ [chartType === 'horizontal' ? 'left' : 'bottom']: '50%' }}
                                                            />
                                                        )}
                                                        {chartType === 'line' && (
                                                            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                                                                <defs>
                                                                    <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                                                                        <stop offset="0%" stopColor="#10b981" />
                                                                        <stop offset="100%" stopColor="#3b82f6" />
                                                                    </linearGradient>
                                                                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                                                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
                                                                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                                                                    </linearGradient>
                                                                </defs>
                                                                {/* 塗りつぶしエリア (Area) */}
                                                                <motion.path
                                                                    d={`M 0 ${hasNegatives ? 50 : 100} L ${normalizedData.map((d, i) => `${(i / (normalizedData.length - 1)) * 100} ${d.yPos}`).join(' L ')} L 100 ${hasNegatives ? 50 : 100} Z`}
                                                                    fill="url(#areaGradient)"
                                                                    initial={{ opacity: 0 }}
                                                                    animate={{ opacity: 1 }}
                                                                    transition={{ duration: 0.5, delay: 0.2 }}
                                                                />
                                                                {/* 精密なメインライン */}
                                                                <motion.path
                                                                    d={`M ${normalizedData.map((d, i) => `${(i / (normalizedData.length - 1)) * 100} ${d.yPos}`).join(' L ')}`}
                                                                    fill="none"
                                                                    stroke="#10b981"
                                                                    strokeWidth="1.5"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    initial={{ pathLength: 0 }}
                                                                    animate={{ pathLength: 1 }}
                                                                    transition={{ duration: 0.8, ease: "easeInOut" }}
                                                                />
                                                                {/* ◯（ドット）をSVG内で描画することでズレを解消 */}
                                                                {normalizedData.map((d, i) => (
                                                                    <motion.circle
                                                                        key={i}
                                                                        cx={`${(i / (normalizedData.length - 1)) * 100}`}
                                                                        cy={d.yPos}
                                                                        r="0.8"
                                                                        fill="white"
                                                                        stroke="#10b981"
                                                                        strokeWidth="1"
                                                                        initial={{ scale: 0 }}
                                                                        animate={{ scale: 1 }}
                                                                        transition={{ delay: 0.5 + i * 0.02 }}
                                                                    />
                                                                ))}
                                                            </svg>
                                                        )}
                                                        {normalizedData.map((item, idx) => {
                                                            const percentageLeft = (idx / (normalizedData.length - 1)) * 100;
                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    className={`flex group transition-all duration-300 ${chartType === 'horizontal' ? 'w-full flex-row items-center gap-4 min-h-[40px] py-1.5' : 'absolute bottom-0 h-full flex flex-col items-center'}`}
                                                                    style={chartType !== 'horizontal' ? { left: `${percentageLeft}%`, width: `${100 / normalizedData.length}%`, transform: 'translateX(-50%)' } : {}}
                                                                >
                                                                    {chartType === 'horizontal' && (
                                                                        <span className={`w-16 text-[12.6px] font-bold text-gray-500 text-right leading-none truncate ${item.raw === 0 ? 'opacity-30' : ''}`} title={item.label}>{item.label}</span>
                                                                    )}

                                                                    <div className={`relative ${chartType === 'horizontal' ? 'flex-1 flex items-center h-full pl-4 border-l-2 border-muted' : 'flex-1 w-full flex items-end justify-center'}`}>
                                                                        {chartType === 'line' ? (
                                                                            <div className="flex flex-col items-center relative h-full justify-center w-0 overflow-visible z-20">
                                                                                {/* ホバー時のツールチップ */}
                                                                                <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity z-30" style={{ bottom: `${(100 - item.yPos) + 5}%` }}>
                                                                                    <div className="bg-gray-900 text-white text-[11.5px] font-bold py-1 px-2 rounded shadow-xl whitespace-nowrap">
                                                                                        {comparisonMode === 'amount'
                                                                                            ? (chartMetric.includes('sales') && chartMetric !== 'sales_comp' ? `¥${(item.raw * 10000).toLocaleString()}` : `${item.raw}${chartMetric === 'turnover' ? '回' : ''}`)
                                                                                            : `${item.raw > 0 ? '+' : ''}${item.raw}%`}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <motion.div
                                                                                initial={chartType === 'horizontal' ? { [hasNegatives ? 'left' : 'width']: hasNegatives ? '50%' : 0, width: 0 } : { [hasNegatives ? 'bottom' : 'height']: hasNegatives ? '50%' : 0, height: 0 }}
                                                                                animate={chartType === 'horizontal' ? { left: `${item.offset}%`, width: `${item.percent}%` } : { bottom: `${item.offset}%`, height: `${item.percent}%` }}
                                                                                transition={{ type: "spring", damping: 18, stiffness: 90 }}
                                                                                className={`bg-gradient-to-br ${item.raw < 0 ? 'from-red-600 to-red-400' : 'from-emerald-600 to-emerald-400'} shadow-md ${item.raw < 0 ? 'group-hover:from-red-400 group-hover:to-red-300' : 'group-hover:from-emerald-400 group-hover:to-emerald-300'} transition-all cursor-pointer absolute ${chartType === 'horizontal'
                                                                                    ? `h-[70%] top-1/2 -translate-y-1/2 ${normalizedData.length > 8 ? 'max-h-[20px]' : 'max-h-[32px]'} rounded-sm ${item.raw < 0 ? 'shadow-[2px_0_8px_rgba(220,38,38,0.1)]' : 'shadow-[2px_0_8px_rgba(16,185,129,0.1)]'}`
                                                                                    : `w-[60%] left-1/2 -translate-x-1/2 ${normalizedData.length > 8 ? 'max-w-[14px]' : 'max-w-[45px]'} rounded-t-sm rounded-b-sm`
                                                                                    }`}
                                                                            >
                                                                                <div className={`absolute left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[11.5px] font-bold py-1.2 px-2.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-2xl whitespace-nowrap ${item.raw >= 0 ? '-top-10' : '-bottom-10'}`}>
                                                                                    {comparisonMode === 'amount'
                                                                                        ? (chartMetric.includes('sales') && chartMetric !== 'sales_comp' ? `¥${(item.raw * 10000).toLocaleString()}` : `${item.raw}${chartMetric === 'turnover' ? '回' : ''}`)
                                                                                        : `${item.raw > 0 ? '+' : ''}${item.raw}%`}
                                                                                </div>
                                                                            </motion.div>
                                                                        )}
                                                                    </div>

                                                                    {chartType !== 'horizontal' && (
                                                                        <span
                                                                            className={`text-[9.2px] font-bold text-gray-400 group-hover:text-emerald-600 transition-colors uppercase tracking-widest whitespace-nowrap absolute -bottom-10 ${normalizedData.length >= 12 ? 'rotate-[-60deg] origin-top-left -ml-1' : ''}`}
                                                                        >
                                                                            {(normalizedData.length <= 15 || idx === 0 || idx === normalizedData.length - 1 || idx % Math.ceil(normalizedData.length / 12) === 0) ? item.label : ''}
                                                                        </span>
                                                                    )}

                                                                    {chartType === 'horizontal' && (
                                                                        <div className="flex flex-col items-end min-w-[80px] relative">
                                                                            {/* 基準軸設定UIは省略（最初の要素にのみ表示されていたロジックを必要に応じて調整） */}
                                                                            <span className={`text-[11.5px] font-black ${item.raw < 0 ? 'text-red-600' : 'text-emerald-600'} tabular-nums leading-none ${item.raw === 0 ? 'opacity-30' : ''}`}>
                                                                                {comparisonMode === 'amount' ? (chartMetric.includes('sales') && chartMetric !== 'sales_comp' ? `¥${(item.raw * 10000).toLocaleString()}` : `${item.raw}${chartMetric === 'turnover' ? '回' : ''}`) : `${item.raw > 0 ? '+' : ''}${item.raw}%`}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </motion.div>
                                                </AnimatePresence>
                                            );
                                        })()}
                                    </div>

                                    <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6 p-6 rounded-2xl bg-muted/20 border border-muted">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">前期比較トレンド</p>
                                            <p className="text-xl font-black text-emerald-600 flex items-center gap-1">
                                                <TrendingUp className="size-4" /> +12.4%
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">平均{chartMetric === 'turnover' ? '回転数' : '客単価'}</p>
                                            <p className="text-xl font-black text-gray-800">
                                                {chartMetric === 'turnover' ? '3.2回' : '¥3,240'}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">予測達成率</p>
                                            <p className="text-xl font-black text-indigo-600">
                                                92%
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">店舗全体スコア</p>
                                            <p className="text-xl font-black text-orange-600">84/100</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>


                        </TabsContent>

                        <TabsContent value="finance" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {/* 収支サマリー */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-lg border-0">
                                    <div className="p-5 space-y-1">
                                        <div className="text-[10px] font-bold opacity-80 uppercase tracking-wider">推定営業利益</div>
                                        <div className="text-2xl font-black">¥642,300</div>
                                        <div className="text-[10px] font-bold bg-white/20 inline-block px-2 py-0.5 rounded-full mt-2">利益率: 34.6%</div>
                                    </div>
                                </Card>
                                <Card className="bg-white border-gray-100 shadow-sm">
                                    <div className="p-5 space-y-1">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">総売上 (確定済)</div>
                                        <div className="text-2xl font-black text-gray-800">¥1,854,200</div>
                                        <div className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight className="size-3" /> +15.2%</div>
                                    </div>
                                </Card>
                                <Card className="bg-white border-gray-100 shadow-sm">
                                    <div className="p-5 space-y-1">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">総経費</div>
                                        <div className="text-2xl font-black text-orange-600">¥1,211,900</div>
                                        <div className="text-[10px] text-gray-400 font-medium mt-2">書類 24通より自動算出</div>
                                    </div >
                                </Card>
                                <Card className="bg-white border-gray-100 shadow-sm">
                                    <div className="p-5 space-y-1">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">納税・引当予測</div>
                                        <div className="text-2xl font-black text-blue-600">¥128,000</div>
                                        <div className="text-[10px] text-gray-400 font-medium mt-2">消費税・所得税概算</div>
                                    </div>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* 科目別経費内訳 */}
                                <Card className="lg:col-span-2 border-gray-100 shadow-sm">
                                    <CardHeader className="p-6 pb-2">
                                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                                            <Sparkles className="size-5 text-purple-500" /> AI科目別経費内訳
                                        </CardTitle>
                                        <CardDescription>今月の支出をAIが自動で科目に紐付けました</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="space-y-6">
                                            {[
                                                { label: '売上原価 (食材・飲料仕入)', amount: 648000, color: 'bg-emerald-500', pct: 53 },
                                                { label: '人件費 (給与・賞与)', amount: 320000, color: 'bg-blue-500', pct: 26 },
                                                { label: '地代家賃', amount: 150000, color: 'bg-indigo-500', pct: 12 },
                                                { label: '水道光熱費', amount: 65000, color: 'bg-orange-500', pct: 5 },
                                                { label: 'その他 (消耗品・広告費)', amount: 28900, color: 'bg-gray-400', pct: 4 },
                                            ].map((item, i) => (
                                                <div key={i} className="space-y-2">
                                                    <div className="flex justify-between items-end">
                                                        <div className="text-xs font-bold text-gray-700">{item.label}</div>
                                                        <div className="text-right">
                                                            <div className="text-xs font-black">¥{item.amount.toLocaleString()}</div>
                                                            <div className="text-[10px] text-gray-400">{item.pct}%</div>
                                                        </div>
                                                    </div>
                                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${item.pct}%` }}
                                                            className={`h-full ${item.color}`}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* 会計ソフト連携 */}
                                <div className="space-y-6">
                                    <Card className="border-purple-100 bg-purple-50/20 shadow-none border-dashed border-2">
                                        <CardHeader className="p-6">
                                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                <RefreshCcw className="size-4 text-purple-600" /> 会計ソフト・外部連携
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                AIが作成した帳簿データを外部ソフトへ同期します。API連携の他、即時利用可能なCSV出力が可能です。
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-6 pt-0 space-y-4">
                                            <div className="space-y-3">
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">会計ソフト用データ出力</div>
                                                <div className="grid grid-cols-1 gap-2">
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => toast.success("freee形式の仕訳CSVを生成しました", { description: "ダウンロードフォルダを確認してください。" })}
                                                        className="w-full justify-between bg-white border-gray-200 h-10 text-[11px] font-bold hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-sm"
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <div className="size-2 rounded-full bg-emerald-500" /> freee形式で書き出し
                                                        </span>
                                                        <Download className="size-3.5 text-gray-400" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => toast.success("MF形式の仕訳CSVを生成しました", { description: "マネーフォワードの「仕訳インポート」から使用可能です。" })}
                                                        className="w-full justify-between bg-white border-gray-200 h-10 text-[11px] font-bold hover:bg-orange-50 hover:border-orange-200 transition-all shadow-sm"
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <div className="size-2 rounded-full bg-orange-500" /> MF形式で書き出し
                                                        </span>
                                                        <Download className="size-3.5 text-gray-400" />
                                                    </Button>
                                                    <Button
                                                        onClick={() => {
                                                            toast.promise(
                                                                new Promise((resolve) => setTimeout(resolve, 2000)),
                                                                {
                                                                    loading: 'AIがインボイス対応スプレッドシートを構成中...',
                                                                    success: 'インボイス管理シート(Excel形式)を生成しました！',
                                                                    error: '生成に失敗しました。',
                                                                }
                                                            );
                                                        }}
                                                        className="w-full justify-between bg-purple-50 border-purple-200 text-purple-700 h-10 text-[11px] font-black hover:bg-purple-100 transition-all shadow-sm border"
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <Sparkles className="size-3.5" /> AIカスタム帳簿 (Excel/Sheet)
                                                        </span>
                                                        <FileText className="size-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-orange-100 bg-orange-50/20 shadow-none border-dashed border-2">
                                        <CardHeader className="p-6">
                                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-orange-800">
                                                <Sparkles className="size-4 text-orange-500" /> AI税理士のアドバイス
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-6 pt-0">
                                            <p className="text-[11px] text-orange-900 leading-relaxed font-medium">
                                                「2026年10月のインボイス経過措置（控除率変更）を見据え、現在の納税予測に基づいたキャッシュ確保を推奨します。AIが将来の納税額も踏まえた資金繰りをバックアップします。」
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="documents" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {(isAnalyzing || capturedImage) && (
                                <div className="space-y-6">
                                    <Card className="border-emerald-100 bg-emerald-50/20 shadow-none border-dashed border-2 overflow-hidden">
                                        <div className="flex flex-col md:flex-row h-full">
                                            <div className="w-full md:w-1/3 bg-gray-100 h-48 md:h-auto overflow-hidden flex items-center justify-center border-b md:border-b-0 md:border-r border-emerald-100">
                                                {capturedImage ? (
                                                    <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                                        <Loader2 className="size-6 animate-spin" />
                                                        <span className="text-[10px] font-bold">IMAGE LOADING...</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 p-6 relative">
                                                {isAnalyzing ? (
                                                    <div className="flex flex-col items-center justify-center h-48 gap-4 text-emerald-800">
                                                        <div className="relative">
                                                            <motion.div
                                                                animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                                                                transition={{ duration: 2, repeat: Infinity }}
                                                            >
                                                                <Sparkles className="size-10 text-emerald-500" />
                                                            </motion.div>
                                                            <Loader2 className="absolute -top-1 -right-1 size-4 animate-spin text-emerald-400" />
                                                        </div>
                                                        <div className="text-center space-y-1">
                                                            <h4 className="text-sm font-black">AI OCR 解析中...</h4>
                                                            <p className="text-[10px] text-emerald-600/60 font-medium">発行元、金額、インボイス番号を抽出しています</p>
                                                        </div>
                                                    </div>
                                                ) : analysisResult ? (
                                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
                                                        <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                                                            <h4 className="text-sm font-black flex items-center gap-2 text-emerald-900">
                                                                <CheckCircle2 className="size-4 text-emerald-500" />
                                                                解析結果の確認
                                                            </h4>
                                                            <Badge variant="outline" className="text-[9px] border-emerald-200 text-emerald-600 bg-emerald-50">
                                                                Accuracy: 99%
                                                            </Badge>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] font-bold text-emerald-800/50 uppercase tracking-widest">店名・会社名</span>
                                                                <div className="text-xs font-black text-gray-800 border-b border-emerald-50 pb-1">{analysisResult.merchant_name}</div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] font-bold text-emerald-800/50 uppercase tracking-widest">合計金額</span>
                                                                <div className="text-xs font-black text-gray-800 border-b border-emerald-50 pb-1">¥{Number(analysisResult.total_amount).toLocaleString()}</div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] font-bold text-emerald-800/50 uppercase tracking-widest">取引日</span>
                                                                <div className="text-xs font-black text-gray-800 border-b border-emerald-50 pb-1">{analysisResult.transaction_date}</div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] font-bold text-emerald-800/50 uppercase tracking-widest">カテゴリー</span>
                                                                <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[9px] h-5">{analysisResult.category}</Badge>
                                                            </div>
                                                            {analysisResult.invoice_number && (
                                                                <div className="space-y-1 col-span-2">
                                                                    <span className="text-[10px] font-bold text-emerald-800/50 uppercase tracking-widest">インボイス登録番号</span>
                                                                    <div className="text-xs font-black text-gray-800 flex items-center gap-2">
                                                                        {analysisResult.invoice_number}
                                                                        <Badge variant="outline" className="text-[8px] h-4 border-blue-100 text-blue-600 bg-blue-50">適格請求書</Badge>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex gap-2 pt-2">
                                                            <Button
                                                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-10 text-xs font-black shadow-lg shadow-emerald-600/20"
                                                                onClick={handleSaveEntry}
                                                                disabled={isSaving}
                                                            >
                                                                {isSaving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                                                                この内容で仕訳登録
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                className="h-10 text-xs font-bold border-emerald-200 text-emerald-800"
                                                                onClick={() => setAnalysisResult(null)}
                                                            >
                                                                再解析
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
                                                        <FileText className="size-8 opacity-20" />
                                                        <span className="text-[10px] font-bold">READY TO ANALYZE</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {/* キャビネット・ヘッダー/検索 */}
                            <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                        <FileText className="size-5 text-purple-500" />
                                        デジタル・キャビネット
                                    </h3>
                                    <p className="text-xs text-gray-500 font-medium">電子帳簿保存法・インボイス制度準拠ストレージ</p>
                                </div>
                                <div className="relative w-full sm:w-72">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                                    <Input placeholder="書類、取引先、日付で検索..." className="pl-9 h-10 rounded-xl bg-white/50 border-gray-200" />
                                </div>
                            </div>

                            {/* AI自動生成フォルダ一覧 */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { name: '食材・飲料仕入', count: 42, color: 'bg-emerald-500', icon: <Plus className="size-4" /> },
                                    { name: '光熱費・水道', count: 8, color: 'bg-blue-500', icon: <Plus className="size-4" /> },
                                    { name: '店舗運営・備品', count: 12, color: 'bg-purple-500', icon: <Plus className="size-4" /> },
                                    { name: '重要書類・契約', count: 5, color: 'bg-orange-500', icon: <Plus className="size-4" /> }
                                ].map((folder, i) => (
                                    <div key={i} className="bg-white p-5 rounded-3xl border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all cursor-pointer group">
                                        <div className={`size-12 rounded-2xl ${folder.color} text-white flex items-center justify-center mb-4 shadow-lg shadow-gray-200 transition-transform group-hover:scale-110`}>
                                            <FileText className="size-6" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="font-black text-sm text-gray-800">{folder.name}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{folder.count} ITEMS</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* 最近の仕訳・検収履歴 */}
                            <Card className="border-gray-100 shadow-sm overflow-hidden">
                                <CardHeader className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-row items-center justify-between">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-600">
                                        <Sparkles className="size-4 text-purple-500" /> AIによる最近の仕訳履歴
                                    </CardTitle>
                                    <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-blue-600">一括エクスポート</Button>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-gray-100">
                                        {entries.length > 0 ? entries.map((item, i) => (
                                            <div key={item.id || i} className="p-4 flex items-center justify-between hover:bg-gray-50/80 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 overflow-hidden">
                                                        {item.imageUrl ? (
                                                            <img src={item.imageUrl} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <FileText className="size-4" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-gray-800">{item.merchantName || item.merchant_name}</div>
                                                        <div className="text-[10px] text-gray-400">{item.transactionDate || item.transaction_date}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-8">
                                                    <Badge variant="outline" className="text-[9px] border-purple-100 text-purple-600 bg-purple-50">
                                                        {item.category}
                                                    </Badge>
                                                    <div className="text-right">
                                                        <div className="text-xs font-black text-gray-800">¥{Number(item.totalAmount || item.total_amount).toLocaleString()}</div>
                                                        <div className="text-[9px] text-emerald-500 font-bold">Confirmed</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="p-12 text-center text-gray-400">
                                                <FileText className="size-8 mx-auto mb-2 opacity-20" />
                                                <p className="text-xs font-bold">まだデータがありません</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 text-center border-t border-gray-100">
                                        <Button variant="ghost" className="text-xs text-gray-400 w-full hover:bg-transparent">さらに表示する</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs >
                </div >
            </main >

            {/* Camera Overlay Modal */}
            <AnimatePresence>
                {
                    isCameraOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden"
                        >
                            <div className="absolute top-6 left-0 right-0 px-6 flex justify-between items-center z-[110]">
                                <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/20">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                    <span className="text-white text-[10px] font-black uppercase tracking-widest leading-none">
                                        LIVE: Document Scan
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-white hover:bg-white/20 rounded-full size-10"
                                    onClick={stopCamera}
                                >
                                    <X className="size-6" />
                                </Button>
                            </div>

                            <div className="relative w-full h-full flex items-center justify-center bg-gray-950">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                />

                                {/* Scanning Guide Overlay */}
                                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                                    {/* Instruction Overlay */}
                                    <div className="absolute top-[20%] text-center px-6">
                                        <p className="text-white/80 text-xs font-bold mb-1 drop-shadow-md">枠の中に納品書・請求書を配置してください</p>
                                        <p className="text-white/40 text-[10px] drop-shadow-md underline decoration-emerald-500/50 underline-offset-4">文字が鮮明に写るように調整してください</p>
                                    </div>

                                    {/* Main Capture Area */}
                                    <div className="relative w-[85%] aspect-[3/4.5] sm:w-[60%] sm:max-w-md border-2 border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.3)]">
                                        {/* Corner Accents */}
                                        <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-500"></div>
                                        <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-500"></div>
                                        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-500"></div>
                                        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-500"></div>

                                        {/* Scanning Line Animation */}
                                        <motion.div
                                            animate={{ top: ['0%', '100%', '0%'] }}
                                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                            className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_rgba(52,211,153,1)] z-10"
                                        />
                                    </div>

                                    <div className="absolute bottom-[20%] flex flex-col items-center gap-4">
                                        <div className="flex gap-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleUploadClick}
                                                className="bg-black/20 border-white/20 text-white rounded-full h-9 px-4 text-[10px] font-bold backdrop-blur-md pointer-events-auto hover:bg-white/10"
                                            >
                                                <UploadCloud className="size-3 mr-2" /> アルバムから選ぶ
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute bottom-12 left-0 right-0 flex justify-center items-center z-[110]">
                                <Button
                                    size="icon"
                                    className="size-20 rounded-full bg-white hover:bg-gray-100 shadow-2xl border-4 border-emerald-100 active:scale-90 transition-all p-0 group"
                                    onClick={capturePhoto}
                                >
                                    <div className="size-16 rounded-full border-2 border-gray-200 group-hover:border-emerald-300 transition-colors flex items-center justify-center">
                                        <div className="size-14 rounded-full bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors"></div>
                                    </div>
                                </Button>
                            </div>
                        </motion.div>
                    )
                }
            </AnimatePresence >
        </div >
    );
}
