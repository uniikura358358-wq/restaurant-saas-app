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

        // 4. Instagram 投稿実行
        // ※ 本番では imageUrl は Firebase Storage などの Public URL である必要があります。
        console.log(`[Instagram Post] Starting post for UID: ${uid}, URL: ${imageUrl}`);

        try {
            const postId = await postToInstagram(imageUrl, caption);

            // 5. 投稿ログの保存
            await db.collection("users").doc(uid).collection("instagram_posts").add({
                postId,
                imageUrl,
                caption,
                postedAt: new Date(),
                status: "success"
            });

            return NextResponse.json({
                success: true,
                message: "Instagram への投稿が完了しました！",
                postId
            });
        } catch (postError: any) {
            console.error("Instagram API Execution Error:", postError);
            return NextResponse.json({
                error: `Instagram への投稿に失敗しました: ${postError.message}`
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Instagram Post Route Error:", error);
        return NextResponse.json({
            error: error.message || "予期せぬエラーが発生しました"
        }, { status: 500 });
    }
}
