import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// サーバーサイド専用: service_role キーで RLS をバイパス
function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Supabase configuration is missing (URL or SERVICE_ROLE_KEY)");
    }

    return createClient(supabaseUrl, serviceRoleKey);
}

export async function POST(request: Request) {
    try {
        const { reviewId, replyContent } = await request.json();

        // 1. バリデーション
        if (!reviewId || !replyContent) {
            return NextResponse.json(
                { error: "レビューIDと返信内容は必須です" },
                { status: 400 }
            );
        }

        // 2. 文字数制限 (300文字 — AI生成は280文字目標、多少の誤差を許容)
        const MAX_LENGTH = 300;
        if (replyContent.length > MAX_LENGTH) {
            return NextResponse.json(
                { error: `返信内容が長すぎます（${MAX_LENGTH}文字以内にしてください）` },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        // 3. 上書き防止チェック
        const { data: existingReview, error: fetchError } = await supabase
            .from("reviews")
            .select("status, reply_content")
            .eq("id", reviewId)
            .maybeSingle();

        if (fetchError) {
            throw fetchError;
        }

        if (!existingReview) {
            return NextResponse.json(
                { error: "指定されたレビューが見つかりません" },
                { status: 404 }
            );
        }

        if (existingReview.status === "replied" && existingReview.reply_content) {
            return NextResponse.json(
                { error: "既に返信済みです。「未返信に戻す」を使ってから再度お試しください。" },
                { status: 409 }
            );
        }

        // 4. reply_content に保存 + status を 'replied' + updated_at を now()
        const { data: updatedData, error: updateError } = await supabase
            .from("reviews")
            .update({
                reply_content: replyContent,
                status: "replied",
                updated_at: new Date().toISOString()
            })
            .eq("id", reviewId)
            .select()
            .maybeSingle();

        if (updateError) {
            throw updateError;
        }

        if (!updatedData) {
            return NextResponse.json(
                { error: "レビューの更新に失敗しました" },
                { status: 500 }
            );
        }

        // 5. Google Business Profile に返信を投稿 (Best Effort)
        // google_review_id がある場合のみ実行
        if (updatedData.google_review_id) {
            try {
                // google-business-profile.ts から import 必要
                const { replyToReview } = await import("@/lib/google-business-profile");
                await replyToReview(updatedData.google_review_id, replyContent);
                console.log(`Posted reply to Google for review ${updatedData.google_review_id}`);
            } catch (googleError) {
                console.error("Failed to post reply to Google:", googleError);
                // Googleへの投稿失敗はクライアントにエラーとして返さない（DB保存は成功しているため）
                // ただし、UI側で「Googleへの反映に失敗しました」と出すなら status を 'google_sync_failed' とかにする手もあるが
                // 今回はログ出力に留める
            }
        }

        return NextResponse.json({ success: true, review: updatedData });
    } catch (error: unknown) {
        let message = "返信の保存中にエラーが発生しました";
        if (error instanceof Error) {
            message = error.message;
        } else if (error && typeof error === "object" && "message" in error) {
            message = String((error as { message: unknown }).message);
        }
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
