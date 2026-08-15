import { useMemo, useReducer, useRef, useState } from "react";
import type { Allergen, DailyLog, DailyPlan, FreeEntry, IngredientStatus, MealName } from "../domain/types";
import { generateSuggestion } from "../domain/suggestionEngine";
import { TextField } from "./TextField";
import { isCommitEnter, isImeComposing } from "../lib/ime";
import {
  addFreeEntry,
  getLog,
  getRecentLogs,
  getRecentPlans,
  getOrCreatePlan,
  regeneratePlan,
  removeFreeEntry,
  upsertDayMemo,
  upsertMealLog,
} from "../data/localStore";

// ===== 食べた量ボタン =====
const EAT_OPTIONS = [
  { ratio: 1,    label: "完食",    color: "#10b981" },
  { ratio: 0.75, label: "だいたい", color: "#84cc16" },
  { ratio: 0.5,  label: "半分",    color: "#f59e0b" },
  { ratio: 0.25, label: "少し",    color: "#f97316" },
  { ratio: 0,    label: "食べず",  color: "#ef4444" },
];

function EatButtons({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <div className="eat-buttons">
      {EAT_OPTIONS.map((opt) => {
        const selected = value === opt.ratio;
        return (
          <button
            key={opt.ratio}
            className="eat-btn"
            style={{
              borderColor: opt.color,
              background: selected ? opt.color : "transparent",
              color: selected ? "#fff" : opt.color,
            }}
            onClick={() => onChange(selected ? undefined : opt.ratio)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function eatLabel(ratio: number | undefined): string {
  if (ratio === undefined) return "未記録";
  const opt = EAT_OPTIONS.find((o) => o.ratio === ratio);
  return opt ? opt.label : `${Math.round(ratio * 100)}%`;
}

function eatColor(ratio: number | undefined): string {
  if (ratio === undefined) return "var(--text-muted)";
  const opt = EAT_OPTIONS.find((o) => o.ratio === ratio);
  return opt ? opt.color : "#888";
}

// ===== 自由入力セクション =====
function FreeEntrySection({
  dateIso,
  mealName,
  entries,
  onChanged,
}: {
  dateIso: string;
  mealName: MealName;
  entries: FreeEntry[];
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [grams, setGrams] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addFreeEntry(dateIso, mealName, {
      name: trimmed,
      grams: grams ? Number(grams) : undefined,
    });
    setName("");
    setGrams("");
    setAdding(false);
    onChanged();
  };

  const handleRemove = (id: string) => {
    removeFreeEntry(dateIso, mealName, id);
    onChanged();
  };

  return (
    <div className="free-entry-section">
      <div className="free-entry-label">食べたもの（自由メモ）</div>
      {entries.map((e) => (
        <div key={e.id} className="free-entry-item">
          <span className="free-entry-name">{e.name}</span>
          {e.grams && <span className="free-entry-grams">{e.grams}g</span>}
          <button
            className="free-entry-remove"
            onClick={() => handleRemove(e.id)}
            title="削除"
          >
            ✕
          </button>
        </div>
      ))}
      {adding ? (
        <div className="free-entry-form">
          <input
            ref={inputRef}
            className="free-entry-input"
            placeholder="食材名・メモ"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              // 変換確定の Enter で登録されてしまわないようガードする
              if (isCommitEnter(e)) handleAdd();
              if (e.key === "Escape" && !isImeComposing(e)) setAdding(false);
            }}
            autoFocus
          />
          <input
            className="free-entry-grams-input"
            type="number"
            placeholder="g"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            onKeyDown={(e) => { if (isCommitEnter(e)) handleAdd(); }}
            min={0}
          />
          <button className="free-entry-add-btn" onClick={handleAdd}>追加</button>
          <button className="free-entry-cancel-btn" onClick={() => { setAdding(false); setName(""); setGrams(""); }}>✕</button>
        </div>
      ) : (
        <button className="add-free-entry-btn" onClick={() => setAdding(true)}>
          ＋ 食材を追加
        </button>
      )}
    </div>
  );
}

// ===== メインコンポーネント =====
export function DayDetail(props: {
  dateIso: string;
  ageMonths: number;
  /** 離乳食開始日を1日目とした経過日数。開始日が未設定なら undefined。 */
  weaningDay: number | undefined;
  allergenTags: Allergen[];
  ingredientStatuses: Record<string, IngredientStatus>;
}) {
  const { dateIso, ageMonths, weaningDay, allergenTags, ingredientStatuses } = props;

  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  const makePlan = (revision: number) => {
    const recentLogs  = getRecentLogs(dateIso, 14);
    const recentPlans = getRecentPlans(dateIso, 14);
    return generateSuggestion({
      dateIso, ageMonths, weaningDay, revision,
      recentLogs, recentPlans, allergenTags, ingredientStatuses,
    });
  };

  const [plan, setPlan] = useState<DailyPlan>(() =>
    getOrCreatePlan(dateIso, makePlan)
  );

  useMemo(() => {
    setPlan(getOrCreatePlan(dateIso, makePlan));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateIso, ageMonths, weaningDay, allergenTags, ingredientStatuses]);

  const log = (): DailyLog | undefined => getLog(dateIso);

  const handleEat = (meal: MealName, ratio: number | undefined) => {
    upsertMealLog(dateIso, meal, { eatenRatio: ratio });
    forceUpdate();
  };

  const handleMemo = (meal: MealName, memo: string) => {
    upsertMealLog(dateIso, meal, { memo });
    forceUpdate();
  };

  const handleDayMemo = (memo: string) => {
    upsertDayMemo(dateIso, memo);
    forceUpdate();
  };

  const currentLog = log();
  const isPast = dateIso < new Date().toISOString().slice(0, 10);
  const isToday = dateIso === new Date().toISOString().slice(0, 10);

  return (
    <div className="day-detail">
      {/* ヘッダー */}
      <div className="day-detail-header">
        <div>
          <div className="day-detail-title">
            {dateIso}
            {isToday && <span className="today-chip">今日</span>}
          </div>
          <div className="day-detail-sub">
            {plan.weaningStepLabel ?? plan.phase.label}・{plan.guideNote}
          </div>
        </div>
        <button
          className="regen-btn"
          onClick={() => setPlan(regeneratePlan(dateIso, makePlan))}
          title="提案を作り直す"
        >
          🔄 再生成
        </button>
      </div>

      {/* 分析インサイト */}
      {plan.insight && (
        <div className="insight-card">
          <span className="insight-icon">💡</span>
          <span>{plan.insight}</span>
        </div>
      )}

      {/* 食事カード */}
      {plan.meals.map((meal) => {
        const mlog = currentLog?.meals?.[meal.name];
        const ratio = mlog?.eatenRatio;
        const hasRecord = ratio !== undefined || (mlog?.freeEntries?.length ?? 0) > 0;

        return (
          <MealCard
            key={meal.name}
            dateIso={dateIso}
            meal={meal}
            mlog={mlog}
            ratio={ratio}
            hasRecord={hasRecord}
            isPast={isPast || isToday}
            onEat={(r) => handleEat(meal.name, r)}
            onMemo={(m) => handleMemo(meal.name, m)}
            onFreeChanged={forceUpdate}
          />
        );
      })}

      {/* その日のメモ */}
      <div className="day-memo-card">
        <strong>その日のメモ</strong>
        <TextField
          type="text"
          value={currentLog?.dayMemo ?? ""}
          onCommit={handleDayMemo}
          placeholder="気になったことなど…"
        />
      </div>
    </div>
  );
}

// ===== 1食分カード =====
function MealCard(props: {
  dateIso: string;
  meal: DailyPlan["meals"][number];
  mlog: DailyLog["meals"][MealName] | undefined;
  ratio: number | undefined;
  hasRecord: boolean;
  isPast: boolean;
  onEat: (r: number | undefined) => void;
  onMemo: (m: string) => void;
  onFreeChanged: () => void;
}) {
  const { dateIso, meal, mlog, ratio, hasRecord, isPast, onEat, onMemo, onFreeChanged } = props;
  const [showMemo, setShowMemo] = useState(!!mlog?.memo);
  const [showFree, setShowFree] = useState((mlog?.freeEntries?.length ?? 0) > 0);

  const MEAL_ICONS: Record<string, string> = { 朝: "🌅", 昼: "☀️", 夕: "🌙" };
  const freeEntries = mlog?.freeEntries ?? [];

  return (
    <div className={`meal-card ${hasRecord ? "meal-card--recorded" : ""}`}>
      {/* 食事名 + 記録状態 */}
      <div className="meal-card-header">
        <strong>
          {MEAL_ICONS[meal.name] ?? ""} {meal.name}ごはん
        </strong>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {ratio !== undefined && (
            <span className="eat-badge" style={{ color: eatColor(ratio) }}>
              {eatLabel(ratio)}
            </span>
          )}
          {freeEntries.length > 0 && ratio === undefined && (
            <span className="eat-badge" style={{ color: "var(--accent)" }}>記録あり</span>
          )}
          <span style={{ opacity: 0.55, fontSize: 12 }}>目安 {meal.totalGrams}g</span>
        </div>
      </div>

      {/* レシピ名（複数食材を組み合わせた一品として提案された場合のみ） */}
      {meal.recipeName && (
        <div className="meal-recipe-name">
          🍽️ {meal.recipeName}
          {meal.recipeNote && <span className="meal-recipe-note">（{meal.recipeNote}）</span>}
        </div>
      )}

      {/* 提案食材リスト */}
      <div className="meal-items-row">
        {meal.items.map((it, i) => (
          <span key={i} className="meal-item-chip">
            {it.text.split("（")[0]}{" "}
            <span className="meal-item-gram">{it.amountLabel ?? `${it.grams}g`}</span>
          </span>
        ))}
      </div>

      {/* 調理法（食材ごと） */}
      <div className="meal-cook-label">
        {meal.items.map((it, i) => (
          <div key={i}>{it.text.match(/（(.+)）/)?.[1] ?? ""}</div>
        ))}
      </div>

      {/* 食べさせ方の工夫 */}
      {meal.items.some((it) => it.tip) && (
        <div className="meal-tip-label">
          {meal.items.filter((it) => it.tip).map((it, i) => (
            <div key={i}>💡 {it.tip}</div>
          ))}
        </div>
      )}

      {/* 実績入力（今日以前のみ） */}
      {isPast && (
        <div className="meal-record-section">
          {/* 提案の食べた量 */}
          <div className="meal-record-label">提案メニューの食べた量</div>
          <EatButtons value={ratio} onChange={onEat} />

          {/* 自由入力セクション */}
          {showFree ? (
            <FreeEntrySection
              dateIso={dateIso}
              mealName={meal.name}
              entries={freeEntries}
              onChanged={onFreeChanged}
            />
          ) : (
            <button
              className="add-free-entry-btn add-free-entry-btn--collapsed"
              onClick={() => setShowFree(true)}
            >
              ＋ 別のものを食べた場合はこちら
            </button>
          )}

          {/* 提案以外のメモ */}
          <div className="meal-memo-row">
            {showMemo ? (
              <TextField
                className="meal-memo-input"
                type="text"
                placeholder="メモ（アレルギー反応、好み等）"
                value={mlog?.memo ?? ""}
                onCommit={onMemo}
                autoFocus
              />
            ) : (
              <button
                className="memo-toggle-btn"
                onClick={() => setShowMemo(true)}
              >
                ＋ メモを追加
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
