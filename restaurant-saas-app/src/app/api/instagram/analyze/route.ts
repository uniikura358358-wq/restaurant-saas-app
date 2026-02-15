
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SystemConfigRow = {
    key: string;
    value: string;
};

const DEFAULT_FALLBACK_MODEL = "gemini-2.5-flash-lite";
const ANALYZE_TIMEOUT_MS = 20_000;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

async function getActiveModelName() {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("system_config")
            .select("value")
            .eq("key", "active_ai_model")
            .single();

        if (error || !data) {
            console.warn("DBからの取得に失敗しました。デフォルト(2.5-flash-lite)を使用します。");
            return DEFAULT_FALLBACK_MODEL;
        }
        return (data as Pick<SystemConfigRow, "value">).value;
    } catch {
        console.warn("DBからの取得に失敗しました。デフォルト(2.5-flash-lite)を使用します。");
        return DEFAULT_FALLBACK_MODEL;
    }
}

function extractJsonObject(text: string) {
    const trimmed = text.trim();

    try {
        return JSON.parse(trimmed);
    } catch {
        // fallthrough
    }

    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
        return JSON.parse(match[0]);
    } catch {
        return null;
    }
}

export async function POST(request: Request) {
    try {
        const apiKey = process.env.GOOGLE_API_KEY?.trim();
        if (!apiKey) {
            return NextResponse.json({ error: "GOOGLE_API_KEY が未設定です" }, { status: 500 });
        }

        const contentType = request.headers.get("content-type") || "";
        if (!contentType.toLowerCase().includes("multipart/form-data")) {
            return NextResponse.json({ error: "multipart/form-data 形式で画像を送信してください" }, { status: 400 });
        }

        const formData = await request.formData();
        const file = formData.get("image") ?? formData.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json({ error: "image フィールドに画像ファイルが必要です" }, { status: 400 });
        }

        if (file.size > MAX_IMAGE_SIZE_BYTES) {
            return NextResponse.json({ error: "画像ファイルは5MB以下にしてください" }, { status: 400 });
        }

        const mimeType = file.type || "application/octet-stream";
        console.log(`[Vision API] 受信画像サイズ: ${(file.size / 1024).toFixed(2)} KB`);
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");

        const modelName = await getActiveModelName();
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });

        const prompt =
            "この料理の画像を分析し、Instagram投稿のキャプション生成に役立つ情報を抽出してください。以下のJSON形式でのみ出力すること。\n" +
            "{\n" +
            '  "dish_name": "具体的な料理名（例: 濃厚魚介豚骨ラーメン）",\n' +
            '  "visual_features": "見た目の特徴、シズル感（例: 湯気が立っている、チャーシューが分厚い、スープが濃厚そう）",\n' +
            '  "key_ingredients": ["主要食材1", "主要食材2"],\n' +
            '  "suggested_hashtags_base": ["料理カテゴリ", "利用シーン"]\n' +
            "}";

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);

        try {
            const result = await Promise.race([
                model.generateContent([
                    { text: prompt },
                    {
                        inlineData: {
                            data: base64,
                            mimeType,
                        },
                    },
                ]),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error("TIMEOUT")), ANALYZE_TIMEOUT_MS)
                ),
            ]);

            const text = (result as { response: { text: () => string } }).response.text();
            const parsed = extractJsonObject(text);

            if (!parsed || typeof parsed !== "object") {
                return NextResponse.json({ error: "AIの出力がJSON形式ではありません" }, { status: 500 });
            }

            return NextResponse.json(
                { result: parsed },
                {
                    headers: {
                        "Cache-Control": "no-store",
                    },
                }
            );
        } catch (error: unknown) {
            if (error instanceof Error && error.message === "TIMEOUT") {
                return NextResponse.json(
                    { error: "通信がタイムアウトしました。電波の良い場所で再度お試しください" },
                    { status: 504, headers: { "Cache-Control": "no-store" } }
                );
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    } catch {
        return NextResponse.json(
            { error: "画像解析に失敗しました" },
            { status: 500, headers: { "Cache-Control": "no-store" } }
        );
    }
}
