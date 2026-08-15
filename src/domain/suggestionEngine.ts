import type {
  Allergen, DailyLog, DailyPlan, MealName, Phase, PhaseKey,
  FoodCategory, PlanItem, Ingredient, IngredientStatus, Recipe,
} from "./types";
import { INGREDIENT_MASTER } from "./ingredients";
import { RECIPE_MASTER } from "./recipes";

const MEALS: MealName[] = ["朝", "昼", "夕"];

const ingredientById = new Map(INGREDIENT_MASTER.map((i) => [i.id, i]));

// プラン生成ロジックの世代番号。安全フィルタ(アレルゲン・月齢)に関わる変更を
// 加えたときは必ず上げる。getOrCreatePlan はこの番号より古い未来日/当日プランを
// 破棄して再生成する（過去日は実績記録として保持するため対象外）。
// 4: 離乳食開始日からの進行段階(WeaningStep)を導入。
export const PLAN_SCHEMA_VERSION = 4;

export function phaseFromMonths(m: number): Phase {
  // 境界はラベルと一致させること。以前は初期が m <= 5 だったため、
  // 6ヶ月の赤ちゃんが中期扱いになり、うどんや納豆など中期向けの食材が
  // 提案されていた。
  if (m <= 6) return { key: "5_6",   label: "初期(5-6ヶ月)" };
  if (m <= 8) return { key: "7_8",   label: "中期(7-8ヶ月)" };
  if (m <= 11) return { key: "9_11", label: "後期(9-11ヶ月)" };
  return            { key: "12_18", label: "完了期(12-18ヶ月)" };
}

type Guide = {
  mealsPerDay: 1 | 2 | 3;
  categories: Record<FoodCategory, number>;
  note: string;
};

const BASE_GUIDE: Record<PhaseKey, Guide> = {
  "5_6":   { mealsPerDay: 1, categories: { staple: 30, veg: 20, protein: 10 }, note: "まずは慣れる。量より継続。" },
  "7_8":   { mealsPerDay: 2, categories: { staple: 60, veg: 40, protein: 20 }, note: "2回食。食材バリエを増やす。" },
  "9_11":  { mealsPerDay: 3, categories: { staple: 80, veg: 50, protein: 30 }, note: "3回食。鉄・たんぱく質を意識。" },
  "12_18": { mealsPerDay: 3, categories: { staple: 100, veg: 60, protein: 40 }, note: "大人食へ近づけつつ無理はしない。" },
};

/**
 * 離乳食開始からの日数に基づく進行段階。
 *
 * 月齢だけで判断すると、開始直後の赤ちゃんにいきなり野菜やたんぱく質を
 * 3品提示してしまう（「初日からじゃがいも・にんじん」問題）。実際の進め方は
 * 一般的に、10倍がゆだけ → 野菜を追加 → たんぱく質を追加、と段階的に増やす。
 * 開始日が設定されている場合はこちらを優先して品目数・量・回数を決める。
 *
 * 量は「小さじ1(≒5g)から始めて徐々に増やす」に合わせて BASE_GUIDE の量を
 * amountScale で縮める。
 */
export type WeaningStep = {
  label: string;
  categories: FoodCategory[];
  mealsPerDay: 1 | 2 | 3;
  amountScale: number;
  note: string;
};

// 各段階の開始日（離乳食開始日を1日目とする）
const STEP2_FROM_DAY = 15; // 野菜を足す
const STEP3_FROM_DAY = 29; // たんぱく質を足し、2回食にする

/**
 * 初期(5-6ヶ月)の間だけ有効。中期以降に進んだらこの段階分けは使わず、
 * 月齢ベースの BASE_GUIDE に任せる（呼び出し側でステージを判定すること）。
 * 最終段階(step3)には終わりを設けていない。日数で打ち切ると、ステージが
 * 上がる前に 2回食 → 1回食 と逆戻りしてしまうため。
 */
