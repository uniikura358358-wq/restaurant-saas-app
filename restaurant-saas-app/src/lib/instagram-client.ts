/**
 * Instagram Graph API Client
 * 
 * 役割:
 * - メディアコンテナの作成
 * - メディアの公開（投稿）
 * - エラーハンドリング（アクセストークンの有効性など）
 */

const INSTAGRAM_BUSINESS_ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const API_VERSION = "v18.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

export interface InstagramPostResult {
    id: string; // Media Container ID or Post ID
}

/**
 * Instagram Graph API を呼び出してメディアコンテナを作成する
 * @param imageUrl 公開アクセス可能な画像のURL
 * @param caption 投稿キャプション
 */
export async function createMediaContainer(imageUrl: string, caption: string): Promise<string> {
    if (!INSTAGRAM_BUSINESS_ACCOUNT_ID || !INSTAGRAM_ACCESS_TOKEN) {
        throw new Error("Instagram configuration (ID/Token) missing in environment variables.");
    }

    const url = `${BASE_URL}/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`;
    const params = new URLSearchParams({
        image_url: imageUrl,
        caption: caption,
        access_token: INSTAGRAM_ACCESS_TOKEN,
    });

    const response = await fetch(`${url}?${params.toString()}`, {
        method: "POST",
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("Instagram Media Container Error:", data);
        throw new Error(data.error?.message || "Failed to create media container");
    }

    return data.id; // creation_id
}

/**
 * 作成したコンテナを公開（投稿）する
 * @param creationId createMediaContainer で取得した ID
 */
export async function publishMedia(creationId: string): Promise<string> {
    if (!INSTAGRAM_BUSINESS_ACCOUNT_ID || !INSTAGRAM_ACCESS_TOKEN) {
        throw new Error("Instagram configuration (ID/Token) missing in environment variables.");
    }

    const url = `${BASE_URL}/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media_publish`;
    const params = new URLSearchParams({
        creation_id: creationId,
        access_token: INSTAGRAM_ACCESS_TOKEN,
    });

    const response = await fetch(`${url}?${params.toString()}`, {
        method: "POST",
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("Instagram Publish Error:", data);
        throw new Error(data.error?.message || "Failed to publish media");
    }

    return data.id; // post_id
}

/**
 * 統合投稿関数
 */
export async function postToInstagram(imageUrl: string, caption: string): Promise<string> {
    const creationId = await createMediaContainer(imageUrl, caption);

    // コンテナ作成直後に公開するとエラーになる場合があるため、わずかな待機が必要な場合があるが
    // Graph API は通常即時受け付ける。エラー時はリトライロジックを検討。
    const postId = await publishMedia(creationId);

    return postId;
}
