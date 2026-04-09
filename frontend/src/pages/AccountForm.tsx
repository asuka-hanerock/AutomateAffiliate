import { useEffect, useState } from "react";
import ScheduleEditor from "../components/ScheduleEditor";

interface Props {
  accountId?: string;
  onDone: () => void;
}

export default function AccountForm({ accountId, onDone }: Props) {
  const isEdit = !!accountId;
  const [form, setForm] = useState({
    email: "",
    displayName: "",
    niche: "転職",
    pronoun: "僕",
    trademark: "",
    profileBio: "",
    // 新規作成時のみ使用
    cronSchedule: '[{"days":[],"time":"09:00"}]',
    ctaEnabled: false,
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

  useEffect(() => {
    if (isEdit) {
      fetch(`/api/accounts/${accountId}`)
        .then((r) => r.json())
        .then((data) => {
          setForm((f) => ({
            ...f,
            email: data.user?.email || "",
            displayName: data.displayName || "",
            niche: data.niche,
            pronoun: data.pronoun || "僕",
            trademark: data.trademark || "",
            profileBio: data.profileBio || "",
          }));
        });
    }
  }, [accountId, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      let body: Record<string, unknown>;
      if (isEdit) {
        body = {
          displayName: form.displayName,
          niche: form.niche,
          pronoun: form.pronoun,
          trademark: form.trademark,
          profileBio: form.profileBio,
        };
      } else {
        body = { ...form };
        if (!form.twitterApiKey) delete body.twitterApiKey;
        if (!form.twitterApiSecret) delete body.twitterApiSecret;
        if (!form.twitterAccessToken) delete body.twitterAccessToken;
        if (!form.twitterAccessTokenSecret)
          delete body.twitterAccessTokenSecret;
        if (!form.claudeApiKey) delete body.claudeApiKey;
        if (!form.googleServiceAccountJson)
          delete body.googleServiceAccountJson;
      }

      const res = await fetch(
        isEdit ? `/api/accounts/${accountId}` : "/api/accounts",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "保存に失敗しました");
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 500 }}>
      <h2 style={{ marginBottom: 16 }}>
        {isEdit ? "プロフィール編集" : "新規アカウント"}
      </h2>
      {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}

      {!isEdit && (
        <Field label="メールアドレス">
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            style={inputStyle}
          />
        </Field>
      )}

      <Field label="アカウント名">
        <input
          value={form.displayName}
          onChange={(e) => set("displayName", e.target.value)}
          style={inputStyle}
          placeholder="かめふく、など表示名"
        />
      </Field>

      <Field label="ジャンル（ニッチ）">
        <input
          value={form.niche}
          onChange={(e) => set("niche", e.target.value)}
          style={inputStyle}
        />
      </Field>

      <Field label="一人称">
        <input
          value={form.pronoun}
          onChange={(e) => set("pronoun", e.target.value)}
          style={inputStyle}
          placeholder="僕、俺、私、自分、あだ名など"
        />
      </Field>

      <Field label="トレードマーク（任意）">
        <input
          value={form.trademark}
          onChange={(e) => set("trademark", e.target.value)}
          style={inputStyle}
          placeholder="🐢 など絵文字やキャラクター"
        />
      </Field>

      <Field label="発信者プロフィール（任意）">
        <textarea
          value={form.profileBio}
          onChange={(e) => set("profileBio", e.target.value)}
          style={{ ...inputStyle, minHeight: 80 }}
          placeholder="例: 大手IT企業エンジニア。副業でアプリ/SaaS複数運営。ITストラテジスト/AWS DVA取得。"
        />
        <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
          投稿生成時にこのプロフィールを踏まえた視点で書かれます
        </div>
      </Field>

      {/* 新規作成時のみ: 初期設定として表示 */}
      {!isEdit && (
        <>
          <hr
            style={{
              margin: "16px 0",
              border: "none",
              borderTop: "1px solid #eee",
            }}
          />
          <h3 style={{ marginBottom: 12, fontSize: 16 }}>投稿設定</h3>

          <ScheduleEditor
            value={form.cronSchedule}
            onChange={(v) => set("cronSchedule", v)}
          />

          <Field label="">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={form.ctaEnabled}
                onChange={(e) => set("ctaEnabled", e.target.checked)}
              />
              CTAを有効にする
            </label>
          </Field>

          <hr
            style={{
              margin: "16px 0",
              border: "none",
              borderTop: "1px solid #eee",
            }}
          />
          <h3 style={{ marginBottom: 12, fontSize: 16 }}>APIキー</h3>

          <Field label="X API Key">
            <input
              value={form.twitterApiKey}
              onChange={(e) => set("twitterApiKey", e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="X API Secret">
            <input
              value={form.twitterApiSecret}
              onChange={(e) => set("twitterApiSecret", e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="X Access Token">
            <input
              value={form.twitterAccessToken}
              onChange={(e) => set("twitterAccessToken", e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="X Access Token Secret">
            <input
              value={form.twitterAccessTokenSecret}
              onChange={(e) => set("twitterAccessTokenSecret", e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="Claude API Key">
            <input
              value={form.claudeApiKey}
              onChange={(e) => set("claudeApiKey", e.target.value)}
              style={inputStyle}
            />
          </Field>

          <hr
            style={{
              margin: "16px 0",
              border: "none",
              borderTop: "1px solid #eee",
            }}
          />
          <h3 style={{ marginBottom: 12, fontSize: 16 }}>
            Google連携（スプレッドシート）
          </h3>

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
        </>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button
          type="submit"
          disabled={saving}
          style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "保存中..." : "保存"}
        </button>
        <button type="button" onClick={onDone} style={btnSecondary}>
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
      {label && (
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
      )}
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
const btnPrimary: React.CSSProperties = {
  background: "#1da1f2",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "10px 20px",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
};
const btnSecondary: React.CSSProperties = {
  background: "#f0f0f0",
  color: "#333",
  border: "1px solid #ccc",
  borderRadius: 6,
  padding: "10px 20px",
  cursor: "pointer",
  fontSize: 14,
};