export function weaningStepFor(weaningDay: number | undefined): WeaningStep | undefined {
  if (weaningDay === undefined || weaningDay < 1) return undefined;

  if (weaningDay < STEP2_FROM_DAY) {
    // 最初の2週間はおかゆだけ。量も小さじ1相当から少しずつ増やす。
    const amountScale = weaningDay <= 3 ? 0.15 : weaningDay <= 7 ? 0.3 : 0.5;
    return {
      label: `開始${weaningDay}日目・おかゆに慣れる時期`,
      categories: ["staple"],
      mealsPerDay: 1,
      amountScale,
      note: "10倍がゆだけを1日1回。小さじ1から始め、機嫌がよければ少しずつ増やす。",
    };
  }
  if (weaningDay < STEP3_FROM_DAY) {
    return {
      label: `開始${weaningDay}日目・野菜を試す時期`,
      categories: ["staple", "veg"],
      mealsPerDay: 1,
      amountScale: 0.75,
      note: "おかゆに野菜を1品ずつ追加。新しい食材は1日1種類、午前中に少量から。",
    };
  }
  return {
    label: `開始${weaningDay}日目・たんぱく質を試す時期`,
    categories: ["staple", "veg", "protein"],
    mealsPerDay: 2,
    amountScale: 1.0,
    note: "豆腐・白身魚などのたんぱく質を追加。慣れてきたら2回食へ。",
  };
}

// 各ステージの「基本の主食」。開始直後はここに固定し、
// さつまいも・じゃがいも等が主食として先に出てくるのを防ぐ。
const BASE_STAPLE_BY_PHASE: Record<PhaseKey, string> = {
  "5_6": "gayu_10",
  "7_8": "gayu_7",
  "9_11": "gayu_5",
  "12_18": "nanhan",
};

// 提案カテゴリ(staple/veg/protein) → 食材マスターのカテゴリ
const FOOD_CATEGORY_TO_INGREDIENT_CATEGORY: Record<FoodCategory, Ingredient["category"]> = {
  staple: "carb",
  veg: "vitamin",
  protein: "protein",
};
// 逆引き。レシピの食材からグラム数・チップ種別を決めるのに使う
// （レシピは carb/vitamin/protein の食材のみを参照する前提。"other" は使わない）。
const INGREDIENT_CATEGORY_TO_FOOD_CATEGORY: Partial<Record<Ingredient["category"], FoodCategory>> = {
  carb: "staple",
  vitamin: "veg",
  protein: "protein",
};

// ===== Seeded RNG =====
function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededRand(seedStr: string) {
  const seed = xmur3(seedStr)();
  return { seed, rand: mulberry32(seed) };
}

// ===== 安全な候補の絞り込み =====
// stageForms にそのステージのキーが無い食材は「まだ早い」または「もう卒業した」ものとして
// 自動的に除外される（earliestStage の下限チェックと、がゆの精製度のような
// 上限チェックの両方をこの1条件でまかなう）。
function candidatesFor(
  foodCategory: FoodCategory,
  phaseKey: PhaseKey,
  allergenTags: Allergen[],
  ingredientStatuses: Record<string, IngredientStatus>
): Ingredient[] {
  const ingredientCategory = FOOD_CATEGORY_TO_INGREDIENT_CATEGORY[foodCategory];
  return INGREDIENT_MASTER.filter((ing) => {
    if (ing.category !== ingredientCategory) return false;
    if (ing.neverSuggest) return false;
    if (!ing.stageForms[phaseKey]) return false;
    if (ing.allergens.some((a) => allergenTags.includes(a))) return false;
    if (ingredientStatuses[ing.id]?.status === "allergic") return false;
    return true;
  });
}

// そのステージで安全に提案できるレシピ(複数食材を組み合わせた一品)を絞り込む。
// 食材ごとの判定基準はcandidatesForと同じ(アレルゲン・卒業判定・アレルギー記録・苦手)。
// 1つでも食材が引っかかればレシピ全体を候補から外す。
function eligibleRecipes(
  stage: PhaseKey,
  allergenTags: Allergen[],
  ingredientStatuses: Record<string, IngredientStatus>,
  disliked: Set<string>
): Recipe[] {
  return RECIPE_MASTER.filter((r) => {
    if (r.stage !== stage) return false;
    return r.ingredientIds.every((id) => {
      const ing = ingredientById.get(id);
      if (!ing) return false;
      if (!ing.stageForms[stage]) return false;
      if (ing.allergens.some((a) => allergenTags.includes(a))) return false;
      if (ingredientStatuses[id]?.status === "allergic") return false;
      if (disliked.has(id)) return false;
      return true;
    });
  });
}

