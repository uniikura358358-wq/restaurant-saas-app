import { getGenerativeModel } from "@/lib/vertex-ai";
import { NextResponse } from "next/server";
import { buildGeneratorPrompt } from "@/lib/review-reply-generator";
import { adminAuth, adminDb, getDbForUser } from "@/lib/firebase-admin";
import { sanitizeAiOutput } from "@/lib/review-handler";

import { verifyAuth } from "@/lib/auth-utils";
import { checkAiQuota, incrementAiUsage } from "@/lib/ai-quota";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_REVIEW_TEXT_LENGTH = 500;

export async function POST(request: Request) {
    try {
        // Firebase Admin Auth 認証
        const user = await verifyAuth(request);

        if (!user) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
        }

        const userId = user.uid;

        if (!userId) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
        }

        // Firestore からユーザープロファイル（プラン情報）を取得
        const db = await getDbForUser(userId);
        let profile = null;
        let planName = "Light Plan";

        try {
            const profileDoc = (db && typeof db.collection === 'function')
                ? await db.collection("users").doc(userId).get()
                : null;

            profile = profileDoc?.exists ? profileDoc.data() : null;
            planName = profile?.plan_name || profile?.planName || "Light Plan";

            if (!profile) {
                console.warn("User profile not found in Firestore for:", userId);
            }
        } catch (dbError) {
            console.error("Firestore Profile Fetch Error (Falling back to default):", dbError);
            // DBエラー時はログのみ出力し、デフォルトプランで継続
        }

        // 新しいクォータチェック (DBエラー時はスキップして許可)
        try {
            const quotaResult = await checkAiQuota(userId, planName, 'text');
            if (!quotaResult.allowed) {
                return NextResponse.json({ error: quotaResult.reason }, { status: 403 });
            }
        } catch (quotaError) {
            console.error("Quota check failed due to DB error (Proceeding with default permit):", quotaError);
        }

        if (profile?.plan_status === "locked") {
            return NextResponse.json(
                { error: "お支払いの確認が取れないため、機能を制限しています。支払い情報を更新してください。" },
                { status: 403 }
            );
        }

        // Vertex AI ではサービスアカウントキーを使用するため、GOOGLE_API_KEY の存在チェックは任意（警告のみ）にするか削除
        const apiKey = process.env.GOOGLE_API_KEY?.trim();
        if (!apiKey) {
            console.warn("GOOGLE_API_KEY is not set, but Vertex AI will use Service Account if available.");
        }

        const body = await request.json();
        const { reviewText, starRating, customerName, config, reviewId } = body ?? {};

        if (typeof reviewText !== "string" || reviewText.trim().length === 0) {
            return NextResponse.json({ error: "reviewText が必要です" }, { status: 400 });
        }
        if (typeof starRating !== "number" || Number.isNaN(starRating) || starRating < 1 || starRating > 5) {
            return NextResponse.json({ error: "starRating は 1〜5 で指定してください" }, { status: 400 });
        }

        // --- 1. キャッシュチェック (無駄な再生成を防止) ---
        if (reviewId && db) {
            try {
                const cacheRef = db.collection("stores").doc(userId).collection("ai_cache").doc(reviewId);
                const cacheDoc = await cacheRef.get();
                if (cacheDoc.exists) {
                    const cacheData = cacheDoc.data();
                    // 24時間以内のキャッシュがあれば再利用（UXを損なわず原価をゼロにする）
                    const createdAt = cacheData?.createdAt?.toMillis ? cacheData.createdAt.toMillis() : 0;
                    const isRecent = Date.now() - createdAt < 24 * 60 * 60 * 1000;

                    if (isRecent && cacheData?.reply) {
                        return NextResponse.json({
                            reply: cacheData.reply,
                            isCached: true
                        });
                    }
                }
            } catch (cacheError) {
                console.warn("Cache fetch error (ignoring and proceeding with AI):", cacheError);
            }
        }

        const truncatedReviewText = reviewText.slice(0, MAX_REVIEW_TEXT_LENGTH);

        // Vertex AI 移行 (運用規則に基づき Flash 優先)
        // 503 Service Unavailable (過負荷) を避けるため、安定した Flash モデルを最優先する
        // 非推奨モデル(1.5等)を排除し、2.5(メイン)と3(サブ)の構成で運用
        const targetModels = ['gemini-2.5-flash', 'gemini-3-flash-preview'];
        let responseText: string | null = null;
        let lastError: unknown = null;

        for (const modelName of targetModels) {
            try {
                const model = getGenerativeModel(modelName);
                const prompt = buildGeneratorPrompt({
                    reviewText: truncatedReviewText,
                    starRating,
                    customerName,
                    config,
                });

                const generationConfig: any = {};
                // Gemini 3系かつサブで使用する場合は思考レベルを LOW に制限してコストを抑制
                if (modelName.includes('gemini-3')) {
                    generationConfig.thinking_config = { include_thoughts: false, thinking_level: 'LOW' };
                }

                const modelTimeout = modelName.includes("pro") ? 40_000 : 25_000;

                const result = await Promise.race([
                    model.generateContent({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig
                    }),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error("TIMEOUT")), modelTimeout)
                    ),
                ]);

                // Vertex AI SDK のレスポンス形式
                const response = (result as any).response;
                if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
                    responseText = response.candidates[0].content.parts[0].text;
                } else {
                    // フォールバック
                    responseText = typeof (result as any).response.text === 'function'
                        ? (result as any).response.text()
                        : null;
                }

                if (responseText) break;
            } catch (error: any) {
                // 503 (過負荷) や 429 (レート制限) は Google 側の一次的な問題のため、次のモデルを即座に試行
                const isRetryable = error?.message?.includes('503') || error?.message?.includes('429') || error?.message === 'TIMEOUT';
                if (isRetryable) {
                    console.warn(`Retryable error in Vertex AI ${modelName} (falling back):`, error.message);
                } else {
                    console.warn(`Error in Vertex AI ${modelName}:`, error);
                }
                lastError = error;
            }
        }

        if (!responseText) {
            const errorMsg = lastError instanceof Error ? lastError.message : "Unknown error";
            return NextResponse.json(
                { error: `AI応答の生成中にエラーが発生しました。(${errorMsg})` },
                { status: 500 }
            );
        }

        // クォータのインクリメントは送信時（submit-reply）に変更するため、ここでは削除

        const sanitizedReply = sanitizeAiOutput(responseText, starRating);

        // --- 2. 成功時にキャッシュ保存 (次回の同一リクエストに備える) ---
        if (reviewId && db) {
            try {
                await db.collection("stores").doc(userId).collection("ai_cache").doc(reviewId).set({
                    reply: sanitizedReply,
                    createdAt: new Date(),
                    userId // 誰が生成したか
                });
            } catch (saveCacheError) {
                console.warn("Cache save error:", saveCacheError);
            }
        }

        return NextResponse.json(
            { reply: sanitizedReply },
            { headers: { "Cache-Control": "no-store" } }
        );
    } catch (error: any) {
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        console.error("Generate Reply Unexpected Error:", {
            message: error?.message,
            stack: error?.stack,
            projectId: projectId
        });

        let detail = error?.message || "Unknown Error";
        if (error?.stack?.includes("VertexAI")) {
            detail = `VertexAI Error: ${detail}`;
        }

        return NextResponse.json(
            { error: `予期せぬエラーが発生しました。[Project: ${projectId}] (${detail})` },
            { status: 500 }
        );
    }
}
