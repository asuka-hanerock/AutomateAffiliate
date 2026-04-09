import { useEffect, useState } from "react";

interface Props {
  accountId: string;
  onBack: () => void;
}

export default function AccountApiKeys({ accountId, onBack }: Props) {
  const [form, setForm] = useState({
    twitterApiKey: "",
    twitterApiSecret: "",
    twitterAccessToken: "",
    twitterAccessTokenSecret: "",
    claudeApiKey: "",
    googleServiceAccountJson: "",
    googleSpreadsheetUrl: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/accounts/${accountId}`)
      .then((r) => r.json())
      .then((data) => {
        setForm((f) => ({
          ...f,
          googleSpreadsheetUrl: data.googleSpreadsheetUrl || "",
        }));
      });
  }, [accountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const body: Record<string, unknown> = {};
      if (form.twitterApiKey) body.twitterApiKey = form.twitterApiKey;
      if (form.twitterApiSecret) body.twitterApiSecret = form.twitterApiSecret;
      if (form.twitterAccessToken)
        body.twitterAccessToken = form.twitterAccessToken;
      if (form.twitterAccessTokenSecret)
        body.twitterAccessTokenSecret = form.twitterAccessTokenSecret;
      if (form.claudeApiKey) body.claudeApiKey = form.claudeApiKey;
      if (form.googleServiceAccountJson)
        body.googleServiceAccountJson = form.googleServiceAccountJson;
      body.googleSpreadsheetUrl = form.googleSpreadsheetUrl;

      const res = await fetch(`/api/accounts/${accountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "保存に失敗しました");
      }
      setSuccess(true);
      setForm((f) => ({
        ...f,
        twitterApiKey: "",
        twitterApiSecret: "",
        twitterAccessToken: "",
        twitterAccessTokenSecret: "",
        claudeApiKey: "",
        googleServiceAccountJson: "",
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 500 }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#1da1f2",
          marginBottom: 16,
          padding: 0,
        }}
      >
        ← 戻る
      </button>

      <h2 style={{ marginBottom: 16 }}>API連携</h2>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
        空欄のキーは既存の値が維持されます
      </p>

      {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}
      {success && (
        <div style={{ color: "#17bf63", marginBottom: 12 }}>保存しました</div>
      )}

      <h3 style={{ marginBottom: 12, fontSize: 15 }}>X (Twitter) API</h3>
      <Field label="API Key">
        <input
          value={form.twitterApiKey}
          onChange={(e) => set("twitterApiKey", e.target.value)}
          style={inputStyle}
          placeholder="変更する場合のみ入力"
        />
      </Field>
      <Field label="API Secret">
        <input
          value={form.twitterApiSecret}
          onChange={(e) => set("twitterApiSecret", e.target.value)}
          style={inputStyle}
          placeholder="変更する場合のみ入力"
        />
      </Field>
      <Field label="Access Token">
        <input
          value={form.twitterAccessToken}
          onChange={(e) => set("twitterAccessToken", e.target.value)}
          style={inputStyle}
          placeholder="変更する場合のみ入力"
        />
      </Field>
      <Field label="Access Token Secret">
        <input
          value={form.twitterAccessTokenSecret}
          onChange={(e) => set("twitterAccessTokenSecret", e.target.value)}
          style={inputStyle}
          placeholder="変更する場合のみ入力"
        />
      </Field>

      <hr
        style={{
          margin: "16px 0",
          border: "none",
          borderTop: "1px solid #eee",
        }}
      />
      <h3 style={{ marginBottom: 12, fontSize: 15 }}>Claude API</h3>
      <Field label="API Key">
        <input
          value={form.claudeApiKey}
          onChange={(e) => set("claudeApiKey", e.target.value)}
          style={inputStyle}
          placeholder="変更する場合のみ入力"
        />
      </Field>

      <hr
        style={{
          margin: "16px 0",
          border: "none",
          borderTop: "1px solid #eee",
        }}
      />
      <h3 style={{ marginBottom: 12, fontSize: 15 }}>Google連携</h3>
      <Field label="スプレッドシートURL">
        <input
          value={form.googleSpreadsheetUrl}
          onChange={(e) => set("googleSpreadsheetUrl", e.target.value)}
          style={inputStyle}
          placeholder="https://docs.google.com/spreadsheets/d/..."
        />
      </Field>
      <Field label="サービスアカウントJSON">
        <textarea
          value={form.googleServiceAccountJson}
          onChange={(e) => set("googleServiceAccountJson", e.target.value)}
          style={{
            ...inputStyle,
            minHeight: 80,
            fontFamily: "monospace",
            fontSize: 12,
          }}
          placeholder="JSONファイルの中身をペースト"
        />
      </Field>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            background: "#1da1f2",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "10px 20px",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "保存中..." : "保存"}
        </button>
        <button
          type="button"
          onClick={onBack}
          style={{
            background: "#f0f0f0",
            color: "#333",
            border: "1px solid #ccc",
            borderRadius: 6,
            padding: "10px 20px",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label
        style={{
          display: "block",
          marginBottom: 4,
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #ccc",
  borderRadius: 6,
  fontSize: 14,
};