// ===== 食材スコア分析 =====
// 直近のログとプランをクロスさせ、食材ごとの平均食べた割合を算出する
type FoodScore = { totalRatio: number; count: number };

export function calcFoodScores(
  recentLogs: DailyLog[],
  recentPlans: DailyPlan[]
): Map<string, FoodScore> {
  const scores = new Map<string, FoodScore>();

  for (const plan of recentPlans) {
    const log = recentLogs.find((l) => l.dateIso === plan.dateIso);
    if (!log) continue;

    for (const meal of plan.meals) {
      const mlog = log.meals[meal.name];
      if (!mlog || typeof mlog.eatenRatio !== "number") continue;

      for (const item of meal.items) {
        // 旧バージョン(ingredientIdを持たない)のプランはスコア集計の対象外にする
        if (!item.ingredientId) continue;
        const cur = scores.get(item.ingredientId) ?? { totalRatio: 0, count: 0 };
        scores.set(item.ingredientId, {
          totalRatio: cur.totalRatio + mlog.eatenRatio,
          count: cur.count + 1,
        });
      }
    }
  }

  return scores;
}

// 苦手食材（2回以上記録 かつ 平均 < 0.35）
function getDislikedFoods(scores: Map<string, FoodScore>): Set<string> {
  const disliked = new Set<string>();
  for (const [id, s] of scores) {
    if (s.count >= 2 && s.totalRatio / s.count < 0.35) {
      disliked.add(id);
    }
  }
  return disliked;
}

// 好き食材（2回以上記録 かつ 平均 > 0.8）
function getLikedFoods(scores: Map<string, FoodScore>): Set<string> {
  const liked = new Set<string>();
  for (const [id, s] of scores) {
    if (s.count >= 2 && s.totalRatio / s.count > 0.8) {
      liked.add(id);
    }
  }
  return liked;
}

/**
 * 直近の実績から好き・苦手な食材名を算出する。カレンダーの日次提案(generateSuggestion)
 * だけでなく、AI献立提案のプロンプトにも同じ学習結果を反映するために公開している。
 */
export function summarizePreferences(
  recentLogs: DailyLog[],
  recentPlans: DailyPlan[]
): { liked: string[]; disliked: string[] } {
  const scores = calcFoodScores(recentLogs, recentPlans);
  return {
    liked: [...getLikedFoods(scores)].map((id) => ingredientById.get(id)?.name ?? id),
    disliked: [...getDislikedFoods(scores)].map((id) => ingredientById.get(id)?.name ?? id),
  };
}

// 重み付き選択：苦手は除外、好きは優先。候補が空なら undefined を返す
// （多重アレルギー等でカテゴリの候補が全滅した場合に備えたガード）。
function pickWeighted(
  candidates: Ingredient[],
  rand: () => number,
  liked: Set<string>,
  disliked: Set<string>
): Ingredient | undefined {
  if (candidates.length === 0) return undefined;

  const preferred = candidates.filter((ing) => !disliked.has(ing.id));
  const pool = preferred.length > 0 ? preferred : candidates;

  const weighted: Ingredient[] = [];
  for (const ing of pool) {
    weighted.push(ing);
    if (liked.has(ing.id)) weighted.push(ing);
  }

  return weighted[Math.floor(rand() * weighted.length)];
}

// ===== 量の補正 =====
function calcAdjustFactor(recentLogs: DailyLog[], days = 7): number {
  const slice = recentLogs.slice(0, days);
  let sum = 0, cnt = 0;
  for (const log of slice) {
    for (const meal of Object.values(log.meals)) {
      if (meal && typeof meal.eatenRatio === "number") {
        sum += meal.eatenRatio;
        cnt++;
      }
    }
  }
  if (cnt === 0) return 1.0;
  const avg = sum / cnt;
  const factor = 1.0 + Math.max(-0.2, Math.min(0.2, (avg - 0.75) * 0.4));
  return Math.round(Math.max(0.8, Math.min(1.2, factor)) * 100) / 100;
}

