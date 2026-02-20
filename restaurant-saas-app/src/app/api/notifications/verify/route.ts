import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth } from "@/lib/auth-utils";
import { randomUUID, randomInt } from "crypto";
import { isValidEmail, isValidPhone } from "@/lib/notification-handler";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = 'force-dynamic';

const EMAIL_TOKEN_EXPIRES_HOURS = 24;
const SMS_OTP_EXPIRES_MINUTES = 10;

export async function POST(request: Request) {
    try {
        try {
            const { channel, contact_value } = await request.json();

            // 1. Validation
            if (!channel || !["email", "sms"].includes(channel)) {
                return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
            }
            if (!contact_value) {
                return NextResponse.json({ error: "Contact value required" }, { status: 400 });
            }
            if (channel === "email" && !isValidEmail(contact_value)) {
                return NextResponse.json({ error: "Invalid email" }, { status: 400 });
            }
            if (channel === "sms" && !isValidPhone(contact_value)) {
                return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
            }

            // 2. Auth Check
            const user = await verifyAuth(request);
            if (!user) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            const uid = user.uid;

            // 3. Generate Token
            const token = channel === "email" ? randomUUID() : String(randomInt(100000, 999999));

            const expiresAt = new Date();
            if (channel === "email") {
                expiresAt.setHours(expiresAt.getHours() + EMAIL_TOKEN_EXPIRES_HOURS);
            } else {
                expiresAt.setMinutes(expiresAt.getMinutes() + SMS_OTP_EXPIRES_MINUTES);
            }

            // 4. Store in Firestore (Root collection for easier cross-uid search if needed, or consistent with confirm endpoint)
            const { getDbForUser } = await import("@/lib/firebase-admin");
            const db = await getDbForUser(uid);
            await db.collection("verificationCodes").doc(`${uid}_${channel}`).set({
                token,
                userId: uid,
                channel,
                contactValue: contact_value,
                expiresAt,
                verified: false,
                createdAt: FieldValue.serverTimestamp()
            });

            // 5. Send Notification (Mock/Placeholder)
            if (channel === "email") {
                const origin = request.headers.get("origin") || "http://localhost:3000";
                const confirmUrl = `${origin}/api/notifications/verify/confirm?token=${token}&channel=email`;
                console.log(`[Email Mock] to=${contact_value}, url=${confirmUrl}`);
            } else {
                console.log(`[SMS Mock] to=${contact_value}, OTP=${token}`);
            }

            return NextResponse.json({
                success: true,
                message: channel === "email"
                    ? "確認メールを送信しました。"
                    : "確認コードを送信しました。"
            });

        } catch (error: any) {
            console.error("Verify API error:", error);
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }
    } catch {
        // Absolute fallback
        return NextResponse.json({ error: "Fatal Error" }, { status: 500 });
    }
}
