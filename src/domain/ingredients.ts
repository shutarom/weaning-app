import type { Allergen, Ingredient } from "./types";

// baby-meal-planner (Gemini CLI版) の食材マスターを移植。
// idはローカルの安定キー（Firestoreのドキュメント名にもそのまま使う）。
//
// stageForms はそのステージで実際に提案してよい形状・調理法を表す。
// キーが存在しないステージでは提案候補から除外されるため、
// 「がゆの精製度」のように月齢が進むと別の食材に置き換わるべきものは
// 該当ステージのみ定義し、野菜・タンパク質のように月齢が進んでも
// （硬さを変えて）出し続けてよいものは複数ステージ分を定義する。
export const INGREDIENT_MASTER: Ingredient[] = [
  // ===== 炭水化物 =====
  {
    id: "gayu_10", name: "10倍がゆ", category: "carb", earliestStage: "5_6",
    allergens: [],
    stageForms: { "5_6": "米1:水10で炊いてなめらかに裏ごししたポタージュ状" },
  },
  {
    id: "gayu_7", name: "7倍がゆ", category: "carb", earliestStage: "7_8",
    allergens: [],
    stageForms: { "7_8": "米1:水7で炊いて舌でつぶせるとろみ状" },
  },
  {
    id: "gayu_5", name: "5倍がゆ", category: "carb", earliestStage: "9_11",
    allergens: [],
    stageForms: { "9_11": "米1:水5で炊いて粒が残るやわらかさ" },
  },
  {
    id: "nanhan", name: "軟飯", category: "carb", earliestStage: "12_18",
    allergens: [],
    stageForms: { "12_18": "米1:水2〜3で炊いた歯ぐきでつぶせるかたさ" },
  },
  {
    id: "shokupan", name: "食パン (小麦)", category: "carb", earliestStage: "7_8",
    allergens: ["wheat"],
    stageForms: {
      "7_8": "耳を除きお湯やミルクでふやかしてつぶす",
      "9_11": "耳を除き1cm角にちぎる",
      "12_18": "耳を除き手づかみしやすい大きさにちぎる",
    },
  },
  {
    id: "udon", name: "うどん (小麦)", category: "carb", earliestStage: "7_8",
    allergens: ["wheat"],
    stageForms: {
      "7_8": "やわらかく茹でて2〜3mmに刻む",
      "9_11": "やわらかく茹でて1cm長さに刻む",
      "12_18": "やわらかく茹でて食べやすい長さに切る",
    },
  },
  {
    id: "somen", name: "そうめん (小麦)", category: "carb", earliestStage: "7_8",
    allergens: ["wheat"],
    stageForms: {
      "7_8": "塩抜きしてやわらかく茹で2〜3mmに刻む",
      "9_11": "塩抜きしてやわらかく茹で1cm長さに刻む",
      "12_18": "塩抜きしてやわらかく茹で食べやすい長さに切る",
    },
  },
  {
    id: "satsumaimo", name: "さつまいも", category: "carb", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": "皮をむき蒸してなめらかにマッシュ",
      "7_8": "皮をむき蒸して2〜3mm角につぶし残す",
      "9_11": "皮をむき蒸して5〜8mm角",
      "12_18": "皮をむき蒸して1cm角",
    },
  },
  {
    id: "jagaimo", name: "じゃがいも", category: "carb", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": "皮をむき茹でてなめらかにマッシュ",
      "7_8": "皮をむき茹でて2〜3mm角につぶし残す",
      "9_11": "皮をむき茹でて5〜8mm角",
      "12_18": "皮をむき茹でて1cm角",
    },
  },

  // ===== ビタミン・ミネラル =====
  {
    id: "ninjin", name: "にんじん", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": "やわらかく茹でて裏ごし",
      "7_8": "やわらかく茹でて2〜3mmのみじん切り",
      "9_11": "やわらかく茹でて5〜8mm角",
      "12_18": "やわらかく茹でて1cm角",
    },
  },
  {
    id: "kabocha", name: "かぼちゃ", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": "皮とわたを除き蒸してなめらかにマッシュ",
      "7_8": "皮を除き蒸して2〜3mm角につぶし残す",
      "9_11": "皮を除き蒸して5〜8mm角",
      "12_18": "皮を除き蒸して1cm角",
    },
  },
  {
    id: "hourensou", name: "ほうれん草", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": "穂先のみ茹でて裏ごし（茎は使わない）",
      "7_8": "穂先を茹でて2〜3mmに刻む",
      "9_11": "茎もやわらかく茹でて5〜8mmに刻む",
      "12_18": "やわらかく茹でて1cm幅に刻む",
    },
  },
  {
    id: "broccoli", name: "ブロッコリー", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": "穂先を茹でて裏ごし",
      "7_8": "穂先を茹でて2〜3mmに刻む",
      "9_11": "小房を茹でて手づかみできる大きさ",
      "12_18": "小房を茹でてそのまま",
    },
  },
  {
    id: "daikon", name: "大根", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": "やわらかく茹でて裏ごし",
      "7_8": "やわらかく茹でて2〜3mmのみじん切り",
      "9_11": "やわらかく茹でて5〜8mm角",
      "12_18": "やわらかく茹でて1cm角",
    },
  },
  {
    id: "cabbage", name: "キャベツ", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": "芯を除きやわらかく茹でて裏ごし",
      "7_8": "芯を除きやわらかく茹でて2〜3mmに刻む",
      "9_11": "やわらかく茹でて5〜8mmに刻む",
      "12_18": "やわらかく茹でて1cm幅に刻む",
    },
  },
  {
    id: "tamanegi", name: "玉ねぎ", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": "辛味が抜けるまでよく加熱して裏ごし",
      "7_8": "よく加熱して2〜3mmのみじん切り",
      "9_11": "よく加熱して5〜8mm角",
      "12_18": "よく加熱して1cm角",
    },
  },
  {
    id: "tomato", name: "トマト", category: "vitamin", earliestStage: "7_8",
    allergens: [],
    stageForms: {
      "7_8": "皮と種を除き加熱して2〜3mm角",
      "9_11": "皮と種を除き加熱して5〜8mm角",
      "12_18": "皮を除き1cm角（生でも可）",
    },
  },
  {
    id: "ringo", name: "りんご", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": "皮をむきすりおろすか煮てなめらかに裏ごし",
      "7_8": "皮をむき加熱して2〜3mm角",
      "9_11": "皮をむき加熱して5〜8mm角（生の薄切りも可）",
      "12_18": "皮をむき1cm角（生でも可）",
    },
  },
  {
    id: "banana", name: "バナナ", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": "フォークでなめらかにつぶす",
      "7_8": "フォークで粗くつぶす",
      "9_11": "5〜8mmの輪切り",
      "12_18": "手づかみしやすい大きさに切る",
    },
  },

  // ===== タンパク質 =====
  {
    id: "tofu", name: "豆腐 (大豆)", category: "protein", earliestStage: "5_6",
    allergens: ["soy"],
    stageForms: {
      "5_6": "茹でてなめらかに裏ごし",
      "7_8": "茹でて2〜3mm角につぶし残す",
      "9_11": "茹でて5〜8mm角",
      "12_18": "1cm角",
    },
  },
  {
    id: "kinako", name: "きな粉 (大豆)", category: "protein", earliestStage: "7_8",
    allergens: ["soy"],
    stageForms: {
      "7_8": "おかゆやペーストにひとつまみ混ぜる",
      "9_11": "ヨーグルトやおやきに混ぜる",
      "12_18": "料理に少量ふりかける",
    },
  },
  {
    id: "natto", name: "納豆 (大豆)", category: "protein", earliestStage: "7_8",
    allergens: ["soy"],
    stageForms: {
      "7_8": "加熱して細かく刻み粘りを切る",
      "9_11": "細かく刻んで粘りを軽く切る",
      "12_18": "軽く刻む",
    },
  },
  {
    id: "shirasu", name: "しらす干し", category: "protein", earliestStage: "5_6",
    allergens: ["fish"],
    stageForms: {
      "5_6": "塩抜きして茹でて裏ごし",
      "7_8": "塩抜きして茹でて細かく刻む",
      "9_11": "塩抜きして粗めに刻む",
      "12_18": "塩抜きしてそのまま",
    },
  },
  {
    id: "shiromizakana", name: "白身魚 (たら・タイ等)", category: "protein", earliestStage: "5_6",
    allergens: ["fish"],
    stageForms: {
      "5_6": "よく加熱し骨と皮を除きなめらかにほぐす",
      "7_8": "よく加熱し骨と皮を除き細かくほぐす",
      "9_11": "よく加熱し骨と皮を除き粗くほぐす",
      "12_18": "よく加熱しほぐしてそのまま",
    },
  },
  {
    id: "ranou", name: "卵黄", category: "protein", earliestStage: "7_8",
    allergens: ["egg"],
    stageForms: {
      "7_8": "固ゆでにしてなめらかに裏ごし（ひとさじから）",
      "9_11": "固ゆでにして刻む",
    },
  },
  {
    id: "zenran", name: "全卵", category: "protein", earliestStage: "9_11",
    allergens: ["egg"],
    stageForms: {
      "9_11": "しっかり加熱し（固ゆで卵・薄焼き卵）細かく刻む",
      "12_18": "しっかり加熱して食べやすい大きさに切る",
    },
  },
  {
    id: "yogurt", name: "ヨーグルト (乳)", category: "protein", earliestStage: "7_8",
    allergens: ["milk"],
    stageForms: {
      "7_8": "無糖プレーンをそのまま",
      "9_11": "無糖プレーンをそのまま",
      "12_18": "無糖プレーンをそのまま",
    },
  },
  {
    id: "sasami", name: "鶏ささみ", category: "protein", earliestStage: "7_8",
    allergens: [],
    stageForms: {
      "7_8": "筋を除きよく茹でてすりつぶす",
      "9_11": "筋を除きよく茹でて細かくほぐす",
      "12_18": "筋を除きよく茹でて粗くほぐす",
    },
  },
  {
    id: "sake", name: "鮭", category: "protein", earliestStage: "9_11",
    allergens: ["fish"],
    stageForms: {
      "9_11": "よく加熱し骨と皮を除き粗くほぐす",
      "12_18": "よく加熱しほぐしてそのまま",
    },
  },
  {
    id: "tsuna", name: "ツナ缶 (水煮)", category: "protein", earliestStage: "9_11",
    allergens: ["fish"],
    stageForms: {
      "9_11": "湯通しして油と塩分を落とし粗くほぐす",
      "12_18": "湯通しして油と塩分を落としほぐす",
    },
  },
  {
    id: "torihikiniku", name: "鶏ひき肉", category: "protein", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": "よく加熱しパラパラになるまでほぐす",
      "12_18": "よく加熱してそぼろ状・団子状",
    },
  },
  {
    id: "gyubutahikiniku", name: "牛・豚ひき肉", category: "protein", earliestStage: "12_18",
    allergens: [],
    stageForms: {
      "12_18": "よく加熱し脂を落としてそぼろ状・団子状",
    },
  },

  // ===== その他 =====
  {
    id: "dashijiru", name: "だし汁", category: "other", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": "昆布と鰹節の一番だし（調味料代わりに）",
      "7_8": "昆布と鰹節の一番だし（調味料代わりに）",
      "9_11": "昆布と鰹節の一番だし（調味料代わりに）",
      "12_18": "昆布と鰹節の一番だし（調味料代わりに）",
    },
  },
  {
    id: "yasaisoup", name: "野菜スープ", category: "other", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": "野菜くずを煮出した無塩スープ",
      "7_8": "野菜くずを煮出した無塩スープ",
      "9_11": "野菜くずを煮出した無塩スープ",
      "12_18": "野菜くずを煮出した無塩スープ",
    },
  },
  {
    id: "gyunyu", name: "牛乳 (飲用)", category: "other", earliestStage: "12_18",
    allergens: ["milk"],
    stageForms: { "12_18": "加熱してから飲用、または調理に使う" },
  },
];

export const INGREDIENT_CATEGORY_LABEL: Record<Ingredient["category"], string> = {
  carb: "炭水化物",
  protein: "タンパク質",
  vitamin: "ビタミン・ミネラル",
  other: "その他",
};

export const ALLERGEN_LABEL: Record<Allergen, string> = {
  egg: "卵",
  milk: "乳",
  wheat: "小麦",
  soy: "大豆",
  peanut: "落花生",
  walnut: "くるみ",
  buckwheat: "そば",
  shrimp: "えび",
  crab: "かに",
  fish: "魚",
  sesame: "ごま",
};

export const ALLERGENS: Allergen[] = [
  "egg", "milk", "wheat", "soy", "peanut",
  "walnut", "buckwheat", "shrimp", "crab", "fish", "sesame",
];
