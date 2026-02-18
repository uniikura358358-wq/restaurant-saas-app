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
        // (環境変数は .env.local から取得)
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

        // 2. Fetch User Info from Whop (to get email/id)
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

        // 4. Update or Create User in Firebase (Linking Whop to Firebase)

        let uid = "";
        let isNewUser = false;

        try {
            const userRecord = await adminAuth.getUserByEmail(whopUser.email);
            uid = userRecord.uid;
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                // New user registration flow
                const newUser = await adminAuth.createUser({
                    email: whopUser.email,
                    emailVerified: true,
                    // password is not set, meaning they can't sign in with password unless they set it.
                    // Ideally we'd link providers or use custom token but for now this syncs the account.
                });
                uid = newUser.uid;
                isNewUser = true;
            } else {
                throw error;
            }
        }

        // Sync Plan to Profile (Firestore)
        // users/{uid}
        await adminDb.collection('users').doc(uid).set({
            email: whopUser.email,
            whopId: whopUser.id,
            plan: planName.toLowerCase(), // 'business' | 'light' | 'web light'
            subscriptionStatus: planStatus,
            planName: planName, // deprecated but keep for compatibility if needed
            updatedAt: FieldValue.serverTimestamp(),
            lastLoginAt: FieldValue.serverTimestamp(), // To indicate activity
        }, { merge: true });

        // 5. Create a Custom Token for the user to sign in on client
        const customToken = await adminAuth.createCustomToken(uid, {
            plan: planName.toLowerCase()
        });

        // Redirect to dashboard with custom token to sign in
        // Note: Passing token in URL is a security risk (could be logged).
        // A better way is to set a secure cookie or use an intermediate page.
        // For this specific migration/MVP, we'll pass it in query param to be handled by client immediately.
        // Client side `useAuth` or a special `/auth/callback` page should `signInWithCustomToken(token)`.

        return NextResponse.redirect(`${origin}/login/callback?token=${customToken}`);

    } catch (error) {
        console.error('Whop Callback Error:', error);
        // Fallback for build time or runtime errors
        // Try to redirect if origin is available, otherwise json
        try {
            const origin = new URL(request.url).origin;
            return NextResponse.redirect(`${origin}/login?error=callback_error`);
        } catch {
            return NextResponse.json({ error: 'Callback failed' }, { status: 500 });
        }
    }
}
