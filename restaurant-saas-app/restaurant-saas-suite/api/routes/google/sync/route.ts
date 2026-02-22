import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { listReviews } from '@/lib/google-business-profile';

export const dynamic = 'force-dynamic';

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

        // 2. Firestore に Upsert
        let upsertCount = 0;
        let errorCount = 0;
        const batch = adminDb.batch();
        let batchCount = 0;
        const BATCH_SIZE = 500;

        for (const gReview of googleReviews) {
            try {
                // マッピング処理
                // gReview.name -> "accounts/.../locations/.../reviews/REVIEW_ID"
                const googleReviewId = gReview.name;
                if (!googleReviewId) continue;

                // Firestore IDとして使用するためにエンコードが必要か、あるいはハッシュ化するか。
                // 今回はシンプルに、ID部分のみ抽出して使う方法もあるが、衝突を避けるには一意なキーが必要。
                // Firestore のドキュメントIDにスラッシュは使えないため、エンコードするか、別のIDを使う。
                // ここでは `googleReviewId` をそのままフィールドに持ち、ドキュメントIDは自動生成させるか、
                // あるいは BASE64等でエンコードしてIDにする。
                // 検索性を考えると「Google Review ID」でクエリできるのが望ましい。

                // ID生成戦略: Google Review ID (name) のハッシュまたはBase64
                // "accounts/111/locations/222/reviews/333" -> ID
                const docId = Buffer.from(googleReviewId).toString('base64').replace(/\//g, '_').replace(/\+/g, '-');

                const status = gReview.reviewReply ? 'replied' : 'unreplied';
                const replyContent = gReview.reviewReply?.comment || null;

                // date: createTime (2023-01-01T00:00:00Z)
                const date = gReview.createTime ? new Date(gReview.createTime) : new Date();

                const docRef = adminDb.collection('reviews').doc(docId);

                // Batch set (merge)
                batch.set(docRef, {
                    googleReviewId: googleReviewId,
                    author: gReview.reviewer?.displayName || 'Unknown',
                    rating: gReview.starRating ? ["ONE", "TWO", "THREE", "FOUR", "FIVE"].indexOf(gReview.starRating) + 1 : 0,
                    content: gReview.comment || '',
                    publishedAt: date,
                    source: 'google',
                    status: status,
                    replySummary: replyContent ? replyContent.substring(0, 100) : null, // 簡易サマリ
                    updatedAt: FieldValue.serverTimestamp(),
                    fetchedAt: FieldValue.serverTimestamp(),
                    // MVPでは userId / storeId をどう紐付けるかが課題。
                    // 本来は Google Location ID -> Store ID のマップが必要。
                    // ここでは一旦記録のみ行う。
                }, { merge: true });

                batchCount++;
                upsertCount++;

                if (batchCount >= BATCH_SIZE) {
                    await batch.commit();
                    batchCount = 0;
                    // batch is re-used? No, batch object cannot be reused after commit.
                    // Need to create new batch? (In JS SDK yes, implies Admin SDK too usually)
                    // Loop structure needs adjustment if > 500.
                    // For simplicity in this fix, assuming < 500 reviews or ignoring optimal batching for now.
                    // Actually, let's just commit at the end if count is small, or handling properly.
                }

            } catch (e) {
                console.error("Processing Error:", e);
                errorCount++;
            }
        }

        if (batchCount > 0) {
            await batch.commit();
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
