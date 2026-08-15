import { describe, it, expect } from "vitest";
import { generateSuggestion, calcFoodScores, summarizePreferences, phaseFromMonths, PLAN_SCHEMA_VERSION } from "./suggestionEngine";
import { INGREDIENT_MASTER, PORTION_GROUP_BY_ID, ALLERGENS, FRUIT_IDS } from "./ingredients";
import { RECIPE_MASTER } from "./recipes";
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

describe("RECIPE_MASTER — データ整合性", () => {
  it("各レシピの食材はINGREDIENT_MASTERに存在し、そのステージのstageFormsを持つ", () => {
    for (const r of RECIPE_MASTER) {
      for (const id of r.ingredientIds) {
        const ing = idToIngredient.get(id);
        expect(ing, `${r.name}が参照する${id}がINGREDIENT_MASTERに無い`).toBeDefined();
        expect(ing!.stageForms[r.stage], `${r.name}の${id}は${r.stage}のstageFormsが無い`).toBeDefined();
        expect(ing!.neverSuggest, `${r.name}がneverSuggest食材(${id})を参照している`).not.toBe(true);
      }
    }
  });

  it("初期(5_6)は主食+野菜の2品か、たんぱく質を足した3品。それ以外は必ず3品", () => {
    for (const r of RECIPE_MASTER) {
      const cats = r.ingredientIds.map((id) => idToIngredient.get(id)!.category).sort();
      if (r.stage === "5_6") {
        // 2品なら主食+野菜、3品なら主食+野菜+たんぱく質
        expect(
          JSON.stringify(cats) === JSON.stringify(["carb", "vitamin"]) ||
          JSON.stringify(cats) === JSON.stringify(["carb", "protein", "vitamin"]),
          `${r.id} のカテゴリ構成が不正: ${cats.join(",")}`
        ).toBe(true);
      } else {
        expect(cats, `${r.id} のカテゴリ構成が不正`).toEqual(["carb", "protein", "vitamin"]);
      }
    }
  });

  it("1つのレシピに主食が2つ入っていない", () => {
    for (const r of RECIPE_MASTER) {
      const carbs = r.ingredientIds.filter((id) => idToIngredient.get(id)!.category === "carb");
      expect(carbs, `${r.id} に主食が複数ある: ${carbs.join(",")}`).toHaveLength(1);
    }
  });

  it("レシピidと名前が重複していない", () => {
    expect(new Set(RECIPE_MASTER.map((r) => r.id)).size).toBe(RECIPE_MASTER.length);
    expect(new Set(RECIPE_MASTER.map((r) => r.name)).size).toBe(RECIPE_MASTER.length);
  });

  it("同じ食材の組み合わせのレシピが重複していない", () => {
    const combos = RECIPE_MASTER.map((r) => `${r.stage}:${[...r.ingredientIds].sort().join(",")}`);
    expect(new Set(combos).size).toBe(combos.length);
  });

  it("各ステージに献立が単調にならない数のレシピがある", () => {
    for (const stage of ["5_6", "7_8", "9_11", "12_18"] as const) {
      const n = RECIPE_MASTER.filter((r) => r.stage === stage).length;
      expect(n, `${stage} のレシピが少なすぎる (${n}件)`).toBeGreaterThanOrEqual(10);
    }
  });
});

