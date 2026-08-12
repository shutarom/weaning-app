import { describe, it, expect } from "vitest";
import { generateSuggestion, calcFoodScores, summarizePreferences, PLAN_SCHEMA_VERSION } from "./suggestionEngine";
import { INGREDIENT_MASTER } from "./ingredients";
import type { DailyLog, DailyPlan, IngredientStatus } from "./types";

const idToIngredient = new Map(INGREDIENT_MASTER.map((i) => [i.id, i]));

function allIngredientIdsInPlan(plan: DailyPlan): string[] {
  return plan.meals.flatMap((m) => m.items.map((i) => i.ingredientId));
}

describe("generateSuggestion — アレルゲン除外", () => {
  it("卵アレルギーを登録すると、卵黄・全卵を含む食材は一切提案されない", () => {
    for (let day = 1; day <= 20; day++) {
      const dateIso = `2026-03-${String(day).padStart(2, "0")}`;
      const plan = generateSuggestion({
        dateIso,
        ageMonths: 10, // 後期・3食・タンパク質あり
        recentLogs: [],
        allergenTags: ["egg"],
      });
      for (const id of allIngredientIdsInPlan(plan)) {
        const ing = idToIngredient.get(id);
        expect(ing?.allergens).not.toContain("egg");
      }
    }
  });

  it("食材チェックで allergic 登録した食材は提案されない", () => {
    const ingredientStatuses: Record<string, IngredientStatus> = {
      sasami: { status: "allergic" },
    };
    for (let day = 1; day <= 20; day++) {
      const dateIso = `2026-03-${String(day).padStart(2, "0")}`;
      const plan = generateSuggestion({
        dateIso,
        ageMonths: 8,
        recentLogs: [],
        ingredientStatuses,
      });
      expect(allIngredientIdsInPlan(plan)).not.toContain("sasami");
    }
  });

  it("複数アレルゲンを登録しても候補が尽きずクラッシュしない", () => {
    const dateIso = "2026-03-01";
    expect(() =>
      generateSuggestion({
        dateIso,
        ageMonths: 6,
        recentLogs: [],
        allergenTags: ["egg", "milk", "wheat", "soy", "fish"],
      })
    ).not.toThrow();
  });
});

describe("generateSuggestion — neverSuggest食材の除外", () => {
  it("neverSuggest: trueの食材(ごま・えび・かに・そば・くるみ等)は月齢に関わらず提案されない", () => {
    const neverSuggestIds = new Set(
      INGREDIENT_MASTER.filter((i) => i.neverSuggest).map((i) => i.id)
    );
    expect(neverSuggestIds.size).toBeGreaterThan(0);

    for (const ageMonths of [5, 8, 10, 15]) {
      for (let day = 1; day <= 15; day++) {
        const dateIso = `2026-04-${String(day).padStart(2, "0")}`;
        const plan = generateSuggestion({ dateIso, ageMonths, recentLogs: [] });
        for (const id of allIngredientIdsInPlan(plan)) {
          expect(neverSuggestIds.has(id)).toBe(false);
        }
      }
    }
  });
});

describe("generateSuggestion — 月齢に応じた食材制限", () => {
  it("初期(5-6ヶ月)には小麦・大豆・卵・魚などまだ早い食材が出ない", () => {
    for (let day = 1; day <= 20; day++) {
      const dateIso = `2026-03-${String(day).padStart(2, "0")}`;
      const plan = generateSuggestion({ dateIso, ageMonths: 5, recentLogs: [] });
      for (const id of allIngredientIdsInPlan(plan)) {
        const ing = idToIngredient.get(id)!;
        expect(ing.stageForms["5_6"]).toBeDefined();
      }
    }
  });

  it("初期(5-6ヶ月)はタンパク質カテゴリの品目を出さない(itemsPerMealの仕様)", () => {
    const plan = generateSuggestion({ dateIso: "2026-03-01", ageMonths: 5, recentLogs: [] });
    for (const meal of plan.meals) {
      for (const item of meal.items) {
        expect(item.cat).not.toBe("protein");
      }
    }
  });

  it("完了期(12-18ヶ月)には卒業した10倍がゆが出ない", () => {
    for (let day = 1; day <= 20; day++) {
      const dateIso = `2026-03-${String(day).padStart(2, "0")}`;
      const plan = generateSuggestion({ dateIso, ageMonths: 15, recentLogs: [] });
      expect(allIngredientIdsInPlan(plan)).not.toContain("gayu_10");
    }
  });
});

describe("generateSuggestion — 決定性と基本構造", () => {
  it("同じ入力なら同じ提案が生成される(シード決定的)", () => {
    const params = { dateIso: "2026-03-05", ageMonths: 9, recentLogs: [] };
    const a = generateSuggestion(params);
    const b = generateSuggestion(params);
    expect(a).toEqual(b);
  });

  it("生成されたプランは現在のスキーマバージョンを持つ", () => {
    const plan = generateSuggestion({ dateIso: "2026-03-05", ageMonths: 9, recentLogs: [] });
    expect(plan.version).toBe(PLAN_SCHEMA_VERSION);
  });

  it("各PlanItemはingredientIdを持ち、食材マスターに存在する", () => {
    const plan = generateSuggestion({ dateIso: "2026-03-05", ageMonths: 9, recentLogs: [] });
    for (const id of allIngredientIdsInPlan(plan)) {
      expect(idToIngredient.has(id)).toBe(true);
    }
  });
});

