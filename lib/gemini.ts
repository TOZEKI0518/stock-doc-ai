import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

function cleanJsonText(text: string) {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}

export async function analyzeStockWithAI(stockData: any) {
  if (!apiKey) {
    return null;
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const prompt = `
あなたは日本株の分析アシスタントです。
以下の銘柄データを、個人学習用として分析してください。

注意：
- 投資助言ではなく、分析コメントとして書く
- 良い点だけでなく、買ってはいけない理由も必ず書く
- 日本語で簡潔に書く
- JSONのみ返す

銘柄データ：
${JSON.stringify(stockData, null, 2)}

返却JSON形式：
{
  "summary": "AI総評を2〜4文で書く",
  "whyUp": ["上がった理由または注目される理由1", "理由2", "理由3"],
  "risks": ["買ってはいけない理由1", "理由2", "理由3"]
}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(cleanJsonText(text));
  } catch (error) {
    console.error("GEMINI ERROR:", error);

    return {
      summary:
        "AI分析の生成に失敗しました。株価・PER・PBR・配当利回りなどの基本指標を確認してください。",
      whyUp: ["AI分析を取得できませんでした。"],
      risks: ["AI分析を取得できませんでした。"],
    };
  }
}