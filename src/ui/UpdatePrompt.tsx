import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";

/**
 * 新しいバージョンが配信されたことを知らせるバナー。
 *
 * Service Worker が更新されても、開いたままの画面は古いJSを実行し続ける。
 * Android の PWA はホーム画面から起動したまま何日も常駐するため、
 * 修正を出しても「まだ直っていない」状態が延々と続いてしまう。
 * 入力中に勝手にリロードするとメモが失われるので、自動リロードではなく
 * 明示的なボタンにしている。
 */
export function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [update, setUpdate] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true);
        // setState に関数をそのまま渡すと更新関数として扱われるのでラップする
        setUpdate(() => () => updateSW(true));
      },
    });
  }, []);

  if (!needRefresh) return null;

  return (
    <div role="status" className="update-banner">
      <span>新しいバージョンがあります</span>
      <button onClick={() => void update?.()}>更新する</button>
    </div>
  );
}
