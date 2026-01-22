import { getMonthGrid, getWeekGrid, monthLabel, toIso } from "../domain/date";

const DOW = ["日", "月", "火", "水", "木", "金", "土"];
const MEAL_LABELS = ["朝", "昼", "夕"] as const;

export function Calendar(props: {
  mode: "month" | "week";
  viewDate: Date;
  selectedIso: string;
  hasLog: (dateIso: string) => boolean;
  getLogMeta: (dateIso: string) => {
    text: string;
    progress: number | null; // 0..1
    mealFlags: { 朝: boolean; 昼: boolean; 夕: boolean };
  };
  onSelect: (dateIso: string) => void;
}) {
  const { mode, viewDate } = props;
  const isWeek = mode === "week";

  const month = getMonthGrid(viewDate);
  const week = getWeekGrid(viewDate);

  const title =
    mode === "month"
      ? monthLabel(viewDate)
      : `${toIso(week[0])} 〜 ${toIso(week[6])}`;

  const cells =
    mode === "month"
      ? month.cells.map((d) => ({ d, out: d.getMonth() !== month.monthIndex }))
      : week.map((d) => ({ d, out: false }));

  const todayIso = toIso(new Date());

  // モード別見た目（週は大きく、読みやすく）
  const gap = isWeek ? 10 : 6;
  const cellMinHeight = isWeek ? 132 : 72;
  const dayFontSize = isWeek ? 22 : 16;

  return (
    <div style={{ border: "1px solid #333", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <strong style={{ color: "#e5e7eb" }}>{title}</strong>
        <span style={{ opacity: 0.75, fontSize: 12, color: "#e5e7eb" }}>
          {isWeek ? "週表示" : "月表示"}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap, marginTop: 10 }}>
        {DOW.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              opacity: 0.85,
              fontSize: isWeek ? 13 : 12,
              padding: "6px 0",
              color: "#e5e7eb",
            }}
          >
            {d}
          </div>
        ))}

        {cells.map(({ d, out }) => {
          const iso = toIso(d);
          const selected = iso === props.selectedIso;
          const logged = props.hasLog(iso);
          const isToday = iso === todayIso;
          const meta = props.getLogMeta(iso);

          const bg = selected ? "#0b3b5a" : out ? "#0f0f0f" : "#151720";
          const border = selected ? "2px solid #7dd3fc" : isToday ? "1px solid #666" : "1px solid #333";
          const textColor = out ? "#9ca3af" : "#e5e7eb";

          return (
            <button
              key={iso}
              onClick={() => props.onSelect(iso)}
              style={{
                textAlign: "left",
                padding: isWeek ? 14 : 10,
                minHeight: cellMinHeight,
                borderRadius: 14,
                border,
                background: bg,
                opacity: out ? 0.55 : 1,
                cursor: "pointer",
                color: textColor,
                lineHeight: 1.2,
              }}
              title={iso}
            >
              {/* 上段：日付・今日・ログ */}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontWeight: 900, fontSize: dayFontSize }}>{d.getDate()}</span>
                  {isToday && (
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 999,
                        border: "1px solid #333",
                        opacity: 0.9,
                      }}
                    >
                      今日
                    </span>
                  )}
                </div>

                {logged ? (
                  <span
                    style={{
                      fontSize: 12,
                      color: "#0b0f14",
                      background: "#a7f3d0",
                      padding: isWeek ? "4px 10px" : "2px 8px",
                      borderRadius: 999,
                      fontWeight: 900,
                    }}
                  >
                    ログ
                  </span>
                ) : (
                  <span style={{ fontSize: 12, opacity: 0.25 }}> </span>
                )}
              </div>

              {/* 週表示だけ：要約・朝昼夕チップ・進捗バー */}
              {isWeek && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 13, opacity: logged ? 0.95 : 0.6 }}>
                    {logged ? meta.text : "未入力"}
                  </div>

                  {/* 朝昼夕チップ */}
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {MEAL_LABELS.map((m) => {
                      const done = meta.mealFlags[m];
                      return (
                        <span
                          key={m}
                          style={{
                            fontSize: 11,
                            padding: "3px 8px",
                            borderRadius: 999,
                            border: "1px solid #333",
                            background: done ? (selected ? "#7dd3fc" : "#a7f3d0") : "#0b0f14",
                            color: done ? "#0b0f14" : "#e5e7eb",
                            opacity: done ? 1 : 0.65,
                            fontWeight: 800,
                          }}
                        >
                          {m}
                        </span>
                      );
                    })}
                  </div>

                  {/* 進捗バー（eatenRatioが取れてる場合だけ） */}
                  {meta.progress !== null && (
                    <div
                      style={{
                        marginTop: 10,
                        height: 9,
                        borderRadius: 999,
                        background: "#0b0f14",
                        border: "1px solid #333",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.round(meta.progress * 100)}%`,
                          background: selected ? "#7dd3fc" : "#a7f3d0",
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
