import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { listReviews } from '@/lib/google-business-profile';

// サーバーサイド専用: service_role キーで RLS をバイパス
function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase config missing");
    return createClient(supabaseUrl, serviceRoleKey);
}

export async function POST(request: Request) {
    try {
        // 本来は認証チェックが必要 (e.g. session check or API key)

        // 環境変数から対象の店舗IDを取得 (複数店舗対応の場合はDBやRequestから取得)
        // ここでは .env.local に設定されていると仮定、またはハードコード
        const accountId = process.env.GOOGLE_ACCOUNT_ID; // "accounts/..."
        const locationId = process.env.GOOGLE_LOCATION_ID; // "locations/..."

        if (!accountId || !locationId) {
            return NextResponse.json({ error: "Google Account/Location ID not set" }, { status: 500 });
        }

        // 1. Google API から口コミ取得
        const googleReviews = await listReviews(accountId, locationId);
        console.log(`Fetched ${googleReviews.length} reviews from Google`);

        // 2. Supabase に Upsert
        const supabase = createAdminClient();
        let upsertCount = 0;
        let errorCount = 0;

        for (const gReview of googleReviews) {
            try {
                // マッピング処理
                // gReview.name -> "accounts/.../locations/.../reviews/REVIEW_ID"
                // google_review_id は一意な識別子として name をそのまま使うか、末尾のIDだけ使う
                const googleReviewId = gReview.name;
                if (!googleReviewId) continue;

                // 既存チェック (google_review_id が一致するもの)
                // insert or ignore 的な処理をしたいが、更新も検知したい（返信がついた場合など）
                // しかし今回はシンプルに「新規なら追加」とするか、upsertにするか。
                // reviewReply がある場合は status = 'replied' にする

                const status = gReview.reviewReply ? 'replied' : 'unreplied';
                const replyContent = gReview.reviewReply?.comment || null;

                // date: createTime (2023-01-01T00:00:00Z)
                const date = gReview.createTime ? gReview.createTime.split('T')[0] : new Date().toISOString().split('T')[0];

                const { error } = await supabase
                    .from('reviews')
                    .upsert({
                        google_review_id: googleReviewId,
                        author: gReview.reviewer?.displayName || 'Unknown',
                        rating: gReview.starRating ? ["ONE", "TWO", "THREE", "FOUR", "FIVE"].indexOf(gReview.starRating) + 1 : 0,
                        text: gReview.comment || '',
                        date: date,
                        source: 'Google',
                        status: status,
                        reply_content: replyContent,
                        updated_at: new Date().toISOString() // 同期時刻
                    }, {
                        onConflict: 'google_review_id',
                        ignoreDuplicates: false
                    });

                if (error) {
                    console.error("Upsert Error:", error);
                    errorCount++;
                } else {
                    upsertCount++;
                }

            } catch (e) {
                console.error("Processing Error:", e);
                errorCount++;
            }
        }

        return NextResponse.json({
            success: true,
            fetched: googleReviews.length,
            upserted: upsertCount,
            errors: errorCount
        });

    } catch (error: any) {
        console.error("Sync API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
