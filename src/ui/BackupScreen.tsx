import { useRef, useState } from "react";
import { buildBackup, serializeBackup, parseBackup, importBackup, type ParsedBackup } from "../data/backup";
import { copyText, downloadBlob } from "../lib/compat";

function downloadJson(filename: string, content: string) {
  downloadBlob(filename, new Blob([content], { type: "application/json" }));
}

export function BackupScreen(props: { onClose: () => void }) {
  const { onClose } = props;
  const [exportedJson, setExportedJson] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState<ParsedBackup | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importDone, setImportDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const backup = buildBackup();
    const json = serializeBackup(backup);
    setExportedJson(json);
    const filename = `weaning-app-backup-${backup.exportedAt.slice(0, 10)}.json`;
    downloadJson(filename, json);
  };

  const handleCopy = () => {
    if (!exportedJson) return;
    void copyText(exportedJson).then((ok) => {
      if (!ok) return;
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportDone(false);
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      setPending(parseBackup(text));
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "読み込みに失敗しました");
    }
  };

  const handleConfirmImport = () => {
    if (!pending) return;
    importBackup(pending.backup);
    setPending(null);
    setImportDone(true);
  };

  return (
    <div className="birthday-setup" style={{ gap: 16, textAlign: "left", alignItems: "stretch" }}>
      <h2 style={{ textAlign: "center", margin: 0 }}>💾 バックアップ</h2>
      <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
        記録はこの端末とクラウドに保存されていますが、万一に備えて手元にもJSONで保存できます
      </p>

      <div className="onboarding-card">
        <div className="onboarding-card-title">エクスポート</div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 10px" }}>
          記録・プラン・食材チェック・プロフィールをすべて含むファイルをダウンロードします
        </p>
        <button className="onboarding-btn" onClick={handleExport}>
          ⬇ JSONファイルをダウンロード
        </button>
        {exportedJson && (
          <div style={{ marginTop: 10 }}>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 6px" }}>
              ダウンロードできない場合は、下のテキストをコピーして自分宛てのメモ等に貼り付けてください
            </p>
            <textarea
              readOnly
              value={exportedJson}
              rows={4}
              style={{
                width: "100%", fontSize: 11, fontFamily: "monospace",
                padding: 8, borderRadius: 8, border: "1px solid var(--border)",
                background: "var(--bg)", color: "var(--text)", resize: "vertical",
              }}
              onFocus={(e) => e.currentTarget.select()}
            />
            <button className="onboarding-btn" style={{ marginTop: 8 }} onClick={handleCopy}>
              {copied ? "✓ コピーしました" : "テキストをコピー"}
            </button>
          </div>
        )}
      </div>

      <div className="onboarding-card">
        <div className="onboarding-card-title">インポート</div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 10px" }}>
          バックアップファイルを選ぶと、既存の記録より新しい内容だけを取り込みます（上書き消去はされません）
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={(e) => void handleFileSelected(e)}
          style={{ fontSize: 13 }}
        />
        {importError && <p className="error-text" style={{ marginTop: 8 }}>⚠️ {importError}</p>}
        {pending && (
          <div style={{ marginTop: 10 }}>
            <p style={{ fontSize: 13, margin: "0 0 8px" }}>
              このファイルには 記録 {pending.counts.logs}件・プラン {pending.counts.plans}件・
              食材チェック {pending.counts.ingredientStatuses}件 が含まれています。取り込みますか？
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-primary" onClick={handleConfirmImport}>取り込む</button>
              <button className="onboarding-btn" onClick={() => setPending(null)}>やめる</button>
            </div>
          </div>
        )}
        {importDone && <p style={{ fontSize: 13, color: "var(--green)", marginTop: 8 }}>✓ 取り込みました</p>}
      </div>

      <button className="onboarding-btn" onClick={onClose}>閉じる</button>
    </div>
  );
}
