import { useEffect, useMemo, useState } from "react";
import { Calendar } from "../ui/Calendar";
import { DayDetail } from "../ui/DayDetail";
import { IngredientChecklist } from "../ui/IngredientChecklist";
import { AllergyManagement } from "../ui/AllergyManagement";
import { AiSuggest } from "../ui/AiSuggest";
import { BackupScreen } from "../ui/BackupScreen";
import { PrintableRecord } from "../ui/PrintableRecord";
import {
  addMonths,
  clampToMonthFirst,
  fromIso,
  toIso,
  addDays,
  daysBetween,
  monthsBetween,
  startOfWeek,
} from "../domain/date";
import { loadAllLogs, STORE_CHANGED_EVENT_NAME, mergeFromCloud, getRecentLogs, getRecentPlans } from "../data/localStore";
import { subscribeToCloud, subscribeProfile, subscribeIngredientStatuses, renameBabyByIdInCloud, type SyncStatus } from "../data/cloudSync";
import {
  loadProfile, saveProfile, addAllergy, removeAllergy,
  addAllergenTag, removeAllergenTag,
  mergeProfileFromCloud, PROFILE_CHANGED_EVENT_NAME,
} from "../data/profileStore";
import {
  loadIngredientStatuses,
  setIngredientStatus,
  mergeIngredientStatusesFromCloud,
  INGREDIENT_STATUS_CHANGED_EVENT_NAME,
} from "../data/ingredientStore";
import { INGREDIENT_MASTER, ALLERGEN_LABEL } from "../domain/ingredients";
import { phaseFromMonths, summarizePreferences } from "../domain/suggestionEngine";
import type { Allergen, DailyLog } from "../domain/types";
import { Onboarding } from "../ui/Onboarding";
import { UpdatePrompt } from "../ui/UpdatePrompt";
import { getHouseholdId, clearHouseholdId } from "../lib/householdState";
import { getBabyId, setBabyId } from "../lib/babyState";
import { createBaby, listBabies, migrateToMultiBabyIfNeeded, getBabyProfile, type BabySummary } from "../lib/babies";
import { useAuthUser } from "../lib/useAuthUser";
import { copyText } from "../lib/compat";
import { isCommitEnter, isImeComposing } from "../lib/ime";
import { getStorageError, STORAGE_ERROR_EVENT_NAME } from "../lib/storage";

type ViewMode = "calendar" | "settings" | "ingredients" | "allergies" | "ai" | "backup" | "print";

function todayIso(): string {
  return toIso(new Date());
}

