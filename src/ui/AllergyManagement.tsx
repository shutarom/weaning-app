import { useState } from "react";
import { INGREDIENT_MASTER } from "../domain/ingredients";
import type { IngredientStatus } from "../domain/types";

export function AllergyManagement(props: {
  allergies: string[];
  statuses: Record<string, IngredientStatus>;
  onSaveAllergies: (allergies: string[]) => void;
  onClose: () => void;
}) {
  const { allergies, statuses, onSaveAllergies, onClose } = props;
  const [input, setInput] = useState("");

  const allergicIngredients = INGREDIENT_MASTER.filter(
    (ing) => statuses[ing.id]?.status === "allergic"
  );

  const addAllergy = () => {
    const trimmed = input.trim();
    if (!trimmed || allergies.includes(trimmed)) return;
    onSaveAllergies([...allergies, trimmed]);
    setInput("");
  };

  const removeAllergy = (name: string) => {
    onSaveAllergies(allergies.filter((a) => a !== name));
  };

  return (
    <div className="birthday-setup" style={{ gap: 16, textAlign: "left", alignItems: "stretch" }}>
      <h2 style={{ textAlign: "center", margin: 0 }}>🚨 アレルギー管理</h2>

      <div className="onboarding-card">
        <div className="onboarding-card-title">申告済みアレルギー食材</div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 10px" }}>
          ここに登録した食材はAI献立提案で絶対に使われません
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {allergies.length === 0 && (
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>まだ登録されていません</span>
          )}
          {allergies.map((a) => (
            <span
              key={a}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "#fee2e2", color: "#b91c1c",
                borderRadius: 999, padding: "4px 10px", fontSize: 13,
              }}
            >
              {a}
              <button
                onClick={() => removeAllergy(a)}
                style={{ border: "none", background: "none", color: "#b91c1c", cursor: "pointer", fontSize: 13 }}
                title="削除"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="birthday-input"
            style={{ flex: 1 }}
            placeholder="例: 卵"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addAllergy(); }}
          />
          <button className="onboarding-btn" onClick={addAllergy}>追加</button>
        </div>
      </div>

      <div className="onboarding-card">
        <div className="onboarding-card-title">食材チェックで「アレルギー」と記録したもの</div>
        {allergicIngredients.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>記録はありません</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {allergicIngredients.map((ing) => (
              <div key={ing.id} style={{ fontSize: 14 }}>
                <strong>{ing.name}</strong>
                {statuses[ing.id]?.notes && (
                  <span style={{ color: "var(--text-muted)", fontSize: 13 }}> — {statuses[ing.id].notes}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="onboarding-btn" onClick={onClose}>閉じる</button>
    </div>
  );
}
