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
import { loadAllLogs, STORE_CHANGED_EVENT_NAME, mergeFromCloud } from "../data/localStore";
import { subscribeToCloud, type SyncStatus } from "../data/cloudSync";
import { phaseFromMonths } from "../domain/suggestionEngine";
import type { DailyLog } from "../domain/types";
import { Onboarding } from "../ui/Onboarding";
import { getHouseholdId } from "../lib/householdState";
import { useAuthUser } from "../lib/useAuthUser";

const BIRTHDAY_KEY = "weaning_birthday";
const WEANING_START_KEY = "weaning_start_date";

function todayIso(): string {
  return toIso(new Date());
}

function loadBirthday(): string {
  return localStorage.getItem(BIRTHDAY_KEY) ?? "";
}

function saveBirthday(iso: string) {
  localStorage.setItem(BIRTHDAY_KEY, iso);
}

function loadWeaningStart(): string {
  return localStorage.getItem(WEANING_START_KEY) ?? "";
}

function saveWeaningStart(iso: string) {
  if (iso) {
    localStorage.setItem(WEANING_START_KEY, iso);
  } else {
    localStorage.removeItem(WEANING_START_KEY);
  }
}

function SyncBadge({ status }: { status: SyncStatus }) {
  if (status === "synced") return null;
  const label = status === "connecting" ? "同期中…" : "オフライン";
  const color = status === "connecting" ? "#6366f1" : "#f97316";
  return (
    <span style={{ fontSize: 11, color, fontWeight: 600, whiteSpace: "nowrap" }}>
      {status === "connecting" ? "⟳" : "⚠"} {label}
    </span>
  );
}