function SyncBadge({ status, onRecover }: { status: SyncStatus; onRecover: () => void }) {
  if (status === "synced") return null;
  if (status === "permission_error") {
    return (
      <button
        onClick={onRecover}
        style={{
          fontSize: 11, color: "#dc2626", fontWeight: 600, whiteSpace: "nowrap",
          border: "1px solid #dc2626", borderRadius: 6, background: "none", padding: "2px 6px", cursor: "pointer",
        }}
        title="この端末はこの家族グループのメンバーとして認識されていません。招待コードで再参加してください"
      >
        ⚠️ 同期エラー・タップして再参加
      </button>
    );
  }
  const label = status === "connecting" ? "同期中…" : "オフライン";
  const color = status === "connecting" ? "#6366f1" : "#f97316";
  return (
    <span style={{ fontSize: 11, color, fontWeight: 600, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}>
      {/* 以前は ⟳ (U+27F3) を使っていたが、これは絵文字ではなく数学記号で
          Android のフォントに無いと豆腐(□)になる。CSS のスピナーに置き換えた。 */}
      {status === "connecting" ? <span className="sync-spinner" aria-hidden="true" /> : "⚠️"} {label}
    </span>
  );
}

/**
 * localStorage への保存に失敗したことを知らせる常設バナー。
 * 以前は例外が握り潰され、記録が保存されていないことに気づけなかった。
 */
function StorageErrorBanner() {
  const [message, setMessage] = useState<string | null>(() => getStorageError());
  useEffect(() => {
    const handler = () => setMessage(getStorageError());
    window.addEventListener(STORAGE_ERROR_EVENT_NAME, handler);
    return () => window.removeEventListener(STORAGE_ERROR_EVENT_NAME, handler);
  }, []);
  if (!message) return null;
  return (
    <div role="alert" className="storage-error-banner">
      ⚠️ {message}
    </div>
  );
}

function MenuOverlay(props: { onSelect: (v: ViewMode) => void; onClose: () => void }) {
  const items: { view: ViewMode; icon: string; label: string }[] = [
    { view: "settings", icon: "⚙️", label: "設定" },
    { view: "ingredients", icon: "🥕", label: "食材チェック" },
    { view: "allergies", icon: "🚨", label: "アレルギー管理" },
    { view: "ai", icon: "✨", label: "AI献立提案" },
    { view: "print", icon: "🖨️", label: "記録の印刷" },
    { view: "backup", icon: "💾", label: "バックアップ" },
  ];
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "flex-start", justifyContent: "flex-end", zIndex: 50,
      }}
      onClick={props.onClose}
    >
      <div
        style={{
          background: "var(--panel, #fff)", borderRadius: 12, margin: "56px 12px 0 0",
          minWidth: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((it) => (
          <button
            key={it.view}
            onClick={() => props.onSelect(it.view)}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "12px 16px", border: "none", background: "none",
              fontSize: 14, textAlign: "left", cursor: "pointer",
            }}
          >
            <span>{it.icon}</span>
            <span>{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BabySwitcherOverlay(props: {
  babies: BabySummary[];
  activeBabyId: string;
  busy: boolean;
  onSelect: (id: string) => void;
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onClose: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "flex-start", justifyContent: "flex-start", zIndex: 50,
      }}
      onClick={props.onClose}
    >
      <div
        style={{
          background: "var(--panel, #fff)", borderRadius: 12, margin: "56px 0 0 12px",
          minWidth: 220, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {props.babies.map((b) => (
          <div key={b.id} style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
            {renamingId === b.id ? (
              <input
                className="birthday-input"
                style={{ margin: 8, fontSize: 13 }}
                value={renameValue}
                autoFocus
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  // 変換確定の Enter で名前が確定してしまわないようガードする
                  if (isCommitEnter(e)) { props.onRename(b.id, renameValue); setRenamingId(null); }
                  if (e.key === "Escape" && !isImeComposing(e)) setRenamingId(null);
                }}
                onBlur={() => setRenamingId(null)}
              />
            ) : (
              <>
                <button
                  disabled={props.busy}
                  onClick={() => { props.onSelect(b.id); props.onClose(); }}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", gap: 8,
                    padding: "12px 16px", border: "none", background: "none",
                    fontSize: 14, textAlign: "left", cursor: "pointer",
                    fontWeight: b.id === props.activeBabyId ? 700 : 400,
                  }}
                >
                  <span>{b.id === props.activeBabyId ? "👶" : "🧒"}</span>
                  <span>{b.name}</span>
                </button>
                <button
                  onClick={() => { setRenamingId(b.id); setRenameValue(b.name); }}
                  style={{ border: "none", background: "none", padding: "8px 12px", cursor: "pointer", color: "var(--text-muted)", fontSize: 12 }}
                  title="名前を編集"
                >
                  ✏️
                </button>
              </>
            )}
          </div>
        ))}
        {adding ? (
          <div style={{ display: "flex", gap: 6, padding: 8 }}>
            <input
              className="birthday-input"
              style={{ fontSize: 13 }}
              placeholder="名前"
              value={newName}
              autoFocus
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (isCommitEnter(e) && newName.trim()) {
                  props.onAdd(newName.trim());
                  setAdding(false);
                  setNewName("");
                }
                if (e.key === "Escape" && !isImeComposing(e)) setAdding(false);
              }}
            />
          </div>
        ) : (
          <button
            disabled={props.busy}
            onClick={() => setAdding(true)}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "12px 16px", border: "none", background: "none",
              fontSize: 14, textAlign: "left", cursor: "pointer", color: "var(--accent)",
            }}
          >
            ＋ 赤ちゃんを追加
          </button>
        )}
      </div>
    </div>
  );
}