describe("calcFoodScores — 学習ループ", () => {
  function syntheticPlan(dateIso: string, vegIngredientId: string): DailyPlan {
    return {
      dateIso,
      phase: { key: "5_6", label: "初期(5-6ヶ月)" },
      guideNote: "",
      seed: 1,
      adjustFactor: 1,
      version: PLAN_SCHEMA_VERSION,
      meals: [
        {
          name: "朝",
          items: [{ cat: "veg", ingredientId: vegIngredientId, text: "", grams: 20 }],
          totalGrams: 20,
        },
      ],
    };
  }

  it("2回以上ほぼ食べなかった食材は平均食べた割合が0.35未満になる", () => {
    const recentPlans = [
      syntheticPlan("2026-03-08", "ninjin"),
      syntheticPlan("2026-03-09", "ninjin"),
    ];
    const recentLogs: DailyLog[] = [
      { dateIso: "2026-03-08", meals: { 朝: { eatenRatio: 0.1 } } },
      { dateIso: "2026-03-09", meals: { 朝: { eatenRatio: 0.1 } } },
    ];
    const scores = calcFoodScores(recentLogs, recentPlans);
    const score = scores.get("ninjin");
    expect(score).toBeDefined();
    expect(score!.count).toBe(2);
    expect(score!.totalRatio / score!.count).toBeLessThan(0.35);
  });

  it("苦手食材は他に候補がある限り、以後の提案から確実に除外される", () => {
    const recentPlans = [
      syntheticPlan("2026-03-08", "ninjin"),
      syntheticPlan("2026-03-09", "ninjin"),
    ];
    const recentLogs: DailyLog[] = [
      { dateIso: "2026-03-08", meals: { 朝: { eatenRatio: 0.1 } } },
      { dateIso: "2026-03-09", meals: { 朝: { eatenRatio: 0.1 } } },
    ];
    for (let day = 10; day <= 28; day++) {
      const dateIso = `2026-03-${String(day).padStart(2, "0")}`;
      const plan = generateSuggestion({ dateIso, ageMonths: 6, recentLogs, recentPlans });
      expect(allIngredientIdsInPlan(plan)).not.toContain("ninjin");
    }
  });

  it("旧バージョン(ingredientIdなし)のプランは集計をスキップする", () => {
    const legacyPlan = {
      dateIso: "2026-03-01",
      phase: { key: "5_6", label: "初期(5-6ヶ月)" },
      guideNote: "",
      seed: 1,
      adjustFactor: 1,
      version: 2,
      meals: [
        {
          name: "朝" as const,
          items: [{ cat: "veg" as const, text: "にんじん", grams: 20 } as unknown as { cat: "veg"; ingredientId: string; text: string; grams: number }],
          totalGrams: 20,
        },
      ],
    };
    const logs: DailyLog[] = [{ dateIso: "2026-03-01", meals: { 朝: { eatenRatio: 1 } } }];
    expect(() => calcFoodScores(logs, [legacyPlan as unknown as DailyPlan])).not.toThrow();
    const scores = calcFoodScores(logs, [legacyPlan as unknown as DailyPlan]);
    expect(scores.size).toBe(0);
  });
});

describe("summarizePreferences — AI提案への学習結果の受け渡し", () => {
  function syntheticPlan(dateIso: string, vegIngredientId: string): DailyPlan {
    return {
      dateIso,
      phase: { key: "5_6", label: "初期(5-6ヶ月)" },
      guideNote: "",
      seed: 1,
      adjustFactor: 1,
      version: PLAN_SCHEMA_VERSION,
      meals: [
        {
          name: "朝",
          items: [{ cat: "veg", ingredientId: vegIngredientId, text: "", grams: 20 }],
          totalGrams: 20,
        },
      ],
    };
  }

  it("苦手・好きな食材を食材名(表示名)として返す", () => {
    const recentPlans = [
      syntheticPlan("2026-03-08", "ninjin"),
      syntheticPlan("2026-03-09", "ninjin"),
      syntheticPlan("2026-03-10", "banana"),
      syntheticPlan("2026-03-11", "banana"),
    ];
    const recentLogs: DailyLog[] = [
      { dateIso: "2026-03-08", meals: { 朝: { eatenRatio: 0.1 } } },
      { dateIso: "2026-03-09", meals: { 朝: { eatenRatio: 0.1 } } },
      { dateIso: "2026-03-10", meals: { 朝: { eatenRatio: 1 } } },
      { dateIso: "2026-03-11", meals: { 朝: { eatenRatio: 1 } } },
    ];
    const { liked, disliked } = summarizePreferences(recentLogs, recentPlans);
    expect(disliked).toContain("にんじん");
    expect(liked).toContain("バナナ");
  });

  it("記録がなければ空配列を返す", () => {
    const { liked, disliked } = summarizePreferences([], []);
    expect(liked).toEqual([]);
    expect(disliked).toEqual([]);
  });
});
