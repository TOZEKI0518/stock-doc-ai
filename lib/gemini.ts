import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

function cleanJsonText(text: string) {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

async function runModel(modelName: string, prompt: string, genAI: GoogleGenerativeAI) {
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(cleanJsonText(text));
}

export async function analyzeStockWithAI(stockData: any) {
  if (!apiKey) {
    return {
      summary: "GEMINI_API_KEYが設定されていません。",
      whyUp: ["環境変数を確認してください。"],
      risks: ["AI分析を実行できません。"],
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const prompt = `
あなたは日本株の分析アシスタントです。
以下の銘柄データを個人学習用として分析してください。

注意：
- 投資助言ではなく分析コメントとして書く
- 良い点だけでなくリスクも必ず書く
- 日本語で簡潔に書く
- 必ずJSONのみ返す

銘柄データ：
${JSON.stringify(stockData, null, 2)}

返却JSON形式：
{
  "summary": "AI総評を2〜4文で書く",
  "whyUp": ["注目される理由1", "理由2", "理由3"],
  "risks": ["買ってはいけない理由1", "理由2", "理由3"]
}
`;

  const models = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-1.5-flash",
  ];

  for (const modelName of models) {
    try {
      return await runModel(modelName, prompt, genAI);
    } catch (error) {
      console.error(`${modelName} ERROR:`, error);
    }
  }

  return {
    summary:
      "現在AI分析サーバーが混雑、または無料枠の対象外になっています。株価・PER・PBR・配当利回りなどの基本指標を確認してください。",
    whyUp: ["AI分析を取得できませんでした。"],
    risks: ["AI分析を取得できませんでした。"],
  };
}