describe("generateSuggestion — レシピ提案", () => {
  it("レシピが選ばれた場合、食材は全てアレルゲン・卒業判定を通っている（独立提案と同じ安全基準）", () => {
    for (let day = 1; day <= 30; day++) {
      const dateIso = `2026-05-${String(day).padStart(2, "0")}`;
      const plan = generateSuggestion({ dateIso, ageMonths: 10, recentLogs: [] });
      for (const meal of plan.meals) {
        if (!meal.recipeName) continue;
        for (const item of meal.items) {
          const ing = idToIngredient.get(item.ingredientId)!;
          expect(ing.stageForms[plan.phase.key]).toBeDefined();
        }
      }
    }
  });

  it("アレルゲンを登録すると、そのアレルゲンを含む食材を使うレシピは一切選ばれない", () => {
    for (let day = 1; day <= 30; day++) {
      const dateIso = `2026-05-${String(day).padStart(2, "0")}`;
      const plan = generateSuggestion({
        dateIso, ageMonths: 10, recentLogs: [], allergenTags: ["fish"],
      });
      for (const id of allIngredientIdsInPlan(plan)) {
        expect(idToIngredient.get(id)?.allergens).not.toContain("fish");
      }
    }
  });

  it("レシピが1つも該当しないステージでも(苦手食材で全滅させても)クラッシュせず独立提案にフォールバックする", () => {
    // 5_6ステージの全レシピはninjin/kabocha/hourensou/daikonのいずれかを含むので、
    // これらを全て苦手に仕立てて候補を消してもクラッシュしないことを確認する。
    const recentPlans: DailyPlan[] = [];
    const recentLogs: DailyLog[] = [];
    for (const [i, id] of ["ninjin", "kabocha", "hourensou", "daikon"].entries()) {
      const dateIso = `2026-06-0${i * 2 + 1}`;
      const dateIso2 = `2026-06-0${i * 2 + 2}`;
      const plan1: DailyPlan = {
        dateIso, phase: { key: "5_6", label: "" }, guideNote: "", seed: 1, adjustFactor: 1,
        version: PLAN_SCHEMA_VERSION,
        meals: [{ name: "朝", items: [{ cat: "veg", ingredientId: id, text: "", grams: 20 }], totalGrams: 20 }],
      };
      const plan2: DailyPlan = { ...plan1, dateIso: dateIso2 };
      recentPlans.push(plan1, plan2);
      recentLogs.push(
        { dateIso, meals: { 朝: { eatenRatio: 0.1 } } },
        { dateIso: dateIso2, meals: { 朝: { eatenRatio: 0.1 } } }
      );
    }
    expect(() =>
      generateSuggestion({ dateIso: "2026-06-10", ageMonths: 5, recentLogs, recentPlans })
    ).not.toThrow();
  });

  it("同じ日付・月齢なら常に同じ提案になる（レシピか独立提案かも含めて決定的）", () => {
    const params = { dateIso: "2026-05-05", ageMonths: 10, recentLogs: [] };
    const a = generateSuggestion(params);
    const b = generateSuggestion(params);
    expect(a).toEqual(b);
  });
});

describe("generateSuggestion — 再生成", () => {
  const base = { dateIso: "2026-03-05", ageMonths: 9, recentLogs: [] };

  it("revisionが違えば別の献立になる（同じだと再生成ボタンが効かない）", () => {
    const first = generateSuggestion({ ...base, revision: 0 });
    // 何度か押せば必ず中身が変わることを確認する
    const laterPlans = [1, 2, 3, 4, 5].map((r) => generateSuggestion({ ...base, revision: r }));
    const changed = laterPlans.some(
      (p) => allIngredientIdsInPlan(p).join(",") !== allIngredientIdsInPlan(first).join(",")
    );
    expect(changed).toBe(true);
  });

  it("同じrevisionなら何度呼んでも同じ献立になる", () => {
    const a = generateSuggestion({ ...base, revision: 3 });
    const b = generateSuggestion({ ...base, revision: 3 });
    expect(a).toEqual(b);
  });

  it("revisionはプランに保存される", () => {
    expect(generateSuggestion({ ...base, revision: 2 }).revision).toBe(2);
  });
});

