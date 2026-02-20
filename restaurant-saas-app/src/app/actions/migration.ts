"use server";

import { adminStorage } from "@/lib/firebase-admin";
import fs from "fs";
import path from "path";

const PUBLIC_IMAGES_DIR = path.join(process.cwd(), "public", "images");

/**
 * public/images 以下のファイルを Firebase Storage へ一括アップロードする
 */
export async function migrateImagesToStorage() {
    const results: { path: string; status: "success" | "error"; message?: string }[] = [];

    if (!fs.existsSync(PUBLIC_IMAGES_DIR)) {
        return { success: false, message: "public/images フォルダが見つかりません" };
    }

    const bucket = adminStorage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);

    async function walkAndUpload(dir: string) {
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                await walkAndUpload(fullPath);
            } else {
                // public/images から相対パスを取得 (例: templates/pop/a4/xxx.png)
                const relativePath = path.relative(PUBLIC_IMAGES_DIR, fullPath).replace(/\\/g, "/");
                const destination = `images/${relativePath}`;

                try {
                    await bucket.upload(fullPath, {
                        destination,
                        public: true, // 公開アクセスを許可（読み取り専用）
                        metadata: {
                            cacheControl: "public, max-age=31536000",
                        },
                    });
                    results.push({ path: destination, status: "success" });
                    console.log(`Uploaded: ${destination}`);
                } catch (error: any) {
                    results.push({ path: destination, status: "error", message: error.message });
                    console.error(`Failed to upload ${destination}:`, error);
                }
            }
        }
    }

    try {
        await walkAndUpload(PUBLIC_IMAGES_DIR);
        return {
            success: true,
            total: results.length,
            errors: results.filter((r) => r.status === "error").length,
            details: results,
        };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
