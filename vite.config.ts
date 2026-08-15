import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    VitePWA({
      // autoUpdate だと新しい Service Worker が有効になっても、開いたままの画面は
      // 古いJSを実行し続ける。Android のPWAは何日も常駐するので「更新したのに直らない」
      // 「挙動がおかしい」の原因になる。更新を検知したらバナーで再読み込みを促す。
      registerType: "prompt",
      injectRegister: null, // main.tsx から registerSW() を呼ぶ
      includeAssets: ["favicon.ico", "apple-touch-icon-180x180.png"],

      manifest: {
        name: "離乳食カレンダー",
        short_name: "離乳食",
        description: "離乳食の献立提案と実績ログ",
        // lang を明示しないと index.html の lang を拾う。ホーム画面から起動した
        // PWA でも Android Chrome の自動翻訳判定に使われるため必須。
        lang: "ja",
        dir: "ltr",
        start_url: ".",
        scope: ".",
        display: "standalone",
        theme_color: "#0b0f14",
        background_color: "#0b0f14",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" }
        ]
      },

      workbox: {
        // SPAでGitHub Pagesでも落ちにくい構成にする
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/__\//],
      }
    }),
  ],
});
