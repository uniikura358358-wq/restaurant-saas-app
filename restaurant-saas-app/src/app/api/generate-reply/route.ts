import { getGenerativeModel } from "@/lib/vertex-ai";
import { NextResponse } from "next/server";
import { buildGeneratorPrompt } from "@/lib/review-reply-generator";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
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
        let profile = null;
        let planName = "Light Plan";

        try {
            const profileDoc = (adminDb && typeof adminDb.collection === 'function')
                ? await adminDb.collection("users").doc(userId).get()
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

        const truncatedReviewText = reviewText.slice(0, MAX_REVIEW_TEXT_LENGTH);

        // Vertex AI 移行 (規則: Main: 3-flash-preview, Sub: 2.5-flash)
        const targetModels = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-1.5-flash'];
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

                const modelTimeout = modelName.includes("pro") ? 40_000 : 25_000;

                const result = await Promise.race([
                    model.generateContent(prompt),
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
            } catch (error: unknown) {
                console.warn(`Error in Vertex AI ${modelName}:`, error);
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

        // Firestore クォータのインクリメント (円ベースの内部予算を減算)
        try {
            await incrementAiUsage(userId, 'text');
        } catch (dbError) {
            console.error("Firestore quota update failed:", dbError);
        }

        const sanitizedReply = sanitizeAiOutput(responseText);

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
