export type PhaseKey = "5_6" | "7_8" | "9_11" | "12_18";

export type Phase = { key: PhaseKey; label: string };

export type MealName = "朝" | "昼" | "夕";

export type FoodCategory = "staple" | "veg" | "protein";

export type PlanItem = {
  cat: FoodCategory;
  ingredientId: string;
  text: string;
  grams: number;
};

export type MealPlan = {
  name: MealName;
  items: PlanItem[];
  totalGrams: number;
};

export type DailyPlan = {
  dateIso: string;
  phase: Phase;
  guideNote: string;
  seed: number;
  adjustFactor: number;
  meals: MealPlan[];
  version: number;
  insight?: string;
  avoidedFoods?: string[];
};

// 提案以外の食材・メモを自由に追加できるエントリ
export type FreeEntry = {
  id: string;
  name: string;       // 食材名 or メモ
  grams?: number;     // 任意
  updatedAt: number;
};

export type MealLog = {
  eatenRatio?: number;    // 提案に対して食べた割合 0..1
  actualGrams?: number;
  memo?: string;
  freeEntries?: FreeEntry[];  // 自由入力した食材
  updatedAt?: number;
};

export type DailyLog = {
  dateIso: string;
  meals: Partial<Record<MealName, MealLog>>;
  dayMemo?: string;
  updatedAt?: number;
};

// 消費者庁「特定原材料等」のうち離乳食で登場しうるもの
export type Allergen =
  | "egg" | "milk" | "wheat" | "soy" | "peanut"
  | "walnut" | "buckwheat" | "shrimp" | "crab" | "fish" | "sesame";

// ===== 赤ちゃんプロフィール（世帯単位でFirestore同期） =====
export type BabyProfile = {
  birthdayIso: string;
  weaningStartIso: string;
  allergies: string[];       // 自由入力（表示用・後方互換）
  allergenTags: Allergen[];  // 提案フィルタで実際に使うタグ
  updatedAt?: number;
};

// ===== 食材マスター・ステータス =====
export type IngredientCategory = "carb" | "protein" | "vitamin" | "other";

export type Ingredient = {
  id: string;
  name: string;
  category: IngredientCategory;
  earliestStage: PhaseKey;
  allergens: Allergen[];
  // ステージ別の形状・調理法（未定義のステージでは登場させない食材もあるため optional）
  stageForms: Partial<Record<PhaseKey, string>>;
  // true の場合、食材チェック・印刷記録には出るが日次提案(generateSuggestion)では
  // 自動的に提案しない。えび・かに・そば・くるみのように離乳食期には積極的に
  // 勧められない食材や、ごま・きな粉のように「ひとつまみ」レベルの薬味であって
  // 主菜1食分(20〜40g)として提案するのが不適切な食材に使う。
  neverSuggest?: boolean;
};

export type IngredientStatusValue = "not_tried" | "safe" | "allergic";

export type IngredientStatus = {
  status: IngredientStatusValue;
  notes?: string;
  firstTriedAtIso?: string;   // 初回摂取日（"safe"に初めてした時に自動設定、後から編集可）
  amountNote?: string;        // 摂取量の目安（例: 「小さじ1」）
  symptom?: string;           // 症状（アレルギー反応があった場合）
  onsetMinutes?: number;      // 摂取〜発症までの分数
  hospitalVisited?: boolean;  // 受診したか
  updatedAt?: number;
};

// ===== AI献立提案 =====
export type AiRecipe = {
  menuTitle: string;
  category: "carb" | "protein" | "vitamin" | "combined";
  ingredientsList: string[];
  instructions: string;
  point: string;
};

export type AiSuggestionResult = {
  stage: string;
  message: string;
  recipes: AiRecipe[];
};
