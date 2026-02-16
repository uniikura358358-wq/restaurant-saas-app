import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { buildGeneratorPrompt } from "@/lib/review-reply-generator";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { sanitizeAiOutput } from "@/lib/review-handler";

import { verifyAuth } from "@/lib/auth-utils";

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
        const profileDoc = await adminDb.collection("profiles").doc(userId).get();
        const profile = profileDoc.data();

        if (!profile) {
            // プロフィールがない場合は初期値を想定（またはエラー）
            console.warn("User profile not found in Firestore for:", userId);
        }

        // クォータチェック (簡易版: Firestore のカウントを参照)
        const planName = profile?.plan_name || "free";
        const aiCount = profile?.ai_count || 0;
        const limit = planName === "premium" ? 1000 : 30; // 暫定リミット

        if (aiCount >= limit) {
            return NextResponse.json({ error: "AI生成の利用制限に達しました。プランをアップグレードしてください。" }, { status: 403 });
        }

        if (profile?.plan_status === "locked") {
            return NextResponse.json(
                { error: "お支払いの確認が取れないため、機能を制限しています。支払い情報を更新してください。" },
                { status: 403 }
            );
        }

        const apiKey = process.env.GOOGLE_API_KEY?.trim();
        if (!apiKey) {
            return NextResponse.json({ error: "GOOGLE_API_KEY が未設定です" }, { status: 500 });
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
        const genAI = new GoogleGenerativeAI(apiKey);

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

                const modelTimeout = modelName.includes("gemini-3") ? 30_000 : 10_000;

                const result = await Promise.race([
                    model.generateContent(prompt),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error("TIMEOUT")), modelTimeout)
                    ),
                ]);

                responseText = (result as any).response.text();
                break;
            } catch (error: unknown) {
                console.warn(`Error in ${modelName}:`, error);
                lastError = error;
            }
        }

        if (!responseText) {
            return NextResponse.json(
                { error: "AI応答の生成中にエラーが発生しました。" },
                { status: 500 }
            );
        }

        // Firestore クォータのインクリメントと返信の保存
        try {
            const batch = adminDb.batch();
            const profileRef = adminDb.collection("profiles").doc(userId);
            batch.update(profileRef, {
                ai_count: (profile?.ai_count || 0) + 1
            });

            if (reviewId) {
                const replyData = {
                    reply: responseText,
                    createdAt: new Date(),
                    starRating,
                    customerName
                };
                // client-side db-actions ではなく server-side で保存するように後で調整するが
                // 現状は Admin SDK で直接保存が安全
                const replyRef = adminDb.collection("replies").doc(String(reviewId));
                batch.set(replyRef, {
                    ...replyData,
                    userId,
                    reviewId,
                    updatedAt: new Date(),
                }, { merge: true });
            }

            await batch.commit();
        } catch (dbError) {
            console.error("Firestore update failed:", dbError);
        }

        const sanitizedReply = sanitizeAiOutput(responseText);

        return NextResponse.json(
            { reply: sanitizedReply },
            { headers: { "Cache-Control": "no-store" } }
        );
    } catch (error: unknown) {
        console.error("Generate Reply Error:", error);
        return NextResponse.json(
            { error: "AI応答の生成中に予期せぬエラーが発生しました。" },
            { status: 500 }
        );
    }
}
