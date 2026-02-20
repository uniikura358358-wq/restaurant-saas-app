"use server";
import { getGenerativeModel, AI_POLICY } from "@/lib/vertex-ai";

/**
 * AIによるPOP用コピー生成 (Vertex AI版)
 * 運用規則に基づき、Gemini 3 Flash (Main) を LOW 設定で使用します。
 */
export async function generatePopCopy(data: {
    productName: string;
    category: string;
    price: string;
    features: string;
    style: string;
}) {
    const targetModels = [AI_POLICY.PRIMARY, AI_POLICY.SECONDARY];
    let responseText: string | null = null;
    let lastError: any = null;

    const prompt = `
あなたはプロの飲食コンサルタント兼コピーライターです。
飲食店のテーブルPOPやメニューに載せる「魅力的なキャプション」を作成してください。

【商品情報】
商品名: ${data.productName}
カテゴリ: ${data.category}
価格: ${data.price}
特徴: ${data.features}
デザインスタイル: ${data.style}

【出力内容】
1. キャッチコピー (15文字以内、インパクト重視)
2. 紹介文 (80文字以内、シズル感を重視し、注文したくなる文章)

返信は以下のJSON形式のみで返してください。余計な解説は不要です。
{
  "catchphrase": "...",
  "description": "..."
}
`;

    for (const modelName of targetModels) {
        try {
            const model = getGenerativeModel(modelName);
            const generationConfig: any = {};
            // メインの Gemini 3系には思考レベル LOW を適用
            if (modelName === AI_POLICY.PRIMARY) {
                Object.assign(generationConfig, AI_POLICY.THINKING_CONFIG_LOW);
            }

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig
            });

            const response = (result as any).response;
            responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (responseText) break;
        } catch (error: any) {
            console.warn(`POP COPY retryable error for ${modelName}:`, error.message);
            lastError = error;
        }
    }

    if (!responseText) {
        console.error("AI Generation Error (Vertex AI):", lastError);
        return {
            catchphrase: "新登場の逸品",
            description: `${data.productName}。厳選素材を使用した店長自信の味をぜひ。`,
        };
    }

    try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error("Invalid format from AI");
    } catch (error) {
        console.error("JSON Parse Error:", error);
        return {
            catchphrase: "新登場の逸品",
            description: `${data.productName}。厳選素材を使用した店長自信の味をぜひ。`,
        };
    }
}

/**
 * クチコミを売れるコピーに変換 (V6: Competitive Superiority)
 */
export async function generateReviewCopy(data: {
    review: string;
    productName: string;
}) {
    const targetModels = [AI_POLICY.PRIMARY, AI_POLICY.SECONDARY];
    let responseText: string | null = null;
    let lastError: any = null;

    const prompt = `
あなたは天才コピーライターです。お客様からいただいた「クチコミ」を元に、新規客が思わず注文したくなる「魅惑の広告コピー」を作成してください。

【お客様のクチコミ】
"${data.review}"

【対象商品】
${data.productName}

【出力内容】
1. キャッチコピー (15文字以内、クチコミの熱量を活かしつつキャッチーに)
2. 紹介文 (80文字以内、お客様の声を第3者の証言として活用し、信頼感とシズル感を両立。ですます調)

返信は以下のJSON形式のみで返してください。
{
  "catchphrase": "...",
  "description": "..."
}
`;

    for (const modelName of targetModels) {
        try {
            const model = getGenerativeModel(modelName);
            const generationConfig: any = {};
            if (modelName === AI_POLICY.PRIMARY) {
                Object.assign(generationConfig, AI_POLICY.THINKING_CONFIG_LOW);
            }

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig
            });

            const response = (result as any).response;
            responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (responseText) break;
        } catch (error: any) {
            console.warn(`REVIEW COPY retryable error for ${modelName}:`, error.message);
            lastError = error;
        }
    }

    if (!responseText) {
        return {
            catchphrase: "お客様絶賛の味",
            description: "多くのお客様から高い評価をいただいている自慢の一品です。",
        };
    }

    try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        throw new Error("Invalid format");
    } catch (error) {
        return {
            catchphrase: "お客様絶賛の味",
            description: "多くのお客様から高い評価をいただいている自慢の一品です。",
        };
    }
}

