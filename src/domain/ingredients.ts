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
    // そばアレルギーは症状が重篤化しやすい食材として知られ、厚労省ガイドも
    // 月齢を明示していない。1歳〜1歳半以降が目安とされるため、離乳食完了期の
    // 中でも遅め。日次提案には出さず、食材チェック・アレルギー記録用に用意する。
    id: "soba", name: "そば (蕎麦)", category: "carb", earliestStage: "12_18",
    allergens: ["buckwheat"],
    neverSuggest: true,
    stageForms: {
      "12_18": "よく茹でて短く刻む（平日の午前中など受診しやすい時間に少量から）",
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
  {
    id: "nasu", name: "なす", category: "vitamin", earliestStage: "7_8",
    allergens: [],
    stageForms: {
      "7_8": "皮をむきアク抜きしてよく加熱し2〜3mm角につぶし残す",
      "9_11": "皮をむきよく加熱して5〜8mm角",
      "12_18": "よく加熱して1cm角",
    },
  },
  {
    id: "piiman", name: "ピーマン", category: "vitamin", earliestStage: "7_8",
    allergens: [],
    stageForms: {
      "7_8": "種とわたを除きよく加熱して2〜3mm角",
      "9_11": "種とわたを除きよく加熱して5〜8mm角",
      "12_18": "種とわたを除きよく加熱して1cm角",
    },
  },
  {
    id: "paprika", name: "パプリカ", category: "vitamin", earliestStage: "7_8",
    allergens: [],
    stageForms: {
      "7_8": "皮と種を除きよく加熱して2〜3mm角",
      "9_11": "皮と種を除きよく加熱して5〜8mm角",
      "12_18": "皮と種を除きよく加熱して1cm角",
    },
  },
  {
    id: "kyuuri", name: "きゅうり", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": "皮をむいてすりおろすか加熱してなめらかにする",
      "7_8": "皮をむき薄切りにしてやわらかく茹でる",
      "9_11": "皮をむき5〜8mm角（加熱するとより安心）",
      "12_18": "皮をむき1cm角（生でも可）",
    },
  },
  {
    id: "renkon", name: "れんこん", category: "vitamin", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": "皮をむきやわらかく茹でてすりおろすか5〜8mm角",
      "12_18": "皮をむきやわらかく茹でて1cm角",
    },
  },
  {
    id: "gobo", name: "ごぼう", category: "vitamin", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": "アク抜きしてやわらかく茹ですりおろすか5〜8mm角",
      "12_18": "アク抜きしてやわらかく茹でて1cm角",
    },
  },
  {
    id: "satoimo", name: "さといも", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": "皮をむき茹でてなめらかにマッシュ（ぬめりは取り除く）",
      "7_8": "皮をむき茹でて2〜3mm角につぶし残す",
      "9_11": "皮をむき茹でて5〜8mm角",
      "12_18": "皮をむき茹でて1cm角",
    },
  },
  {
    id: "okura", name: "オクラ", category: "vitamin", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": "産毛を取り除きやわらかく茹でて小さく刻む（種が多ければ除く）",
      "12_18": "産毛を取り除きやわらかく茹でて小口切り",
    },
  },
  {
    id: "toumorokoshi", name: "とうもろこし", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": "やわらかく茹でて薄皮を除き裏ごししたポタージュ状",
      "7_8": "やわらかく茹でて薄皮を除き粗くつぶす",
      "9_11": "やわらかく茹でて粒のまま(薄皮は気になれば除く)",
      "12_18": "やわらかく茹でてそのまま",
    },
  },
  {
    id: "komatsuna", name: "小松菜", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": "やわらかく茹でて葉先を裏ごし",
      "7_8": "やわらかく茹でて2〜3mmに刻む",
      "9_11": "やわらかく茹でて5〜8mmに刻む",
      "12_18": "やわらかく茹でて1cm幅に刻む",
    },
  },
  {
    id: "asparagus", name: "アスパラガス", category: "vitamin", earliestStage: "7_8",
    allergens: [],
    stageForms: {
      "7_8": "穂先を中心にやわらかく茹でて2〜3mmに刻む",
      "9_11": "皮の固い部分を除きやわらかく茹でて5〜8mmに刻む",
      "12_18": "皮の固い部分を除きやわらかく茹でて1cm幅",
    },
  },
  {
    id: "serori", name: "セロリ", category: "vitamin", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": "筋を取りよく加熱して香りを弱め5〜8mm角",
      "12_18": "筋を取りよく加熱して1cm角",
    },
  },
  {
    id: "shimeji", name: "しめじ (きのこ類)", category: "vitamin", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": "石づきを除きやわらかく茹でてみじん切り",
      "12_18": "石づきを除きやわらかく茹でて小さくほぐす",
    },
  },
  {
    id: "edamame", name: "枝豆 (大豆)", category: "vitamin", earliestStage: "7_8",
    allergens: ["soy"],
    stageForms: {
      "7_8": "薄皮を除きやわらかく茹でてつぶす",
      "9_11": "薄皮を除きやわらかく茹でて粗くつぶす",
      "12_18": "薄皮を除きやわらかく茹でて刻む",
    },
  },
  {
    id: "ichigo", name: "いちご", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": "加熱して種と繊維が気にならないよう裏ごし",
      "7_8": "加熱してつぶす",
      "9_11": "生のまま粗くつぶすか5〜8mm角",
      "12_18": "生のままへたを取り食べやすい大きさに切る",
    },
  },
  {
    id: "mikan", name: "みかん", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": "皮と薄皮・筋を除き実をなめらかにつぶす（酸味が気になれば加熱）",
      "7_8": "皮と薄皮を除き実を粗くつぶす",
      "9_11": "皮と薄皮を除き食べやすい大きさにほぐす",
      "12_18": "皮と薄皮を除き小房のまま",
    },
  },
  {
    id: "momo", name: "もも", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": "皮をむきなめらかにつぶす",
      "7_8": "皮をむき粗くつぶす",
      "9_11": "皮をむき5〜8mm角",
      "12_18": "皮をむき1cm角",
    },
  },
  {
    id: "nashi", name: "なし", category: "vitamin", earliestStage: "7_8",
    allergens: [],
    stageForms: {
      "7_8": "皮をむきすりおろすか加熱してつぶす",
      "9_11": "皮をむき5〜8mm角（加熱するとより安心）",
      "12_18": "皮をむき1cm角（生でも可）",
    },
  },
  {
    id: "suika", name: "すいか", category: "vitamin", earliestStage: "7_8",
    allergens: [],
    stageForms: {
      "7_8": "種を除きなめらかにつぶす",
      "9_11": "種を除き5〜8mm角",
      "12_18": "種を除き1cm角",
    },
  },
  {
    id: "melon", name: "メロン", category: "vitamin", earliestStage: "7_8",
    allergens: [],
    stageForms: {
      "7_8": "種とわたを除きなめらかにつぶす",
      "9_11": "種とわたを除き5〜8mm角",
      "12_18": "種とわたを除き1cm角",
    },
  },
  {
    // 特定原材料等28品目の一つ。口腔アレルギー症候群(OAS)の原因になりやすい果物として
    // 知られるため後期からとし、念のため加熱して与える形にする。
    id: "kiwi", name: "キウイ", category: "vitamin", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": "皮をむき加熱してつぶす（口腔アレルギー症状に注意し少量から）",
      "12_18": "皮をむき加熱して1cm角（生は少量から慎重に）",
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
    // 「ひとつまみ」レベルの薬味であり、主菜1食分(20〜40g)として提案するのは不適切なため
    // 日次提案の対象からは外す（食材チェックでの記録用途では使う）。
    neverSuggest: true,
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
  {
    id: "goma", name: "ごま", category: "protein", earliestStage: "9_11",
    allergens: ["sesame"],
    // 「耳かき1さじ」レベルの薬味であり、主菜1食分として提案するのは不適切なため
    // 日次提案の対象からは外す（食材チェックでの記録用途では使う）。
    neverSuggest: true,
    stageForms: {
      "9_11": "すりごま・ねりごまをごく少量（耳かき1さじから）料理に混ぜる",
      "12_18": "すりごま・ねりごまを少量ふりかける",
    },
  },
  {
    // 甲殻類アレルギーは重篤化しやすく、離乳食期(〜18ヶ月)に積極的に
    // 与える必要は無いとされる食材。食材チェック・アレルギー記録用に用意する。
    id: "ebi", name: "えび", category: "protein", earliestStage: "12_18",
    allergens: ["shrimp"],
    neverSuggest: true,
    stageForms: {
      "12_18": "よく加熱し殻と背わたを除き細かく刻む（無理に急いで与える必要はない）",
    },
  },
  {
    id: "kani", name: "かに", category: "protein", earliestStage: "12_18",
    allergens: ["crab"],
    neverSuggest: true,
    stageForms: {
      "12_18": "よく加熱しほぐし身を細かくほぐす（無理に急いで与える必要はない）",
    },
  },
  {
    // 誤嚥防止のため必ずペースト・パウダー状で。粒や刻んだものは厳禁。
    // 早期導入に関する研究はあるが国内では明確には推奨されておらず、
    // 既往症(アトピー等)がある場合は必ず医師の指導のもとで行う。
    id: "kurumi", name: "くるみ (ナッツ類)", category: "protein", earliestStage: "12_18",
    allergens: ["walnut"],
    neverSuggest: true,
    stageForms: {
      "12_18": "必ずペースト状にしてごく少量から（粒・刻んだものは誤嚥の危険があり厳禁）",
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
