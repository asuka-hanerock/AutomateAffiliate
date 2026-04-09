import { useEffect, useState } from "react";
import ScheduleEditor from "../components/ScheduleEditor";

interface Props {
  accountId: string;
  onBack: () => void;
}

export default function AccountSettings({ accountId, onBack }: Props) {
  const [form, setForm] = useState({
    cronSchedule: '[{"days":[],"time":"09:00"}]',
    ctaEnabled: false,
    skipPreview: false,
    maxCharsPerPost: 140,
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
          maxCharsPerPost: data.maxCharsPerPost ?? 140,
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

      {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}
      {success && (
        <div style={{ color: "#17bf63", marginBottom: 12 }}>保存しました</div>
      )}

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
          1投稿あたりの文字数上限
        </label>
        <select
          value={form.maxCharsPerPost}
          onChange={(e) =>
            setForm((f) => ({ ...f, maxCharsPerPost: Number(e.target.value) }))
          }
          style={{
            padding: "8px 12px",
            border: "1px solid #ccc",
            borderRadius: 6,
            fontSize: 14,
          }}
        >
          <option value={140}>140文字（通常）</option>
          <option value={280}>280文字（Xプレミアム）</option>
          <option value={500}>500文字</option>
          <option value={1000}>1,000文字</option>
          <option value={25000}>25,000文字（Xプレミアム+）</option>
        </select>
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
      </div>
    </form>
  );
}
