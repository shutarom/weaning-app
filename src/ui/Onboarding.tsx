import { useMemo, useState } from "react";
import { createHousehold, joinHousehold } from "../lib/household";
import { clearHouseholdId, getHouseholdId, setHouseholdId } from "../lib/householdState";
import { getDeviceId } from "../lib/deviceId";

export function Onboarding(props: { onReady: (hid: string) => void }) {
  const savedHid = useMemo(() => getHouseholdId(), []);
  const [invite, setInvite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"new" | "join">("new");
  const [createdHid, setCreatedHid] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 保存済みなら即続行
  if (savedHid) {
    return (
      <div className="onboarding">
        <h2>🍚 離乳食カレンダー</h2>
        <div className="onboarding-card">
          <div className="onboarding-card-title">前回のデータがあります</div>
          <button className="btn-primary" style={{ marginBottom: 10 }} onClick={() => props.onReady(savedHid)}>
            続きから使う
          </button>
          <button className="onboarding-btn" onClick={() => { clearHouseholdId(); window.location.reload(); }}>
            リセット
          </button>
        </div>
      </div>
    );
  }

  // グループ作成直後：コードを大きく表示
  if (createdHid) {
    return (
      <div className="onboarding">
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
          <h2 style={{ margin: "0 0 6px" }}>家族グループを作成しました</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
            下の招待コードを家族に共有すると、<br />同じデータを確認・入力できます
          </p>
        </div>

        <div className="onboarding-card" style={{ textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 10px" }}>招待コード</p>
          <div style={{
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: "0.15em",
            color: "var(--accent-text)",
            background: "var(--accent-light)",
            borderRadius: 10,
            padding: "14px 20px",
            marginBottom: 12,
            fontFamily: "monospace",
            wordBreak: "break-all",
          }}>
            {createdHid}
          </div>
          <button
            className="onboarding-btn"
            onClick={() => {
              navigator.clipboard.writeText(createdHid).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
          >
            {copied ? "✓ コピーしました" : "コードをコピー"}
          </button>
          <p className="hint-text">このコードはあとで ⚙️ 設定画面からも確認できます</p>
        </div>

        <button
          className="btn-primary"
          style={{ marginTop: 16 }}
          onClick={() => props.onReady(createdHid)}
        >
          アプリを使いはじめる →
        </button>
      </div>
    );
  }

  return (
    <div className="onboarding">
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>👶</div>
        <h2 style={{ margin: "0 0 6px" }}>離乳食カレンダー</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
          赤ちゃんの離乳食献立・記録アプリ
        </p>
      </div>

      <div style={{ display: "flex", borderBottom: "2px solid var(--border)", marginBottom: 16 }}>
        {(["new", "join"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setError(null); }} style={{
            flex: 1, border: "none",
            borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
            borderRadius: 0, marginBottom: -2, padding: "12px",
            background: "none",
            color: tab === t ? "var(--accent)" : "var(--text-muted)",
            fontWeight: tab === t ? 700 : 400, fontSize: 15,
          }}>
            {t === "new" ? "新しくはじめる" : "招待コードで参加"}
          </button>
        ))}
      </div>

      {tab === "new" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
            このデバイスで家族グループを作成します。<br />
            作成後に表示される招待コードを家族に共有してください。
          </p>
          <button
            className="btn-primary"
            disabled={busy}
            onClick={async () => {
              setError(null);
              setBusy(true);
              try {
                const uid = getDeviceId();
                const hid = await createHousehold(uid);
                setHouseholdId(hid);
                setCreatedHid(hid);
              } catch (e: unknown) {
                setError(e instanceof Error ? e.message : String(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "作成中…" : "家族グループを作成する"}
          </button>
        </div>
      )}

      {tab === "join" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
            家族から共有された招待コードを入力してください。
          </p>
          <input
            className="birthday-input"
            value={invite}
            onChange={(e) => setInvite(e.target.value.trim())}
            placeholder="例: a1b2c3d4e5"
            autoComplete="off"
            autoCapitalize="none"
          />
          <button
            className="btn-primary"
            disabled={busy || invite.length < 6}
            onClick={async () => {
              setError(null);
              setBusy(true);
              try {
                const uid = getDeviceId();
                const hid = await joinHousehold(invite, uid);
                setHouseholdId(hid);
                props.onReady(hid);
              } catch (e: unknown) {
                setError(e instanceof Error ? e.message : String(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "参加中…" : "参加する"}
          </button>
        </div>
      )}

      {error && <p className="error-text" style={{ marginTop: 12 }}>⚠️ {error}</p>}
    </div>
  );
}
