import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { buildGeneratorPrompt } from "@/lib/review-reply-generator";


export const dynamic = "force-dynamic";
export const revalidate = 0;

// const GENERATE_TIMEOUT_MS = 15_000; // Removed in favor of dynamic timeout
const MAX_REVIEW_TEXT_LENGTH = 500;



// GET handler removed

export async function POST(request: Request) {
    try {
        const apiKey = process.env.GOOGLE_API_KEY?.trim();
        if (!apiKey) {
            return NextResponse.json({ error: "GOOGLE_API_KEY が未設定です" }, { status: 500 });
        }

        const body = await request.json();
        const { reviewText, starRating, customerName, config } = body ?? {};

        if (typeof reviewText !== "string" || reviewText.trim().length === 0) {
            return NextResponse.json({ error: "reviewText が必要です" }, { status: 400 });
        }
        if (typeof starRating !== "number" || Number.isNaN(starRating) || starRating < 1 || starRating > 5) {
            return NextResponse.json({ error: "starRating は 1〜5 で指定してください" }, { status: 400 });
        }
        if (!config || typeof config !== "object") {
            return NextResponse.json({ error: "config が必要です" }, { status: 400 });
        }

        const truncatedReviewText = reviewText.slice(0, MAX_REVIEW_TEXT_LENGTH);
        const genAI = new GoogleGenerativeAI(apiKey);

        // プロジェクト憲法定義の絶対的正解モデル構成
        // Main: 最優先。PhDレベルの推論を低コストで実行。
        // Sub: バックアップ。Main失敗時のフォールバック用。
        const TARGET_MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash'];
        let responseText: string | null = null;
        let lastError: unknown = null;

        for (const modelName of TARGET_MODELS) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });

                const prompt = buildGeneratorPrompt({
                    reviewText: truncatedReviewText,
                    starRating,
                    customerName,
                    config,
                });

                // モデルごとのタイムアウト設定 (AI_Model_Specs_202602.md 準拠)
                // gemini-3-flash-preview: 思考プロセスがあるため 30s 推奨
                // gemini-2.5-flash: 高速なため 10s 推奨
                const modelTimeout = modelName.includes("gemini-3") ? 30_000 : 10_000;

                const generateOnce = async () => {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), modelTimeout);

                    try {
                        const result = await Promise.race([
                            model.generateContent(prompt),
                            new Promise<never>((_, reject) =>
                                setTimeout(() => reject(new Error("TIMEOUT")), modelTimeout)
                            ),
                        ]);

                        return (result as { response: { text: () => string } }).response.text();
                    } finally {
                        clearTimeout(timeoutId);
                    }
                };

                // Single model attempt with timeout
                responseText = await generateOnce();
                break; // If successful, exit loop
            } catch (error: unknown) {
                console.warn(`Error in ${modelName}: Retrying with fallback...`, error);
                lastError = error;
                // Continue to next model
            }
        }

        if (!responseText) {
            const isTimeout = lastError instanceof Error && lastError.message === "TIMEOUT";
            if (isTimeout) {
                return NextResponse.json(
                    { error: "通信がタイムアウトしました。電波の良い場所で再度お試しください" },
                    { status: 504, headers: { "Cache-Control": "no-store" } }
                );
            }
            return NextResponse.json(
                { error: "AI応答の生成中にエラーが発生しました(全モデル失敗)。時間をおいて再度お試しください。" },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { reply: responseText },
            {
                headers: {
                    "Cache-Control": "no-store",
                },
            }
        );
    } catch (error: unknown) {
        console.error("Generate Reply Error:", error);
        return NextResponse.json(
            { error: "AI応答の生成中に予期せぬエラーが発生しました。" },
            { status: 500 }
        );
    }
}