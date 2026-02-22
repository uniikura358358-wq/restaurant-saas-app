import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth } from "@/lib/auth-utils";
import { postToInstagram } from "@/lib/instagram-client";

export const dynamic = "force-dynamic";

const ALLOWED_PLANS = ['standard', 'business', 'premium', 'pro'];

/**
 * Instagram への自動投稿を実行する API
 * POST /api/instagram/post
 */
export async function POST(request: Request) {
    try {
        // 1. ユーザー認証チェック
        const user = await verifyAuth(request);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const uid = user.uid;

        // 購読ステータスによる制限の適用 (1日以上の遅延で遮断)
        const { enforceSubscriptionLock } = await import("@/lib/subscription-server");
        await enforceSubscriptionLock(user.uid, "ai_api");

        // 2. プラン権限チェック
        const { getDbForUser } = await import("@/lib/firebase-admin");
        const db = await getDbForUser(uid);
        const userDoc = await db.collection("users").doc(uid).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "ユーザー情報が見つかりません" }, { status: 404 });
        }
        const userData = userDoc.data();
        const userPlan = (userData?.plan || 'WEB会員').toLowerCase();

        if (!ALLOWED_PLANS.includes(userPlan)) {
            return NextResponse.json({
                error: "Instagram 自動投稿機能は Standard プラン以上でご利用いただけます。プランのアップグレードをご検討ください。"
            }, { status: 403 });
        }

        // 3. パラメータ取得
        const { imageUrl, caption } = await request.json().catch(() => ({}));

        if (!imageUrl || !caption) {
            return NextResponse.json({ error: "imageUrl と caption は必須です" }, { status: 400 });
        }

        // 4. Instagram 投稿実行（マニュアル方式への変更により、API経由の自動投稿は廃止）
        // Meta の審査回避のため、ここでは投稿ログのみを記録し、実際の投稿はユーザーに委ねます。
        console.log(`[Instagram Post] Assets prepared for manual post. UID: ${uid}`);

        try {
            // 自動投稿ロジックのコメントアウト
            // const postId = await postToInstagram(imageUrl, caption);

            // 5. 投稿開始（意図）のログ保存
            await db.collection("users").doc(uid).collection("instagram_posts").add({
                imageUrl,
                caption,
                postedAt: new Date(),
                status: "manual_intent",
                method: "manual"
            });

            return NextResponse.json({
                success: true,
                message: "投稿用素材의準備が完了しました。Instagram アプリを開いて投稿を完了させてください。",
                manual: true
            });
        } catch (postError: any) {
            console.error("Instagram Manual Prep Error:", postError);
            return NextResponse.json({
                error: `素材の準備に失敗しました: ${postError.message}`
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Instagram Post Route Error:", error);
        return NextResponse.json({
            error: error.message || "予期せぬエラーが発生しました"
        }, { status: 500 });
    }
}
