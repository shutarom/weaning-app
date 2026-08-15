# 離乳食カレンダー

赤ちゃんの離乳食の献立提案と実績記録を行う PWA。家族間で同じデータを共有できる。

React + TypeScript + Vite / Firebase (Auth・Firestore・Hosting・AI Logic)

## 主な機能

- **日次の献立提案** — 月齢と離乳食開始日から進行段階を判定し、主食・野菜・たんぱく質を提案する（[src/domain/suggestionEngine.ts](src/domain/suggestionEngine.ts)）
- **実績記録** — 食べた量・自由入力・メモをカレンダーに記録し、翌日以降の提案量に反映する
- **食材チェック / アレルギー管理** — 61品目の食材マスターに対しクリア・アレルギーを記録。アレルゲンは提案から自動除外される
- **AI献立提案** — Gemini に条件を渡してレシピを3件生成する（[src/lib/aiSuggest.ts](src/lib/aiSuggest.ts)）
- **家族共有** — 招待コードで同じ世帯に参加すると Firestore 経由でリアルタイム同期される
- **複数の赤ちゃん** — 世帯の下に複数の赤ちゃんを持て、記録は赤ちゃん単位で分離される
- **印刷・バックアップ** — 保育園提出用の食材チェック表の印刷、JSON エクスポート／インポート

## セットアップ

```bash
npm install
```

`.env.local` に Firebase ウェブアプリの設定を置く（Firebase コンソールのウェブアプリ登録から取得）。

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_RECAPTCHA_V3_SITE_KEY=
```

## 開発

```bash
npm run dev
```

実機（スマホ）で確認する場合は LAN 経由で開く。

```bash
npm run dev -- --host
```

`ipconfig` で PC の IPv4 アドレスを調べ、同じ Wi-Fi の端末から `http://<IPアドレス>:5173` を開く。App Check は開発ビルドでは初期化されないため、デバッグトークンの登録は不要。

## テスト・検証

```bash
npm test
npm run lint
```

セキュリティルールのテストは Firestore エミュレータを使うため別コマンドにしてある。
実行には Java (JDK 11 以上) が必要。

```bash
npm run test:rules
```

ルールを変更したら、デプロイ前に必ずこれを通すこと。過去に「既存メンバーが再参加
できない」「新しい端末が一切参加できない」という不具合を、どちらも本番にデプロイして
実際に使われるまで検知できなかった。

## デプロイ

Firebase Hosting へデプロイする。

```bash
npm run build && firebase deploy --only hosting
```

Firestore のセキュリティルールを変更した場合は併せて反映する。

```bash
firebase deploy --only firestore:rules
```

## 実装上の注意

- **`index.html` の `lang="ja"` と `translate="no"` は外さない。** `lang="en"` だと Android Chrome が日本語本文を自動翻訳しにかかり、ラベルが無関係な日本語に書き換わる。翻訳はテキストノードを直接差し替えるため React の DOM と食い違い、画面が落ちる原因にもなる。
- **テキスト入力には [`TextField`](src/ui/TextField.tsx) を使う。** 素の `<input>` を localStorage 直結の `onChange` で書くと、Android の Gboard で変換中の文字が壊れる。
- **`localStorage` は [`src/lib/storage.ts`](src/lib/storage.ts) 経由で読み書きする。** 直接呼ぶと、保存がブロックされている端末で例外が握り潰される。
- **`crypto.randomUUID` / `navigator.clipboard` は直接使わない。** secure context 必須のため、[`src/lib/compat.ts`](src/lib/compat.ts) のフォールバックを使う。
- **安全フィルタ（アレルゲン・月齢・進行段階）に関わる変更をしたら `PLAN_SCHEMA_VERSION` を上げる。** 当日以降の古いプランが破棄され、再生成される。
