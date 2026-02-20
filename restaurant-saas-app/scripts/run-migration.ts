import * as dotenv from "dotenv";
import path from "path";
// .env.local を手動で読み込む
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

async function run() {
    const { migrateImagesToStorage } = await import("../src/app/actions/migration");
    console.log("Starting migration...");
    try {
        const result = await migrateImagesToStorage();
        console.log("Migration Result:", JSON.stringify({
            success: result.success,
            total: (result as any).total,
            errors: (result as any).errors,
            message: (result as any).message
        }, null, 2));
    } catch (error: any) {
        console.error("Migration failed:", error);
    }
}

run();
