
import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
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
            // default_signature, // legacy
            // emoji_level, // legacy
            // reply_config, // legacy
            notification_config,
            sms_limit_override
        } = body;

        // 1. Validation (Simplified for migration safety)
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

        // 3. Prepare Update Data for Firestore
        // Mapped to camelCase for Firestore
        const updateData: any = {
            updatedAt: FieldValue.serverTimestamp(),
            ownerUid: uid
        };

        if (store_name !== undefined) updateData.storeName = store_name;
        if (store_area !== undefined) updateData.address = store_area;
        if (ai_tone !== undefined) updateData.aiTone = ai_tone;
        if (notification_config !== undefined) updateData.notificationConfig = notification_config;
        if (sms_limit_override !== undefined) updateData.smsLimitOverride = sms_limit_override;

        // Handle other legacy fields if needed (omitted for speed/safety as they weren't in my basic schema, 
        // but can be added to the 'websiteMaterials' or root if important).
        // Since the user said "storeId = uid", we write to stores/{uid}.

        await adminDb.collection("stores").doc(uid).set(updateData, { merge: true });

        // 4. Return Success
        return NextResponse.json({ success: true, data: updateData });

    } catch (error: any) {
        console.error("Settings POST error:", error);
        return NextResponse.json(
            { error: "設定の保存に失敗しました" },
            { status: 500 }
        );
    }
}
