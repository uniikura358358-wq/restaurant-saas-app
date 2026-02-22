import { NextRequest, NextResponse } from 'next/server';

// 環境変数に RESEND_API_KEY がある場合は Resend を使用
// ない場合はコンソールログに出力 (開発用)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com'; // 実際の運用では環境変数で設定

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            userId,
            storeName,
            plan = 'Light Plan',
            deliveryEstimate,
            imageStatus, // "あり" | "なし"
            materials, // { basicInfo, catchCopy, images }
        } = body;

        // 画像枚数をカウント
        const menuImages = [materials.images?.menu1, materials.images?.menu2, materials.images?.menu3].filter(Boolean);
        const menuCount = menuImages.length;

        // 基本は3商品用のテンプレートを使用し、数に合わせて調整する指示
        let templateInstruction = 'Standard Template (3-items Base)';
        if (menuCount === 0) templateInstruction = 'Text-Only Template (No Images)';
        else if (menuCount < 3) templateInstruction = `Standard Template (3-items Base) - Adjust layout for ${menuCount} item(s)`;

        // 制作指示書テンプレートの作成
        const subject = `【素材提出完了】${storeName}様 (ID: ${userId}) - 納期: ${deliveryEstimate}`;

        const textContent = `
[制作指示書]
--------------------------------------------------
顧客ID: ${userId}
店舗名: ${storeName}
申込プラン: ${plan}
受付日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
--------------------------------------------------

【制作・デザイン指示】
■ 使用テンプレート: [ ${templateInstruction} ]
  -> 基本は3商品入るレイアウトを使用。
  -> 商品数が ${menuCount}品のため、${menuCount < 3 ? '空き枠を削除または中央寄せしてバランス調整すること。' : 'そのまま3枠を使用。'}

■ 画像素材ステータス: [ ${imageStatus} ]
${imageStatus === 'なし' ? '  -> ⚠️ 画像なし: 「テキスト主体テンプレート(Type-T)」を使用し、ダミー画像は使用せず「準備中」アイコンを配置すること。' : '  -> 通常制作フロー'}

■ 納期目安: ${deliveryEstimate}

--------------------------------------------------
【提出データ】

[基本情報]
店名: ${materials.basicInfo?.storeName || '未入力'}
電話番号: ${materials.basicInfo?.phone || '未入力'}
住所: ${materials.basicInfo?.address || '未入力'}
営業時間: ${materials.basicInfo?.hours || '未入力'}

[AI生成/編集テキスト]
キャッチコピー:
${materials.catchCopy || '未入力'}

PR文/詳細:
${materials.prText || '未入力'}

[画像URL]
1. 店内画像: ${materials.images?.interior || 'なし'}
2. メニュー1: ${materials.images?.menu1 || 'なし'}
3. メニュー2: ${materials.images?.menu2 || 'なし'}
4. メニュー3: ${materials.images?.menu3 || 'なし'}

--------------------------------------------------
        `.trim();

        console.log('--- ADMIN NOTIFICATION START ---');
        console.log(subject);
        console.log(textContent);
        console.log('--- ADMIN NOTIFICATION END ---');

        if (RESEND_API_KEY) {
            // Resend API を使用して送信 (実装例)
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                },
                body: JSON.stringify({
                    from: 'System <onboarding@resend.dev>',
                    to: [ADMIN_EMAIL],
                    subject: subject,
                    text: textContent,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                console.error('Resend API Error:', error);
                // エラーでもユーザーには成功を返す（通知は裏側の処理なので）
            } else {
                console.log('Email sent successfully');
            }
        }

        return NextResponse.json({ success: true, message: 'Notification processed' });

    } catch (error) {
        console.error('Notification Error:', error);
        return NextResponse.json(
            { error: 'Failed to process notification' },
            { status: 500 }
        );
    }
}
