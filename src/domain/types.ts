export type PhaseKey = "5_6" | "7_8" | "9_11" | "12_18";

export type Phase = { key: PhaseKey; label: string };

export type MealName = "朝" | "昼" | "夕";

export type FoodCategory = "staple" | "veg" | "protein";

export type PlanItem = {
  cat: FoodCategory;
  text: string;        // 例: "10倍がゆ（ペースト）"
  grams: number;       // 提案量
};

export type MealPlan = {
  name: MealName;
  items: PlanItem[];
  totalGrams: number;
};

export type DailyPlan = {
  dateIso: string;         // YYYY-MM-DD
  phase: Phase;
  guideNote: string;
  seed: number;
  adjustFactor: number;
  meals: MealPlan[];
  version: number;         // ロジック更新に備えて
};

export type MealLog = {
  eatenRatio?: number;     // 0..1
  actualGrams?: number;    // 合計g
  memo?: string;
  updatedAt?: number;      // ms
};

export type DailyLog = {
  dateIso: string;
  meals: Partial<Record<MealName, MealLog>>;
  dayMemo?: string;
  updatedAt?: number;
};
