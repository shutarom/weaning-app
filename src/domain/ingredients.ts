import type { Ingredient } from "./types";

// baby-meal-planner (Gemini CLI版) の食材マスターを移植。
// idはローカルの安定キー（Firestoreのドキュメント名にもそのまま使う）。
export const INGREDIENT_MASTER: Ingredient[] = [
  // 炭水化物
  { id: "gayu_10", name: "10倍がゆ", category: "carb", earliestStage: "5_6", allergenRisk: false },
  { id: "gayu_7", name: "7倍がゆ", category: "carb", earliestStage: "7_8", allergenRisk: false },
  { id: "gayu_5", name: "5倍がゆ", category: "carb", earliestStage: "9_11", allergenRisk: false },
  { id: "nanhan", name: "軟飯", category: "carb", earliestStage: "12_18", allergenRisk: false },
  { id: "shokupan", name: "食パン (小麦)", category: "carb", earliestStage: "7_8", allergenRisk: true },
  { id: "udon", name: "うどん (小麦)", category: "carb", earliestStage: "7_8", allergenRisk: true },
  { id: "somen", name: "そうめん (小麦)", category: "carb", earliestStage: "7_8", allergenRisk: true },
  { id: "satsumaimo", name: "さつまいも", category: "carb", earliestStage: "5_6", allergenRisk: false },
  { id: "jagaimo", name: "じゃがいも", category: "carb", earliestStage: "5_6", allergenRisk: false },

  // ビタミン・ミネラル
  { id: "ninjin", name: "にんじん", category: "vitamin", earliestStage: "5_6", allergenRisk: false },
  { id: "kabocha", name: "かぼちゃ", category: "vitamin", earliestStage: "5_6", allergenRisk: false },
  { id: "hourensou", name: "ほうれん草", category: "vitamin", earliestStage: "5_6", allergenRisk: false },
  { id: "broccoli", name: "ブロッコリー", category: "vitamin", earliestStage: "5_6", allergenRisk: false },
  { id: "daikon", name: "大根", category: "vitamin", earliestStage: "5_6", allergenRisk: false },
  { id: "cabbage", name: "キャベツ", category: "vitamin", earliestStage: "5_6", allergenRisk: false },
  { id: "tamanegi", name: "玉ねぎ", category: "vitamin", earliestStage: "5_6", allergenRisk: false },
  { id: "tomato", name: "トマト", category: "vitamin", earliestStage: "7_8", allergenRisk: false },
  { id: "ringo", name: "りんご", category: "vitamin", earliestStage: "5_6", allergenRisk: false },
  { id: "banana", name: "バナナ", category: "vitamin", earliestStage: "5_6", allergenRisk: false },

  // タンパク質
  { id: "tofu", name: "豆腐 (大豆)", category: "protein", earliestStage: "5_6", allergenRisk: true },
  { id: "kinako", name: "きな粉 (大豆)", category: "protein", earliestStage: "7_8", allergenRisk: true },
  { id: "natto", name: "納豆 (大豆)", category: "protein", earliestStage: "7_8", allergenRisk: true },
  { id: "shirasu", name: "しらす干し", category: "protein", earliestStage: "5_6", allergenRisk: false },
  { id: "shiromizakana", name: "白身魚 (たら・タイ等)", category: "protein", earliestStage: "5_6", allergenRisk: false },
  { id: "ranou", name: "卵黄", category: "protein", earliestStage: "7_8", allergenRisk: true },
  { id: "zenran", name: "全卵", category: "protein", earliestStage: "9_11", allergenRisk: true },
  { id: "yogurt", name: "ヨーグルト (乳)", category: "protein", earliestStage: "7_8", allergenRisk: true },
  { id: "sasami", name: "鶏ささみ", category: "protein", earliestStage: "7_8", allergenRisk: false },
  { id: "sake", name: "鮭", category: "protein", earliestStage: "9_11", allergenRisk: false },
  { id: "tsuna", name: "ツナ缶 (水煮)", category: "protein", earliestStage: "9_11", allergenRisk: false },
  { id: "torihikiniku", name: "鶏ひき肉", category: "protein", earliestStage: "9_11", allergenRisk: false },
  { id: "gyubutahikiniku", name: "牛・豚ひき肉", category: "protein", earliestStage: "12_18", allergenRisk: false },

  // その他
  { id: "dashijiru", name: "だし汁", category: "other", earliestStage: "5_6", allergenRisk: false },
  { id: "yasaisoup", name: "野菜スープ", category: "other", earliestStage: "5_6", allergenRisk: false },
  { id: "gyunyu", name: "牛乳 (飲用)", category: "other", earliestStage: "12_18", allergenRisk: true },
];

export const INGREDIENT_CATEGORY_LABEL: Record<Ingredient["category"], string> = {
  carb: "炭水化物",
  protein: "タンパク質",
  vitamin: "ビタミン・ミネラル",
  other: "その他",
};
