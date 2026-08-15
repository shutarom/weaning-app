import type { Allergen, Ingredient, PortionGroup } from "./types";

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
      "12_18": { cook: "水切りして1cm角に切る（加熱しなくてもよい）" },
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
      "12_18": { cook: "加熱して軽く刻み、粘りが強ければ湯でのばす" },
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
    // 厚生労働省「授乳・離乳の支援ガイド(2019年改定版)」は離乳初期の項に
    // 「慣れてきたら、つぶした豆腐・白身魚・卵黄等を試してみる」と明記している。
    // また国立成育医療研究センターのPETIT研究以降、開始を遅らせるとかえって
    // 鶏卵アレルギーの発症リスクが上がるとされ、方針が変わっている。
    // 以前は中期(7_8)開始としていたが、公的ガイドに合わせて初期から出す。
    id: "ranou", name: "卵黄", category: "protein", earliestStage: "5_6",
    allergens: ["egg"],
    stageForms: {
      "5_6": {
        cook: "20分以上固ゆでにした卵黄を、耳かき1杯分からなめらかにすりつぶす",
        tip: "受診できる平日の午前中に、ごく少量から。アトピー性皮膚炎がある場合は自己判断で進めず必ずかかりつけ医に相談する",
      },
      "7_8": {
        cook: "固ゆでにしてなめらかに裏ごし",
        tip: "問題がなければ少しずつ増やし、慣れたら全卵へ進む",
      },
      "9_11": { cook: "固ゆでにして刻む" },
    },
  },
  {
    // 中期の目安量が「卵黄1個〜全卵1/3個」であるため、全卵も中期から出せる。
    id: "zenran", name: "全卵", category: "protein", earliestStage: "7_8",
    allergens: ["egg"],
    stageForms: {
      "7_8": {
        cook: "固ゆでにして白身も含めしっかりつぶす（全卵1/3個まで）",
        tip: "卵白は卵黄よりアレルギーが出やすい。卵黄に慣れてから、少量ずつ始める",
      },
      "9_11": {
        cook: "しっかり加熱し（固ゆで卵・薄焼き卵）細かく刻む",
        tip: "半熟は避け、中心まで完全に火を通す",
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

  // ============================================================
  // 拡充分
  // 献立の代わり映えと、食材チェック表の網羅性を上げるための追加。
  // 後期以降は鉄が不足しやすいため、赤身の魚・肉・レバーを厚めに入れている。
  // ============================================================

  // ===== 炭水化物（追加） =====
  {
    id: "oatmeal", name: "オートミール", category: "carb", earliestStage: "7_8",
    allergens: [],
    stageForms: {
      "7_8": {
        cook: "水や湯で10分ほど煮てとろとろのおかゆ状にする",
        tip: "おかゆより手早く作れる。粒の細かいクイックオーツが扱いやすい",
      },
      "9_11": { cook: "水分少なめに煮て粒感を少し残す" },
      "12_18": { cook: "牛乳や豆乳で煮てリゾット風にする" },
    },
  },
  {
    id: "macaroni", name: "マカロニ (小麦)", category: "carb", earliestStage: "7_8",
    allergens: ["wheat"],
    stageForms: {
      "7_8": { cook: "表示より長めに茹でて2〜3mmに刻む" },
      "9_11": { cook: "やわらかく茹でて5〜8mmに刻む" },
      "12_18": { cook: "やわらかめに茹でる（手づかみ食べにも向く）" },
    },
  },
  {
    id: "fu", name: "麩 (小麦)", category: "carb", earliestStage: "7_8",
    allergens: ["wheat"],
    stageForms: {
      "7_8": {
        cook: "すりおろすか水で戻してすりつぶす",
        tip: "汁物に入れるととろみがつく。常温保存でき、買い置きしやすい",
      },
      "9_11": { cook: "水で戻して細かく刻む" },
      "12_18": { cook: "水で戻して食べやすい大きさに切る" },
    },
  },
  {
    id: "cornflakes", name: "コーンフレーク (無糖)", category: "carb", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": {
        cook: "湯やミルクでふやかしてやわらかくする",
        tip: "砂糖・はちみつ不使用のプレーンなものを選ぶ",
      },
      "12_18": { cook: "ミルクでふやかす（少し食感を残してもよい）" },
    },
  },
  {
    id: "harusame", name: "春雨", category: "carb", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": {
        cook: "やわらかく茹でて5〜8mmに刻む",
        tip: "つるんと丸呑みしやすいので必ず短く刻む",
      },
      "12_18": { cook: "やわらかく茹でて1cm程度に刻む" },
    },
  },
  {
    id: "gohan", name: "ご飯", category: "carb", earliestStage: "12_18",
    allergens: [],
    stageForms: {
      "12_18": {
        cook: "大人よりやわらかめに炊く",
        tip: "軟飯に慣れて、丸呑みせず噛めるようになってから移行する",
      },
    },
  },

  // ===== 野菜・果物（追加） =====
  {
    id: "hakusai", name: "白菜", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": { cook: "葉先をやわらかく茹でてなめらかに裏ごし", tip: "芯は繊維が強いので葉先だけを使う" },
      "7_8": { cook: "やわらかく茹でて2〜3mmに刻む" },
      "9_11": { cook: "やわらかく茹でて5〜8mmに刻む" },
      "12_18": { cook: "やわらかく煮て食べやすい大きさに切る" },
    },
  },
  {
    id: "kabu", name: "かぶ", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": { cook: "皮を厚めにむいてやわらかく茹で、なめらかにすりつぶす", tip: "加熱すると甘みが出てくせがない" },
      "7_8": { cook: "やわらかく茹でて2〜3mmに刻む" },
      "9_11": { cook: "やわらかく煮て5〜8mm角に切る" },
      "12_18": { cook: "煮物にして食べやすい大きさに切る" },
    },
  },
  {
    id: "cauliflower", name: "カリフラワー", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": { cook: "穂先をやわらかく茹でてなめらかに裏ごし" },
      "7_8": { cook: "やわらかく茹でて2〜3mmに刻む" },
      "9_11": { cook: "やわらかく茹でて5〜8mmに刻む" },
      "12_18": { cook: "小房に分けてやわらかく茹でる（手づかみ食べにも向く）" },
    },
  },
  {
    id: "chingensai", name: "チンゲン菜", category: "vitamin", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": { cook: "葉先だけを茹でてなめらかに裏ごし", tip: "茎は繊維が強いので後期以降に回す" },
      "7_8": { cook: "葉先をやわらかく茹でて2〜3mmに刻む" },
      "9_11": { cook: "茎もやわらかく茹でて5〜8mmに刻む" },
      "12_18": { cook: "やわらかく煮て食べやすい大きさに切る" },
    },
  },
  {
    id: "zucchini", name: "ズッキーニ", category: "vitamin", earliestStage: "7_8",
    allergens: [],
    stageForms: {
      "7_8": { cook: "皮をむいてやわらかく茹で、2〜3mmに刻む" },
      "9_11": { cook: "皮をむいてやわらかく茹で、5〜8mm角に切る" },
      "12_18": { cook: "皮をむいて煮るか焼いて、食べやすい大きさに切る" },
    },
  },
  {
    id: "ingen", name: "さやいんげん", category: "vitamin", earliestStage: "7_8",
    allergens: [],
    stageForms: {
      "7_8": { cook: "筋を取ってやわらかく茹で、2〜3mmに刻む", tip: "薄皮が口に残りやすいので、気になるうちは裏ごしする" },
      "9_11": { cook: "やわらかく茹でて5〜8mmに刻む" },
      "12_18": { cook: "やわらかく茹でて1〜2cmに切る" },
    },
  },
  {
    id: "greenpeas", name: "グリンピース", category: "vitamin", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": { cook: "やわらかく茹でて薄皮を除き、粗くつぶす", tip: "薄皮は必ず取り除く。丸のままは詰まりやすい" },
      "12_18": { cook: "やわらかく茹でて薄皮を除く" },
    },
  },
  {
    id: "mizuna", name: "水菜", category: "vitamin", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": { cook: "葉先をやわらかく茹でて5mm程度に刻む" },
      "12_18": { cook: "やわらかく茹でて1cm程度に刻む" },
    },
  },
  {
    id: "moyashi", name: "もやし", category: "vitamin", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": { cook: "ひげ根を取ってやわらかく茹で、細かく刻む", tip: "繊維が残りやすいので短く刻む" },
      "12_18": { cook: "やわらかく茹でて1cm程度に刻む" },
    },
  },
  {
    id: "avocado", name: "アボカド", category: "vitamin", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": { cook: "熟したものをつぶす", tip: "脂質が多いので少量から。加熱しなくても食べられる" },
      "12_18": { cook: "熟したものを食べやすい大きさに切る" },
    },
  },
  {
    id: "budou", name: "ぶどう", category: "vitamin", earliestStage: "7_8",
    allergens: [],
    stageForms: {
      "7_8": { cook: "皮と種を除いてすりつぶす", tip: "丸のままは窒息の危険があるため、必ず4等分以下に切る" },
      "9_11": { cook: "皮と種を除いて4等分以上に切る" },
      "12_18": { cook: "皮と種を除いて4等分以上に切る" },
    },
  },
  {
    id: "prune", name: "プルーン", category: "vitamin", earliestStage: "7_8",
    allergens: [],
    stageForms: {
      "7_8": { cook: "種を除き、湯で戻してなめらかにすりつぶす", tip: "便秘がちなときに少量。与えすぎるとゆるくなる" },
      "9_11": { cook: "種を除いて細かく刻む" },
      "12_18": { cook: "種を除いて食べやすい大きさに切る" },
    },
  },
  {
    id: "kaki", name: "柿", category: "vitamin", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": { cook: "よく熟したものの皮と種を除いてつぶす", tip: "渋みが残るものは避け、やわらかく熟したものを選ぶ" },
      "12_18": { cook: "皮と種を除いて食べやすい大きさに切る" },
    },
  },
  {
    id: "blueberry", name: "ブルーベリー", category: "vitamin", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": { cook: "加熱してつぶすか、半分に切る", tip: "丸のままは喉に詰まりやすいので必ず切る" },
      "12_18": { cook: "半分に切る（丸のままは喉に詰まりやすい）" },
    },
  },
  {
    id: "wakame", name: "わかめ", category: "vitamin", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": { cook: "塩抜きしてやわらかく煮て、ごく細かく刻む", tip: "噛み切りにくく張り付きやすいので必ず細かく刻む" },
      "12_18": { cook: "塩抜きしてやわらかく煮て細かく刻む" },
    },
  },
  {
    // のりは板1枚が約3g。1食分の野菜(30〜40g)としては成立せず、
    // ごま・きな粉と同じく薬味扱い。食材チェック・アレルギー記録には残す。
    id: "nori", name: "焼きのり", category: "vitamin", earliestStage: "9_11",
    allergens: [],
    neverSuggest: true,
    stageForms: {
      "9_11": { cook: "細かくちぎるか、もんで粉状にしてかける", tip: "口や喉に張り付きやすいので、湿らせるか粉状にして使う" },
      "12_18": { cook: "小さくちぎっておにぎりに巻く" },
    },
  },
  {
    id: "hoshishiitake", name: "干ししいたけ", category: "vitamin", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": { cook: "水で戻してやわらかく煮て、ごく細かく刻む", tip: "戻し汁はだしとして使える" },
      "12_18": { cook: "水で戻してやわらかく煮て細かく刻む" },
    },
  },
  {
    id: "maitake", name: "まいたけ", category: "vitamin", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": { cook: "やわらかく煮てごく細かく刻む", tip: "きのこ類は弾力があり噛み切りにくいので細かく刻む" },
      "12_18": { cook: "やわらかく煮て細かく刻む" },
    },
  },
  {
    id: "enoki", name: "えのきたけ", category: "vitamin", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": { cook: "やわらかく煮てごく細かく刻む", tip: "繊維が長いまま入ると絡まるので、必ず短く刻む" },
      "12_18": { cook: "やわらかく煮て短く刻む" },
    },
  },
  {
    id: "kiriboshi", name: "切り干し大根", category: "vitamin", earliestStage: "12_18",
    allergens: [],
    stageForms: {
      "12_18": { cook: "水で戻してやわらかく煮て、細かく刻む", tip: "戻し汁ごと煮ると甘みが出る" },
    },
  },

  // ===== たんぱく質（追加） =====
  {
    id: "koyadofu", name: "高野豆腐 (大豆)", category: "protein", earliestStage: "7_8",
    allergens: ["soy"],
    stageForms: {
      "7_8": { cook: "凍ったまますりおろして煮る", tip: "すりおろすと下ごしらえが不要で、鉄・たんぱく質が手軽に足せる" },
      "9_11": { cook: "水で戻してやわらかく煮て細かく刻む" },
      "12_18": { cook: "水で戻して煮含め、食べやすい大きさに切る" },
    },
  },
  {
    id: "atsuage", name: "厚揚げ (大豆)", category: "protein", earliestStage: "9_11",
    allergens: ["soy"],
    stageForms: {
      "9_11": { cook: "熱湯をかけて油抜きし、やわらかく煮て細かく刻む", tip: "油抜きをしないと脂質が多すぎる" },
      "12_18": { cook: "油抜きして煮含め、食べやすい大きさに切る" },
    },
  },
  {
    id: "daizunisui", name: "大豆水煮 (大豆)", category: "protein", earliestStage: "9_11",
    allergens: ["soy"],
    stageForms: {
      "9_11": { cook: "薄皮を除いてやわらかく煮てつぶす", tip: "薄皮が口に残りやすいので必ず取り除く" },
      "12_18": { cook: "やわらかく煮て粗くつぶす" },
    },
  },
  {
    id: "maguro", name: "まぐろ (赤身)", category: "protein", earliestStage: "7_8",
    allergens: ["fish"],
    stageForms: {
      "7_8": { cook: "しっかり加熱してほぐし、ゆで汁でのばす", tip: "白身魚に慣れてから赤身魚へ。鉄が多く、後期以降の鉄不足対策になる" },
      "9_11": { cook: "しっかり加熱して5〜8mmにほぐす" },
      "12_18": { cook: "しっかり加熱して食べやすい大きさにほぐす" },
    },
  },
  {
    id: "katsuo", name: "かつお", category: "protein", earliestStage: "9_11",
    allergens: ["fish"],
    stageForms: {
      "9_11": { cook: "しっかり加熱してほぐす", tip: "鉄が豊富。刺身用でも必ず中心まで加熱する" },
      "12_18": { cook: "しっかり加熱してほぐす" },
    },
  },
  {
    id: "buri", name: "ぶり", category: "protein", earliestStage: "9_11",
    allergens: ["fish"],
    stageForms: {
      "9_11": { cook: "しっかり加熱し、小骨と皮を除いてほぐす", tip: "脂が多い青背魚。白身魚・赤身魚に慣れてから少量ずつ" },
      "12_18": { cook: "しっかり加熱し、小骨と皮を除いてほぐす" },
    },
  },
  {
    id: "aji", name: "あじ", category: "protein", earliestStage: "9_11",
    allergens: ["fish"],
    stageForms: {
      "9_11": { cook: "しっかり加熱し、小骨と皮を丁寧に除いてほぐす", tip: "小骨が多いので必ず指で確認する" },
      "12_18": { cook: "しっかり加熱し、小骨と皮を除いてほぐす" },
    },
  },
  {
    id: "iwashi", name: "いわし", category: "protein", earliestStage: "9_11",
    allergens: ["fish"],
    stageForms: {
      "9_11": { cook: "しっかり加熱し、小骨と皮を丁寧に除いてほぐす", tip: "青背魚は白身魚に慣れてから。小骨の確認を丁寧に" },
      "12_18": { cook: "しっかり加熱し、小骨と皮を除いてほぐす" },
    },
  },
  {
    id: "torimune", name: "鶏むね肉", category: "protein", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": { cook: "皮と脂を除いて茹で、細かく刻むかほぐす", tip: "パサつきやすいので、ゆで汁やとろみと一緒に与える" },
      "12_18": { cook: "皮と脂を除いて茹で、食べやすい大きさに切る" },
    },
  },
  {
    id: "butaniku", name: "豚赤身肉", category: "protein", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": { cook: "脂の少ない部位を選び、しっかり加熱して細かく刻む", tip: "脂身は取り除く。ひき肉から始めると食べやすい" },
      "12_18": { cook: "脂身を除いてやわらかく煮て、食べやすい大きさに切る" },
    },
  },
  {
    id: "gyuniku", name: "牛赤身肉", category: "protein", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": { cook: "脂の少ない部分をしっかり加熱して細かく刻む", tip: "鉄が多い。かたくなりやすいのでやわらかく煮る" },
      "12_18": { cook: "脂身を除いてやわらかく煮て、食べやすい大きさに切る" },
    },
  },
  {
    id: "reba", name: "鶏レバー", category: "protein", earliestStage: "9_11",
    allergens: [],
    stageForms: {
      "9_11": {
        cook: "血抜きしてしっかり加熱し、なめらかにすりつぶす",
        tip: "鉄が非常に多く、後期の鉄不足対策に有効。ビタミンAも多いため、少量を週1〜2回程度に留める",
      },
      "12_18": { cook: "血抜きしてしっかり加熱し、細かく刻む" },
    },
  },
  {
    id: "cottagecheese", name: "カッテージチーズ (乳)", category: "protein", earliestStage: "7_8",
    allergens: ["milk"],
    stageForms: {
      "7_8": { cook: "裏ごしタイプをそのまま、または加熱して和える", tip: "チーズの中では塩分・脂質が少なく、離乳食に向く" },
      "9_11": { cook: "そのまま和えるか、加熱して混ぜる" },
      "12_18": { cook: "そのまま和える" },
    },
  },
  {
    id: "processcheese", name: "プロセスチーズ (乳)", category: "protein", earliestStage: "12_18",
    allergens: ["milk"],
    stageForms: {
      "12_18": {
        cook: "細かく刻むか加熱して溶かす",
        tip: "塩分・脂質が多いのでごく少量に。ベビー用や食塩不使用のものを選ぶと安心",
      },
    },
  },

  // ===== その他（追加） =====
  {
    id: "tounyu", name: "豆乳 (大豆)", category: "other", earliestStage: "9_11",
    allergens: ["soy"],
    stageForms: {
      "9_11": { cook: "無調整のものを加熱して調理に使う", tip: "飲み物としてではなく、煮込みやスープの水分として使う" },
      "12_18": { cook: "無調整のものを加熱して調理に使う" },
    },
  },
  {
    id: "mugicha", name: "麦茶", category: "other", earliestStage: "5_6",
    allergens: [],
    stageForms: {
      "5_6": { cook: "湯冷ましで薄めて少量", tip: "水分補給は母乳・ミルクが基本。麦茶は補助的に" },
      "7_8": { cook: "薄めのものを湯冷まし程度の温度で" },
      "9_11": { cook: "食事と一緒に少量ずつ" },
      "12_18": { cook: "食事と一緒にコップで少しずつ与える" },
    },
  },
  {
    id: "katsuobushi", name: "かつお節", category: "other", earliestStage: "7_8",
    allergens: ["fish"],
    neverSuggest: true,
    stageForms: {
      "7_8": { cook: "細かくして風味づけにひとつまみ", tip: "だしや風味づけとして少量。主菜としては使わない" },
      "9_11": { cook: "細かくして風味づけに" },
      "12_18": { cook: "細かくして風味づけにひとつまみ" },
    },
  },
  {
    id: "aonori", name: "青のり", category: "other", earliestStage: "7_8",
    allergens: [],
    neverSuggest: true,
    stageForms: {
      "7_8": { cook: "風味づけにひとつまみ" },
      "9_11": { cook: "風味づけにひとつまみ" },
      "12_18": { cook: "風味づけにひとつまみ" },
    },
  },
];

