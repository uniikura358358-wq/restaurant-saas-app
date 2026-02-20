import { adminAuth, adminAuthSecondary } from "@/lib/firebase-admin";

export interface AuthenticatedUser {
    uid: string;
    email?: string;
    storeId?: string; // Future extension for multi-tenant
}

/**
 * Verifies the Firebase ID Token from the Authorization header.
 * 2つのプロジェクト（Primary/Secondary）の両方をチェックします。
 */
export async function verifyAuth(requestOrToken: Request | string): Promise<AuthenticatedUser | null> {
    let idToken: string | null = null;

    if (typeof requestOrToken === "string") {
        idToken = requestOrToken;
    } else {
        const authHeader = requestOrToken.headers.get("Authorization");
        if (authHeader?.startsWith("Bearer ")) {
            idToken = authHeader.split("Bearer ")[1];
        }
    }

    if (!idToken) {
        return null;
    }

    // 1. デモトークンのチェック (バイパス)
    if (idToken === "demo-token") {
        return { uid: "demo-user-id", email: "demo@example.com" };
    }

    // 2. プライマリ・プロジェクトで検証
    try {
        if (typeof adminAuth.verifyIdToken === 'function') {
            const decodedToken = await adminAuth.verifyIdToken(idToken);
            return { uid: decodedToken.uid, email: decodedToken.email };
        }
    } catch (error: any) {
        console.warn("Primary Auth failed, trying secondary...");
    }

    // 3. セカンダリ・プロジェクトで再検証
    try {
        if (typeof adminAuthSecondary.verifyIdToken === 'function') {
            const decodedToken = await adminAuthSecondary.verifyIdToken(idToken);
            return { uid: decodedToken.uid, email: decodedToken.email };
        }
    } catch (error: any) {
        console.error("verifyAuth: All token verification failed:", error.message);
    }

    return null;
}
