import { GoogleGenAI } from "@google/genai";

const PROJECT_ID = "restaurant-saas-2026";
const LOCATION = "global";

// 常用はFlash推奨（安い）
const MODEL = "gemini-3-flash-preview";
// Proで試したい時は上をコメントアウトして下を使う
// const MODEL = "gemini-3.1-pro-preview";

const PROMPT = "TypeScriptで add(a,b) 関数を1つ。説明は3行以内。";

const ai = new GoogleGenAI({
  vertexai: true,
  project: PROJECT_ID,
  location: LOCATION,
});

function lowCostConfig(model) {
  // Gemini 3系は thinkingLevel を使う
  if (/gemini-3/i.test(model)) {
    return {
      temperature: 0.2,
      topP: 0.9,
      candidateCount: 1,
      maxOutputTokens: 1200,
      thinkingConfig: {
        thinkingLevel: /flash/i.test(model) ? "MINIMAL" : "LOW"
      }
    };
  }

  // 保険（2.5系など）
  return {
    temperature: 0.2,
    topP: 0.9,
    candidateCount: 1,
    maxOutputTokens: 1200
  };
}

async function main() {
  const config = lowCostConfig(MODEL);

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: PROMPT,
    config,
  });

  console.log("=== REQUEST ===");
  console.log({ MODEL, config });

  console.log("\n=== TEXT ===");
  console.log(response.text ?? "(no text)");

  console.log("\n=== USAGE ===");
  console.log(response.usageMetadata ?? null);

  console.log("\n=== MODEL VERSION ===");
  console.log(response.modelVersion ?? null);
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});

