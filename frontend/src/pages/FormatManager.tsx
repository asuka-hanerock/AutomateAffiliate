import { useEffect, useState } from "react";

interface TrendFormat {
  id: string;
  name: string;
  template: string;
  example: string;
  postCount: number;
  isActive: boolean;
  sortOrder: number;
}

interface Props {
  accountId: string;
  onBack: () => void;
}

export default function FormatManager({ accountId, onBack }: Props) {
  const [formats, setFormats] = useState<TrendFormat[]>([]);
  const [editing, setEditing] = useState<TrendFormat | null>(null);
  const [creating, setCreating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    template: "",
    example: "",
    postCount: 5,
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch(`/api/formats/${accountId}`)
      .then((r) => r.json())
      .then(setFormats);
  };

  useEffect(() => {
    load();
  }, [accountId]);

  const handleCreate = async () => {
    if (!form.name || !form.template) return;
    setSaving(true);
    await fetch("/api/formats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, ...form }),
    });
    setForm({ name: "", template: "", example: "", postCount: 5 });
    setCreating(false);
    setSaving(false);
    load();
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setSaving(true);
    await fetch(`/api/formats/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        template: form.template,
        example: form.example,
        postCount: form.postCount,
      }),
    });
    setEditing(null);
    setForm({ name: "", template: "", example: "", postCount: 5 });
    setSaving(false);
    load();
  };

  const handleToggle = async (f: TrendFormat) => {
    await fetch(`/api/formats/${f.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !f.isActive }),
    });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この構文テンプレートを削除しますか？")) return;
    await fetch(`/api/formats/${id}`, { method: "DELETE" });
    load();
  };

  const startEdit = (f: TrendFormat) => {
    setEditing(f);
    setCreating(false);
    setForm({
      name: f.name,
      template: f.template,
      example: f.example,
      postCount: f.postCount,
    });
  };

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm({ name: "", template: "", example: "", postCount: 5 });
  };

  const cancel = () => {
    setCreating(false);
    setEditing(null);
    setForm({ name: "", template: "", example: "", postCount: 5 });
  };

  const handleAnalyze = async (file: File) => {
    setAnalyzing(true);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(file);
      });

      const mediaType = file.type || "image/png";
      const res = await fetch("/api/analyze-format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, imageBase64: base64, mediaType }),
      });
      const data = await res.json();
      if (res.ok && data.suggestion) {
        setForm({
          name: data.suggestion.name || "",
          template: data.suggestion.template || "",
          example: data.suggestion.example || "",
          postCount: data.suggestion.postCount || 5,
        });
        setCreating(true);
        setEditing(null);
      } else {
        alert(data.error || "分析に失敗しました");
      }
    } catch {
      alert("通信エラー");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <button
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

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0 }}>流行構文テンプレート</h2>
        {!creating && !editing && (
          <button
            onClick={startCreate}
            style={{
              background: "#1da1f2",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            + 追加
          </button>
        )}
        {!creating && !editing && (
          <label
            style={{
              background: "#794bc4",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              cursor: analyzing ? "wait" : "pointer",
              fontSize: 13,
              fontWeight: 600,
              opacity: analyzing ? 0.6 : 1,
            }}
          >
            {analyzing ? "分析中..." : "スクショから分析"}
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAnalyze(file);
                e.target.value = "";
              }}
              disabled={analyzing}
            />
          </label>
        )}
      </div>

      <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
        Xで流行している投稿構文を登録すると、スレッド生成時にランダムで適用されます。
      </p>

      {/* 作成/編集フォーム */}
      {(creating || editing) && (
        <div
          style={{
            border: "1px solid #1da1f2",
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
            background: "#f8fbff",
          }}
        >
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
            {editing ? "編集" : "新規追加"}
          </h3>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>構文名</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              style={inputStyle}
              placeholder="例: 〇〇な人の特徴"
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>テンプレート</label>
            <textarea
              value={form.template}
              onChange={(e) =>
                setForm((f) => ({ ...f, template: e.target.value }))
              }
              style={{ ...inputStyle, minHeight: 80 }}
              placeholder="例: 「{{topic}}な人の特徴」→ 特徴を5つ挙げて、1投稿目で興味を引き、2〜5投稿目で各特徴を解説するスレッド"
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>使用例（任意）</label>
            <textarea
              value={form.example}
              onChange={(e) =>
                setForm((f) => ({ ...f, example: e.target.value }))
              }
              style={{ ...inputStyle, minHeight: 60 }}
              placeholder="例: 「転職で失敗する人の特徴」→ 1投稿目: 転職で失敗する人には共通点がある..."
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>投稿数</label>
            <select
              value={form.postCount}
              onChange={(e) =>
                setForm((f) => ({ ...f, postCount: Number(e.target.value) }))
              }
              style={{
                padding: "8px 12px",
                border: "1px solid #ccc",
                borderRadius: 6,
                fontSize: 14,
              }}
            >
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>
                  {n}投稿
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={editing ? handleUpdate : handleCreate}
              disabled={saving || !form.name || !form.template}
              style={{
                background: "#1da1f2",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                opacity: saving || !form.name || !form.template ? 0.6 : 1,
              }}
            >
              {saving ? "保存中..." : "保存"}
            </button>
            <button
              onClick={cancel}
              style={{
                background: "#f0f0f0",
                color: "#333",
                border: "1px solid #ccc",
                borderRadius: 6,
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 一覧 */}
      {formats.length === 0 ? (
        <p style={{ color: "#888" }}>
          まだ構文テンプレートがありません。「+ 追加」から登録してください。
        </p>
      ) : (
        formats.map((f) => (
          <div
            key={f.id}
            style={{
              border: "1px solid #eee",
              borderRadius: 8,
              padding: 14,
              marginBottom: 10,
              background: f.isActive ? "#fff" : "#f9f9f9",
              opacity: f.isActive ? 1 : 0.6,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 6,
              }}
            >
              <div>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{f.name}</span>
                <span style={{ fontSize: 12, color: "#888", marginLeft: 8 }}>
                  {f.postCount}投稿
                </span>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => handleToggle(f)}
                  style={{
                    background: f.isActive ? "#e6f9ed" : "#f0f0f0",
                    color: f.isActive ? "#17bf63" : "#888",
                    border: "none",
                    borderRadius: 4,
                    padding: "3px 8px",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {f.isActive ? "ON" : "OFF"}
                </button>
                <button onClick={() => startEdit(f)} style={smallBtnStyle}>
                  編集
                </button>
                <button
                  onClick={() => handleDelete(f.id)}
                  style={{ ...smallBtnStyle, color: "#e0245e" }}
                >
                  削除
                </button>
              </div>
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#555",
                whiteSpace: "pre-wrap",
                lineHeight: 1.5,
              }}
            >
              {f.template}
            </div>
            {f.example && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: "#999",
                  fontStyle: "italic",
                }}
              >
                例: {f.example}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 4,
  fontSize: 13,
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #ccc",
  borderRadius: 6,
  fontSize: 14,
};

const smallBtnStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid #ddd",
  borderRadius: 4,
  padding: "3px 8px",
  cursor: "pointer",
  fontSize: 11,
  color: "#555",
};