function SettingsScreen(props: {
  birthdayIso: string;
  weaningStartIso: string;
  householdId: string;
  onSave: (birthday: string, weaningStart: string) => void;
  onClose: () => void;
}) {
  const [birthday, setBirthday] = useState(props.birthdayIso);
  const [weaningStart, setWeaningStart] = useState(props.weaningStartIso);
  const [copied, setCopied] = useState(false);

  return (
    <div className="birthday-setup" style={{ gap: 16, textAlign: "left", alignItems: "stretch" }}>
      <h2 style={{ textAlign: "center", margin: 0 }}>⚙️ 設定</h2>

      {/* 招待コード */}
      <div className="onboarding-card">
        <div className="onboarding-card-title">📋 家族への招待コード</div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 10px" }}>
          このコードを家族に共有すると、同じデータを確認・入力できます
        </p>
        <div style={{
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: "0.12em",
          color: "var(--accent-text)",
          background: "var(--accent-light)",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 10,
          fontFamily: "monospace",
          textAlign: "center",
          wordBreak: "break-all",
        }}>
          {props.householdId}
        </div>
        <button
          className="onboarding-btn"
          onClick={() => {
            navigator.clipboard.writeText(props.householdId).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
        >
          {copied ? "✓ コピーしました" : "コードをコピー"}
        </button>
      </div>

      {/* 生年月日 */}
      <div className="onboarding-card">
        <div className="onboarding-card-title">👶 赤ちゃんの生年月日</div>
        <input
          type="date"
          className="birthday-input"
          value={birthday}
          max={todayIso()}
          onChange={(e) => setBirthday(e.target.value)}
        />
      </div>

      {/* 離乳食開始日 */}
      <div className="onboarding-card">
        <div className="onboarding-card-title">🥣 離乳食の開始日</div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 10px" }}>
          設定するとより正確なステージ判定ができます（任意）
        </p>
        <input
          type="date"
          className="birthday-input"
          value={weaningStart}
          max={todayIso()}
          min={birthday || undefined}
          onChange={(e) => setWeaningStart(e.target.value)}
        />
        {weaningStart && (
          <button
            className="memo-toggle-btn"
            style={{ marginTop: 8, display: "block" }}
            onClick={() => setWeaningStart("")}
          >
            クリア（月齢から自動判定に戻す）
          </button>
        )}
      </div>

      <button
        className="btn-primary"
        disabled={!birthday}
        onClick={() => {
          saveBirthday(birthday);
          saveWeaningStart(weaningStart);
          props.onSave(birthday, weaningStart);
          props.onClose();
        }}
      >
        保存して閉じる
      </button>
      <button className="onboarding-btn" onClick={props.onClose}>
        キャンセル
      </button>
    </div>
  );
}

export default function App() {
  const { loading: authLoading } = useAuthUser();
  const [householdId, setHouseholdId] = useState<string | null>(() => getHouseholdId());

  // Firestoreルールが request.auth を要求するため、匿名認証の解決を待ってから
  // household作成/参加やクラウド同期を試みる（未解決のまま呼ぶと permission-denied になる）。
  if (authLoading) {
    return (
      <div className="onboarding">
        <p className="hint-text">読み込み中…</p>
      </div>
    );
  }
  if (!householdId) {
    return <Onboarding onReady={(hid) => setHouseholdId(hid)} />;
  }
  return <MainApp householdId={householdId} />;
}

function MainApp({ householdId }: { householdId: string }) {
  const [birthdayIso, setBirthdayIso] = useState<string>(() => loadBirthday());
  const [weaningStartIso, setWeaningStartIso] = useState<string>(() => loadWeaningStart());
  const [showSettings, setShowSettings] = useState(!loadBirthday());
  const [selectedIso, setSelectedIso] = useState<string>(todayIso());
  const [mode, setMode] = useState<"month" | "week">("month");
  const [viewDate, setViewDate] = useState<Date>(clampToMonthFirst(new Date()));
  const [mobilePanel, setMobilePanel] = useState<"calendar" | "detail">("calendar");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("connecting");

  const [logsMap, setLogsMap] = useState<Record<string, DailyLog>>(() => loadAllLogs());

  useEffect(() => {
    const handler = () => setLogsMap(loadAllLogs());
    window.addEventListener(STORE_CHANGED_EVENT_NAME, handler);
    return () => window.removeEventListener(STORE_CHANGED_EVENT_NAME, handler);
  }, []);

  // Firestore リアルタイム同期
  useEffect(() => {
    const unsub = subscribeToCloud(
      householdId,
      (cloudLogs, cloudPlans) => {
        mergeFromCloud(cloudLogs, cloudPlans);
      },
      setSyncStatus
    );
    return unsub;
  }, [householdId]);

  // 離乳食開始日が設定されている場合はそこからのステージ計算
  // 未設定の場合は月齢から計算（従来動作）
  const ageMonths = useMemo(() => {
    if (!birthdayIso) return 0;
    if (weaningStartIso) {
      // 開始からの月数 + 5 で "標準月齢換算" → 既存の phaseFromMonths が使えるようにする
      const wm = Math.max(0, monthsBetween(fromIso(weaningStartIso), fromIso(selectedIso)));
      return wm + 5;
    }
    return monthsBetween(fromIso(birthdayIso), fromIso(selectedIso));
  }, [birthdayIso, weaningStartIso, selectedIso]);

  const phase = phaseFromMonths(ageMonths);

  // ヘッダーのバッジに表示する月数ラベル
  const ageLabel = useMemo(() => {
    if (!birthdayIso) return "";
    const actual = monthsBetween(fromIso(birthdayIso), fromIso(selectedIso));
    return `${actual}ヶ月`;
  }, [birthdayIso, selectedIso]);

  const hasLog = (dateIso: string) => {
    const log = logsMap[dateIso];
    if (!log) return false;
    if (log.dayMemo?.trim()) return true;
    if (log.meals) {
      for (const m of Object.values(log.meals)) {
        if (!m) continue;
        if (typeof m.eatenRatio === "number" || typeof m.actualGrams === "number" || m.memo?.trim() || (m.freeEntries?.length ?? 0) > 0)
          return true;
      }
    }
    return false;
  };

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
        m.memo?.trim() ||
        (m.freeEntries?.length ?? 0) > 0;
      if (hasContent) mealFlags[key] = true;
      if (typeof m.eatenRatio === "number") ratios.push(m.eatenRatio);
    }
    const any = mealFlags.朝 || mealFlags.昼 || mealFlags.夕 || !!log.dayMemo?.trim();
    if (!any) return { text: "", progress: null as number | null, mealFlags };
    if (!ratios.length) return { text: "記録あり", progress: null as number | null, mealFlags };
    const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    const text =
      avg >= 0.9 ? "ほぼ完食" :
      avg >= 0.7 ? "だいたい" :
      avg >= 0.4 ? "半分くらい" :
      avg > 0 ? "少し" : "食べず";
    return { text, progress: avg, mealFlags };
  };

  const gotoToday = () => {
    const now = new Date();
    setSelectedIso(toIso(now));
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

  const handleDateSelect = (iso: string) => {
    setSelectedIso(iso);
    const d = fromIso(iso);
    setViewDate(mode === "month" ? clampToMonthFirst(d) : startOfWeek(d));
    setMobilePanel("detail");
  };

  if (showSettings) {
    return (
      <SettingsScreen
        birthdayIso={birthdayIso}
        weaningStartIso={weaningStartIso}
        householdId={householdId}
        onSave={(b, ws) => { setBirthdayIso(b); setWeaningStartIso(ws); }}
        onClose={() => setShowSettings(false)}
      />
    );
  }

  return (
    <div className="app-root">
      <header className="app-header">
        {mobilePanel === "detail" ? (
          <button className="back-btn" onClick={() => setMobilePanel("calendar")}>
            ← カレンダー
          </button>
        ) : (
          <span className="app-title">🍚 離乳食カレンダー</span>
        )}
        <div className="header-right">
          <SyncBadge status={syncStatus} />
          <span className="phase-badge">
            {phase.label}
            {ageLabel && <> · {ageLabel}</>}
          </span>
          <button
            className="icon-btn"
            onClick={() => setShowSettings(true)}
            title="設定"
          >
            ⚙️
          </button>
        </div>
      </header>

      <div className="controls">
        <div className="mode-btns">
          <button className={mode === "month" ? "active" : ""} onClick={() => onChangeMode("month")}>月</button>
          <button className={mode === "week" ? "active" : ""} onClick={() => onChangeMode("week")}>週</button>
        </div>
        <div className="nav-btns">
          <button onClick={goPrev}>◀</button>
          <button onClick={gotoToday}>今日</button>
          <button onClick={goNext}>▶</button>
        </div>
      </div>

      <main className="app-main">
        <div className={`panel panel-calendar ${mobilePanel === "calendar" ? "mobile-visible" : "mobile-hidden"}`}>
          <Calendar
            mode={mode}
            viewDate={viewDate}
            selectedIso={selectedIso}
            hasLog={hasLog}
            getLogMeta={getLogMeta}
            onSelect={handleDateSelect}
          />
        </div>
        <div className={`panel panel-detail ${mobilePanel === "detail" ? "mobile-visible" : "mobile-hidden"}`}>
          <DayDetail dateIso={selectedIso} ageMonths={ageMonths} />
        </div>
      </main>
    </div>
  );
}
