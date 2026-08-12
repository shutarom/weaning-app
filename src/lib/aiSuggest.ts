import { getGenerativeModel } from "firebase/ai";
import { ai } from "./firebase";
import type { AiSuggestionResult, Phase } from "../domain/types";

const model = getGenerativeModel(ai, {
  model: "gemini-2.5-flash",
  generationConfig: { responseMimeType: "application/json" },
});

function buildPrompt(params: {
  ageMonths: number;
  phase: Phase;
  allergies: string[];
  safeIngredients: string[];
  notTriedIngredients: string[];
  fridgeIngredients: string[];
}): string {
  const { ageMonths, phase, allergies, safeIngredients, notTriedIngredients, fridgeIngredients } = params;
  const join = (list: string[]) => (list.length ? list.join(", ") : "なし");

  return `
あなたはプロの離乳食管理栄養士です。以下の条件を満たす赤ちゃんの離乳食メニューを3つ提案してください。

【対象の赤ちゃん情報】
- 月齢: ${ageMonths}ヶ月
- 離乳食ステージ: ${phase.label}
- アレルギー食材: ${join(allergies)} (※絶対にレシピに含まないでください)
- クリア済み安全食材: ${join(safeIngredients)}
- 未試行の食材リスト: ${join(notTriedIngredients)}
- 冷蔵庫にある使いたい食材: ${join(fridgeIngredients)}

【レシピ提案ルール】
1. 指定されたステージに適した食材の大きさ、硬さ、調理法にしてください。
   - 初期(5-6ヶ月): とろとろのペースト状、裏ごししたもの。
   - 中期(7-8ヶ月): 舌でつぶせる豆腐くらいの硬さ、2〜3mmのみじん切り。
   - 後期(9-11ヶ月): 歯ぐきでつぶせるバナナくらいの硬さ、5〜8mmの角切り。
   - 完了期(12-18ヶ月): 歯ぐきで噛み切れる肉団子くらいの硬さ、手づかみしやすい工夫。
2. アレルギー食材は完全に排除してください。
3. すでに安全とわかっている食材、または冷蔵庫にある食材を組み合わせてください。
4. 新しい食材を試したい場合は「未試行の食材リスト」から【最大1種類のみ】を少量含めることができます。どの新食材を含めたかをレシピのポイントに明記してください。
5. 味付けは基本的に極薄味（ステージ初期〜中期は出汁やスープのみ、後期・完了期は醤油や塩を数滴程度）にしてください。

【返却フォーマット】
以下のJSONフォーマットで出力してください。その他の説明テキストは一切含めないでください。

{
  "stage": "ステージ名と月齢目安の日本語文字列",
  "message": "親御さんへの温かい応援メッセージや、このステージの調理のアドバイス(日本語)",
  "recipes": [
    {
      "menu_title": "メニュー名(日本語)",
      "category": "カテゴリ(carb, protein, vitamin, combined のいずれか)",
      "ingredients_list": ["材料名1", "材料名2"],
      "instructions": "1. 調理ステップ1\\n2. 調理ステップ2\\n3. 調理ステップ3 (改行文字を含める)",
      "point": "調理のコツやアレルギー対応、新しい食材に関するアドバイス(日本語)"
    }
  ]
}
`.trim();
}

type RawRecipe = {
  menu_title: string;
  category: string;
  ingredients_list: string[];
  instructions: string;
  point: string;
};
type RawResult = { stage: string; message: string; recipes: RawRecipe[] };

export async function suggestMenu(params: {
  ageMonths: number;
  phase: Phase;
  allergies: string[];
  safeIngredients: string[];
  notTriedIngredients: string[];
  fridgeIngredients: string[];
}): Promise<AiSuggestionResult> {
  const prompt = buildPrompt(params);
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const raw = JSON.parse(text) as RawResult;

  return {
    stage: raw.stage,
    message: raw.message,
    recipes: raw.recipes.map((r) => ({
      menuTitle: r.menu_title,
      category: (["carb", "protein", "vitamin", "combined"] as const).includes(r.category as never)
        ? (r.category as AiSuggestionResult["recipes"][number]["category"])
        : "combined",
      ingredientsList: r.ingredients_list,
      instructions: r.instructions,
      point: r.point,
    })),
  };
}
