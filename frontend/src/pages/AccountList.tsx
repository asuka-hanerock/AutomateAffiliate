import { useEffect, useState } from "react";

const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
function formatSchedule(cronSchedule: string): string {
  try {
    const entries = JSON.parse(cronSchedule);
    if (!Array.isArray(entries)) return cronSchedule;
    return entries
      .map((e: { days: number[]; time: string }) => {
        const dayPart =
          !e.days || e.days.length === 0
            ? "毎日"
            : e.days.map((d: number) => dayNames[d]).join("・");
        return `${dayPart} ${e.time}`;
      })
      .join("、");
  } catch {
    return cronSchedule;
  }
}

interface Account {
  id: string;
  displayName: string;
  profileImageUrl: string;
  xUsername: string;
  trademark: string;
  niche: string;
  cronSchedule: string;
  ctaEnabled: boolean;
  user: { email: string };
  _count?: { postLogs: number };
}

interface Props {
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
}

export default function AccountList({ onSelect }: Props) {
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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {accounts.map((a) => (
        <div
          key={a.id}
          onClick={() => onSelect(a.id)}
          style={{
            borderRadius: 12,
            overflow: "hidden",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            transition: "box-shadow 0.2s, transform 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          {/* ヘッダー */}
          <div
            style={{
              background: "linear-gradient(135deg, #1da1f2 0%, #0d8bd9 100%)",
              padding: "16px 20px",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {a.profileImageUrl ? (
              <img
                src={a.profileImageUrl}
                alt=""
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.3)",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                {a.trademark ||
                  (a.displayName || a.user.email)[0].toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>
                {a.displayName || a.user.email}
              </div>
              {a.xUsername && (
                <div style={{ fontSize: 13, opacity: 0.8 }}>@{a.xUsername}</div>
              )}
            </div>
          </div>

          {/* 情報エリア */}
          <div
            style={{
              padding: "12px 20px",
              background: "#fff",
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <InfoChip label="ジャンル" value={a.niche} />
            <InfoChip
              label="スケジュール"
              value={formatSchedule(a.cronSchedule)}
            />
            <InfoChip label="CTA" value={a.ctaEnabled ? "ON" : "OFF"} />
          </div>
        </div>
      ))}
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: "#999",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>
        {value}
      </div>
    </div>
  );
}
