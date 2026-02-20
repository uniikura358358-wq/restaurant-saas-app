"use server";

import { getGenerativeModel, AI_POLICY } from "@/lib/vertex-ai";

/**
 * AIとのデザイン対話アシスタント
 */
export async function chatWithPopAssistant(params: {
    messages: { role: "user" | "model"; content: string; images?: string[] }[];
    currentPopState: any;
}) {
    const targetModel = AI_POLICY.PRIMARY;

    // システムプロンプトの構築
    const systemPrompt = `
あなたは世界最高峰のフードメニュー・POPデザイナー兼集客コンサルタントです。
ユーザー（飲食店主）との対話を通じて、最高品質のPOPデザインを提案・作成します。

【あなたの役割】
1. ユーザーの意図（「もっと高級感を出したい」「期間限定を強調して」「左側に写真を置いて」など）を正確に把握する。
2. その意図に基づき、POPの「座標(x, y)」「サイズ」「コピー内容」「フォント」「色」を論理的に決定する。
3. ユーザーに対して「デザインの意図」を説明し、最後に必ず最新のレイアウトデータをJSON形式で提供する。

【現在のデザイン状態】
${JSON.stringify(params.currentPopState, null, 2)}

【制約事項】
- 返信の最後には必ず、更新後のデザインデータを \`\`\`json ... \`\`\` ブロックで含めてください。
- デザインデータ（JSON）の形式は以下の通りです。
{
  "catchphrase": "...",
  "description": "...",
  "productName": "...",
  "price": "...",
  "style": "...",
  "fontFamily": "font-noto-serif" | "font-noto-sans" | "font-yuji" | "font-inter" | "font-playfair" | "font-bebas" | string,
  "recommendedColor": "hex",
  "aiLayout": {
    "catchphrase": { "x": number, "y": number, "fontSize": number, "align": "center" },
    "productName": { "x": number, "y": number, "fontSize": number, "align": "center" },
    "price": { "x": number, "y": number, "fontSize": number, "align": "center" },
    "description": { "x": number, "y": number, "fontSize": number, "align": "center" }
  }
}
- 座標は0-100のパーセンテージ。
- 日本語で親身かつプロフェッショナルなトーンで回答してください。
`;

    try {
        const model = getGenerativeModel(targetModel);
        const generationConfig: any = {};
        if (targetModel === AI_POLICY.PRIMARY) {
            Object.assign(generationConfig, AI_POLICY.THINKING_CONFIG_LOW);
        }

        // 過去のメッセージをパーツに変換
        const contents = params.messages.map(msg => {
            const parts: any[] = [{ text: msg.content }];
            if (msg.images && msg.images.length > 0) {
                msg.images.forEach(img => {
                    const base64Data = img.replace(/^data:image\/\w+;base64,/, "");
                    parts.push({
                        inlineData: {
                            mimeType: "image/png",
                            data: base64Data
                        }
                    });
                });
            }
            return {
                role: msg.role === "user" ? "user" : "model",
                parts
            };
        });

        // システム命令を先頭に追加（あるいは専用のsystemInstructionがあればそれを使うが、contentsの最初に入れる）
        contents.unshift({
            role: "user",
            parts: [{ text: systemPrompt }]
        });
        contents.push({
            role: "model",
            parts: [{ text: "承知いたしました。誠心誠意、デザインのサポートをさせていただきます。" }]
        });

        const result = await model.generateContent({
            contents,
            generationConfig
        });

        const response = (result as any).response;
        const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

        return {
            content: responseText,
            success: true
        };
    } catch (error: any) {
        console.error("POP CHAT ASSISTANT Error:", error);
        return {
            content: "申し訳ありません。デザイナーが席を外しているようです。後ほどお試しください。",
            success: false,
            error: error.message
        };
    }
}