function SettingsScreen(props: {
  birthdayIso: string;
  weaningStartIso: string;
  allergies: string[];
  allergenTags: Allergen[];
  householdId: string;
  onSave: (birthday: string, weaningStart: string) => void;
  onOpenAllergies: () => void;
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
            void copyText(props.householdId).then((ok) => {
              if (!ok) return;
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

      {/* アレルギー */}
      <div className="onboarding-card">
        <div className="onboarding-card-title">🚨 アレルギー食材</div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 10px" }}>
          {[...props.allergenTags.map((t) => ALLERGEN_LABEL[t]), ...props.allergies].length > 0
            ? [...new Set([...props.allergenTags.map((t) => ALLERGEN_LABEL[t]), ...props.allergies])].join("、")
            : "未登録"}
        </p>
        <button className="onboarding-btn" onClick={props.onOpenAllergies}>
          🚨 アレルギー管理を開く
        </button>
      </div>

      <button
        className="btn-primary"
        disabled={!birthday}
        onClick={() => {
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
  const { loading: authLoading, error: authError } = useAuthUser();
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
  // 以前は認証が終わらなくても黙って先へ進んでいたため、モバイル回線では
  // 原因の分からない permission-denied として現れていた。
  if (authError) {
    return (
      <div className="onboarding">
        <p className="error-text">⚠️ {authError}</p>
        <button className="onboarding-btn" onClick={() => window.location.reload()}>再読み込み</button>
      </div>
    );
  }
  return (
    <>
      <UpdatePrompt />
      <StorageErrorBanner />
      {householdId
        ? <MainApp householdId={householdId} />
        : <Onboarding onReady={(hid) => setHouseholdId(hid)} />}
    </>
  );
}

type ActiveState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; babyId: string };

/**
 * householdIdが決まった後、赤ちゃん単位のデータ構造(babies/{babyId})を解決する。
 * 旧バージョンで作られたhouseholdは初回だけ移行処理が走る（babies.ts参照）。
 */
function MainApp({ householdId }: { householdId: string }) {
  const [babies, setBabies] = useState<BabySummary[]>([]);
  const [active, setActive] = useState<ActiveState>({ status: "loading" });

  // 指定babyIdをローカルの「現在の赤ちゃん」にする。切り替え直後・新規追加直後は
  // そのbabyId用のローカルキャッシュがまだ空なので、先にクラウドの値で温めてから
  // 画面を出す（そうしないと生年月日等が一瞬空に見え、設定画面に戻ってしまう）。
  const activateBaby = async (id: string) => {
    setActive({ status: "loading" });
    try {
      setBabyId(id);
      const cloudProfile = await getBabyProfile(householdId, id);
      if (cloudProfile) mergeProfileFromCloud(cloudProfile);
      setActive({ status: "ready", babyId: id });
    } catch (e) {
      setActive({ status: "error", message: e instanceof Error ? e.message : String(e) });
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setActive({ status: "loading" });
      try {
        await migrateToMultiBabyIfNeeded(householdId);
        let list = await listBabies(householdId);
        if (list.length === 0) {
          // 理論上は起こらないはずだが、念のためのフォールバック
          await createBaby(householdId, "赤ちゃん", 0);
          list = await listBabies(householdId);
        }
        if (cancelled) return;
        setBabies(list);
        const saved = getBabyId();
        const activeId = saved && list.some((b) => b.id === saved) ? saved : list[0].id;
        await activateBaby(activeId);
      } catch (e) {
        if (!cancelled) {
          setActive({ status: "error", message: e instanceof Error ? e.message : String(e) });
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId]);

  if (active.status === "loading") {
    return (
      <div className="onboarding">
        <p className="hint-text">読み込み中…</p>
      </div>
    );
  }
  if (active.status === "error") {
    return (
      <div className="onboarding">
        <p className="error-text">⚠️ {active.message}</p>
        <button className="onboarding-btn" onClick={() => window.location.reload()}>再読み込み</button>
      </div>
    );
  }

  return (
    <BabyScopedApp
      // babyIdが変わったら状態を素朴にリセットしたいので remount させる
      key={active.babyId}
      householdId={householdId}
      babyId={active.babyId}
      babies={babies}
      onSwitchBaby={(id) => void activateBaby(id)}
      onBabiesChanged={setBabies}
    />
  );
}

function BabyScopedApp({
  householdId, babyId, babies, onSwitchBaby, onBabiesChanged,
}: {
  householdId: string;
  babyId: string;
  babies: BabySummary[];
  onSwitchBaby: (id: string) => void;
  onBabiesChanged: (babies: BabySummary[]) => void;
}) {
  const [profile, setProfile] = useState(() => loadProfile());
  const [view, setView] = useState<ViewMode>(() => (loadProfile().birthdayIso ? "calendar" : "settings"));
  const [menuOpen, setMenuOpen] = useState(false);
  const [babySwitcherOpen, setBabySwitcherOpen] = useState(false);
  const [babySwitcherBusy, setBabySwitcherBusy] = useState(false);
  const [selectedIso, setSelectedIso] = useState<string>(todayIso());
  const [mode, setMode] = useState<"month" | "week">("month");
  const [viewDate, setViewDate] = useState<Date>(clampToMonthFirst(new Date()));
  // 起動直後に「今日の食事」が見えるようにする（B-5: 今日ホーム画面の簡易実装）。
  // デスクトップでは元々カレンダーと詳細を同時表示しているため影響しない。
  const [mobilePanel, setMobilePanel] = useState<"calendar" | "detail">("detail");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("connecting");

  const [logsMap, setLogsMap] = useState<Record<string, DailyLog>>(() => loadAllLogs());
  const [ingredientStatuses, setIngredientStatuses] = useState(() => loadIngredientStatuses());

  useEffect(() => {
    const handler = () => setLogsMap(loadAllLogs());
    window.addEventListener(STORE_CHANGED_EVENT_NAME, handler);
    return () => window.removeEventListener(STORE_CHANGED_EVENT_NAME, handler);
  }, []);

  useEffect(() => {
    const handler = () => setProfile(loadProfile());
    window.addEventListener(PROFILE_CHANGED_EVENT_NAME, handler);
    return () => window.removeEventListener(PROFILE_CHANGED_EVENT_NAME, handler);
  }, []);

  useEffect(() => {
    const handler = () => setIngredientStatuses(loadIngredientStatuses());
    window.addEventListener(INGREDIENT_STATUS_CHANGED_EVENT_NAME, handler);
    return () => window.removeEventListener(INGREDIENT_STATUS_CHANGED_EVENT_NAME, handler);
  }, []);

  // Firestore リアルタイム同期（ログ・プラン）
  useEffect(() => {
    const unsub = subscribeToCloud(
      householdId,
      babyId,
      (cloudLogs, cloudPlans) => {
        mergeFromCloud(cloudLogs, cloudPlans);
      },
      setSyncStatus
    );
    return unsub;
  }, [householdId, babyId]);

  // Firestore リアルタイム同期（プロフィール・食材ステータス）
  // permission-denied（この端末がmembersに存在しない等）はログ・プランの購読とは
  // 独立に検知しうるため、こちらのエラーも同じ syncStatus にまとめて反映する。
  useEffect(() => {
    const unsubProfile = subscribeProfile(householdId, babyId, mergeProfileFromCloud, setSyncStatus);
    const unsubIngredients = subscribeIngredientStatuses(householdId, babyId, mergeIngredientStatusesFromCloud, setSyncStatus);
    return () => { unsubProfile(); unsubIngredients(); };
  }, [householdId, babyId]);

  const handleSyncRecover = () => {
    if (!window.confirm("この端末を家族グループから一旦切り離し、招待コードで再参加しますか？（記録データはこの端末に残ります）")) return;
    clearHouseholdId();
    window.location.reload();
  };

  const handleAddBaby = async (name: string) => {
    setBabySwitcherBusy(true);
    try {
      const newId = await createBaby(householdId, name, babies.length);
      onBabiesChanged(await listBabies(householdId));
      onSwitchBaby(newId);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "追加に失敗しました");
    } finally {
      setBabySwitcherBusy(false);
    }
  };

  const handleRenameBaby = async (id: string, name: string) => {
    try {
      await renameBabyByIdInCloud(householdId, id, name.trim() || "赤ちゃん");
      onBabiesChanged(await listBabies(householdId));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "名前の変更に失敗しました");
    }
  };

  const { birthdayIso, weaningStartIso, allergies, allergenTags } = profile;
  const activeBabyName = babies.find((b) => b.id === babyId)?.name ?? "赤ちゃん";

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

  // 離乳食開始日を1日目とした経過日数。開始直後に「おかゆだけ」から段階的に
  // 品目を増やすために使う（月齢だけでは開始からの日数が分からない）。
  const weaningDay = useMemo(() => {
    if (!weaningStartIso) return undefined;
    const d = daysBetween(fromIso(weaningStartIso), fromIso(selectedIso)) + 1;
    return d >= 1 ? d : undefined;
  }, [weaningStartIso, selectedIso]);

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

  if (view === "settings") {
    return (
      <SettingsScreen
        birthdayIso={birthdayIso}
        weaningStartIso={weaningStartIso}
        allergies={allergies}
        allergenTags={allergenTags}
        householdId={householdId}
        onSave={(b, ws) => saveProfile({ birthdayIso: b, weaningStartIso: ws })}
        onOpenAllergies={() => setView("allergies")}
        onClose={() => setView("calendar")}
      />
    );
  }

  if (view === "ingredients") {
    return (
      <IngredientChecklist
        statuses={ingredientStatuses}
        onChange={(id, patch) => setIngredientStatus(id, patch)}
        onClose={() => setView("calendar")}
      />
    );
  }

  if (view === "allergies") {
    return (
      <AllergyManagement
        allergies={allergies}
        allergenTags={allergenTags}
        statuses={ingredientStatuses}
        onAddAllergy={addAllergy}
        onRemoveAllergy={removeAllergy}
        onToggleAllergenTag={(tag) =>
          allergenTags.includes(tag) ? removeAllergenTag(tag) : addAllergenTag(tag)
        }
        onClose={() => setView("calendar")}
      />
    );
  }

  if (view === "ai") {
    const safeIngredients = INGREDIENT_MASTER
      .filter((i) => ingredientStatuses[i.id]?.status === "safe")
      .map((i) => i.name);
    const notTriedIngredients = INGREDIENT_MASTER
      .filter((i) => (ingredientStatuses[i.id]?.status ?? "not_tried") === "not_tried")
      .map((i) => i.name);
    // 自由記述のアレルギー申告とタグ選択の両方をAIプロンプトに渡し、
    // どちらか一方にしか登録していなくても確実に除外されるようにする。
    const allAllergyLabels = [
      ...new Set([...allergies, ...allergenTags.map((t) => ALLERGEN_LABEL[t])]),
    ];
    // カレンダーの日次提案と同じ学習結果(好き・苦手)をAI提案にも反映する。
    const { liked: likedIngredients, disliked: dislikedIngredients } = summarizePreferences(
      getRecentLogs(selectedIso, 14),
      getRecentPlans(selectedIso, 14)
    );
    return (
      <AiSuggest
        ageMonths={ageMonths}
        phase={phase}
        allergies={allAllergyLabels}
        safeIngredients={safeIngredients}
        notTriedIngredients={notTriedIngredients}
        likedIngredients={likedIngredients}
        dislikedIngredients={dislikedIngredients}
        onClose={() => setView("calendar")}
      />
    );
  }

  if (view === "backup") {
    return <BackupScreen onClose={() => setView("calendar")} />;
  }

  if (view === "print") {
    return (
      <PrintableRecord
        profile={profile}
        statuses={ingredientStatuses}
        onClose={() => setView("calendar")}
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
          <SyncBadge status={syncStatus} onRecover={handleSyncRecover} />
          {babies.length > 1 && (
            <button
              className="icon-btn"
              style={{ fontSize: 12, fontWeight: 700 }}
              onClick={() => setBabySwitcherOpen(true)}
              title="赤ちゃんを切り替え"
            >
              👶 {activeBabyName} ▾
            </button>
          )}
          <span className="phase-badge">
            {phase.label}
            {ageLabel && <> · {ageLabel}</>}
          </span>
          <button
            className="icon-btn"
            onClick={() => setMenuOpen(true)}
            title="メニュー"
          >
            ☰
          </button>
        </div>
      </header>

      {menuOpen && (
        <MenuOverlay
          onSelect={(v) => { setView(v); setMenuOpen(false); }}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {babySwitcherOpen && (
        <BabySwitcherOverlay
          babies={babies}
          activeBabyId={babyId}
          busy={babySwitcherBusy}
          onSelect={onSwitchBaby}
          onAdd={(name) => void handleAddBaby(name)}
          onRename={(id, name) => void handleRenameBaby(id, name)}
          onClose={() => setBabySwitcherOpen(false)}
        />
      )}

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
          <DayDetail
            dateIso={selectedIso}
            ageMonths={ageMonths}
            weaningDay={weaningDay}
            allergenTags={allergenTags}
            ingredientStatuses={ingredientStatuses}
          />
        </div>
      </main>
    </div>
  );
}