/**
 * 画像の雰囲気から最適なフォントを提案 (V8: AI Font Matcher)
 */
export async function suggestFontFromImage(imageBase64: string) {
    const targetModels = [AI_POLICY.PRIMARY, AI_POLICY.SECONDARY];
    let responseText: string | null = null;
    let lastError: any = null;

    const prompt = `
画像のデザイン（色、雰囲気、スタイル）を分析し、以下のフォントリストの中から、このデザインに最も合うものを1つだけ選んでください。
返信は、以下の「キー」の名前のみを返してください。解説は一切不要です。

【フォントリスト】
- font-noto-serif (明朝体: 和食、高級、伝統)
- font-noto-sans (ゴシック体: モダン、汎用、シンプル)
- font-yuji (筆文字: 居酒屋、力強い、和風)
- font-inter (サンセリフ: カフェ、おしゃれ、ミニマル)
- font-playfair (セリフ: ラグジュアリー、ワイン、洋風)
- font-bebas (インパクト: セール、太字、力強い)

返信例: font-noto-serif
`;

    // Base64のヘッダーを削除（もしあれば）
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    for (const modelName of targetModels) {
        try {
            const model = getGenerativeModel(modelName);
            const generationConfig: any = {};
            if (modelName === AI_POLICY.PRIMARY) {
                Object.assign(generationConfig, AI_POLICY.THINKING_CONFIG_LOW);
            }

            const result = await model.generateContent({
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: prompt },
                            {
                                inlineData: {
                                    mimeType: "image/png",
                                    data: base64Data
                                }
                            }
                        ]
                    }
                ],
                generationConfig
            });

            const response = (result as any).response;
            responseText = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
            if (responseText) break;
        } catch (error: any) {
            console.warn(`FONT MATCHER retryable error for ${modelName}:`, error.message);
            lastError = error;
        }
    }

    if (!responseText) return "font-noto-sans";

    // キーのみを抽出
    const validFonts = ["font-noto-serif", "font-noto-sans", "font-yuji", "font-inter", "font-playfair", "font-bebas"];
    const matched = validFonts.find(f => responseText.includes(f));

    return matched || "font-notosans";
}

/**
 * 高精度AI翻訳 (飲食店・おもてなし・美食に特化)
 */
export async function translateToEnglish(text: string, context: string = "general") {
    if (!text) return "";

    const targetModels = [AI_POLICY.PRIMARY, AI_POLICY.SECONDARY];
    let responseText: string | null = null;
    let lastError: any = null;

    // 文脈に応じたプロンプト調整
    let contextNote = "";
    if (context === "catchphrase") {
        contextNote = "これは店舗のキャッチコピーです。単なる直訳ではなく、海外の高級レストランやグルメ誌のような、読んだだけで食欲をそそる（Appetizing）で格式高い表現にしてください。";
    } else if (context === "menu") {
        contextNote = "これはメニュー項目です。食材の魅力が伝わる自然な英語にしてください。";
    }

    const prompt = `
あなたは世界的に評価される美食ガイド（ミシュランや50 Best Restaurants等）の専属エディターであり、プロの翻訳家です。
以下の日本語を、海外の美食家や観光客が魅了されるような「最高精度の英語」に翻訳してください。

【制約事項】
- 直訳は厳禁です。英語圏の高級飲食店で実際に使われる、洗練された語彙（Sophisticated vocabulary）を使用してください。
- 文脈を読み取り、おもてなしの心（Hospitality）が伝わるトーンにしてください。
- ${contextNote}

【翻訳対象】
${text}

出力は「翻訳後の英語テキストのみ」を返してください。解説や引用符などは一切不要です。
`;

    for (const modelName of targetModels) {
        try {
            const model = getGenerativeModel(modelName);
            const generationConfig: any = {};
            if (modelName === AI_POLICY.PRIMARY) {
                Object.assign(generationConfig, AI_POLICY.THINKING_CONFIG_LOW);
            }

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig
            });

            const response = (result as any).response;
            responseText = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
            if (responseText) break;
        } catch (error: any) {
            console.warn(`TRANSLATION error for ${modelName}:`, error.message);
            lastError = error;
        }
    }

    return responseText || text; // 失敗時は原文を返す
}