/**
 * 食材id → 目安量グループ。
 *
 * 全61件に portionGroup を直接書くと差分が大きくなるので、ここで一括して対応づける。
 * ここに無い食材は categoryFallback（carb→gayu, vitamin→vegetable, protein→tofu）で解決される。
 * 提案対象外(neverSuggest)や other カテゴリの食材は登録しなくてよい。
 */
export const PORTION_GROUP_BY_ID: Record<string, PortionGroup> = {
  // ---- 穀類 ----
  gayu_10: "gayu", gayu_7: "gayu", gayu_5: "gayu", nanhan: "gayu",
  udon: "noodle", somen: "noodle",
  shokupan: "bread",
  soba: "noodle",
  // いも類は主食としても野菜としても扱われるが、このアプリでは
  // じゃがいも・さつまいもを carb(主食枠)、さといもを vitamin(野菜枠)に置いている。
  jagaimo: "potato", satsumaimo: "potato",

  // ---- たんぱく質 ----
  shiromizakana: "fish", shirasu: "fish", sake: "fish", tsuna: "fish",
  sasami: "meat", torihikiniku: "meat", gyubutahikiniku: "meat",
  tofu: "tofu",
  natto: "natto",
  ranou: "egg_yolk", zenran: "egg_whole",
  yogurt: "dairy",

  // ---- 拡充分 ----
  oatmeal: "gayu", gohan: "gayu",
  macaroni: "noodle", harusame: "noodle",
  fu: "bread", cornflakes: "bread",
  koyadofu: "tofu", atsuage: "tofu",
  daizunisui: "natto", // 豆腐より少量。粒の豆は納豆に近い目安量にする
  maguro: "fish", katsuo: "fish", buri: "fish", aji: "fish", iwashi: "fish",
  torimune: "meat", butaniku: "meat", gyuniku: "meat",
  reba: "liver",
  cottagecheese: "cheese", processcheese: "cheese",
  shimeji: "mushroom", maitake: "mushroom", enoki: "mushroom", hoshishiitake: "mushroom",
  wakame: "seaweed", nori: "nori",
};

/**
 * 果物の食材id。
 *
 * 公的な目安量では「野菜・果物」で1枠だが、毎食フルーツが野菜枠を占めると
 * 献立として偏る。提案では野菜を優先し、果物は控えめの確率で選ぶ。
 */
export const FRUIT_IDS: ReadonlySet<string> = new Set([
  "ringo", "banana", "ichigo", "mikan", "momo", "suika", "melon", "nashi",
  "kiwi", "budou", "prune", "kaki", "blueberry", "avocado",
]);

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
