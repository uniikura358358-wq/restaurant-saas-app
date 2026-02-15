import { db } from "./firebase";
import { collection, doc, setDoc, getDocs, serverTimestamp, Timestamp, query, where } from "firebase/firestore";

// Firestore Collection Name
const REPLIES_COLLECTION = "replies";

export interface ReplyData {
    reviewId: string;
    replyContent: string;
    userId: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/**
 * Save a reply to Firestore
 * @param reviewId The ID of the review (number or string)
 * @param replyContent The content of the reply
 * @param userId The ID of the user saving the reply
 */
export async function saveReply(reviewId: number | string, replyContent: string, userId: string) {
    if (!userId) {
        throw new Error("User ID is required to save reply");
    }
    try {
        const docRef = doc(db, REPLIES_COLLECTION, String(reviewId));
        await setDoc(docRef, {
            reviewId: String(reviewId),
            replyContent,
            userId,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(), // In a real app, you might want to only set this on create
        }, { merge: true }); // Merge checks for existing document
        console.log("Reply saved to Firestore:", reviewId);
        return true;
    } catch (error) {
        console.error("Error saving reply to Firestore:", error);
        throw error;
    }
}

/**
 * Get all replies from Firestore for a specific user
 * @param userId The ID of the user to fetch replies for
 * @returns An object mapping reviewId to replyContent
 */
export async function getAllReplies(userId: string): Promise<Record<string, string>> {
    if (!userId) return {};

    try {
        const q = query(
            collection(db, REPLIES_COLLECTION),
            where("userId", "==", userId)
        );

        const querySnapshot = await getDocs(q);
        const replies: Record<string, string> = {};
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.reviewId && data.replyContent) {
                replies[data.reviewId] = data.replyContent;
            }
        });
        return replies;
    } catch (error) {
        console.error("Error fetching replies from Firestore:", error);
        return {};
    }
}
