export type PhaseKey = "5_6" | "7_8" | "9_11" | "12_18";

export type Phase = { key: PhaseKey; label: string };

export type MealName = "朝" | "昼" | "夕";

export type FoodCategory = "staple" | "veg" | "protein";

/**
 * 目安量のグループ。
 *
 * 厚生労働省「授乳・離乳の支援ガイド(2019年改定版)」の「離乳の進め方の目安」は、
 * たんぱく質を「魚 / 肉 / 豆腐 / 卵 / 乳製品のいずれか」として食材種別ごとに
 * 別々の量で示している(中期なら魚10〜15g・豆腐30〜40g・乳製品50〜70g)。
 * カテゴリ単位で1つの数値しか持たないと、豆腐が少なすぎ魚が多すぎる、という
 * ズレが必ず出るため、食材の種別ごとに目安量を引けるようにする。
 */
export type PortionGroup =
  | "gayu"      // がゆ・軟飯・ご飯（穀類の基準）
  | "noodle"    // うどん・そうめん（ゆで上がり）
  | "bread"     // 食パン
  | "potato"    // いも類（主食として出す場合）
  | "vegetable" // 野菜・果物
  | "fish"      // 魚
  | "meat"      // 肉
  | "tofu"      // 豆腐
  | "natto"     // 納豆
  | "egg_yolk"  // 卵黄のみ
  | "egg_whole" // 全卵
  | "dairy"     // 乳製品（ヨーグルト等）
  | "cheese"    // チーズ（乳製品より少量）
  | "liver"     // レバー（鉄が多く少量で足りる）
  | "mushroom"  // きのこ類（かさが大きく、野菜と同量は多すぎる）
  | "seaweed"   // わかめ等の海藻（戻すと大きく増える）
  | "nori";     // のり（1枚3g程度。他と桁が違う）

/**
 * 1回あたりの目安量。label がある場合は「◯g」の代わりにそれを表示する
 * （卵のように個数で示すのが自然なものに使う）。
 */
export type Portion = { grams: number; label?: string };

export type PlanItem = {
  cat: FoodCategory;
  ingredientId: string;
  text: string;
  grams: number;
  /** grams の代わりに表示する量の表記（例: 「卵黄1個〜全卵1/3個」） */
  amountLabel?: string;
  tip?: string; // 食べさせ方の工夫（ある場合のみ）
};

export type MealPlan = {
  name: MealName;
  items: PlanItem[];
  totalGrams: number;
  recipeName?: string; // レシピから生成された場合のみ（一品の料理名）
  recipeNote?: string; // レシピのひとことコツ（ある場合のみ）
};

// ===== オフラインの簡易レシピライブラリ =====
// 複数食材を組み合わせた「一品」として提案するための最小限のデータ。
// 各食材はそのステージの安全フィルタ(アレルゲン・卒業判定・苦手食材)を
// 独立提案の食材と同じ基準で通ったものだけが使われる（generateSuggestion参照）。
export type Recipe = {
  id: string;
  name: string;
  stage: PhaseKey; // このレシピを提案してよい唯一のステージ
  ingredientIds: string[]; // INGREDIENT_MASTER内のid。stage="5_6"は2品(staple+veg)、それ以外は3品(staple+veg+protein)
  note?: string; // 合わせ技としてのひとことコツ（任意）
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
  // 「再生成」を押した回数。乱数シードに混ぜており、これが無いと同じ日付・
  // 同じステージでは常に同じ献立になってしまう（＝再生成しても何も変わらない）。
  revision?: number;
  // 離乳食開始からの日数に基づく進行段階（開始日が未設定なら undefined）
  weaningStepLabel?: string;
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

// ステージごとの調理情報。cookは必須（チップ表示に使う調理法・形状の一文）、
// prep/tipは任意（下ごしらえの注意点／食べさせ方の工夫。無い場合は書かない）。
export type StageForm = {
  cook: string;
  prep?: string;
  tip?: string;
};

export type Ingredient = {
  id: string;
  name: string;
  category: IngredientCategory;
  earliestStage: PhaseKey;
  allergens: Allergen[];
  // ステージ別の調理情報（未定義のステージでは登場させない食材もあるため optional）
  stageForms: Partial<Record<PhaseKey, StageForm>>;
  // 目安量のグループ。未指定ならカテゴリから推定される（ingredients.ts参照）。
  portionGroup?: PortionGroup;
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
