import { useEffect, useMemo, useState } from "react";
import { Calendar } from "../ui/Calendar";
import { DayDetail } from "../ui/DayDetail";
import {
  addMonths,
  clampToMonthFirst,
  fromIso,
  toIso,
  addDays,
  monthsBetween,
  startOfWeek,
} from "../domain/date";
import { loadAllLogs, STORE_CHANGED_EVENT_NAME } from "../data/localStore";
import { phaseFromMonths } from "../domain/suggestionEngine";
import type { DailyLog } from "../domain/types";

function todayIso(): string {
  return toIso(new Date());
}

export default function App() {
  const [birthdayIso, setBirthdayIso] = useState<string>("2025-12-01");

  const [selectedIso, setSelectedIso] = useState<string>(todayIso());
  const [mode, setMode] = useState<"month" | "week">("month");
  const [viewDate, setViewDate] = useState<Date>(clampToMonthFirst(new Date()));

  // ✅ logsMapをstateで管理し、store更新イベントで即時再描画
  const [logsMap, setLogsMap] = useState<Record<string, DailyLog>>(() => loadAllLogs());

  useEffect(() => {
    const handler = () => setLogsMap(loadAllLogs());
    window.addEventListener(STORE_CHANGED_EVENT_NAME, handler);
    return () => window.removeEventListener(STORE_CHANGED_EVENT_NAME, handler);
  }, []);

  const ageMonths = useMemo(() => {
    const birth = fromIso(birthdayIso);
    const onDate = fromIso(selectedIso);
    return monthsBetween(birth, onDate);
  }, [birthdayIso, selectedIso]);

  const phase = phaseFromMonths(ageMonths);

  const hasLog = (dateIso: string) => {
    const log = logsMap[dateIso];
    if (!log) return false;

    const hasMeal = log.meals && Object.keys(log.meals).length > 0;
    const hasMemo = !!log.dayMemo && log.dayMemo.trim().length > 0;

    // mealの中身が空（全部undefined）でもキーだけある場合があるので、もう少し厳しめに見る
    let hasAnyMealContent = false;
    if (log.meals) {
      for (const m of Object.values(log.meals)) {
        if (!m) continue;
        if (
          typeof m.eatenRatio === "number" ||
          typeof m.actualGrams === "number" ||
          (m.memo && m.memo.trim().length > 0)
        ) {
          hasAnyMealContent = true;
          break;
        }
      }
    }
    return hasMemo || hasAnyMealContent || hasMeal;
  };

  // ✅ 週表示の“見える化”用メタ
  const getLogMeta = (dateIso: string) => {
    const log = logsMap[dateIso];
    const mealFlags = { 朝: false, 昼: false, 夕: false };

    if (!log) return { text: "", progress: null as number | null, mealFlags };

    const ratios: number[] = [];

    for (const key of ["朝", "昼", "夕"] as const) {
      const m = log.meals?.[key];
      if (!m) continue;

      const hasContent =
        typeof m.eatenRatio === "number" ||
        typeof m.actualGrams === "number" ||
        (m.memo && m.memo.trim().length > 0);

      if (hasContent) mealFlags[key] = true;
      if (typeof m.eatenRatio === "number") ratios.push(m.eatenRatio);
    }

    // 要約テキスト
    const any = mealFlags.朝 || mealFlags.昼 || mealFlags.夕 || (log.dayMemo?.trim()?.length ?? 0) > 0;
    if (!any) return { text: "", progress: null as number | null, mealFlags };

    if (ratios.length === 0) return { text: "記録あり", progress: null as number | null, mealFlags };

    const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length; // 0..1
    let text = `${Math.round(avg * 100)}%`;
    if (avg >= 0.9) text = "ほぼ完食";
    else if (avg >= 0.7) text = "だいたい";
    else if (avg >= 0.4) text = "半分くらい";
    else if (avg > 0) text = "少し";
    else text = "食べず";

    return { text, progress: avg, mealFlags };
  };

  const gotoToday = () => {
    const now = new Date();
    const iso = toIso(now);
    setSelectedIso(iso);
    setViewDate(mode === "month" ? clampToMonthFirst(now) : startOfWeek(now));
  };

  const goPrev = () => {
    if (mode === "month") setViewDate(clampToMonthFirst(addMonths(viewDate, -1)));
    else setViewDate(addDays(viewDate, -7));
  };

  const goNext = () => {
    if (mode === "month") setViewDate(clampToMonthFirst(addMonths(viewDate, 1)));
    else setViewDate(addDays(viewDate, 7));
  };

  const onChangeMode = (m: "month" | "week") => {
    setMode(m);
    const anchor = fromIso(selectedIso);
    setViewDate(m === "month" ? clampToMonthFirst(anchor) : startOfWeek(anchor));
  };

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 10px" }}>離乳食カレンダー v1</h1>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <label>
          生年月日{" "}
          <input type="date" value={birthdayIso} onChange={(e) => setBirthdayIso(e.target.value)} />
        </label>

        <span style={{ opacity: 0.85 }}>月齢: {ageMonths}ヶ月</span>
        <span style={{ opacity: 0.85 }}>フェーズ: {phase.label}</span>

        <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
          <button onClick={() => onChangeMode("month")} disabled={mode === "month"}>
            月
          </button>
          <button onClick={() => onChangeMode("week")} disabled={mode === "week"}>
            週
          </button>

          <span style={{ opacity: 0.5, padding: "0 6px" }}>|</span>

          <button onClick={goPrev}>◀︎</button>
          <button onClick={gotoToday}>今日へ</button>
          <button onClick={goNext}>▶︎</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 12 }}>
        <Calendar
          mode={mode}
          viewDate={viewDate}
          selectedIso={selectedIso}
          hasLog={hasLog}
          getLogMeta={getLogMeta}
          onSelect={(iso) => {
            setSelectedIso(iso);
            const d = fromIso(iso);
            setViewDate(mode === "month" ? clampToMonthFirst(d) : startOfWeek(d));
          }}
        />
        <DayDetail dateIso={selectedIso} ageMonths={ageMonths} />
      </div>
    </div>
  );
}
