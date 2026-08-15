import { INGREDIENT_CATEGORY_LABEL, INGREDIENT_MASTER, ALLERGEN_LABEL } from "../domain/ingredients";
import type { BabyProfile, IngredientCategory, IngredientStatus } from "../domain/types";

const CATEGORIES: IngredientCategory[] = ["carb", "protein", "vitamin", "other"];

/**
 * Android でホーム画面から起動した PWA (standalone) は window.print() が
 * 無反応な端末がある。事前に案内を出しておく。
 */
function isStandalone(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches === true;
}

function handlePrint() {
  try {
    window.print();
  } catch (e) {
    console.error("window.print failed", e);
  }
}

function formatDate(ms: number | undefined): string {
  if (!ms) return "";
  const d = new Date(ms);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function statusMark(status: IngredientStatus | undefined): string {
  if (!status) return "－";
  if (status.status === "safe") return "○";
  if (status.status === "allergic") return "×";
  return "－";
}

export function PrintableRecord(props: {
  profile: BabyProfile;
  statuses: Record<string, IngredientStatus>;
  onClose: () => void;
}) {
  const { profile, statuses, onClose } = props;

  const allergicIngredients = INGREDIENT_MASTER.filter(
    (ing) => statuses[ing.id]?.status === "allergic"
  );

  return (
    <div className="birthday-setup" style={{ maxWidth: 720, gap: 16, textAlign: "left", alignItems: "stretch" }}>
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <h2 style={{ margin: 0 }}>🖨️ 記録の印刷</h2>
        <button className="onboarding-btn" style={{ width: "auto", padding: "10px 16px" }} onClick={handlePrint}>
          印刷する
        </button>
      </div>
      <p className="no-print" style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
        保育園への提出や受診時の問診にそのまま使えます。「印刷する」から、プリンターの代わりに
        「PDFとして保存」を選ぶとファイルとしても保存できます。
      </p>
      {isStandalone() && (
        <p className="no-print" style={{ fontSize: 13, color: "var(--orange)", margin: 0 }}>
          ⚠️ ホーム画面のアイコンから起動している場合、Android では「印刷する」が反応しないことがあります。
          その場合は Chrome でこのページを開き直してから印刷してください。
        </p>
      )}

      <div className="printable-record">
        <section style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 4 }}>食材チェック表</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 10px" }}>
            ○=食べたことがある ×=アレルギーあり －=未試行
            {profile.birthdayIso && ` 生年月日: ${profile.birthdayIso}`}
          </p>
          {CATEGORIES.map((cat) => {
            const items = INGREDIENT_MASTER.filter((i) => i.category === cat);
            return (
              <table key={cat} style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10, fontSize: 12 }}>
                <thead>
                  <tr>
                    <th colSpan={3} style={{ textAlign: "left", padding: "4px 6px", borderBottom: "2px solid #333" }}>
                      {INGREDIENT_CATEGORY_LABEL[cat]}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((ing) => {
                    const entry = statuses[ing.id];
                    return (
                      <tr key={ing.id} style={{ borderBottom: "1px solid #ccc" }}>
                        <td style={{ padding: "3px 6px", width: 24, textAlign: "center", fontWeight: 700 }}>
                          {statusMark(entry)}
                        </td>
                        <td style={{ padding: "3px 6px" }}>{ing.name}</td>
                        <td style={{ padding: "3px 6px", color: "#666" }}>
                          {entry?.firstTriedAtIso ?? (entry?.updatedAt ? formatDate(entry.updatedAt) : "")}
                          {entry?.amountNote ? ` (${entry.amountNote})` : ""}
                          {entry?.notes ? ` ${entry.notes}` : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
          })}
        </section>

        <section style={{ pageBreakBefore: "always" }}>
          <h3 style={{ marginBottom: 4 }}>アレルギー記録</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 10px" }}>
            受診時の問診にお使いください。
            {profile.allergenTags.length > 0 &&
              ` 特定原材料の申告: ${profile.allergenTags.map((t) => ALLERGEN_LABEL[t]).join("、")}`}
          </p>
          {allergicIngredients.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>記録はありません</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "4px 6px", borderBottom: "2px solid #333" }}>食材</th>
                  <th style={{ textAlign: "left", padding: "4px 6px", borderBottom: "2px solid #333" }}>記録日</th>
                  <th style={{ textAlign: "left", padding: "4px 6px", borderBottom: "2px solid #333" }}>症状</th>
                  <th style={{ textAlign: "left", padding: "4px 6px", borderBottom: "2px solid #333" }}>発症まで</th>
                  <th style={{ textAlign: "left", padding: "4px 6px", borderBottom: "2px solid #333" }}>受診</th>
                  <th style={{ textAlign: "left", padding: "4px 6px", borderBottom: "2px solid #333" }}>メモ</th>
                </tr>
              </thead>
              <tbody>
                {allergicIngredients.map((ing) => {
                  const entry = statuses[ing.id];
                  return (
                    <tr key={ing.id} style={{ borderBottom: "1px solid #ccc" }}>
                      <td style={{ padding: "3px 6px" }}>{ing.name}</td>
                      <td style={{ padding: "3px 6px" }}>{entry?.firstTriedAtIso ?? formatDate(entry?.updatedAt)}</td>
                      <td style={{ padding: "3px 6px" }}>{entry?.symptom ?? ""}</td>
                      <td style={{ padding: "3px 6px" }}>{entry?.onsetMinutes != null ? `${entry.onsetMinutes}分` : ""}</td>
                      <td style={{ padding: "3px 6px" }}>{entry?.hospitalVisited ? "あり" : ""}</td>
                      <td style={{ padding: "3px 6px" }}>{entry?.notes ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <p style={{ fontSize: 10, color: "#666", marginTop: 16 }}>
          ※この記録は保護者がアプリで入力したものです。診断・治療の根拠となるものではありません。
        </p>
      </div>

      <button className="onboarding-btn no-print" onClick={onClose}>閉じる</button>
    </div>
  );
}
