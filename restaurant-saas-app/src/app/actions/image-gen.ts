"use server";

import { getGenerativeModel, AI_POLICY } from "@/lib/vertex-ai";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

/**
 * ナノバナナ (gemini-2.5-flash-image) を使用した画像生成アクション
 * 
 * @param prompt 画像生成用のプロンプト
 * @returns 生成された画像の公開URL（/images/generated/...）
 */
export async function generateImageWithNanoBanana(prompt: string) {
    try {
        const model = getGenerativeModel(AI_POLICY.IMAGE);

        // 画像生成リクエスト
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
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
