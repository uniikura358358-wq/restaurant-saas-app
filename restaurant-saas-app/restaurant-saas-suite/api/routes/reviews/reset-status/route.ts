import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { reviewId } = body;

        // 1. Authentication
        const { verifyAuth } = await import("@/lib/auth-utils");
        const user = await verifyAuth(request);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const uid = user.uid;

        if (!reviewId) {
            return NextResponse.json(
                { error: "Review ID is required" },
                { status: 400 }
            );
        }

        // 2. Ownership Check & Reset Status (Firestore)
        const { getDbForUser } = await import("@/lib/firebase-admin");
        const db = await getDbForUser(uid);
        const reviewRef = db.collection("reviews").doc(reviewId);
        const reviewDoc = await reviewRef.get();

        if (!reviewDoc.exists) {
            return NextResponse.json({ error: "Review not found" }, { status: 404 });
        }

        const reviewData = reviewDoc.data();
        if (reviewData?.userId && reviewData.userId !== uid) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // 3. Reset Status
        await reviewRef.update({
            status: "unreplied",
            replyContent: null,
            replySummary: FieldValue.delete(),
            replyId: FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp()
        });

        // 4. Update Stats (Optional but recommended for consistency)
        try {
            const statsRef = db.collection("users").doc(uid).collection("stats").doc("current");
            await db.runTransaction(async (t) => {
                const statsDoc = await t.get(statsRef);
                if (statsDoc.exists) {
                    t.update(statsRef, {
                        repliedCount: FieldValue.increment(-1),
                        unrepliedCount: FieldValue.increment(1),
                        updatedAt: FieldValue.serverTimestamp()
                    });
                }
            });
        } catch (statsError) {
            console.warn("Stats update failed during reset:", statsError);
            // Continue even if stats update fails
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Error in reset-status:", error);
        return NextResponse.json(
            { error: "Failed to reset review status" },
            { status: 500 }
        );
    }
}
