import type { Recipe } from "./types";

// オフラインの簡易レシピライブラリ。各ステージ4品、小規模な手作りセット。
// 参照する食材(ingredientIds)は必ず INGREDIENT_MASTER に存在し、
// 該当ステージの stageForms を持つものだけを使う(generateSuggestion側で
// 実行時にも安全フィルタを通すため、ここでの整合性は vitest で担保する)。
export const RECIPE_MASTER: Recipe[] = [
  // ===== 初期(5-6ヶ月) : 主食+野菜の2品 =====
  {
    id: "r_ninjin_gayu",
    name: "にんじんの10倍がゆ",
    stage: "5_6",
    ingredientIds: ["gayu_10", "ninjin"],
    note: "がゆに裏ごししたにんじんを混ぜるだけ",
  },
  {
    id: "r_kabocha_gayu",
    name: "かぼちゃの10倍がゆ",
    stage: "5_6",
    ingredientIds: ["gayu_10", "kabocha"],
    note: "かぼちゃの自然な甘みでがゆが食べやすくなる",
  },
  {
    id: "r_satsumaimo_hourensou",
    name: "さつまいもとほうれん草のうらごし",
    stage: "5_6",
    ingredientIds: ["satsumaimo", "hourensou"],
    note: "さつまいもの甘みでほうれん草のえぐみが和らぐ",
  },
  {
    id: "r_jagaimo_daikon",
    name: "じゃがいもと大根のうらごし",
    stage: "5_6",
    ingredientIds: ["jagaimo", "daikon"],
    note: "どちらもくせが少なく、離乳食に慣れていない時期でも食べやすい",
  },

  // ===== 中期(7-8ヶ月) : 主食+野菜+タンパク質の3品 =====
  {
    id: "r_ninjin_shiromizakana_gayu",
    name: "にんじんと白身魚の7倍がゆ",
    stage: "7_8",
    ingredientIds: ["gayu_7", "ninjin", "shiromizakana"],
    note: "白身魚はしっかりほぐしてがゆに混ぜ込む",
  },
  {
    id: "r_kabocha_tofu_gayu",
    name: "かぼちゃ豆腐がゆ",
    stage: "7_8",
    ingredientIds: ["gayu_7", "kabocha", "tofu"],
    note: "豆腐は崩しながら混ぜるととろみがつく",
  },
  {
    id: "r_tomato_sasami_gayu",
    name: "トマトと鶏ささみの7倍がゆ",
    stage: "7_8",
    ingredientIds: ["gayu_7", "tomato", "sasami"],
    note: "トマトの酸味でささみのパサつきが食べやすくなる",
  },
  {
    id: "r_satsumaimo_shirasu",
    name: "さつまいもとしらすの温野菜",
    stage: "7_8",
    ingredientIds: ["satsumaimo", "hourensou", "shirasu"],
    note: "しらすは塩抜きしてから混ぜる",
  },

  // ===== 後期(9-11ヶ月) : 主食+野菜+タンパク質の3品 =====
  {
    id: "r_ninjin_torihikiniku_gayu",
    name: "にんじんと鶏ひき肉の5倍がゆ",
    stage: "9_11",
    ingredientIds: ["gayu_5", "ninjin", "torihikiniku"],
    note: "ひき肉はパラパラになるまで加熱してから混ぜる",
  },
  {
    id: "r_kabocha_sake",
    name: "かぼちゃと鮭のうま煮",
    stage: "9_11",
    ingredientIds: ["gayu_5", "kabocha", "sake"],
    note: "鮭は小骨を必ず確認してからほぐす",
  },
  {
    id: "r_broccoli_shiromizakana_ankake",
    name: "ブロッコリーと白身魚のあんかけがゆ",
    stage: "9_11",
    ingredientIds: ["gayu_5", "broccoli", "shiromizakana"],
    note: "水溶き片栗粉で軽くとろみをつけると食べやすい",
  },
  {
    id: "r_satsumaimo_zenran",
    name: "さつまいもと卵の炒め煮",
    stage: "9_11",
    ingredientIds: ["satsumaimo", "tamanegi", "zenran"],
    note: "卵はしっかり加熱し、初回は少量から",
  },

  // ===== 完了期(12-18ヶ月) : 主食+野菜+タンパク質の3品 =====
  {
    id: "r_gyubuta_ankake",
    name: "軟飯と牛豚そぼろの野菜あんかけ",
    stage: "12_18",
    ingredientIds: ["nanhan", "ninjin", "gyubutahikiniku"],
    note: "そぼろは脂を落としてから野菜あんと合わせる",
  },
  {
    id: "r_renkon_tsukune",
    name: "れんこんと鶏ひき肉のつくね風がゆ",
    stage: "12_18",
    ingredientIds: ["nanhan", "renkon", "torihikiniku"],
    note: "れんこんはすりおろして混ぜると食感が優しくなる",
  },
  {
    id: "r_tomato_tsuna_nanhan",
    name: "トマトとツナの手づかみ軟飯",
    stage: "12_18",
    ingredientIds: ["nanhan", "tomato", "tsuna"],
    note: "軟飯を小さいおにぎり状にすると手づかみ食べの練習になる",
  },
  {
    id: "r_satsumaimo_sake_hoiru",
    name: "さつまいもと鮭のホイル蒸し風",
    stage: "12_18",
    ingredientIds: ["satsumaimo", "broccoli", "sake"],
    note: "電子レンジで加熱するとホイル蒸しのように仕上がる",
  },
];
