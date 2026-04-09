import { useEffect, useState } from "react";

interface QuoteTarget {
  id: string;
  xUsername: string;
  xUserId: string;
  isActive: boolean;
}

interface Props {
  accountId: string;
}

export default function QuoteTargetManager({ accountId }: Props) {
  const [targets, setTargets] = useState<QuoteTarget[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [adding, setAdding] = useState(false);

  const load = () => {
    fetch(`/api/quote-targets/${accountId}`)
      .then((r) => r.json())
      .then(setTargets);
  };

  useEffect(() => {
    load();
  }, [accountId]);

  const handleAdd = async () => {
    if (!newUsername.trim()) return;
    setAdding(true);
    await fetch("/api/quote-targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, xUsername: newUsername.trim() }),
    });
    setNewUsername("");
    setAdding(false);
    load();
  };

  const handleToggle = async (t: QuoteTarget) => {
    await fetch(`/api/quote-targets/${t.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !t.isActive }),
    });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この引用対象を削除しますか？")) return;
    await fetch(`/api/quote-targets/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>
        引用対象のXアカウントを登録すると、伸びてるポストを自動で引用します（X
        API Basic以上が必要）
      </p>

      {/* 追加フォーム */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          placeholder="@ユーザー名"
          style={{
            flex: 1,
            padding: "8px 12px",
            border: "1px solid #ccc",
            borderRadius: 6,
            fontSize: 14,
          }}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newUsername.trim()}
          style={{
            background: "#1da1f2",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            opacity: adding || !newUsername.trim() ? 0.6 : 1,
          }}
        >
          {adding ? "追加中..." : "追加"}
        </button>
      </div>

      {/* 一覧 */}
      {targets.length === 0 ? (
        <p style={{ color: "#888", fontSize: 13 }}>
          引用対象がありません。@ユーザー名を入力して追加してください。
        </p>
      ) : (
        targets.map((t) => (
          <div
            key={t.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              border: "1px solid #eee",
              borderRadius: 8,
              marginBottom: 8,
              opacity: t.isActive ? 1 : 0.5,
            }}
          >
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>
                @{t.xUsername}
              </span>
              {t.xUserId && (
                <span style={{ fontSize: 11, color: "#999", marginLeft: 8 }}>
                  ID: {t.xUserId}
                </span>
              )}
            </div>
            <button
              onClick={() => handleToggle(t)}
              style={{
                background: t.isActive ? "#e6f9ed" : "#f0f0f0",
                color: t.isActive ? "#17bf63" : "#888",
                border: "none",
                borderRadius: 4,
                padding: "3px 8px",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {t.isActive ? "ON" : "OFF"}
            </button>
            <button
              onClick={() => handleDelete(t.id)}
              style={{
                background: "none",
                border: "1px solid #ddd",
                borderRadius: 4,
                padding: "3px 8px",
                cursor: "pointer",
                fontSize: 11,
                color: "#e0245e",
              }}
            >
              削除
            </button>
          </div>
        ))
      )}
    </div>
  );
}
