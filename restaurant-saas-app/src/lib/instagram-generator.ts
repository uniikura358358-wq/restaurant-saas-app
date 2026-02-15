// 解析用プロンプトの論理構造

import type { ToneConfigData } from "@/app/settings/store/page";

export type InstagramAnalysisResult = {
    dish_name: string;
    visual_features: string;
    key_ingredients: string[];
    suggested_hashtags_base: string[];
};

function getToneInstruction(aiTone: string) {
    switch (aiTone) {
        case "polite":
            return "丁寧で上品。敬語ベース。";
        case "friendly":
            return "親しみやすく、距離感は近め。馴れ馴れしすぎない。";
        case "energetic":
            return "明るく元気。テンポよく、ワクワク感を出す。";
        default:
            return "丁寧で上品。敬語ベース。";
    }
}

function getEmojiInstruction(emojiLevel: number) {
    if (emojiLevel <= 0) return "絵文字は使わない。";
    if (emojiLevel === 1) return "絵文字は控えめ（0〜2個程度）。";
    if (emojiLevel === 2) return "絵文字は適度（2〜5個程度）。";
    return "絵文字は多め（5〜8個程度）。";
}

function normalizeHashtag(tag: string) {
    const t = tag.trim();
    if (!t) return "";
    return t.startsWith("#") ? t : `#${t}`;
}

export function generateInstagramCaption(params: {
    analysis: InstagramAnalysisResult;
    config: ToneConfigData;
}) {
    const { analysis, config } = params;

    const storeName = (config.store_name || "").trim();
    const storeArea = (config.store_area || "").trim();
    const dishName = (analysis.dish_name || "").trim();

    const baseHashtags = Array.from(
        new Set((analysis.suggested_hashtags_base ?? []).map(normalizeHashtag).filter(Boolean))
    );

    const storeHashtag = storeName ? normalizeHashtag(storeName.replace(/\s+/g, "")) : "";
    const areaHashtag = storeArea ? normalizeHashtag(storeArea.replace(/\s+/g, "")) : "";

    const hashtagsSeed = [
        ...baseHashtags,
        ...(storeHashtag ? [storeHashtag] : []),
        ...(areaHashtag ? [areaHashtag] : []),
    ].filter(Boolean);

    const prompt = `役割: あなたは飲食店「${storeName || "（店舗名未設定）"}」のオーナーで、Instagram の人気アカウント運用者です。\n\n入力: \n- 店舗名: ${storeName || "（未設定）"}\n- エリア: ${storeArea || "（未設定）"}\n- 料理名: ${dishName || "（不明）"}\n- 見た目の特徴: ${analysis.visual_features || "（不明）"}\n- 主要食材: ${(analysis.key_ingredients ?? []).join("、") || "（不明）"}\n- ハッシュタグのベース候補: ${hashtagsSeed.join(" ") || "（なし）"}\n\n制約:\n- トーンは必ず「${config.ai_tone}」。${getToneInstruction(config.ai_tone)}\n- 絵文字レベルは必ず ${config.emoji_level}。${getEmojiInstruction(config.emoji_level)}\n- 読者が「今すぐ食べたい！」と思うような、シズル感のある表現を使う。\n- 文章は簡潔に、最大300文字程度に収める（ハッシュタグ除く）。\n- ハッシュタグは、ベース候補に加え、店舗名やエリアも組み合わせて15個程度生成し、投稿の最後に追記する。\n\n出力: キャプション本文とハッシュタグのみ。余計な説明は書かない。`;

    return prompt;
}