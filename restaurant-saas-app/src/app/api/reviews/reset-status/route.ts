import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// サーバーサイド専用: service_role キーで RLS をバイパス
function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Supabase configuration is missing (URL or SERVICE_ROLE_KEY)");
    }

    return createClient(supabaseUrl, serviceRoleKey);
}

export async function POST(request: Request) {
    try {
        const { reviewId } = await request.json();

        if (!reviewId) {
            return NextResponse.json(
                { error: "Review ID is required" },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        const { error } = await supabase
            .from("reviews")
            .update({
                status: "unreplied",
                reply_content: null,
                updated_at: new Date().toISOString()
            })
            .eq("id", reviewId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        let message = "Failed to reset review status";
        if (error instanceof Error) {
            message = error.message;
        } else if (error && typeof error === "object" && "message" in error) {
            message = String((error as { message: unknown }).message);
        }
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
