import { defineConfig } from "vitest/config";

// セキュリティルールのテスト専用。Firestoreエミュレータが必要なため、
// 通常の `npm test` からは切り離してある（`npm run test:rules` で実行）。
export default defineConfig({
  test: {
    include: ["rules-tests/**/*.test.ts"],
    // エミュレータの起動を待つぶん、既定より長めに取る
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
