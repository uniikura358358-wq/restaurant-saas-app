import { NextResponse } from "next/server";
import { migrateImagesToStorage } from "@/app/actions/migration";

export async function GET() {
    try {
        const result = await migrateImagesToStorage();
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
