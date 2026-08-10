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
    progress: number | null;
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
  const gap = isWeek ? 8 : 4;
  const cellMinHeight = isWeek ? 120 : 64;

  return (
    <div className="calendar-wrap">
      <div className="calendar-title-bar">
        <span className="calendar-title">{title}</span>
        <span className="calendar-mode-label">{isWeek ? "週表示" : "月表示"}</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap,
        }}
      >
        {DOW.map((d, i) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontSize: 12,
              fontWeight: 600,
              padding: "6px 0",
              color: i === 0 ? "#ef4444" : i === 6 ? "#3b82f6" : "#6b7280",
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
          const isSun = d.getDay() === 0;
          const isSat = d.getDay() === 6;

          const bg = selected
            ? "#6366f1"
            : out
            ? "#f8f9fb"
            : "#ffffff";

          const border = selected
            ? "2px solid #6366f1"
            : isToday
            ? "2px solid #f59e0b"
            : "1px solid #e2e5ef";

          const dayColor = selected
            ? "#ffffff"
            : out
            ? "#c0c4cc"
            : isSun
            ? "#ef4444"
            : isSat
            ? "#3b82f6"
            : "#1a1a2e";

          return (
            <button
              key={iso}
              onClick={() => props.onSelect(iso)}
              style={{
                textAlign: "left",
                padding: isWeek ? 10 : 6,
                minHeight: cellMinHeight,
                borderRadius: 10,
                border,
                background: bg,
                opacity: out ? 0.6 : 1,
                cursor: "pointer",
                lineHeight: 1.2,
                transition: "background 0.1s",
              }}
              title={iso}
            >
              {/* 日付行 */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: isWeek ? 20 : 14,
                    color: dayColor,
                  }}
                >
                  {d.getDate()}
                </span>

                {isToday && !selected && (
                  <span
                    style={{
                      fontSize: 10,
                      padding: "1px 5px",
                      borderRadius: 999,
                      background: "#f59e0b",
                      color: "#fff",
                      fontWeight: 700,
                    }}
                  >
                    今日
                  </span>
                )}

                {logged && (
                  <span
                    style={{
                      fontSize: 10,
                      padding: "1px 5px",
                      borderRadius: 999,
                      background: selected ? "rgba(255,255,255,0.3)" : "#d1fae5",
                      color: selected ? "#fff" : "#065f46",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    ログ
                  </span>
                )}
              </div>

              {/* 週表示のみ：要約・チップ・進捗バー */}
              {isWeek && (
                <div style={{ marginTop: 8 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: selected ? "rgba(255,255,255,0.9)" : "#374151",
                      opacity: logged ? 1 : 0.5,
                    }}
                  >
                    {logged ? meta.text : "未入力"}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      marginTop: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    {MEAL_LABELS.map((m) => {
                      const done = meta.mealFlags[m];
                      return (
                        <span
                          key={m}
                          style={{
                            fontSize: 11,
                            padding: "2px 6px",
                            borderRadius: 999,
                            background: done
                              ? selected
                                ? "rgba(255,255,255,0.3)"
                                : "#d1fae5"
                              : selected
                              ? "rgba(255,255,255,0.1)"
                              : "#f3f4f6",
                            color: done
                              ? selected
                                ? "#fff"
                                : "#065f46"
                              : selected
                              ? "rgba(255,255,255,0.6)"
                              : "#9ca3af",
                            fontWeight: done ? 700 : 400,
                          }}
                        >
                          {m}
                        </span>
                      );
                    })}
                  </div>

                  {meta.progress !== null && (
                    <div
                      style={{
                        marginTop: 8,
                        height: 6,
                        borderRadius: 999,
                        background: selected ? "rgba(255,255,255,0.2)" : "#e5e7eb",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.round(meta.progress * 100)}%`,
                          background: selected ? "#fff" : "#6366f1",
                          borderRadius: 999,
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