describe("generateSuggestion — 離乳食開始日からの進行段階", () => {
  // 開始日が設定されている初期(5-6ヶ月)を想定
  const base = { dateIso: "2026-03-05", ageMonths: 5, recentLogs: [] };

  const catsIn = (plan: DailyPlan) =>
    new Set(plan.meals.flatMap((m) => m.items.map((i) => i.cat)));

  it("開始1日目は主食(おかゆ)のみで、野菜もタンパク質も出さない", () => {
    const plan = generateSuggestion({ ...base, weaningDay: 1 });
    expect([...catsIn(plan)]).toEqual(["staple"]);
  });

  it("開始直後の主食は10倍がゆに固定される（じゃがいも等が主食にならない）", () => {
    for (let day = 1; day <= 14; day++) {
      const plan = generateSuggestion({ ...base, weaningDay: day });
      expect(allIngredientIdsInPlan(plan)).toEqual(["gayu_10"]);
    }
  });

  it("開始1日目は1回食で、量は通常より大幅に少ない", () => {
    const first = generateSuggestion({ ...base, weaningDay: 1 });
    const later = generateSuggestion({ ...base, weaningDay: 40 });
    expect(first.meals).toHaveLength(1);
    expect(first.meals[0].totalGrams).toBeLessThan(later.meals[0].totalGrams);
  });

  it("2週間後には野菜が加わるが、タンパク質はまだ出さない", () => {
    const plan = generateSuggestion({ ...base, weaningDay: 15 });
    expect(catsIn(plan).has("staple")).toBe(true);
    expect(catsIn(plan).has("veg")).toBe(true);
    expect(catsIn(plan).has("protein")).toBe(false);
  });

  it("1ヶ月後にはタンパク質が加わり2回食になる", () => {
    const plan = generateSuggestion({ ...base, weaningDay: 29 });
    expect(catsIn(plan).has("protein")).toBe(true);
    expect(plan.meals).toHaveLength(2);
  });

  it("開始日が未設定なら従来どおり月齢だけで判断する（主食＋野菜）", () => {
    const plan = generateSuggestion({ ...base, weaningDay: undefined });
    expect(catsIn(plan).has("staple")).toBe(true);
    expect(catsIn(plan).has("protein")).toBe(false);
    expect(plan.weaningStepLabel).toBeUndefined();
  });

  it("段階が進むにつれて出せるカテゴリが減ることはない", () => {
    let prev = 0;
    for (const day of [1, 10, 15, 25, 29, 40]) {
      const n = catsIn(generateSuggestion({ ...base, weaningDay: day })).size;
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
  });

  it("おかゆだけの時期に野菜入りのレシピが選ばれない", () => {
    for (let day = 1; day < 15; day++) {
      for (let d = 1; d <= 28; d++) {
        const plan = generateSuggestion({
          ...base,
          dateIso: `2026-04-${String(d).padStart(2, "0")}`,
          weaningDay: day,
        });
        expect(plan.meals.every((m) => m.recipeName === undefined)).toBe(true);
      }
    }
  });

  it("アレルギー等でおかゆが出せない場合もクラッシュせず何かを提案する", () => {
    const plan = generateSuggestion({
      ...base,
      weaningDay: 1,
      ingredientStatuses: { gayu_10: { status: "allergic" } },
    });
    expect(plan.meals).toHaveLength(1);
    expect(allIngredientIdsInPlan(plan)).not.toContain("gayu_10");
  });
});

describe("phaseFromMonths — ステージ境界", () => {
  it("6ヶ月はまだ初期（ラベルの5-6ヶ月と一致する）", () => {
    expect(phaseFromMonths(5).key).toBe("5_6");
    expect(phaseFromMonths(6).key).toBe("5_6");
    expect(phaseFromMonths(7).key).toBe("7_8");
  });

  it("6ヶ月の献立に中期以降の食材(うどん・納豆)が出ない", () => {
    for (let d = 1; d <= 28; d++) {
      const plan = generateSuggestion({
        dateIso: `2026-04-${String(d).padStart(2, "0")}`,
        ageMonths: 6,
        recentLogs: [],
      });
      for (const id of allIngredientIdsInPlan(plan)) {
        expect(idToIngredient.get(id)!.stageForms["5_6"]).toBeDefined();
      }
    }
  });

  it("中期以降は進行段階に引き戻されず、月齢どおりの食事回数になる", () => {
    // 開始から日が浅くても、後期(9-11ヶ月)なら3回食
    const plan = generateSuggestion({
      dateIso: "2026-03-05", ageMonths: 10, recentLogs: [], weaningDay: 30,
    });
    expect(plan.meals).toHaveLength(3);
    expect(plan.weaningStepLabel).toBeUndefined();
  });

  it("初期の最終段階は日数で打ち切られず、2回食から1回食へ戻らない", () => {
    for (const day of [29, 56, 57, 80]) {
      const plan = generateSuggestion({
        dateIso: "2026-03-05", ageMonths: 6, recentLogs: [], weaningDay: day,
      });
      expect(plan.meals).toHaveLength(2);
    }
  });
});

describe("generateSuggestion — 初期の主食はおかゆが基本", () => {
  it("たんぱく質を足す時期でも、主食の過半はおかゆになる", () => {
    let gayu = 0, total = 0;
    for (let d = 1; d <= 28; d++) {
      for (const rev of [0, 1, 2]) {
        const plan = generateSuggestion({
          dateIso: `2026-04-${String(d).padStart(2, "0")}`,
          ageMonths: 6, recentLogs: [], weaningDay: 40, revision: rev,
        });
        for (const meal of plan.meals) {
          for (const item of meal.items) {
            if (item.cat !== "staple") continue;
            total++;
            if (item.ingredientId === "gayu_10") gayu++;
          }
        }
      }
    }
    expect(total).toBeGreaterThan(0);
    expect(gayu / total).toBeGreaterThan(0.5);
  });
});

describe("目安量 — 厚生労働省「授乳・離乳の支援ガイド」の値に沿っているか", () => {
  // 同ガイド「離乳の進め方の目安」の1回あたりの量。[下限, 上限]
  // ゆらぎ(wobble ±10%)を考慮し、実測の中央付近がこの範囲に収まることを見る。
  const EXPECTED: Record<string, Record<number, [number, number]>> = {
    // 食材id: { 月齢: [下限, 上限] }
    tofu:          { 8: [30, 40], 10: [40, 50], 15: [46, 58] },
    shiromizakana: { 8: [10, 15], 10: [13, 17], 15: [15, 22] },
    sasami:        { 8: [10, 15], 10: [13, 17], 15: [15, 22] },
    yogurt:        { 8: [50, 70], 10: [70, 90], 15: [88, 112] },
    natto:         { 8: [15, 22], 10: [17, 23], 15: [21, 29] },
    ninjin:        { 8: [20, 30], 10: [30, 40], 15: [40, 50] },
    gayu_7:        { 8: [50, 80] },
    gayu_5:        { 10: [75, 95] },
    nanhan:        { 15: [75, 95] },
  };

  it("食材ごとの目安量が公的な範囲に収まる", () => {
    const seen = new Set<string>();
    for (const [id, byMonth] of Object.entries(EXPECTED)) {
      for (const [months, [lo, hi]] of Object.entries(byMonth)) {
        for (let d = 1; d <= 28; d++) {
          for (const rev of [0, 1, 2, 3]) {
            const plan = generateSuggestion({
              dateIso: `2026-05-${String(d).padStart(2, "0")}`,
              ageMonths: Number(months), recentLogs: [], revision: rev,
            });
            for (const meal of plan.meals) {
              for (const item of meal.items) {
                if (item.ingredientId !== id) continue;
                seen.add(`${id}@${months}`);
                expect(item.grams,
                  `${id} (${months}ヶ月) が目安 ${lo}〜${hi}g の範囲外`).toBeGreaterThanOrEqual(lo);
                expect(item.grams,
                  `${id} (${months}ヶ月) が目安 ${lo}〜${hi}g の範囲外`).toBeLessThanOrEqual(hi);
              }
            }
          }
        }
      }
    }
    // 実際に検証できた組み合わせがあること（提案されず素通りしていたら意味がない）
    expect(seen.size).toBeGreaterThanOrEqual(10);
  });

  it("同じたんぱく質でも食材ごとに量が変わる（豆腐は魚より多い）", () => {
    const grams = (id: string, months: number) => {
      for (let d = 1; d <= 28; d++) {
        for (const rev of [0, 1, 2, 3]) {
          const plan = generateSuggestion({
            dateIso: `2026-06-${String(d).padStart(2, "0")}`,
            ageMonths: months, recentLogs: [], revision: rev,
          });
          for (const m of plan.meals) {
            const hit = m.items.find((i) => i.ingredientId === id);
            if (hit) return hit.grams;
          }
        }
      }
      throw new Error(`${id} が提案されなかった`);
    };
    expect(grams("tofu", 10)).toBeGreaterThan(grams("shiromizakana", 10) * 2);
  });

  it("卵は個数の表記で示され、卵黄と全卵で表記が違う", () => {
    const labelOf = (id: string, months: number) => {
      for (let d = 1; d <= 28; d++) {
        for (const rev of [0, 1, 2, 3]) {
          const plan = generateSuggestion({
            dateIso: `2026-07-${String(d).padStart(2, "0")}`,
            ageMonths: months, recentLogs: [], revision: rev,
          });
          for (const m of plan.meals) {
            const hit = m.items.find((i) => i.ingredientId === id);
            if (hit) return hit.amountLabel;
          }
        }
      }
      return undefined;
    };
    expect(labelOf("ranou", 8)).toBe("卵黄1個");
    expect(labelOf("zenran", 8)).toBe("全卵1/3個");
    expect(labelOf("zenran", 10)).toBe("全卵1/2個");
  });
});

describe("卵黄の開始時期", () => {
  it("卵黄は初期(5-6ヶ月)から提案されうる（公的ガイドに合わせた前倒し）", () => {
    const ranou = INGREDIENT_MASTER.find((i) => i.id === "ranou")!;
    expect(ranou.earliestStage).toBe("5_6");
    expect(ranou.stageForms["5_6"]).toBeDefined();
  });

  it("初期の卵黄には医師相談の注意書きが付いている", () => {
    const tip = INGREDIENT_MASTER.find((i) => i.id === "ranou")!.stageForms["5_6"]!.tip ?? "";
    expect(tip).toContain("かかりつけ医");
  });

  it("卵アレルギーを登録すると卵黄・全卵は初期でも提案されない", () => {
    for (let d = 1; d <= 28; d++) {
      const plan = generateSuggestion({
        dateIso: `2026-08-${String(d).padStart(2, "0")}`,
        ageMonths: 6, recentLogs: [], allergenTags: ["egg"], weaningDay: 40,
      });
      const ids = allIngredientIdsInPlan(plan);
      expect(ids).not.toContain("ranou");
      expect(ids).not.toContain("zenran");
    }
  });
});

describe("INGREDIENT_MASTER — データ整合性", () => {
  it("idが重複していない", () => {
    const ids = INGREDIENT_MASTER.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("食材名が重複していない", () => {
    const names = INGREDIENT_MASTER.map((i) => i.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("earliestStage のステージには必ず stageForms がある", () => {
    for (const ing of INGREDIENT_MASTER) {
      expect(ing.stageForms[ing.earliestStage], `${ing.id} に ${ing.earliestStage} の調理情報がない`).toBeDefined();
    }
  });

  it("stageForms は earliestStage より前のステージを持たない", () => {
    const order = ["5_6", "7_8", "9_11", "12_18"] as const;
    for (const ing of INGREDIENT_MASTER) {
      const earliest = order.indexOf(ing.earliestStage);
      for (const s of order) {
        if (ing.stageForms[s] && order.indexOf(s) < earliest) {
          throw new Error(`${ing.id}: ${s} は earliestStage(${ing.earliestStage}) より前`);
        }
      }
    }
  });

  it("cook は空でなく、日本語として成立している", () => {
    for (const ing of INGREDIENT_MASTER) {
      for (const [stage, form] of Object.entries(ing.stageForms)) {
        expect(form!.cook.length, `${ing.id}/${stage} の cook が短すぎる`).toBeGreaterThan(6);
        // 英字が混ざっていないこと（過去に "部position" のような混入があった）
        expect(/[A-Za-z]{3,}/.test(form!.cook), `${ing.id}/${stage} の cook に英単語が混入`).toBe(false);
        // ハングル・簡体字特有の文字が混ざっていないこと
        expect(/[\uAC00-\uD7AF]/.test(form!.cook), `${ing.id}/${stage} の cook にハングルが混入`).toBe(false);
      }
    }
  });

  it("アレルゲンを持つ食材のアレルゲンは定義済みのタグである", () => {
    const valid = new Set(ALLERGENS);
    for (const ing of INGREDIENT_MASTER) {
      for (const a of ing.allergens) expect(valid.has(a), `${ing.id} の ${a}`).toBe(true);
    }
  });

  it("PORTION_GROUP_BY_ID に存在しない食材idが登録されていない", () => {
    const ids = new Set(INGREDIENT_MASTER.map((i) => i.id));
    for (const id of Object.keys(PORTION_GROUP_BY_ID)) {
      expect(ids.has(id), `PORTION_GROUP_BY_ID の ${id} は食材マスターに無い`).toBe(true);
    }
  });

  it("提案対象の主食・たんぱく質には目安量グループが割り当てられている", () => {
    for (const ing of INGREDIENT_MASTER) {
      if (ing.neverSuggest) continue;
      if (ing.category !== "carb" && ing.category !== "protein") continue;
      expect(
        ing.portionGroup ?? PORTION_GROUP_BY_ID[ing.id],
        `${ing.id} (${ing.name}) に目安量グループが無い`
      ).toBeDefined();
    }
  });

  it("各ステージに十分な数の提案候補がある", () => {
    for (const stage of ["5_6", "7_8", "9_11", "12_18"] as const) {
      const n = INGREDIENT_MASTER.filter((i) => !i.neverSuggest && i.stageForms[stage]).length;
      expect(n, `${stage} の候補が少ない (${n}件)`).toBeGreaterThanOrEqual(25);
    }
  });
});

describe("献立の質 — 同日の重複と偏り", () => {
  it("同じ日の食事に同じレシピが2回出ない", () => {
    for (const months of [8, 10, 15]) {
      for (let d = 1; d <= 28; d++) {
        for (const rev of [0, 1, 2]) {
          const plan = generateSuggestion({
            dateIso: `2026-09-${String(d).padStart(2, "0")}`,
            ageMonths: months, recentLogs: [], revision: rev,
          });
          const names = plan.meals.map((m) => m.recipeName).filter(Boolean);
          expect(new Set(names).size, `${months}ヶ月 9/${d} でレシピが重複`).toBe(names.length);
        }
      }
    }
  });

  it("同じ日の食事で主食が全部同じにならない（3回食のとき）", () => {
    let allSame = 0, total = 0;
    for (let d = 1; d <= 28; d++) {
      const plan = generateSuggestion({
        dateIso: `2026-10-${String(d).padStart(2, "0")}`, ageMonths: 10, recentLogs: [],
      });
      const staples = plan.meals.map((m) => m.items.find((i) => i.cat === "staple")?.ingredientId);
      total++;
      if (new Set(staples).size === 1) allSame++;
    }
    // 候補が十分あるので、全食同じ主食になる日はごく一部に留まるはず
    expect(allSame / total).toBeLessThan(0.2);
  });

  it("のり・わかめ・きのこが野菜と同じ量で出ない", () => {
    const maxFor = (id: string) => {
      let max = 0;
      for (let d = 1; d <= 28; d++) {
        for (const rev of [0, 1, 2, 3, 4]) {
          const plan = generateSuggestion({
            dateIso: `2026-11-${String(d).padStart(2, "0")}`,
            ageMonths: 15, recentLogs: [], revision: rev,
          });
          for (const m of plan.meals) {
            const hit = m.items.find((i) => i.ingredientId === id);
            if (hit) max = Math.max(max, hit.grams);
          }
        }
      }
      return max;
    };
    // のりは板のり1枚が約3g。野菜と同じ40g台で出たら明らかにおかしい。
    const nori = maxFor("nori");
    if (nori > 0) expect(nori, "のりの量が多すぎる").toBeLessThanOrEqual(4);
    const wakame = maxFor("wakame");
    if (wakame > 0) expect(wakame, "わかめの量が多すぎる").toBeLessThanOrEqual(10);
    const maitake = maxFor("maitake");
    if (maitake > 0) expect(maitake, "きのこの量が多すぎる").toBeLessThanOrEqual(25);
  });

  it("野菜枠が果物ばかりにならない", () => {
    let fruit = 0, total = 0;
    for (const months of [8, 10, 15]) {
      for (let d = 1; d <= 28; d++) {
        const plan = generateSuggestion({
          dateIso: `2026-12-${String(d).padStart(2, "0")}`, ageMonths: months, recentLogs: [],
        });
        for (const m of plan.meals) {
          for (const i of m.items) {
            if (i.cat !== "veg") continue;
            total++;
            if (FRUIT_IDS.has(i.ingredientId)) fruit++;
          }
        }
      }
    }
    expect(total).toBeGreaterThan(50);
    expect(fruit / total, "野菜枠に占める果物の割合が高すぎる").toBeLessThan(0.4);
  });
});
