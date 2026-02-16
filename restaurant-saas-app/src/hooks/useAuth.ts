import { useEffect, useState } from "react";
import { onAuthStateChanged as onFirebaseAuthStateChange, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
        if (!auth?.currentUser) return null;
        return auth.currentUser.getIdToken();
    };

    return { user, loading, getToken };
}
