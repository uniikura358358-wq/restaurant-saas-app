import { useEffect, useState } from "react";
import { onAuthStateChanged as onFirebaseAuthStateChange, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 開発環境用のデモユーザーチェック
        if (process.env.NODE_ENV === "development") {
            const isDemo = localStorage.getItem("demo_user") === "true";
            if (isDemo) {
                setUser({
                    uid: "demo-user-id",
                    email: "demo@example.com",
                    displayName: "管理者（デモ）",
                    getIdToken: async () => "demo-token",
                } as any);
                setLoading(false);
                return;
            }
        }

        if (!auth) {
            setLoading(false);
            return;
        }

        // 状態変化を監視
        const unsubscribe = onFirebaseAuthStateChange(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const getToken = async () => {
        if (process.env.NODE_ENV === "development" && localStorage.getItem("demo_user") === "true") {
            return "demo-token";
        }
        if (!auth?.currentUser) return null;
        return auth.currentUser.getIdToken();
    };

    return { user, loading, getToken };
}
