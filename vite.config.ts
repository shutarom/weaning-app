import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate", // 更新を自動適用寄りにする
      includeAssets: ["favicon.svg"],

      manifest: {
        name: "離乳食カレンダー",
        short_name: "離乳食",
        description: "離乳食の献立提案と実績ログ",
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
