import { useState } from "react";
import { suggestMenu } from "../lib/aiSuggest";
import type { AiSuggestionResult, Phase } from "../domain/types";
import { isCommitEnter } from "../lib/ime";

const CATEGORY_LABEL: Record<AiSuggestionResult["recipes"][number]["category"], string> = {
  carb: "炭水化物",
  protein: "タンパク質",
  vitamin: "ビタミン",
  combined: "複合",
};

export function AiSuggest(props: {
  ageMonths: number;
  phase: Phase;
  allergies: string[];
  safeIngredients: string[];
  notTriedIngredients: string[];
  likedIngredients: string[];
  dislikedIngredients: string[];
  onClose: () => void;
}) {
  const {
    ageMonths, phase, allergies, safeIngredients, notTriedIngredients,
    likedIngredients, dislikedIngredients, onClose,
  } = props;
  const [fridgeInput, setFridgeInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiSuggestionResult | null>(null);

  const handleSuggest = async () => {
    setError(null);
    setBusy(true);
    setResult(null);
    try {
      const fridgeIngredients = fridgeInput
        .split(/[,、\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await suggestMenu({
        ageMonths,
        phase,
        allergies,
        safeIngredients,
        notTriedIngredients,
        fridgeIngredients,
        likedIngredients,
        dislikedIngredients,
      });
      setResult(res);
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? `提案の取得に失敗しました: ${e.message}`
          : "提案の取得に失敗しました"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="birthday-setup" style={{ gap: 16, textAlign: "left", alignItems: "stretch" }}>
      <h2 style={{ textAlign: "center", margin: 0 }}>✨ AI献立提案</h2>
      <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
        {phase.label} ・ アレルギー食材は自動で除外されます
      </p>

      <div className="onboarding-card">
        <div className="onboarding-card-title">冷蔵庫にある食材（任意）</div>
        <input
          className="birthday-input"
          placeholder="例: にんじん, 鶏ささみ"
          value={fridgeInput}
          onChange={(e) => setFridgeInput(e.target.value)}
          onKeyDown={(e) => { if (isCommitEnter(e)) void handleSuggest(); }}
        />
        <button className="btn-primary" style={{ marginTop: 10 }} disabled={busy} onClick={handleSuggest}>
          {busy ? "考え中…" : "献立を提案してもらう"}
        </button>
      </div>

      {error && <p className="error-text">⚠️ {error}</p>}

      {result && (
        <>
          <div className="insight-card">
            <span className="insight-icon">💡</span>
            <span>{result.message}</span>
          </div>
          {result.recipes.map((r, i) => (
            <div key={i} className="onboarding-card">
              <div className="onboarding-card-title">
                {r.menuTitle}
                <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>
                  {CATEGORY_LABEL[r.category]}
                </span>
              </div>
              <p style={{ fontSize: 13, margin: "0 0 8px" }}>材料: {r.ingredientsList.join("、")}</p>
              <p style={{ fontSize: 13, whiteSpace: "pre-line", margin: "0 0 8px" }}>{r.instructions}</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>💡 {r.point}</p>
            </div>
          ))}
          <p className="disclaimer-note">
            この献立はAIが生成したものです。登録済みのアレルギー食材は除外するよう指示していますが、
            提供前に必ず材料と加熱の状態をご自身で確認してください。
            アレルギーや発育について気になることは、かかりつけの小児科医にご相談ください。
          </p>
        </>
      )}

      <button className="onboarding-btn" onClick={onClose}>閉じる</button>
    </div>
  );
}
