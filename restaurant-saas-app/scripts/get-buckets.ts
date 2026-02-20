import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

async function run() {
    const { Storage } = await import("@google-cloud/storage");
    const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY!;
    let key;
    try {
        key = JSON.parse(rawKey);
        if (typeof key === 'string') key = JSON.parse(key);
    } catch (e) {
        let keyStr = rawKey.trim();
        if (keyStr.startsWith("'") || keyStr.startsWith('"')) keyStr = keyStr.substring(1, keyStr.length - 1);
        key = JSON.parse(keyStr);
    }

    const storage = new Storage({
        projectId: key.project_id,
        credentials: { client_email: key.client_email, private_key: key.private_key }
    });
    const [buckets] = await storage.getBuckets();
    console.log("ACTUAL_BUCKET_NAMES:", buckets.map(b => b.name).join(","));
}
run();
