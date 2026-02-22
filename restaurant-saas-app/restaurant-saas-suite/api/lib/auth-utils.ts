import { adminAuth } from "@/lib/firebase-admin";

export interface AuthenticatedUser {
    uid: string;
    email?: string;
    storeId?: string; // Future extension for multi-tenant
}

/**
 * Verifies the Firebase ID Token from the Authorization header.
 * プロジェクト一本化に伴い、メインの認証インスタンスのみを使用します。
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

    // 2. トークンの検証
    try {
        if (typeof adminAuth.verifyIdToken === 'function') {
            const decodedToken = await adminAuth.verifyIdToken(idToken);
            return { uid: decodedToken.uid, email: decodedToken.email };
        }
    } catch (error: any) {
        console.error("verifyAuth: Token verification failed:", error.message);
    }

    return null;
}
