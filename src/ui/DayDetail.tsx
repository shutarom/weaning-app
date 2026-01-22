import { useMemo, useState } from "react";
import type { DailyLog, DailyPlan } from "../domain/types";
import { generateSuggestion } from "../domain/suggestionEngine";
import {
  getLog,
  getRecentLogs,
  getOrCreatePlan,
  regeneratePlan,
  upsertDayMemo,
  upsertMealLog,
} from "../data/localStore";

export function DayDetail(props: { dateIso: string; ageMonths: number }) {
  const { dateIso, ageMonths } = props;

  // ✅ plan: 保存済みがあればそれを使う。なければ生成して保存。
  const [plan, setPlan] = useState<DailyPlan>(() =>
    getOrCreatePlan(dateIso, () => {
      const recentLogs = getRecentLogs(dateIso, 14);
      return generateSuggestion({ dateIso, ageMonths, recentLogs });
    })
  );

  // dateIsoが変わったら、対象日のplanをロード or 生成してstateへ
  useMemo(() => {
    const next = getOrCreatePlan(dateIso, () => {
      const recentLogs = getRecentLogs(dateIso, 14);
      return generateSuggestion({ dateIso, ageMonths, recentLogs });
    });
    setPlan(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateIso, ageMonths]); // ageMonthsが変わる（生年月日変更）も考慮

  const log: DailyLog | undefined = useMemo(() => getLog(dateIso), [dateIso]);

  return (
    <div style={{ border: "1px solid #333", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <div>
          <strong>選択日: {dateIso}</strong>
          <div style={{ opacity: 0.7, fontSize: 12 }}>
            {plan.phase.label} / 補正 x{plan.adjustFactor.toFixed(2)} / {plan.guideNote}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ opacity: 0.7, fontSize: 12 }}>seed: {plan.seed}</div>
          <button
            onClick={() => {
              const next = regeneratePlan(dateIso, () => {
                const recentLogs = getRecentLogs(dateIso, 14);
                return generateSuggestion({ dateIso, ageMonths, recentLogs });
              });
              setPlan(next);
            }}
            style={{ fontSize: 12 }}
            title="提案を作り直す（保存も上書き）"
          >
            再生成
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {plan.meals.map((meal) => {
          const mlog = log?.meals?.[meal.name];

          return (
            <div key={meal.name} style={{ border: "1px solid #333", borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                <strong>{meal.name}</strong>
                <span style={{ opacity: 0.8 }}>目安合計: {meal.totalGrams}g</span>
              </div>

              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {meal.items.map((it, idx) => (
                  <li key={idx}>
                    {it.text}：{it.grams}g
                  </li>
                ))}
              </ul>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
                <label>
                  食べた割合{" "}
                  <select
                    value={typeof mlog?.eatenRatio === "number" ? String(mlog.eatenRatio) : ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      upsertMealLog(dateIso, meal.name, { eatenRatio: v === "" ? undefined : Number(v) });
                    }}
                  >
                    <option value="">未入力</option>
                    <option value="1">完食(100%)</option>
                    <option value="0.75">だいたい(75%)</option>
                    <option value="0.5">半分(50%)</option>
                    <option value="0.25">少し(25%)</option>
                    <option value="0">食べず(0%)</option>
                  </select>
                </label>

                <label>
                  実食量(g){" "}
                  <input
                    type="number"
                    min={0}
                    value={typeof mlog?.actualGrams === "number" ? mlog.actualGrams : ""}
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      upsertMealLog(dateIso, meal.name, {
                        actualGrams: raw === "" ? undefined : Number(raw),
                      });
                    }}
                  />
                </label>

                <label style={{ flex: "1 1 240px" }}>
                  メモ{" "}
                  <input
                    type="text"
                    value={mlog?.memo ?? ""}
                    onChange={(e) => upsertMealLog(dateIso, meal.name, { memo: e.target.value })}
                    style={{ width: "100%" }}
                  />
                </label>
              </div>
            </div>
          );
        })}

        <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12 }}>
          <strong>その日メモ</strong>
          <div style={{ marginTop: 8 }}>
            <input
              type="text"
              value={log?.dayMemo ?? ""}
              onChange={(e) => upsertDayMemo(dateIso, e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <p style={{ opacity: 0.7, fontSize: 12, marginTop: 10 }}>
          ※ 提案(plan)も保存されるので、同じ日付は同じ提案が出ます（再生成しない限り）。
        </p>
      </div>
    </div>
  );
}
