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

    try {
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
