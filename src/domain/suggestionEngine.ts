import type { DailyLog, DailyPlan, MealName, Phase, PhaseKey, FoodCategory, PlanItem } from "./types";

const MEALS: MealName[] = ["朝", "昼", "夕"];

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

const FOOD = {
  staple:  ["10倍がゆ", "7倍がゆ", "軟飯", "うどん(やわ)", "食パン(ふやかし)", "さつまいもマッシュ", "オートミール粥", "そうめん(やわ)"],
  veg:     ["にんじん", "かぼちゃ", "ほうれん草", "ブロッコリー", "トマト", "大根", "玉ねぎ(よく加熱)", "さつまいも", "じゃがいも", "小松菜", "なす", "ズッキーニ"],
  protein: ["豆腐", "白身魚", "しらす(塩抜き)", "鶏ささみ", "ヨーグルト", "卵黄(慣れてから)", "納豆(刻む)", "鶏ひき肉", "きな粉"],
} as const;

const COOK = ["ペースト", "つぶし", "みじん切り＋とろみ", "だし煮", "蒸してやわらかく", "スープ"] as const;

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
        // food名はスペース前まで（"にんじん（だし煮）" → "にんじん"）
        const foodName = item.text.split("（")[0].split("(")[0].trim();
        const cur = scores.get(foodName) ?? { totalRatio: 0, count: 0 };
        scores.set(foodName, {
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
  for (const [food, s] of scores) {
    if (s.count >= 2 && s.totalRatio / s.count < 0.35) {
      disliked.add(food);
    }
  }
  return disliked;
}

// 好き食材（2回以上記録 かつ 平均 > 0.8）
function getLikedFoods(scores: Map<string, FoodScore>): Set<string> {
  const liked = new Set<string>();
  for (const [food, s] of scores) {
    if (s.count >= 2 && s.totalRatio / s.count > 0.8) {
      liked.add(food);
    }
  }
  return liked;
}

// 重み付き選択：苦手は除外、好きは優先
function pickWeighted<T extends string>(
  arr: readonly T[],
  rand: () => number,
  liked: Set<string>,
  disliked: Set<string>
): T {
  // 苦手を除いた候補
  const candidates = arr.filter((f) => !disliked.has(f));
  const pool = candidates.length > 0 ? candidates : [...arr];

  // 好きな食材を2倍の確率で選ぶ
  const weighted: T[] = [];
  for (const f of pool) {
    weighted.push(f);
    if (liked.has(f)) weighted.push(f);
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
  disliked: Set<string>,
  liked: Set<string>,
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

  if (disliked.size > 0) {
    parts.push(`${[...disliked].slice(0, 2).join("・")}は苦手な様子のため控えています`);
  }
  if (liked.size > 0) {
    parts.push(`${[...liked].slice(0, 2).join("・")}はよく食べるため優先しています`);
  }

  return parts.join("。");
}

// ===== メイン生成関数 =====
export function generateSuggestion(params: {
  dateIso: string;
  ageMonths: number;
  recentLogs: DailyLog[];
  recentPlans?: DailyPlan[];
}): DailyPlan {
  const { dateIso, ageMonths, recentLogs, recentPlans = [] } = params;

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

  const meals = activeMeals.map((name) => {
    const staple  = pickWeighted(FOOD.staple,  rand, liked, disliked);
    const veg     = pickWeighted(FOOD.veg,     rand, liked, disliked);
    const protein = pickWeighted(FOOD.protein, rand, liked, disliked);
    const cook    = COOK[Math.floor(rand() * COOK.length)];

    const wobble = 0.9 + rand() * 0.2;
    const stapleG  = Math.round(guide.categories.staple  * adj * wobble);
    const vegG     = Math.round(guide.categories.veg     * adj * wobble);
    const proteinG = Math.round(guide.categories.protein * adj * wobble);

    const items: PlanItem[] = [
      { cat: "staple",  text: `${staple}（${cook}）`,  grams: stapleG },
      { cat: "veg",     text: `${veg}（${cook}）`,     grams: vegG },
    ];
    if (itemsPerMeal >= 3) {
      items.push({ cat: "protein", text: `${protein}（${cook}）`, grams: proteinG });
    }

    return { name, items, totalGrams: items.reduce((a, b) => a + b.grams, 0) };
  });

  const insight = buildInsight(adj, disliked, liked, logCount);
  const avoidedFoods = [...disliked];

  return {
    dateIso,
    phase,
    guideNote: guide.note,
    seed,
    adjustFactor: adj,
    meals,
    version: 2,
    insight,
    avoidedFoods,
  };
}
