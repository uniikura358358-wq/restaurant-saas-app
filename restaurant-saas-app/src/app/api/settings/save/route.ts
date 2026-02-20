import { NextResponse } from "next/server";
import { adminDb, getDbForUser } from "@/lib/firebase-admin";
import { verifyAuth } from "@/lib/auth-utils";
import { isValidEmail, isValidPhone } from "@/lib/notification-handler";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            store_name,
            store_area,
            ai_tone,
            default_signature,
            emoji_level,
            auto_reply_delay_minutes,
            reply_config,
            reply_templates,
            notification_config,
            sms_limit_override
        } = body;

        // 1. Validation
        if (notification_config) {
            if (notification_config.email_enabled && notification_config.email_address && !isValidEmail(notification_config.email_address)) {
                return NextResponse.json({ error: "メールアドレスの形式が正しくありません" }, { status: 400 });
            }
            if (notification_config.sms_enabled && notification_config.phone_number && !isValidPhone(notification_config.phone_number)) {
                return NextResponse.json({ error: "電話番号は国際形式（+81...）で入力してください" }, { status: 400 });
            }
        }

        // 2. Auth Check
        const user = await verifyAuth(request);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const uid = user.uid;

        // 【デモユーザーガード】
        if (uid === "demo-user-id") {
            return NextResponse.json({ success: true, message: "設定を一時的に反映しました（デモモード）" });
        }

        // 3. 適切な DB インスタンスを取得
        const db = await getDbForUser(uid);

        // 4. Prepare Update Data
        const updateData: any = {
            updatedAt: FieldValue.serverTimestamp(),
            ownerUid: uid
        };

        if (store_name !== undefined) updateData.storeName = store_name;
        if (store_area !== undefined) updateData.address = store_area;
        if (ai_tone !== undefined) updateData.aiTone = ai_tone;
        if (default_signature !== undefined) updateData.defaultSignature = default_signature;
        if (emoji_level !== undefined) updateData.emojiLevel = emoji_level;
        if (auto_reply_delay_minutes !== undefined) updateData.autoReplyDelayMinutes = auto_reply_delay_minutes;
        if (reply_config !== undefined) updateData.replyConfig = reply_config;
        if (reply_templates !== undefined) updateData.replyTemplates = reply_templates;
        if (notification_config !== undefined) updateData.notificationConfig = notification_config;
        if (sms_limit_override !== undefined) updateData.smsLimitOverride = sms_limit_override;

        // 新機能: ビジネス設定（営業時間、席数、原価率）の保存
        if (body.business_config !== undefined) {
            updateData.businessConfig = body.business_config;
        }

        await db.collection("stores").doc(uid).set(updateData, { merge: true });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Settings POST error:", error);
        return NextResponse.json(
            { error: "設定の保存に失敗しました" },
            { status: 500 }
        );
    }
}
