import type { DailyLog, DailyPlan, MealName, Phase, PhaseKey, FoodCategory, PlanItem } from "./types";

const MEALS: MealName[] = ["朝", "昼", "夕"];

export function phaseFromMonths(m: number): Phase {
  if (m <= 5) return { key: "5_6", label: "初期(5-6ヶ月)" };
  if (m <= 8) return { key: "7_8", label: "中期(7-8ヶ月)" };
  if (m <= 11) return { key: "9_11", label: "後期(9-11ヶ月)" };
  return { key: "12_18", label: "完了期(12-18ヶ月)" };
}

type Guide = {
  mealsPerDay: 1 | 2 | 3;
  categories: Record<FoodCategory, number>; // 1食あたり目安(g)
  note: string;
};

const BASE_GUIDE: Record<PhaseKey, Guide> = {
  "5_6": { mealsPerDay: 1, categories: { staple: 30, veg: 20, protein: 10 }, note: "まずは慣れる。量より継続。" },
  "7_8": { mealsPerDay: 2, categories: { staple: 60, veg: 40, protein: 20 }, note: "2回食。食材バリエ増やす。" },
  "9_11": { mealsPerDay: 3, categories: { staple: 80, veg: 50, protein: 30 }, note: "3回食。鉄・たんぱく意識。" },
  "12_18": { mealsPerDay: 3, categories: { staple: 100, veg: 60, protein: 40 }, note: "大人食へ寄せつつ無理はしない。" },
};

const FOOD = {
  staple: ["10倍がゆ", "軟飯", "うどん(やわ)", "食パン(ふやかし)", "さつまいもマッシュ", "オートミール粥"],
  veg: ["にんじん", "かぼちゃ", "ほうれん草", "ブロッコリー", "トマト", "大根", "玉ねぎ(よく加熱)", "さつまいも"],
  protein: ["豆腐", "白身魚", "しらす(塩抜き)", "鶏ささみ", "ヨーグルト", "卵黄(慣れてから)", "納豆(刻む)"],
} as const;

const COOK = ["ペースト", "つぶし", "みじん切り＋とろみ", "だし煮", "蒸してやわらかく", "スープ"] as const;

// seed乱数（プロトと同じ系）
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
function pick<T>(arr: readonly T[], r: number): T {
  return arr[Math.floor(r * arr.length)];
}

// 直近ログから補正係数（まずは超単純）
function calcAdjustFactor(recentLogs: DailyLog[], days = 7): number {
  const slice = recentLogs.slice(0, days); // 呼び出し側で「直近日」順に並べる想定
  let sum = 0,
    cnt = 0;
  for (const log of slice) {
    for (const meal of Object.values(log.meals)) {
      if (meal && typeof meal.eatenRatio === "number") {
        sum += meal.eatenRatio;
        cnt++;
      }
    }
  }
  if (cnt === 0) return 1.0;

  const avg = sum / cnt; // 0..1
  const delta = avg - 0.75;
  const factor = 1.0 + Math.max(-0.2, Math.min(0.2, delta * 0.4));
  return Math.max(0.8, Math.min(1.2, factor));
}

export function generateSuggestion(params: {
  dateIso: string;
  ageMonths: number;
  recentLogs: DailyLog[]; // 直近日順（今日-1, 今日-2...）
}): DailyPlan {
  const { dateIso, ageMonths, recentLogs } = params;

  const phase = phaseFromMonths(ageMonths);
  const guide = BASE_GUIDE[phase.key];

  const { seed, rand } = seededRand(`${dateIso}|${phase.key}`);
  const adj = calcAdjustFactor(recentLogs, 7);

  const activeMeals = MEALS.slice(0, guide.mealsPerDay);
  const itemsPerMeal = phase.key === "5_6" ? 2 : 3;

  const meals = activeMeals.map((name) => {
    const staple = pick(FOOD.staple, rand());
    const veg = pick(FOOD.veg, rand());
    const protein = pick(FOOD.protein, rand());
    const cook = pick(COOK, rand());

    const wobble = 0.9 + rand() * 0.2; // 0.9..1.1
    const stapleG = Math.round(guide.categories.staple * adj * wobble);
    const vegG = Math.round(guide.categories.veg * adj * wobble);
    const proteinG = Math.round(guide.categories.protein * adj * wobble);

  const items: PlanItem[]  = [
      { cat: "staple", text: `${staple}（${cook}）`, grams: stapleG },
      { cat: "veg", text: `${veg}（${cook}）`, grams: vegG },
    ];

    if (itemsPerMeal >= 3) {
      items.push({ cat: "protein", text: `${protein}（${cook}）`, grams: proteinG });
    }

    const totalGrams = items.reduce((a, b) => a + b.grams, 0);
    return { name, items, totalGrams };
  });

  return {
    dateIso,
    phase,
    guideNote: guide.note,
    seed,
    adjustFactor: adj,
    meals,
    version: 1,
  };
}
