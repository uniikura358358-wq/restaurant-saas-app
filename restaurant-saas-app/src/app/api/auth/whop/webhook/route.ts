import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Whop Webhook Handler
 * メンバーシップの作成・更新・キャンセルを検知し、Firestore の users コレクションを更新します。
 */
export async function POST(request: Request) {
    try {
        const signature = request.headers.get('x-whop-signature');
        const body = await request.text();
        const secret = process.env.WHOP_WEBHOOK_SECRET;

        if (!secret) {
            console.error('WHOP_WEBHOOK_SECRET is not configured');
            return NextResponse.json({ error: 'Configuration Error' }, { status: 500 });
        }

        if (!signature) {
            return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
        }

        // 1. Signature Verification
        const hmac = crypto.createHmac('sha256', secret);
        const digest = hmac.update(body).digest('hex');

        if (digest !== signature) {
            console.warn('Invalid Whop signature attempt');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        try {
            const payload = JSON.parse(body);
            const { action, data } = payload;

            console.log(`Received Whop webhook: ${action}`, data.id);

            // 2. Handle Membership Events
            if (action === 'membership.created' || action === 'membership.updated') {
                const { user, product_id, status } = data;
                const email = user?.email;

                if (!email) {
                    return NextResponse.json({ error: 'No user email in payload' }, { status: 400 });
                }

                // Find user in Firebase Auth
                let uid: string;
                try {
                    const userRecord = await adminAuth.getUserByEmail(email);
                    uid = userRecord.uid;
                } catch (error: any) {
                    if (error.code === 'auth/user-not-found') {
                        console.log(`User not found for email: ${email}. Skipping sync.`);
                        return NextResponse.json({ success: true, message: 'User not found' });
                    } else {
                        throw error;
                    }
                }

                // Determine Plan Level
                const isBusiness = product_id === process.env.WHOP_PRODUCT_ID_BUSINESS;
                const isLight = product_id === process.env.WHOP_PRODUCT_ID_LIGHT;

                const planStatus = status === 'active' ? 'active' : 'web light';
                const planName = status === 'active' ? (isBusiness ? 'Business' : (isLight ? 'Light' : 'web Light')) : 'web Light';

                // Update Firestore Profile
                try {
                    const db = adminDb;
                    await db.collection('users').doc(uid).set({
                        plan: planName.toLowerCase(), // 'business' | 'light' | 'web light'
                        subscriptionStatus: planStatus,
                        planName: planName,
                        updatedAt: FieldValue.serverTimestamp()
                    }, { merge: true });
                    console.log(`Synced plan for ${email}: ${planName} (${planStatus})`);
                } catch (dbError) {
                    console.error("Firestore update failed:", dbError);
                    throw dbError;
                }
            }

            return NextResponse.json({ success: true });

        } catch (error: any) {
            console.error('Whop Webhook Processing Error:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    } catch (topLevelError) {
        console.error('Whop Webhook Fatal Error:', topLevelError);
        return NextResponse.json({ error: 'Fatal Error' }, { status: 500 });
    }
}
