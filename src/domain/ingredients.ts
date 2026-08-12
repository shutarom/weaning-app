import type { Allergen, Ingredient } from "./types";

// baby-meal-planner (Gemini CLI版) の食材マスターを移植・拡充。
// idはローカルの安定キー（Firestoreのドキュメント名にもそのまま使う）。
//
// stageForms はそのステージで実際に提案してよい調理情報を表す。
// キーが存在しないステージでは提案候補から除外されるため、
// 「がゆの精製度」のように月齢が進むと別の食材に置き換わるべきものは
// 該当ステージのみ定義し、野菜・タンパク質のように月齢が進んでも
// （硬さを変えて）出し続けてよいものは複数ステージ分を定義する。
// tip（食べさせ方の工夫）は主に日次提案で頻繁に登場する食材にだけ付けている。
export const INGREDIENT_MASTER: Ingredient[] = [
  // ===== 炭水化物 =====
  {
    id: "gayu_10", name: "10倍がゆ", category: "carb", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": {
        cook: "米1:水10で炊いてなめらかに裏ごししたポタージュ状",
        tip: "スプーンから自然に落ちるくらいのとろみが目安。冷凍する場合は製氷皿で小分けに",
      },
    },
  },
  {
    id: "gayu_7", name: "7倍がゆ", category: "carb", earliestStage: "7_8",
    allergens: [],
    stageForms: {
      "7_8": {
        cook: "米1:水7で炊いて舌でつぶせるとろみ状",
        tip: "つぶつぶが残る食感に慣れてきたサイン。無理に裏ごしに戻さなくてよい",
      },
    },
  },
  {
    id: "gayu_5", name: "5倍がゆ", category: "carb", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": {
        cook: "米1:水5で炊いて粒が残るやわらかさ",
        tip: "歯ぐきでつぶせる硬さ。丸呑みしていないか食べる様子を見ておく",
      },
    },
  },
  {
    id: "nanhan", name: "軟飯", category: "carb", earliestStage: "12_18",
    allergens: [],
    stageForms: {
      "12_18": {
        cook: "米1:水2〜3で炊いた歯ぐきでつぶせるかたさ",
        tip: "大人のご飯より柔らかめを保つ。丸呑みが多ければもう少しやわらかく戻す",
      },
    },
  },
  {
    id: "shokupan", name: "食パン (小麦)", category: "carb", earliestStage: "7_8",
    allergens: ["wheat"],
    stageForms: {
      "7_8": {
        cook: "耳を除きお湯やミルクでふやかしてつぶす",
        tip: "パサつくと飲み込みにくいので、必ず水分でしっとりさせてから与える",
      },
      "9_11": { cook: "耳を除き1cm角にちぎる" },
      "12_18": {
        cook: "耳を除き手づかみしやすい大きさにちぎる",
        tip: "手づかみ食べの練習に向くが、口に詰め込みすぎないよう見守る",
      },
    },
  },
  {
    id: "udon", name: "うどん (小麦)", category: "carb", earliestStage: "7_8",
    allergens: ["wheat"],
    stageForms: {
      "7_8": { cook: "やわらかく茹でて2〜3mmに刻む" },
      "9_11": { cook: "やわらかく茹でて1cm長さに刻む" },
      "12_18": {
        cook: "やわらかく茹でて食べやすい長さに切る",
        tip: "麺類はすすると詰まりやすいので、必ず短く切ってから与える",
      },
    },
  },
  {
    id: "somen", name: "そうめん (小麦)", category: "carb", earliestStage: "7_8",
    allergens: ["wheat"],
    stageForms: {
      "7_8": {
        cook: "塩抜きしてやわらかく茹で2〜3mmに刻む",
        tip: "乾麺は塩分が多いので、茹でた後さらに水にさらして塩抜きする",
      },
      "9_11": { cook: "塩抜きしてやわらかく茹で1cm長さに刻む" },
      "12_18": { cook: "塩抜きしてやわらかく茹で食べやすい長さに切る" },
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
      "12_18": { cook: "よく茹でて短く刻む（平日の午前中など受診しやすい時間に少量から）" },
    },
  },
  {
    id: "satsumaimo", name: "さつまいも", category: "carb", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": { cook: "皮をむき蒸してなめらかにマッシュ" },
      "7_8": { cook: "皮をむき蒸して2〜3mm角につぶし残す" },
      "9_11": {
        cook: "皮をむき蒸して5〜8mm角",
        tip: "自然な甘みがあるので野菜が苦手な子でも食べやすい",
      },
      "12_18": { cook: "皮をむき蒸して1cm角" },
    },
  },
  {
    id: "jagaimo", name: "じゃがいも", category: "carb", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": { cook: "皮をむき茹でてなめらかにマッシュ" },
      "7_8": { cook: "皮をむき茹でて2〜3mm角につぶし残す" },
      "9_11": { cook: "皮をむき茹でて5〜8mm角" },
      "12_18": {
        cook: "皮をむき茹でて1cm角",
        tip: "冷めるとホクホク感が失われやすいので温かいうちに与える",
      },
    },
  },

  // ===== ビタミン・ミネラル =====
  {
    id: "ninjin", name: "にんじん", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": {
        cook: "やわらかく茹でて裏ごし",
        tip: "つぶした後にだし汁でのばすとスプーンで食べやすくなる",
      },
      "7_8": { cook: "やわらかく茹でて2〜3mmのみじん切り" },
      "9_11": { cook: "やわらかく茹でて5〜8mm角" },
      "12_18": { cook: "やわらかく茹でて1cm角" },
    },
  },
  {
    id: "kabocha", name: "かぼちゃ", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": { cook: "皮とわたを除き蒸してなめらかにマッシュ" },
      "7_8": {
        cook: "皮を除き蒸して2〜3mm角につぶし残す",
        tip: "ほくほくして喉に詰まりやすいので水分を足してゆるめにする",
      },
      "9_11": { cook: "皮を除き蒸して5〜8mm角" },
      "12_18": { cook: "皮を除き蒸して1cm角" },
    },
  },
  {
    id: "hourensou", name: "ほうれん草", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": {
        cook: "穂先のみ茹でて裏ごし（茎は使わない）",
        tip: "アクが強いので茹でこぼしてから使う。えぐみが気になれば茹で汁は使わない",
      },
      "7_8": { cook: "穂先を茹でて2〜3mmに刻む" },
      "9_11": { cook: "茎もやわらかく茹でて5〜8mmに刻む" },
      "12_18": { cook: "やわらかく茹でて1cm幅に刻む" },
    },
  },
  {
    id: "broccoli", name: "ブロッコリー", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": { cook: "穂先を茹でて裏ごし" },
      "7_8": { cook: "穂先を茹でて2〜3mmに刻む" },
      "9_11": {
        cook: "小房を茹でて手づかみできる大きさ",
        tip: "軸を持って自分で食べる練習になる。房の部分から先に口へ運ぶよう渡すと安心",
      },
      "12_18": { cook: "小房を茹でてそのまま" },
    },
  },
  {
    id: "daikon", name: "大根", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": { cook: "やわらかく茹でて裏ごし" },
      "7_8": { cook: "やわらかく茹でて2〜3mmのみじん切り" },
      "9_11": { cook: "やわらかく茹でて5〜8mm角" },
      "12_18": { cook: "やわらかく茹でて1cm角" },
    },
  },
  {
    id: "cabbage", name: "キャベツ", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": { cook: "芯を除きやわらかく茹でて裏ごし" },
      "7_8": { cook: "芯を除きやわらかく茹でて2〜3mmに刻む" },
      "9_11": { cook: "やわらかく茹でて5〜8mmに刻む" },
      "12_18": { cook: "やわらかく茹でて1cm幅に刻む" },
    },
  },
  {
    id: "tamanegi", name: "玉ねぎ", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": {
        cook: "辛味が抜けるまでよく加熱して裏ごし",
        tip: "加熱不足だと辛味が残るので、透き通ってやわらかくなるまでしっかり火を通す",
      },
      "7_8": { cook: "よく加熱して2〜3mmのみじん切り" },
      "9_11": { cook: "よく加熱して5〜8mm角" },
      "12_18": { cook: "よく加熱して1cm角" },
    },
  },
  {
    id: "tomato", name: "トマト", category: "vitamin", earliestStage: "7_8",
    allergens: [],
    stageForms: {
      "7_8": {
        cook: "皮と種を除き加熱して2〜3mm角",
        tip: "湯むきすると皮が口に残らず食べやすい",
      },
      "9_11": { cook: "皮と種を除き加熱して5〜8mm角" },
      "12_18": { cook: "皮を除き1cm角（生でも可）" },
    },
  },
  {
    id: "ringo", name: "りんご", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": { cook: "皮をむきすりおろすか煮てなめらかに裏ごし" },
      "7_8": { cook: "皮をむき加熱して2〜3mm角" },
      "9_11": {
        cook: "皮をむき加熱して5〜8mm角（生の薄切りも可）",
        tip: "生であげる場合は薄くスライスし、丸ごとかじらせない",
      },
      "12_18": { cook: "皮をむき1cm角（生でも可）" },
    },
  },
  {
    id: "banana", name: "バナナ", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": { cook: "フォークでなめらかにつぶす" },
      "7_8": { cook: "フォークで粗くつぶす" },
      "9_11": {
        cook: "5〜8mmの輪切り",
        tip: "手づかみ食べの練習にちょうどよい。丸ごと詰め込まないよう見守る",
      },
      "12_18": { cook: "手づかみしやすい大きさに切る" },
    },
  },
  {
    id: "nasu", name: "なす", category: "vitamin", earliestStage: "7_8",
    allergens: [],
    stageForms: {
      "7_8": {
        cook: "皮をむきアク抜きしてよく加熱し2〜3mm角につぶし残す",
        tip: "水にさらしてアク抜きすると食べやすい味になる",
      },
      "9_11": { cook: "皮をむきよく加熱して5〜8mm角" },
      "12_18": { cook: "よく加熱して1cm角" },
    },
  },
  {
    id: "piiman", name: "ピーマン", category: "vitamin", earliestStage: "7_8",
    allergens: [],
    stageForms: {
      "7_8": { cook: "種とわたを除きよく加熱して2〜3mm角" },
      "9_11": { cook: "種とわたを除きよく加熱して5〜8mm角" },
      "12_18": { cook: "種とわたを除きよく加熱して1cm角" },
    },
  },
  {
    id: "paprika", name: "パプリカ", category: "vitamin", earliestStage: "7_8",
    allergens: [],
    stageForms: {
      "7_8": { cook: "皮と種を除きよく加熱して2〜3mm角" },
      "9_11": { cook: "皮と種を除きよく加熱して5〜8mm角" },
      "12_18": { cook: "皮と種を除きよく加熱して1cm角" },
    },
  },
  {
    id: "kyuuri", name: "きゅうり", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": { cook: "皮をむいてすりおろすか加熱してなめらかにする" },
      "7_8": { cook: "皮をむき薄切りにしてやわらかく茹でる" },
      "9_11": { cook: "皮をむき5〜8mm角（加熱するとより安心）" },
      "12_18": {
        cook: "皮をむき1cm角（生でも可）",
        tip: "生であげ始めて1ヶ月ほどは加熱がおすすめ。生は消化に負担がかかることがある",
      },
    },
  },
  {
    id: "renkon", name: "れんこん", category: "vitamin", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": {
        cook: "皮をむきやわらかく茹でてすりおろすか5〜8mm角",
        tip: "繊維が固く残りやすいので、すりおろしから慣らすと食べやすい",
      },
      "12_18": { cook: "皮をむきやわらかく茹でて1cm角" },
    },
  },
  {
    id: "gobo", name: "ごぼう", category: "vitamin", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": { cook: "アク抜きしてやわらかく茹ですりおろすか5〜8mm角" },
      "12_18": { cook: "アク抜きしてやわらかく茹でて1cm角" },
    },
  },
  {
    id: "satoimo", name: "さといも", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": {
        cook: "皮をむき茹でてなめらかにマッシュ（ぬめりは取り除く）",
        tip: "皮をむくときは手がかゆくなることがあるので手袋があると安心",
      },
      "7_8": { cook: "皮をむき茹でて2〜3mm角につぶし残す" },
      "9_11": { cook: "皮をむき茹でて5〜8mm角" },
      "12_18": { cook: "皮をむき茹でて1cm角" },
    },
  },
  {
    id: "okura", name: "オクラ", category: "vitamin", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": {
        cook: "産毛を取り除きやわらかく茹でて小さく刻む（種が多ければ除く）",
        tip: "塩でこすり洗いすると産毛が取れやすい",
      },
      "12_18": { cook: "産毛を取り除きやわらかく茹でて小口切り" },
    },
  },
  {
    id: "toumorokoshi", name: "とうもろこし", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": { cook: "やわらかく茹でて薄皮を除き裏ごししたポタージュ状" },
      "7_8": { cook: "やわらかく茹でて薄皮を除き粗くつぶす" },
      "9_11": {
        cook: "やわらかく茹でて粒のまま(薄皮は気になれば除く)",
        tip: "薄皮がついたまま丸呑みすると消化されにくいので、心配なら裏ごしに戻す",
      },
      "12_18": { cook: "やわらかく茹でてそのまま" },
    },
  },
  {
    id: "komatsuna", name: "小松菜", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": { cook: "やわらかく茹でて葉先を裏ごし" },
      "7_8": { cook: "やわらかく茹でて2〜3mmに刻む" },
      "9_11": { cook: "やわらかく茹でて5〜8mmに刻む" },
      "12_18": { cook: "やわらかく茹でて1cm幅に刻む" },
    },
  },
  {
    id: "asparagus", name: "アスパラガス", category: "vitamin", earliestStage: "7_8",
    allergens: [],
    stageForms: {
      "7_8": { cook: "穂先を中心にやわらかく茹でて2〜3mmに刻む" },
      "9_11": { cook: "皮の固い部分を除きやわらかく茹でて5〜8mmに刻む" },
      "12_18": { cook: "皮の固い部分を除きやわらかく茹でて1cm幅" },
    },
  },
  {
    id: "serori", name: "セロリ", category: "vitamin", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": { cook: "筋を取りよく加熱して香りを弱め5〜8mm角" },
      "12_18": { cook: "筋を取りよく加熱して1cm角" },
    },
  },
  {
    id: "shimeji", name: "しめじ (きのこ類)", category: "vitamin", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": {
        cook: "石づきを除きやわらかく茹でてみじん切り",
        tip: "弾力があって噛み切りにくいので、細かく刻んで様子を見る",
      },
      "12_18": { cook: "石づきを除きやわらかく茹でて小さくほぐす" },
    },
  },
  {
    id: "edamame", name: "枝豆 (大豆)", category: "vitamin", earliestStage: "7_8",
    allergens: ["soy"],
    stageForms: {
      "7_8": {
        cook: "薄皮を除きやわらかく茹でてつぶす",
        tip: "薄皮が喉に残りやすいので必ず取り除く",
      },
      "9_11": { cook: "薄皮を除きやわらかく茹でて粗くつぶす" },
      "12_18": { cook: "薄皮を除きやわらかく茹でて刻む" },
    },
  },
  {
    id: "ichigo", name: "いちご", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": {
        cook: "加熱して種と繊維が気にならないよう裏ごし",
        tip: "生で与えるのは噛む力がついてくる後期(9〜11ヶ月)以降が目安",
      },
      "7_8": { cook: "加熱してつぶす" },
      "9_11": { cook: "生のまま粗くつぶすか5〜8mm角" },
      "12_18": { cook: "生のままへたを取り食べやすい大きさに切る" },
    },
  },
  {
    id: "mikan", name: "みかん", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": {
        cook: "皮と薄皮・筋を除き実をなめらかにつぶす（酸味が気になれば加熱）",
        tip: "薄皮と筋は食物繊維が多く消化しにくいので必ず取り除く",
      },
      "7_8": { cook: "皮と薄皮を除き実を粗くつぶす" },
      "9_11": { cook: "皮と薄皮を除き食べやすい大きさにほぐす" },
      "12_18": { cook: "皮と薄皮を除き小房のまま" },
    },
  },
  {
    id: "momo", name: "もも", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": { cook: "皮をむきなめらかにつぶす" },
      "7_8": { cook: "皮をむき粗くつぶす" },
      "9_11": { cook: "皮をむき5〜8mm角" },
      "12_18": { cook: "皮をむき1cm角" },
    },
  },
  {
    id: "nashi", name: "なし", category: "vitamin", earliestStage: "7_8",
    allergens: [],
    stageForms: {
      "7_8": {
        cook: "皮をむきすりおろすか加熱してつぶす",
        tip: "生のまま繊維質でかたいので、慣れるまではすりおろしがおすすめ",
      },
      "9_11": { cook: "皮をむき5〜8mm角（加熱するとより安心）" },
      "12_18": { cook: "皮をむき1cm角（生でも可）" },
    },
  },
  {
    id: "suika", name: "すいか", category: "vitamin", earliestStage: "7_8",
    allergens: [],
    stageForms: {
      "7_8": { cook: "種を除きなめらかにつぶす" },
      "9_11": { cook: "種を除き5〜8mm角" },
      "12_18": { cook: "種を除き1cm角" },
    },
  },
  {
    id: "melon", name: "メロン", category: "vitamin", earliestStage: "7_8",
    allergens: [],
    stageForms: {
      "7_8": { cook: "種とわたを除きなめらかにつぶす" },
      "9_11": { cook: "種とわたを除き5〜8mm角" },
      "12_18": { cook: "種とわたを除き1cm角" },
    },
  },
  {
    // 特定原材料等28品目の一つ。口腔アレルギー症候群(OAS)の原因になりやすい果物として
    // 知られるため後期からとし、念のため加熱して与える形にする。
    id: "kiwi", name: "キウイ", category: "vitamin", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": {
        cook: "皮をむき加熱してつぶす（口腔アレルギー症状に注意し少量から）",
        tip: "口の周りが赤くなる・かゆがるなどが見られたら中止し受診を検討する",
      },
      "12_18": { cook: "皮をむき加熱して1cm角（生は少量から慎重に）" },
    },
  },

  // ===== タンパク質 =====
  {
    id: "tofu", name: "豆腐 (大豆)", category: "protein", earliestStage: "5_6",
    allergens: ["soy"],
    stageForms: {
      "5_6": {
        cook: "茹でてなめらかに裏ごし",
        tip: "加熱してから使うと安全性が高まり、離乳食に慣れていない時期でも扱いやすい",
      },
      "7_8": { cook: "茹でて2〜3mm角につぶし残す" },
      "9_11": { cook: "茹でて5〜8mm角" },
      "12_18": { cook: "1cm角" },
    },
  },
  {
    id: "kinako", name: "きな粉 (大豆)", category: "protein", earliestStage: "7_8",
    allergens: ["soy"],
    // 「ひとつまみ」レベルの薬味であり、主菜1食分(20〜40g)として提案するのは不適切なため
    // 日次提案の対象からは外す（食材チェックでの記録用途では使う）。
    neverSuggest: true,
    stageForms: {
      "7_8": { cook: "おかゆやペーストにひとつまみ混ぜる" },
      "9_11": { cook: "ヨーグルトやおやきに混ぜる" },
      "12_18": { cook: "料理に少量ふりかける" },
    },
  },
  {
    id: "natto", name: "納豆 (大豆)", category: "protein", earliestStage: "7_8",
    allergens: ["soy"],
    stageForms: {
      "7_8": {
        cook: "加熱して細かく刻み粘りを切る",
        tip: "熱湯をかけると粘りが取れて食べやすくなる",
      },
      "9_11": { cook: "細かく刻んで粘りを軽く切る" },
      "12_18": { cook: "軽く刻む" },
    },
  },
  {
    id: "shirasu", name: "しらす干し", category: "protein", earliestStage: "5_6",
    allergens: ["fish"],
    stageForms: {
      "5_6": {
        cook: "塩抜きして茹でて裏ごし",
        tip: "しらすは塩分が多いので、熱湯を回しかけるかさっと茹でて塩抜きしてから使う",
      },
      "7_8": { cook: "塩抜きして茹でて細かく刻む" },
      "9_11": { cook: "塩抜きして粗めに刻む" },
      "12_18": { cook: "塩抜きしてそのまま" },
    },
  },
  {
    id: "shiromizakana", name: "白身魚 (たら・タイ等)", category: "protein", earliestStage: "5_6",
    allergens: ["fish"],
    stageForms: {
      "5_6": {
        cook: "よく加熱し骨と皮を除きなめらかにほぐす",
        tip: "小骨が残っていないか指でよく確認してから与える",
      },
      "7_8": { cook: "よく加熱し骨と皮を除き細かくほぐす" },
      "9_11": { cook: "よく加熱し骨と皮を除き粗くほぐす" },
      "12_18": { cook: "よく加熱しほぐしてそのまま" },
    },
  },
  {
    id: "ranou", name: "卵黄", category: "protein", earliestStage: "7_8",
    allergens: ["egg"],
    stageForms: {
      "7_8": {
        cook: "固ゆでにしてなめらかに裏ごし（ひとさじから）",
        tip: "初めては平日の午前中など、症状が出てもすぐ受診できる時間帯に少量から",
      },
      "9_11": { cook: "固ゆでにして刻む" },
    },
  },
  {
    id: "zenran", name: "全卵", category: "protein", earliestStage: "9_11",
    allergens: ["egg"],
    stageForms: {
      "9_11": {
        cook: "しっかり加熱し（固ゆで卵・薄焼き卵）細かく刻む",
        tip: "卵白は卵黄よりアレルギーが出やすいため、初回は少量からゆっくり増やす",
      },
      "12_18": { cook: "しっかり加熱して食べやすい大きさに切る" },
    },
  },
  {
    id: "yogurt", name: "ヨーグルト (乳)", category: "protein", earliestStage: "7_8",
    allergens: ["milk"],
    stageForms: {
      "7_8": {
        cook: "無糖プレーンをそのまま",
        tip: "加糖タイプは糖分が多いので、必ず無糖プレーンを選ぶ",
      },
      "9_11": { cook: "無糖プレーンをそのまま" },
      "12_18": { cook: "無糖プレーンをそのまま" },
    },
  },
  {
    id: "sasami", name: "鶏ささみ", category: "protein", earliestStage: "7_8",
    allergens: [],
    stageForms: {
      "7_8": {
        cook: "筋を除きよく茹でてすりつぶす",
        tip: "パサつきやすいのでゆで汁やとろみをつけて食べやすくする",
      },
      "9_11": { cook: "筋を除きよく茹でて細かくほぐす" },
      "12_18": { cook: "筋を除きよく茹でて粗くほぐす" },
    },
  },
  {
    id: "sake", name: "鮭", category: "protein", earliestStage: "9_11",
    allergens: ["fish"],
    stageForms: {
      "9_11": {
        cook: "よく加熱し骨と皮を除き粗くほぐす",
        tip: "小骨が残っていないか指でよく確認してから与える",
      },
      "12_18": { cook: "よく加熱しほぐしてそのまま" },
    },
  },
  {
    id: "tsuna", name: "ツナ缶 (水煮)", category: "protein", earliestStage: "9_11",
    allergens: ["fish"],
    stageForms: {
      "9_11": {
        cook: "湯通しして油と塩分を落とし粗くほぐす",
        tip: "水煮タイプを選び、必ず湯通ししてから使うと塩分・油分を抑えられる",
      },
      "12_18": { cook: "湯通しして油と塩分を落としほぐす" },
    },
  },
  {
    id: "torihikiniku", name: "鶏ひき肉", category: "protein", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": {
        cook: "よく加熱しパラパラになるまでほぐす",
        tip: "加熱中に菜箸でよくほぐすとダマにならず食べやすい",
      },
      "12_18": { cook: "よく加熱してそぼろ状・団子状" },
    },
  },
  {
    id: "gyubutahikiniku", name: "牛・豚ひき肉", category: "protein", earliestStage: "12_18",
    allergens: [],
    stageForms: {
      "12_18": {
        cook: "よく加熱し脂を落としてそぼろ状・団子状",
        tip: "脂身が多いと消化に負担がかかるので赤身多めのひき肉を選ぶ",
      },
    },
  },
  {
    id: "goma", name: "ごま", category: "protein", earliestStage: "9_11",
    allergens: ["sesame"],
    // 「耳かき1さじ」レベルの薬味であり、主菜1食分として提案するのは不適切なため
    // 日次提案の対象からは外す（食材チェックでの記録用途では使う）。
    neverSuggest: true,
    stageForms: {
      "9_11": { cook: "すりごま・ねりごまをごく少量（耳かき1さじから）料理に混ぜる" },
      "12_18": { cook: "すりごま・ねりごまを少量ふりかける" },
    },
  },
  {
    // 甲殻類アレルギーは重篤化しやすく、離乳食期(〜18ヶ月)に積極的に
    // 与える必要は無いとされる食材。食材チェック・アレルギー記録用に用意する。
    id: "ebi", name: "えび", category: "protein", earliestStage: "12_18",
    allergens: ["shrimp"],
    neverSuggest: true,
    stageForms: {
      "12_18": { cook: "よく加熱し殻と背わたを除き細かく刻む（無理に急いで与える必要はない）" },
    },
  },
  {
    id: "kani", name: "かに", category: "protein", earliestStage: "12_18",
    allergens: ["crab"],
    neverSuggest: true,
    stageForms: {
      "12_18": { cook: "よく加熱しほぐし身を細かくほぐす（無理に急いで与える必要はない）" },
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
      "12_18": { cook: "必ずペースト状にしてごく少量から（粒・刻んだものは誤嚥の危険があり厳禁）" },
    },
  },

  // ===== その他 =====
  {
    id: "dashijiru", name: "だし汁", category: "other", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": { cook: "昆布と鰹節の一番だし（調味料代わりに）" },
      "7_8": { cook: "昆布と鰹節の一番だし（調味料代わりに）" },
      "9_11": { cook: "昆布と鰹節の一番だし（調味料代わりに）" },
      "12_18": { cook: "昆布と鰹節の一番だし（調味料代わりに）" },
    },
  },
  {
    id: "yasaisoup", name: "野菜スープ", category: "other", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": { cook: "野菜くずを煮出した無塩スープ" },
      "7_8": { cook: "野菜くずを煮出した無塩スープ" },
      "9_11": { cook: "野菜くずを煮出した無塩スープ" },
      "12_18": { cook: "野菜くずを煮出した無塩スープ" },
    },
  },
  {
    id: "gyunyu", name: "牛乳 (飲用)", category: "other", earliestStage: "12_18",
    allergens: ["milk"],
    stageForms: {
      "12_18": {
        cook: "加熱してから飲用、または調理に使う",
        tip: "飲用は1歳を過ぎてから。それまでは調理用として少量使う程度にする",
      },
    },
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
