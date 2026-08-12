import { useState } from "react";
import { INGREDIENT_MASTER, INGREDIENT_CATEGORY_LABEL, ALLERGEN_LABEL } from "../domain/ingredients";
import type { IngredientCategory, IngredientStatus, IngredientStatusValue } from "../domain/types";

const STATUS_LABEL: Record<IngredientStatusValue, string> = {
  not_tried: "未試行",
  safe: "クリア",
  allergic: "アレルギー",
};
const STATUS_COLOR: Record<IngredientStatusValue, string> = {
  not_tried: "var(--text-muted)",
  safe: "#10b981",
  allergic: "#ef4444",
};
const CATEGORIES: IngredientCategory[] = ["carb", "protein", "vitamin", "other"];

// 詳細編集フォーム(初回摂取日・症状など)。safe/allergicの時だけ表示する。
function DetailEditor(props: {
  entry: IngredientStatus | undefined;
  status: IngredientStatusValue;
  onPatch: (patch: Partial<IngredientStatus>) => void;
}) {
  const { entry, status, onPatch } = props;

  return (
    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
      <input
        className="birthday-input"
        style={{ fontSize: 13 }}
        placeholder="メモ"
        value={entry?.notes ?? ""}
        onChange={(e) => onPatch({ notes: e.target.value })}
      />
      {status === "safe" && (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>初回摂取日</label>
          <input
            type="date"
            className="birthday-input"
            style={{ fontSize: 13, flex: 1 }}
            value={entry?.firstTriedAtIso ?? ""}
            onChange={(e) => onPatch({ firstTriedAtIso: e.target.value })}
          />
        </div>
      )}
      {status === "safe" && (
        <input
          className="birthday-input"
          style={{ fontSize: 13 }}
          placeholder="量の目安（例: 小さじ1）"
          value={entry?.amountNote ?? ""}
          onChange={(e) => onPatch({ amountNote: e.target.value })}
        />
      )}
      {status === "allergic" && (
        <input
          className="birthday-input"
          style={{ fontSize: 13 }}
          placeholder="症状（例: 口の周りが赤くなった）"
          value={entry?.symptom ?? ""}
          onChange={(e) => onPatch({ symptom: e.target.value })}
        />
      )}
      {status === "allergic" && (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>発症まで</label>
          <input
            type="number"
            min={0}
            className="birthday-input"
            style={{ fontSize: 13, width: 80 }}
            value={entry?.onsetMinutes ?? ""}
            onChange={(e) => onPatch({ onsetMinutes: e.target.value ? Number(e.target.value) : undefined })}
          />
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>分</span>
        </div>
      )}
      {status === "allergic" && (
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={entry?.hospitalVisited ?? false}
            onChange={(e) => onPatch({ hospitalVisited: e.target.checked })}
          />
          受診した
        </label>
      )}
    </div>
  );
}

export function IngredientChecklist(props: {
  statuses: Record<string, IngredientStatus>;
  onChange: (ingredientId: string, patch: Partial<IngredientStatus>) => void;
  onClose: () => void;
}) {
  const { statuses, onChange, onClose } = props;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const clearedCount = Object.values(statuses).filter((s) => s.status === "safe").length;

  return (
    <div className="birthday-setup" style={{ gap: 16, textAlign: "left", alignItems: "stretch" }}>
      <h2 style={{ textAlign: "center", margin: 0 }}>🥕 食材チェック</h2>
      <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
        クリア済み {clearedCount} / {INGREDIENT_MASTER.length} 品目
      </p>

      {CATEGORIES.map((cat) => (
        <div key={cat} className="onboarding-card">
          <div className="onboarding-card-title">{INGREDIENT_CATEGORY_LABEL[cat]}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {INGREDIENT_MASTER.filter((i) => i.category === cat).map((ing) => {
              const entry = statuses[ing.id];
              const status = entry?.status ?? "not_tried";
              const expanded = expandedId === ing.id;
              return (
                <div key={ing.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14 }}>
                      {ing.name}
                      {ing.allergens.length > 0 && (
                        <span style={{ color: "#f59e0b", fontSize: 11, marginLeft: 4 }}>
                          ⚠️{ing.allergens.map((a) => ALLERGEN_LABEL[a]).join("・")}
                        </span>
                      )}
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {(["not_tried", "safe", "allergic"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => onChange(ing.id, { status: s })}
                          style={{
                            fontSize: 11,
                            padding: "4px 8px",
                            borderRadius: 8,
                            border: `1px solid ${STATUS_COLOR[s]}`,
                            background: status === s ? STATUS_COLOR[s] : "transparent",
                            color: status === s ? "#fff" : STATUS_COLOR[s],
                            cursor: "pointer",
                          }}
                        >
                          {STATUS_LABEL[s]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {status === "not_tried" ? (
                    <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "4px 0 0" }}>
                      「クリア」または「アレルギー」にすると詳細を記録できます
                    </p>
                  ) : expanded ? (
                    <DetailEditor
                      entry={entry}
                      status={status}
                      onPatch={(patch) => onChange(ing.id, patch)}
                    />
                  ) : (
                    <button
                      className="memo-toggle-btn"
                      style={{ marginTop: 4 }}
                      onClick={() => setExpandedId(ing.id)}
                    >
                      {entry?.notes || entry?.firstTriedAtIso || entry?.symptom
                        ? `📝 ${[entry.firstTriedAtIso, entry.notes, entry.symptom].filter(Boolean).join(" / ")}`
                        : "＋ 詳細を記録"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <button className="onboarding-btn" onClick={onClose}>閉じる</button>
    </div>
  );
}
