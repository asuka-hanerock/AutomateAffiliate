import { useEffect, useState } from "react";
import ScheduleEditor from "../components/ScheduleEditor";

interface Props {
  accountId: string;
  onBack: () => void;
  embedded?: boolean;
}

export default function AccountSettings({
  accountId,
  onBack,
  embedded,
}: Props) {
  const [form, setForm] = useState({
    cronSchedule: '[{"days":[],"time":"09:00"}]',
    ctaEnabled: false,
    skipPreview: false,
    xPremiumTier: "none" as string,
    maxCharsPerPost: 140,
    quoteRatio: 0,
    discordWebhookUrl: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/accounts/${accountId}`)
      .then((r) => r.json())
      .then((data) => {
        setForm({
          cronSchedule: data.cronSchedule,
          ctaEnabled: data.ctaEnabled,
          skipPreview: data.skipPreview ?? false,
          xPremiumTier: data.xPremiumTier ?? "none",
          maxCharsPerPost: data.maxCharsPerPost ?? 140,
          quoteRatio: data.quoteRatio ?? 0,
          discordWebhookUrl: data.discordWebhookUrl ?? "",
        });
      });
  }, [accountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "保存に失敗しました");
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 500 }}>
      {!embedded && (
        <>
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
          <h2 style={{ marginBottom: 16 }}>運用設定</h2>
        </>
      )}

      {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}

      <ScheduleEditor
        value={form.cronSchedule}
        onChange={(v) => setForm((f) => ({ ...f, cronSchedule: v }))}
      />

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={form.ctaEnabled}
            onChange={(e) =>
              setForm((f) => ({ ...f, ctaEnabled: e.target.checked }))
            }
          />
          CTAを有効にする
        </label>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={form.skipPreview}
            onChange={(e) =>
              setForm((f) => ({ ...f, skipPreview: e.target.checked }))
            }
          />
          プレビューをスキップ（「今すぐ実行」で即投稿）
        </label>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label
          style={{
            display: "block",
            marginBottom: 4,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Xプレミアム
        </label>
        <select
          value={form.xPremiumTier}
          onChange={(e) => {
            const tier = e.target.value;
            const charMap: Record<string, number> = {
              none: 140,
              premium: 25000,
              premium_plus: 25000,
            };
            setForm((f) => ({
              ...f,
              xPremiumTier: tier,
              maxCharsPerPost: charMap[tier] ?? 140,
            }));
          }}
          style={{
            padding: "8px 12px",
            border: "1px solid #ccc",
            borderRadius: 6,
            fontSize: 14,
          }}
        >
          <option value="none">なし（140文字）</option>
          <option value="premium">Premium（25,000文字）</option>
          <option value="premium_plus">Premium+（25,000文字）</option>
        </select>
        <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
          プレミアムに応じて文字数上限が自動設定されます
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label
          style={{
            display: "block",
            marginBottom: 4,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          引用ポスト比率
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="range"
            min={0}
            max={100}
            step={10}
            value={form.quoteRatio}
            onChange={(e) =>
              setForm((f) => ({ ...f, quoteRatio: Number(e.target.value) }))
            }
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: 14, fontWeight: 600, minWidth: 40 }}>
            {form.quoteRatio}%
          </span>
        </div>
        <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
          自動投稿のうち引用ポストの割合。0%=通常のみ
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label
          style={{
            display: "block",
            marginBottom: 4,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Discord通知
        </label>
        <input
          value={form.discordWebhookUrl}
          onChange={(e) =>
            setForm((f) => ({ ...f, discordWebhookUrl: e.target.value }))
          }
          placeholder="https://discord.com/api/webhooks/..."
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #ccc",
            borderRadius: 6,
            fontSize: 14,
          }}
        />
        <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
          投稿時にDiscordに通知を送ります。空欄で無効
        </div>
      </div>

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
        {success && (
          <span style={{ color: "#17bf63", fontSize: 14, fontWeight: 600 }}>
            保存しました
          </span>
        )}
      </div>
    </form>
  );
}
