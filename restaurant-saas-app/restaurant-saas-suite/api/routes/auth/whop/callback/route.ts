import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const { searchParams, origin } = url;
        const code = searchParams.get('code');

        if (!code) {
            return NextResponse.redirect(`${origin}/login?error=no_code`);
        }

        // 1. Whop Token Exchange
        const tokenRes = await fetch('https://whop.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: process.env.NEXT_PUBLIC_WHOP_CLIENT_ID,
                client_secret: process.env.WHOP_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
                redirect_uri: process.env.WHOP_REDIRECT_URI,
            }),
        });

        if (!tokenRes.ok) {
            const errorData = await tokenRes.json();
            console.error('Whop Token Error:', errorData);
            return NextResponse.redirect(`${origin}/login?error=token_exchange_failed`);
        }

        const tokens = await tokenRes.json();
        const accessToken = tokens.access_token;

        // 2. Fetch User Info from Whop
        const userRes = await fetch('https://api.whop.com/api/v2/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        const whopUser = await userRes.json();

        // 3. Check Memberships
        const membershipRes = await fetch('https://api.whop.com/api/v2/memberships?status=active', {
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        const memberships = await membershipRes.json();

        // Determine plan level
        const hasBusiness = memberships.data.some((m: any) => m.product_id === process.env.WHOP_PRODUCT_ID_BUSINESS);
        const hasLight = memberships.data.some((m: any) => m.product_id === process.env.WHOP_PRODUCT_ID_LIGHT);

        const planStatus = (hasBusiness || hasLight) ? 'active' : 'web Light';
        const planName = hasBusiness ? 'Business' : (hasLight ? 'Light' : 'web Light');

        // 4. Update or Create User in Firebase
        let uid = "";
        try {
            const userRecord = await adminAuth.getUserByEmail(whopUser.email);
            uid = userRecord.uid;
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                const newUser = await adminAuth.createUser({
                    email: whopUser.email,
                    emailVerified: true,
                });
                uid = newUser.uid;
            } else {
                throw error;
            }
        }

        // 5. Sync Plan to Profile (Firestore)
        const db = adminDb;
        await db.collection('users').doc(uid).set({
            email: whopUser.email,
            whopId: whopUser.id,
            plan: planName.toLowerCase(), // 'business' | 'light' | 'web light'
            subscriptionStatus: planStatus,
            planName: planName,
            updatedAt: FieldValue.serverTimestamp(),
            lastLoginAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        // 6. Create a Custom Token for the user to sign in on client
        const customToken = await adminAuth.createCustomToken(uid, {
            plan: planName.toLowerCase()
        });

        return NextResponse.redirect(`${origin}/login/callback?token=${customToken}`);

    } catch (error) {
        console.error('Whop Callback Error:', error);
        try {
            const origin = new URL(request.url).origin;
            return NextResponse.redirect(`${origin}/login?error=callback_error`);
        } catch {
            return NextResponse.json({ error: 'Callback failed' }, { status: 500 });
        }
    }
}
