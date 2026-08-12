import { useState } from "react";
import { INGREDIENT_MASTER, INGREDIENT_CATEGORY_LABEL } from "../domain/ingredients";
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

export function IngredientChecklist(props: {
  statuses: Record<string, IngredientStatus>;
  onChange: (ingredientId: string, status: IngredientStatusValue, notes?: string) => void;
  onClose: () => void;
}) {
  const { statuses, onChange, onClose } = props;
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);

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
              return (
                <div key={ing.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14 }}>
                      {ing.name}
                      {ing.allergenRisk && <span style={{ color: "#f59e0b", fontSize: 11, marginLeft: 4 }}>⚠️高リスク</span>}
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {(["not_tried", "safe", "allergic"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => onChange(ing.id, s, entry?.notes)}
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
                  {editingNotesId === ing.id ? (
                    <input
                      className="birthday-input"
                      style={{ marginTop: 6, fontSize: 13 }}
                      placeholder="メモ（症状など）"
                      value={entry?.notes ?? ""}
                      autoFocus
                      onChange={(e) => onChange(ing.id, status, e.target.value)}
                      onBlur={() => setEditingNotesId(null)}
                    />
                  ) : (
                    <button
                      className="memo-toggle-btn"
                      style={{ marginTop: 4 }}
                      onClick={() => setEditingNotesId(ing.id)}
                    >
                      {entry?.notes ? `📝 ${entry.notes}` : "＋ メモ"}
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
