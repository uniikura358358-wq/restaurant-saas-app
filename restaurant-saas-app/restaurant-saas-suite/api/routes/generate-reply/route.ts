import { getGenerativeModel } from "@/lib/vertex-ai";
import { NextResponse } from "next/server";
import { buildGeneratorPrompt } from "@/lib/review-reply-generator";
import { adminAuth, adminDb, getDbForUser } from "@/lib/firebase-admin";
import { sanitizeAiOutput } from "@/lib/review-handler";

import { verifyAuth } from "@/lib/auth-utils";
import { checkAiQuota, incrementAiUsage } from "@/lib/ai-quota";
import { enforceSubscriptionLock } from "@/lib/subscription-server";

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

        // 購読ステータスによる制限の適用 (1日以上の遅延で遮断)
        await enforceSubscriptionLock(userId, "ai_api");

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

        // プラン別モデルポリシー取得
        // Standard: 基本=2.5-Flash / ★1〜2(低評価・クレーム)=3-Flash LOW
        // Pro/Pro Premium: 3-Flash LOW → 2.5-Flash(fallback)
        const { AI_POLICY, getPlanAiPolicy } = await import("@/lib/vertex-ai");
        const planPolicy = getPlanAiPolicy(planName);

        // Standardプランかつ低評価（★1〜2）の場合はメイン/サブを反転し、3-Flash LOWを優先使用
        const plan = (planName || '').toLowerCase();
        const isStandard = !plan.includes('pro') && !plan.includes('premium');
        const isLowRating = typeof starRating === 'number' && starRating <= 2;
        const useSubFirst = isStandard && isLowRating;

        const targetModels = useSubFirst
            ? [planPolicy.secondary, planPolicy.primary]   // 3-Flash LOW → 2.5-Flash
            : [planPolicy.primary, planPolicy.secondary];  // プランデフォルト順
        const thinkingFlags = useSubFirst
            ? [planPolicy.secondaryNeedsThinking, planPolicy.primaryNeedsThinking]
            : [planPolicy.primaryNeedsThinking, planPolicy.secondaryNeedsThinking];

        let responseText: string | null = null;
        let lastError: unknown = null;


        for (const [idx, modelName] of targetModels.entries()) {
            const needsThinking = thinkingFlags[idx];
            try {
                const model = getGenerativeModel(modelName);
                const prompt = buildGeneratorPrompt({
                    reviewText: truncatedReviewText,
                    starRating,
                    customerName,
                    config,
                });

                // 口コミ返信用パラメータ
                const generationConfig: any = {
                    temperature: 0.3,
                    topP: 0.85,
                    topK: 30,
                    maxOutputTokens: 220,
                };
                // Gemini 3系(Low設定)の場合のみ thinking_config を追加
                if (needsThinking) {
                    Object.assign(generationConfig, AI_POLICY.THINKING_CONFIG_LOW);
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
