import type {
  Allergen, DailyLog, DailyPlan, MealName, Phase, PhaseKey,
  FoodCategory, PlanItem, Ingredient, IngredientStatus,
} from "./types";
import { INGREDIENT_MASTER } from "./ingredients";

const MEALS: MealName[] = ["朝", "昼", "夕"];

// プラン生成ロジックの世代番号。安全フィルタ(アレルゲン・月齢)に関わる変更を
// 加えたときは必ず上げる。getOrCreatePlan はこの番号より古い未来日/当日プランを
// 破棄して再生成する（過去日は実績記録として保持するため対象外）。
export const PLAN_SCHEMA_VERSION = 3;

export function phaseFromMonths(m: number): Phase {
  if (m <= 5) return { key: "5_6",   label: "初期(5-6ヶ月)" };
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

// 提案カテゴリ(staple/veg/protein) → 食材マスターのカテゴリ
const FOOD_CATEGORY_TO_INGREDIENT_CATEGORY: Record<FoodCategory, Ingredient["category"]> = {
  staple: "carb",
  veg: "vitamin",
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
  const idToName = new Map(INGREDIENT_MASTER.map((i) => [i.id, i.name]));
  return {
    liked: [...getLikedFoods(scores)].map((id) => idToName.get(id) ?? id),
    disliked: [...getDislikedFoods(scores)].map((id) => idToName.get(id) ?? id),
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
}): DailyPlan {
  const {
    dateIso, ageMonths, recentLogs, recentPlans = [],
    allergenTags = [], ingredientStatuses = {},
  } = params;

  const phase = phaseFromMonths(ageMonths);
  const guide = BASE_GUIDE[phase.key];

  const { seed, rand } = seededRand(`${dateIso}|${phase.key}`);
  const adj = calcAdjustFactor(recentLogs, 7);

  // 食材スコア分析
  const scores = calcFoodScores(recentLogs, recentPlans);
  const disliked = getDislikedFoods(scores);
  const liked = getLikedFoods(scores);

  // 記録件数（インサイト判定用）
  const logCount = recentLogs.filter(
    (l) => Object.values(l.meals).some((m) => m && typeof m.eatenRatio === "number")
  ).length;

  const activeMeals = MEALS.slice(0, guide.mealsPerDay);
  const itemsPerMeal = phase.key === "5_6" ? 2 : 3;

  const stapleCandidates  = candidatesFor("staple",  phase.key, allergenTags, ingredientStatuses);
  const vegCandidates     = candidatesFor("veg",     phase.key, allergenTags, ingredientStatuses);
  const proteinCandidates = candidatesFor("protein", phase.key, allergenTags, ingredientStatuses);

  const meals = activeMeals.map((name) => {
    const staple  = pickWeighted(stapleCandidates,  rand, liked, disliked);
    const veg     = pickWeighted(vegCandidates,     rand, liked, disliked);
    const protein = itemsPerMeal >= 3 ? pickWeighted(proteinCandidates, rand, liked, disliked) : undefined;

    const wobble = 0.9 + rand() * 0.2;
    const stapleG  = Math.round(guide.categories.staple  * adj * wobble);
    const vegG     = Math.round(guide.categories.veg     * adj * wobble);
    const proteinG = Math.round(guide.categories.protein * adj * wobble);

    const items: PlanItem[] = [];
    if (staple) {
      items.push({
        cat: "staple", ingredientId: staple.id,
        text: `${staple.name}（${staple.stageForms[phase.key]}）`, grams: stapleG,
      });
    }
    if (veg) {
      items.push({
        cat: "veg", ingredientId: veg.id,
        text: `${veg.name}（${veg.stageForms[phase.key]}）`, grams: vegG,
      });
    }
    if (protein) {
      items.push({
        cat: "protein", ingredientId: protein.id,
        text: `${protein.name}（${protein.stageForms[phase.key]}）`, grams: proteinG,
      });
    }

    return { name, items, totalGrams: items.reduce((a, b) => a + b.grams, 0) };
  });

  const idToName = new Map(INGREDIENT_MASTER.map((i) => [i.id, i.name]));
  const dislikedNames = [...disliked].map((id) => idToName.get(id) ?? id);
  const likedNames = [...liked].map((id) => idToName.get(id) ?? id);

  const insight = buildInsight(adj, dislikedNames, likedNames, logCount);

  return {
    dateIso,
    phase,
    guideNote: guide.note,
    seed,
    adjustFactor: adj,
    meals,
    version: PLAN_SCHEMA_VERSION,
    insight,
    avoidedFoods: dislikedNames,
  };
}
