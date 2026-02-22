"use server";

import { getGenerativeModel, AI_POLICY } from "@/lib/vertex-ai";
import { verifyAuth } from "@/lib/auth-utils";
import { enforceSubscriptionLock } from "@/lib/subscription-server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

/**
 * ナノバナナ (gemini-2.5-flash-image) を使用した画像生成アクション
 * 
 * @param prompt 画像生成用のプロンプト
 * @param isProduction 本番用高品質生成フラグ（デフォルト: false = 試作）
 * @returns 生成された画像の公開URL（/images/generated/...）
 */
export async function generateImageWithNanoBanana(prompt: string, isProduction: boolean = false, idToken?: string) {
    try {
        // 1. 認証チェック
        const user = await verifyAuth(idToken || "");
        if (!user) {
            throw new Error("Unauthorized: 認証が必要です");
        }

        // 2. 購読ステータスによる制限の適用 (1日以上の遅延で遮断)
        await enforceSubscriptionLock(user.uid, "ai_api");

        const model = getGenerativeModel(AI_POLICY.IMAGE);

        // [V2-MOD] 試作・本番に応じたパラメータ制御（将来的な拡張性を保持）
        const generationConfig = isProduction ? {
            // 本番用高品質設定 (例: サンプル数、アスペクト比指定など)
            // 現在の Gemini 2.5 Flash Image では基本 1枚だが、構造を分離
            candidateCount: 1,
        } : {
            // 試作・最速設定
            candidateCount: 1,
        };

        // 画像生成リクエスト
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig
        });

        const response = (result as any).response;
        // 全てのパーツを走査して画像データ（inlineData）を抽出
        const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        const base64Data = imagePart?.inlineData?.data;

        if (!base64Data) {
            throw new Error("画像データの生成に失敗しました（データが空です）。");
        }

        // 保存先ディレクトリの準備
        const fileName = `nanobanana_${uuidv4()}.png`;
        const publicDir = path.join(process.cwd(), "public", "images", "generated");
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }

        const filePath = path.join(publicDir, fileName);

        // 物理ファイルとして保存 (AI規則遵守)
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

        // クライアントからアクセス可能なパスを返す
        return {
            success: true,
            url: `/images/generated/${fileName}`,
            filePath: filePath
        };

    } catch (error: any) {
        console.error("Nano Banana Image Generation Error:", error);
        return {
            success: false,
            error: error.message || "画像生成中に不明なエラーが発生しました。"
        };
    }
}
