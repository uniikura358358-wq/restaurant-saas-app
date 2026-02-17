import { adminAuth } from "@/lib/firebase-admin";

export interface AuthenticatedUser {
    uid: string;
    email?: string;
    storeId?: string; // Future extension for multi-tenant
}

/**
 * Verifies the Firebase ID Token from the Authorization header.
 * @param request The incoming Request object
 * @returns The authenticated user's UID and other info, or null if verification fails.
 */
export async function verifyAuth(request: Request): Promise<AuthenticatedUser | null> {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
        return null;
    }

    const idToken = authHeader.split("Bearer ")[1];

    // 開発環境かつデモトークンの場合はバイパス
    if (process.env.NODE_ENV === "development" && idToken === "demo-token") {
        console.log("verifyAuth: Demo token detected, bypassing Firebase Admin Auth.");
        return {
            uid: "demo-user-id",
            email: "demo@example.com",
        };
    }

    try {
        console.log("verifyAuth: Verifying ID token with Firebase Admin...");
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        return {
            uid: decodedToken.uid,
            email: decodedToken.email,
        };
    } catch (error) {
        console.error("verifyAuth: Token verification failed:", error);
        return null;
    }
}
