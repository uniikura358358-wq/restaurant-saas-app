import * as dotenv from "dotenv";
import path from "path";
import fs from "fs";

// .env.local を手動で読み込む
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

/**
 * public/images/templates/pop/incoming フォルダにある新しいテンプレート画像を
 * Firebase Storage へアップロードし、アプリ (page.tsx) への追加準備を行う。
 */
async function importTemplates() {
    const { adminStorage } = await import("../src/lib/firebase-admin");
    const incomingDir = path.join(process.cwd(), "public", "images", "templates", "pop", "incoming");

    if (!fs.existsSync(incomingDir)) {
        console.log("No incoming directory found.");
        return;
    }

    const files = fs.readdirSync(incomingDir).filter(f => f.endsWith(".png") || f.endsWith(".jpg"));
    if (files.length === 0) {
        console.log("No images found in incoming folder.");
        return;
    }

    const bucket = adminStorage.bucket();
    console.log(`Found ${files.length} images to import...`);

    for (const file of files) {
        const fullPath = path.join(incomingDir, file);
        // デフォルトでは A4 カテゴリへ
        const destination = `images/templates/pop/a4/${file}`;

        try {
            console.log(`Uploading ${file} to ${destination}...`);
            await bucket.upload(fullPath, {
                destination,
                public: true,
                metadata: {
                    cacheControl: "public, max-age=31536000",
                },
            });
            console.log(`Successfully imported: ${file}`);

            // TODO: ここで page.tsx を自動更新するロジックを追加予定
            console.log(`NEXT STEP: Add the following entry to STYLE_GROUPS and PRO_LAYOUT_CONFIG in page.tsx:`);
            console.log(`URL: /${destination}`);

        } catch (error) {
            console.error(`Failed to import ${file}:`, error);
        }
    }
}

importTemplates().catch(console.error);
