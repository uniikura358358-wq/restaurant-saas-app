import { storage } from "./firebase";
import { ref, getDownloadURL, uploadBytes } from "firebase/storage";

/**
 * 画像のパスを受け取り、Firebase StorageのURLを返す。
 * ストレージに存在しない場合や取得に失敗した場合は、フォールバックとしてローカルパスを返す。
 */
export async function getStorageUrl(path: string): Promise<string> {
    // すでに対象がURL（httpから始まる）の場合はそのまま返す
    if (path.startsWith("http") || path.startsWith("data:")) return path;

    // ローカルパス (/images/...) を Storageパス (images/...) に変換
    const storagePath = path.startsWith("/") ? path.slice(1) : path;

    try {
        const storageRef = ref(storage, storagePath);
        const url = await getDownloadURL(storageRef);
        return url;
    } catch (error) {
        // 見つからない場合はローカルパスを返す（移行期間用）
        return path;
    }
}

/**
 * 同期的にURLを生成する（Public URL形式）
 * getDownloadURLを待てない場合や、多くの画像を一覧表示する際に使用。
 */
export function getPublicStorageUrl(path: string): string {
    if (path.startsWith("http") || path.startsWith("data:")) return path;

    const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    const storagePath = path.startsWith("/") ? path.slice(1) : path;

    // NOTE: Firebase Storage の Public URL 形式
    // https://firebasestorage.googleapis.com/v0/b/[BUCKET]/o/[PATH]?alt=media
    const encodedPath = encodeURIComponent(storagePath);
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
}

/**
 * ファイルを Firebase Storage にアップロードし、ダウンロードURLを返す
 */
export async function uploadToStorage(file: File, path: string): Promise<string> {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
}
