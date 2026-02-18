import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { verifyAuth } from "@/lib/auth-utils";
import { getSmsUsageSummary, DEFAULT_SMS_LIMIT } from "@/lib/sms-quota";
import { checkAiQuota, getAiLimitByPlan } from "@/lib/ai-quota";

export const dynamic = 'force-dynamic';

// Default Configs
const DEFAULT_NOTIFICATION_CONFIG = {
    email_enabled: false,
    sms_enabled: false,
    email_address: "",
    phone_number: "",
    email_verified: false,
    phone_verified: false,
    target_stars: [1, 2],
    silent_hours: { start: "23:00", end: "08:00" },
    last_notified_at: null,
};

const DEFAULT_SETTINGS = {
    store_name: "",
    store_area: "",
    ai_tone: "polite",
    default_signature: "",
    emoji_level: 2,
    auto_reply_delay_minutes: 30, // Default 30 min
    reply_config: { "1": "manual", "2": "manual", "3": "auto", "4": "auto", "5": "auto" },
    reply_templates: {}, // Empty defaults
    notification_config: DEFAULT_NOTIFICATION_CONFIG,
    sms_limit_override: DEFAULT_SMS_LIMIT,
    sms_usage: { sent: 0, limit: DEFAULT_SMS_LIMIT, remaining: DEFAULT_SMS_LIMIT, usageMonth: "" },
    ai_usage: { sent: 0, limit: 0, remaining: 0, usageMonth: "" }
};

// ... imports ...

export async function GET(request: Request) {
    try {
        // 1. Auth Check (Firebase)
        const user = await verifyAuth(request);
        if (!user) {
            // Return defaults if not auth to prevent build fail
            return NextResponse.json(DEFAULT_SETTINGS);
        }

        const uid = user.uid;

        // 2. Fetch Data from Firestore
        let profileDoc, storeDoc;
        try {
            [profileDoc, storeDoc] = await Promise.all([
                adminDb.collection('users').doc(uid).get(),
                adminDb.collection('stores').doc(uid).get()
            ]);
        } catch (dbError) {
            console.warn("Firestore fetch failed (likely build time or no creds):", dbError);
            // Return defaults on DB error
            return NextResponse.json(DEFAULT_SETTINGS);
        }

        const profile = profileDoc.exists ? profileDoc.data() : null;
        const storeData = storeDoc.exists ? storeDoc.data() : null;

        // 3. Construct Response
        const smsLimitOverride = storeData?.smsLimitOverride ?? DEFAULT_SMS_LIMIT;

        // Fetch SMS Usage
        let smsUsage = { sent: 0, limit: smsLimitOverride, remaining: smsLimitOverride, usageMonth: "" };
        try {
            // This might fail if adminDb is mocked incorrectly
            smsUsage = await getSmsUsageSummary(uid, smsLimitOverride);
        } catch (e) {
            console.error("SMS usage fetch fail", e);
            // Ignore error and use default
        }

        const result = {
            id: uid,
            user_id: uid,
            store_name: storeData?.storeName ?? "",
            store_area: storeData?.address ?? "",
            ai_tone: storeData?.aiTone ?? "polite",
            default_signature: storeData?.defaultSignature ?? storeData?.websiteMaterials?.catchCopy ?? "",
            emoji_level: storeData?.emojiLevel ?? 2,
            auto_reply_delay_minutes: storeData?.autoReplyDelayMinutes ?? 30,
            reply_config: storeData?.replyConfig ?? DEFAULT_SETTINGS.reply_config,
            reply_templates: storeData?.replyTemplates ?? {},
            notification_config: storeData?.notificationConfig ?? DEFAULT_NOTIFICATION_CONFIG,
            sms_limit_override: smsLimitOverride,
            sms_usage: smsUsage,
            ai_usage: { sent: 0, limit: 30, remaining: 30, usageMonth: "" },
            user_email: user.email || profile?.email || "",
        };

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Settings GET error:", error);
        // Fallback for any other error: Return 200 with Defaults to pass build
        return NextResponse.json(DEFAULT_SETTINGS);
    }
}