// ===== インサイト文章生成 =====
function buildInsight(
  adj: number,
  dislikedNames: string[],
  likedNames: string[],
  logCount: number
): string {
  const parts: string[] = [];

  if (logCount < 3) {
    parts.push("記録が増えると提案が最適化されます");
  } else if (adj >= 1.15) {
    parts.push("よく食べています！量を増やしました");
  } else if (adj <= 0.85) {
    parts.push("食べ残しが多め。量を少し減らしました");
  } else if (adj >= 1.05) {
    parts.push("順調です。量を少し増やしています");
  } else {
    parts.push("ちょうどよい量で食べています");
  }

  if (dislikedNames.length > 0) {
    parts.push(`${dislikedNames.slice(0, 2).join("・")}は苦手な様子のため控えています`);
  }
  if (likedNames.length > 0) {
    parts.push(`${likedNames.slice(0, 2).join("・")}はよく食べるため優先しています`);
  }

  return parts.join("。");
}

// ===== メイン生成関数 =====
export function generateSuggestion(params: {
  dateIso: string;
  ageMonths: number;
  recentLogs: DailyLog[];
  recentPlans?: DailyPlan[];
  allergenTags?: Allergen[];
  ingredientStatuses?: Record<string, IngredientStatus>;
  /** 離乳食開始日を1日目とした経過日数。未設定なら月齢だけで判断する。 */
  weaningDay?: number;
  /** 「再生成」の回数。シードに混ぜて別の献立を出すために使う。 */
  revision?: number;
}): DailyPlan {
  const {
    dateIso, ageMonths, recentLogs, recentPlans = [],
    allergenTags = [], ingredientStatuses = {},
    weaningDay, revision = 0,
  } = params;

  const phase = phaseFromMonths(ageMonths);
  const guide = BASE_GUIDE[phase.key];
  // 段階分けは初期の間だけ。中期以降でこれを適用すると、3回食であるべき
  // 後期の子が step3 の「2回食」に引き戻されてしまう。
  const step = phase.key === "5_6" ? weaningStepFor(weaningDay) : undefined;

  // revision をシードに含めないと、同じ日付・同じステージでは常に同じ献立になり
  // 「再生成」を押しても何も変わらない。
  const { seed, rand } = seededRand(`${dateIso}|${phase.key}|${revision}`);
  const adj = calcAdjustFactor(recentLogs, 7);

  // 食材スコア分析
  const scores = calcFoodScores(recentLogs, recentPlans);
  const disliked = getDislikedFoods(scores);
  const liked = getLikedFoods(scores);

  // 記録件数（インサイト判定用）
  const logCount = recentLogs.filter(
    (l) => Object.values(l.meals).some((m) => m && typeof m.eatenRatio === "number")
  ).length;

  const activeMeals = MEALS.slice(0, step?.mealsPerDay ?? guide.mealsPerDay);
  const amountScale = step?.amountScale ?? 1;

  // 進行段階が分かっているならその段階で出してよいカテゴリだけ、
  // 分からない（開始日未設定）なら従来どおり月齢で判断する。
  const allowedCategories: FoodCategory[] =
    step?.categories ?? (phase.key === "5_6" ? ["staple", "veg"] : ["staple", "veg", "protein"]);
  const allows = (c: FoodCategory) => allowedCategories.includes(c);

  let stapleCandidates    = candidatesFor("staple",  phase.key, allergenTags, ingredientStatuses);
  const vegCandidates     = candidatesFor("veg",     phase.key, allergenTags, ingredientStatuses);
  const proteinCandidates = candidatesFor("protein", phase.key, allergenTags, ingredientStatuses);

  // 初期のうちは主食はおかゆが基本。これをしないと、開始初日から主食として
  // じゃがいもやさつまいもが選ばれてしまう。
  //   - たんぱく質を足す前（開始4週まで）はおかゆのみ
  //   - それ以降は他の主食も出すが、おかゆが選ばれやすいよう重みを付ける
  // 米アレルギー等でおかゆが候補から外れている場合は元の候補のままにする。
  if (step) {
    const base = stapleCandidates.filter((i) => i.id === BASE_STAPLE_BY_PHASE[phase.key]);
    if (base.length > 0) {
      stapleCandidates = allows("protein")
        ? [...stapleCandidates, ...base, ...base]
        : base;
    }
  }

  // レシピは、その段階で出してよいカテゴリだけで構成されているものに限る
  // （おかゆだけの時期に「野菜入りの一品」を出さないため）。
  const recipeCandidates = eligibleRecipes(phase.key, allergenTags, ingredientStatuses, disliked)
    .filter((r) =>
      r.ingredientIds.every((id) => {
        const cat = INGREDIENT_CATEGORY_TO_FOOD_CATEGORY[ingredientById.get(id)!.category];
        return cat !== undefined && allows(cat);
      })
    );

  const meals = activeMeals.map((name) => {
    const wobble = 0.9 + rand() * 0.2;
    const gramsOf = (base: number) => Math.max(1, Math.round(base * adj * wobble * amountScale));
    const gramsFor: Record<FoodCategory, number> = {
      staple:  gramsOf(guide.categories.staple),
      veg:     gramsOf(guide.categories.veg),
      protein: gramsOf(guide.categories.protein),
    };

    // 該当ステージで安全なレシピがあれば半々の確率で「一品」として提案する。
    // 無ければ従来どおり主食・野菜・タンパク質を独立に選ぶ。
    if (recipeCandidates.length > 0 && rand() < 0.5) {
      const recipe = recipeCandidates[Math.floor(rand() * recipeCandidates.length)];
      const items: PlanItem[] = recipe.ingredientIds.map((id) => {
        const ing = ingredientById.get(id)!;
        const foodCat = INGREDIENT_CATEGORY_TO_FOOD_CATEGORY[ing.category]!;
        const form = ing.stageForms[phase.key]!;
        return {
          cat: foodCat, ingredientId: id,
          text: `${ing.name}（${form.cook}）`, grams: gramsFor[foodCat], tip: form.tip,
        };
      });
      return {
        name, items, totalGrams: items.reduce((a, b) => a + b.grams, 0),
        recipeName: recipe.name, recipeNote: recipe.note,
      };
    }

    const staple  = allows("staple")  ? pickWeighted(stapleCandidates,  rand, liked, disliked) : undefined;
    const veg     = allows("veg")     ? pickWeighted(vegCandidates,     rand, liked, disliked) : undefined;
    const protein = allows("protein") ? pickWeighted(proteinCandidates, rand, liked, disliked) : undefined;

    const items: PlanItem[] = [];
    if (staple) {
      const form = staple.stageForms[phase.key]!;
      items.push({
        cat: "staple", ingredientId: staple.id,
        text: `${staple.name}（${form.cook}）`, grams: gramsFor.staple, tip: form.tip,
      });
    }
    if (veg) {
      const form = veg.stageForms[phase.key]!;
      items.push({
        cat: "veg", ingredientId: veg.id,
        text: `${veg.name}（${form.cook}）`, grams: gramsFor.veg, tip: form.tip,
      });
    }
    if (protein) {
      const form = protein.stageForms[phase.key]!;
      items.push({
        cat: "protein", ingredientId: protein.id,
        text: `${protein.name}（${form.cook}）`, grams: gramsFor.protein, tip: form.tip,
      });
    }

    return { name, items, totalGrams: items.reduce((a, b) => a + b.grams, 0) };
  });

  const dislikedNames = [...disliked].map((id) => ingredientById.get(id)?.name ?? id);
  const likedNames = [...liked].map((id) => ingredientById.get(id)?.name ?? id);

  const insight = buildInsight(adj, dislikedNames, likedNames, logCount);

  return {
    dateIso,
    phase,
    // 進行段階が分かっているならそちらの案内を出す。分からない場合は
    // 開始日を設定すると精度が上がることを伝える。
    guideNote: step
      ? step.note
      : phase.key === "5_6" && weaningDay === undefined
        ? `${guide.note} 設定で離乳食の開始日を入れると、開始からの日数に合わせて提案します。`
        : guide.note,
    seed,
    adjustFactor: adj,
    meals,
    version: PLAN_SCHEMA_VERSION,
    insight,
    avoidedFoods: dislikedNames,
    revision,
    weaningStepLabel: step?.label,
  };
}
