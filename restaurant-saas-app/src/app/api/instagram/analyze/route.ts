import { getGenerativeModel } from "@/lib/vertex-ai";
import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SystemConfigRow = {
    key: string;
    value: string;
};

const DEFAULT_FALLBACK_MODEL = "gemini-3-flash-preview";
const ANALYZE_TIMEOUT_MS = 20_000;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_PLANS = ['standard', 'business', 'premium', 'pro'];

// 運用規則に基づき 2.5 Flash をメインで使用
const DEFAULT_AI_MODEL = "gemini-2.5-flash";

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
        // ユーザー認証チェック
        const { verifyAuth } = await import("@/lib/auth-utils");
        const user = await verifyAuth(request);
        if (!user) {
            return NextResponse.json({ error: "認証されていません" }, { status: 401 });
        }
        const uid = user.uid;

        // プラン権限チェック (バックエンド側の防衛線)
        let userPlan = "standard";
        try {
            const { getDbForUser } = await import("@/lib/firebase-admin");
            const db = await getDbForUser(uid);
            const userDoc = await db.collection("users").doc(uid).get();
            const userData = userDoc.data();
            userPlan = (userData?.plan || userData?.planName || 'Standard').toLowerCase();
        } catch (dbError) {
            console.error("Analyze API: Plan fetch failed (Falling back to standard):", dbError);
        }

        if (!ALLOWED_PLANS.includes(userPlan)) {
            return NextResponse.json({ error: "現在のプランではこの機能を利用できません。アップグレードをご検討ください。" }, { status: 403 });
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

        const prompt =
            "この料理の画像を分析し、Instagram投稿のキャプション生成に役立つ情報を抽出してください。以下のJSON形式でのみ出力すること。\n" +
            "{\n" +
            '  "dish_name": "具体的な料理名（例: 濃厚魚介豚骨ラーメン）",\n' +
            '  "visual_features": "見た目の特徴、シズル感（例: 湯気が立っている、チャーシューが分厚い、スープが濃厚そう）",\n' +
            '  "key_ingredients": ["主要食材1", "主要食材2"],\n' +
            '  "suggested_hashtags_base": ["料理カテゴリ", "利用シーン"]\n' +
            "}";

        // プラン別モデルポリシー取得（getPlanAiPolicy）
        // Standard: 2.5-Flash(main) → 3-Flash-Preview(LOW)(fallback)
        // Pro/Pro Premium: 3-Flash-Preview(LOW)(main) → 2.5-Flash(fallback)
        const { AI_POLICY, getPlanAiPolicy } = await import("@/lib/vertex-ai");
        const planPolicy = getPlanAiPolicy(userPlan);
        const targetModels = [planPolicy.primary, planPolicy.secondary];
        let responseText: string | null = null;
        let lastError: any = null;

        for (const [idx, modelName] of targetModels.entries()) {
            const needsThinking = idx === 0 ? planPolicy.primaryNeedsThinking : planPolicy.secondaryNeedsThinking;
            try {
                const model = getGenerativeModel(modelName);
                // Instagramキャプション生成用パラメータ
                const generationConfig: any = {
                    temperature: 0.7,
                    topP: 0.9,
                    topK: 40,
                    maxOutputTokens: 350,
                };
                if (needsThinking) {
                    generationConfig.thinking_config = AI_POLICY.THINKING_CONFIG_LOW.thinking_config;
                }

                const result = await Promise.race([
                    model.generateContent({
                        contents: [
                            {
                                role: "user",
                                parts: [
                                    { text: prompt },
                                    {
                                        inlineData: {
                                            data: base64,
                                            mimeType,
                                        },
                                    },
                                ],
                            },
                        ],
                        generationConfig,
                    }),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error("TIMEOUT")), ANALYZE_TIMEOUT_MS)
                    ),
                ]);

                const response = (result as any).response;
                responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
                if (responseText) break;
            } catch (error: any) {
                console.warn(`Analyze retryable error for ${modelName}:`, error.message);
                lastError = error;
            }
        }

        if (!responseText) {
            throw lastError || new Error("解析結果が取得できませんでした");
        }

        const parsed = extractJsonObject(responseText);

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
    } catch (error: any) {
        console.error("Analyze Error:", error);
        if (error?.message === "TIMEOUT") {
            return NextResponse.json(
                { error: "通信がタイムアウトしました。電波の良い場所で再度お試しください" },
                { status: 504, headers: { "Cache-Control": "no-store" } }
            );
        }
        try {
            return NextResponse.json(
                { error: "画像解析に失敗しました" },
                { status: 500, headers: { "Cache-Control": "no-store" } }
            );
        } catch {
            return new NextResponse("Internal Server Error", { status: 500 });
        }
    }
}
