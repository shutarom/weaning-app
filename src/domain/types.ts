export type PhaseKey = "5_6" | "7_8" | "9_11" | "12_18";

export type Phase = { key: PhaseKey; label: string };

export type MealName = "朝" | "昼" | "夕";

export type FoodCategory = "staple" | "veg" | "protein";

export type PlanItem = {
  cat: FoodCategory;
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
