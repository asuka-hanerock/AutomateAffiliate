import { useEffect, useState } from "react";

interface Account {
  id: string;
  displayName: string;
  niche: string;
  cronSchedule: string;
  ctaEnabled: boolean;
  user: { email: string };
}

interface Props {
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
}

export default function AccountList({ onSelect, onEdit }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then(setAccounts)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>読み込み中...</p>;
  if (accounts.length === 0)
    return (
      <p style={{ color: "#888" }}>
        アカウントがありません。「新規アカウント」から追加してください。
      </p>
    );

  return (
    <div>
      {accounts.map((a) => (
        <div
          key={a.id}
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
            marginBottom: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ cursor: "pointer" }} onClick={() => onSelect(a.id)}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>
              {a.displayName || a.user.email}
            </div>
            <div style={{ color: "#666", fontSize: 14, marginTop: 4 }}>
              ジャンル: {a.niche} ／ Cron: {a.cronSchedule} ／ CTA:{" "}
              {a.ctaEnabled ? "ON" : "OFF"}
            </div>
          </div>
          <button
            onClick={() => onEdit(a.id)}
            style={{
              background: "#f0f0f0",
              border: "1px solid #ccc",
              borderRadius: 4,
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            編集
          </button>
        </div>
      ))}
    </div>
  );
}
