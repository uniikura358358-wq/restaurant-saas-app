"use server";

import { getGenerativeModel, AI_POLICY } from "@/lib/vertex-ai";
import { ChatMessage, PopState } from "@/types/pop-maker";

/**
 * AIとのデザイン対話アシスタント
 */
export async function chatWithPopAssistant(params: {
    messages: ChatMessage[];
    currentPopState: PopState;
    planName?: string;
}) {
    const targetModel = AI_POLICY.PRIMARY;

    const isPro = params.planName?.toLowerCase().includes("pro") || params.planName?.toLowerCase().includes("premium");

    // システムプロンプトの構築
    const systemPrompt = `
あなたの役割は、世界数万件の「売れるメニュー」から導き出されたデザインの黄金律を自在に操る「メタ・デザイナー」です。

【コア・インテリジェンス】
1. **コンテキスト認識**: ユーザーがアップロードした画像やテキストから、商品のカテゴリ（ラーメン、ステーキ、カフェ等）を即座に特定します。
2. **ドメイン特化参照**: 特定したカテゴリ（例：ラーメン）に対応する、世界中の「最も注文を誘発するデザインパターン」を数百万のDBから引用し、最適なレイアウトやフォント（例：和風なら力強い筆文字）を決定します。
3. **オリジナル昇華**: 成功事例のエッセンスのみを抽出し・融合させることで、著作権的にクリーンかつ、圧倒的なプロ品質を誇るデザインを提案してください。

${isPro
            ? "【最重要：感動レベル（PRO）】想像を超える、芸術的なレイアウト。料理の特性に応じた「究極の視線誘導」と、ナノバナナによる独創的な背景補完、多階層の奥行き演出をフル活用してください。"
            : "【最重要：プロ品質（Standard）】お店の信頼を高める「正解」のデザイン。ジャンルごとの王道パターンを適用し、清潔感と視認性を極限まで高めてください。"
        }
        

【プロ級デザインの３原則】
1. **視認性と高級感の両立**: 文字には適切な「shadow（影）」や「stroke（縁取り）」を使い、背景に埋もれないようにします。
2. **奥行きの演出**: 「glass: true」を使い、文字の背後に半透明の磨りガラスパネルを配置することで、写真の良さを活かしつつ可読性を極限まで高めます。
3. **装飾のアクセント**: 「decorations」レイヤーを使い、赤い「リボン（ribbon）」や「金色のシール（seal）」、「筆跡（brush）」などを配置して、限定感やこだわりを視覚的に伝えます。

【現在のデザイン状態】
${JSON.stringify(params.currentPopState, null, 2)}

【出力JSONの拡張仕様】
- "catchphrase", "productName", "price", "description" の各オブジェクトに以下を追加可能：
  - "shadow": "2px 2px 4px rgba(0,0,0,0.5)" (影。ラグジュアリーなら必須)
  - "stroke": "1px #ffffff" (縁取り。背景と同系色の文字を際立たせる)
  - "glass": true (背景をぼかしたパネルを敷く。現代的でクリーンなデザインに有効)
  - "letterSpacing": "0.1em", "lineHeight": "1.4"
- "decorations": [
    { "type": "ribbon" | "seal" | "badge" | "brush" | "circle", "text": "...", "x": number, "y": number, "scale": number, "rotate": number, "color": "hex", "layer": "front" | "back" }
  ]
  - "ribbon": 赤いリボン（お勧め・期間限定用）
  - "seal": 金色の丸いシール（価格や賞の強調用）
  - "badge": 黒い小さなバッジ（カテゴリー用）
  - "brush": 文字の背後に敷く淡い筆跡（和風や手書き感の演出用。layer: "back" 推奨）

【制約事項】
- 返信の最後には必ず、更新後のデザインデータを \`\`\`json ... \`\`\` ブロックで含めてください。
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
        const contents = params.messages.map((msg: any) => {
            const parts: any[] = [{ text: msg.content }];
            if (msg.images && msg.images.length > 0) {
                msg.images.forEach((img: string) => {
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

        // システム命令を先頭に追加（あるいは専用のsystemInstructionがあればそれを使うが、contents의 最初に入れる）
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

        // JSONが含まれている場合、必要に応じて背景画像もナノバナナで生成
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/\{[\s\S]*\}/);
        let finalGeneratedBackground = null;

        if (jsonMatch) {
            try {
                const data = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                // 全プラン共通でナノバナナを駆動（お店に出せるレベルにするため）
                const { generateImageWithNanoBanana } = await import("@/app/actions/image-gen");

                let bgPrompt = "";
                const productName = data.productName || params.currentPopState.productName || "Special Dish";

                if (isPro) {
                    bgPrompt = `A breathtaking, Michelin-star level artistic menu background for "${productName}". Dramatic cinematic lighting, high-end restaurant aesthetic, perfect for professional POP design, sophisticated colors, ample copy space.`;
                } else {
                    bgPrompt = `A professional and clean restaurant menu background for "${productName}". High-quality commercial food photography style, aesthetic lighting, elegant texture, ample space for text.`;
                }

                const bgResult = await generateImageWithNanoBanana(bgPrompt);
                if (bgResult.success) {
                    finalGeneratedBackground = bgResult.url;
                }
            } catch (e) {
                console.warn("Background generation skipped in chat:", e);
            }
        }

        return {
            content: responseText,
            generatedBackground: finalGeneratedBackground,
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
