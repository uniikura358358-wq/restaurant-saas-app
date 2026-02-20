"use server";

import { adminDb, getDbForUser } from "@/lib/firebase-admin";
import { AccountingEntry } from "@/types/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * 認証チェックを行う内部ヘルパー
 */
async function verifyUser(idToken?: string): Promise<string> {
    if (!idToken) {
        throw new Error("Unauthorized: No token provided");
    }

    const { verifyAuth } = await import("@/lib/auth-utils");
    const user = await verifyAuth(idToken);

    if (!user) {
        throw new Error("Unauthorized: Invalid token");
    }

    return user.uid;
}

/**
 * OCR解析結果を仕訳データとして保存する
 */
export async function saveAccountingEntry(
    idToken: string,
    data: {
        merchantName: string;
        totalAmount: number;
        transactionDate: string;
        category: string;
        invoiceNumber?: string;
        taxAmount?: number;
        imageUrl?: string;
    }
) {
    const uid = await verifyUser(idToken);
    const isDemo = uid === "demo-user-id";

    if (isDemo) {
        // デモモード：Cookieベースの永続化は今回は簡略化し、成功のみ返す
        // ※必要に応じて dashboard.ts のように Cookie への書き込みを追加可能
        console.log("Demo Mode: saveAccountingEntry", data);
        return { success: true, id: "demo-entry-" + Date.now() };
    }

    try {
        const db = await getDbForUser(uid);
        const entriesRef = db.collection("stores").doc(uid).collection("accounting_entries");

        const newEntryRef = entriesRef.doc();
        const entryData = {
            id: newEntryRef.id,
            userId: uid,
            ...data,
            status: "confirmed",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        await newEntryRef.set(entryData);

        // また、統計情報の更新が必要な場合は、ここで行う（未実装、必要に応じて追加）

        revalidatePath('/dashboard/accounting');
        return { success: true, id: newEntryRef.id };
    } catch (error) {
        console.error("Error saving accounting entry:", error);
        throw new Error("仕訳データの保存に失敗しました。");
    }
}

/**
 * 保存された仕訳データを取得する
 */
export async function getAccountingEntries(idToken: string, limitCount: number = 20) {
    const uid = await verifyUser(idToken);

    if (uid === "demo-user-id") {
        return [
            { id: 'demo-1', merchantName: 'サントリー', totalAmount: 34200, transactionDate: '2026-02-19', category: '仕入', status: 'confirmed' },
            { id: 'demo-2', merchantName: '東京ガス', totalAmount: 11800, transactionDate: '2026-02-18', category: '光熱費', status: 'confirmed' },
            { id: 'demo-3', merchantName: 'ダイソー', totalAmount: 1100, transactionDate: '2026-02-17', category: '消耗品', status: 'confirmed' },
        ];
    }

    try {
        const db = await getDbForUser(uid);
        const snapshot = await db.collection("stores").doc(uid)
            .collection("accounting_entries")
            .orderBy("createdAt", "desc")
            .limit(limitCount)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
        }));
    } catch (error) {
        console.error("Error fetching accounting entries:", error);
        return [];
    }
}
