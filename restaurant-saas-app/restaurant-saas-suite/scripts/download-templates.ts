import * as dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

async function downloadTemplates() {
    const { adminStorage } = await import("../src/lib/firebase-admin");
    const bucket = adminStorage.bucket();

    const targetDirs = ["images/templates/pop/a4/", "images/templates/pop/large/"];
    const localBaseDir = path.join(process.cwd(), "public", "images", "templates", "pop");

    for (const dir of targetDirs) {
        console.log(`Checking storage directory: ${dir}`);
        const [files] = await bucket.getFiles({ prefix: dir });

        for (const file of files) {
            if (file.name.endsWith("/")) continue; // Skip folders

            const relativePath = file.name.replace("images/templates/pop/", "");
            const localPath = path.join(localBaseDir, relativePath);
            const localDir = path.dirname(localPath);

            if (!fs.existsSync(localDir)) {
                fs.mkdirSync(localDir, { recursive: true });
            }

            console.log(`Downloading ${file.name} to ${localPath}...`);
            await file.download({ destination: localPath });
        }
    }
    console.log("Download complete.");
}

downloadTemplates().catch(console.error);
