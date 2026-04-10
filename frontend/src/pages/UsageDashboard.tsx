import { useEffect, useState } from "react";

interface ProviderSummary {
  count: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
}

interface DailyEntry {
  date: string;
  claude: number;
  x: number;
  total: number;
}

interface UsageData {
  period: string;
  since: string;
  totalCost: number;
  byProvider: Record<string, ProviderSummary>;
  daily: DailyEntry[];
  totalRecords: number;
}

interface Props {
  accountId: string;
  onBack: () => void;
}

const periodLabels: Record<string, string> = {
  day: "今日",
  month: "今月",
  year: "今年",
};

const providerLabels: Record<string, { label: string; color: string }> = {
  claude: { label: "Claude API", color: "#d97706" },
  x_post: { label: "X 投稿", color: "#1da1f2" },
  x_read: { label: "X 読取", color: "#794bc4" },
};

export default function UsageDashboard({ accountId, onBack }: Props) {
  const [period, setPeriod] = useState<"day" | "month" | "year">("month");
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = (p: string) => {
    setLoading(true);
    fetch(`/api/usage/${accountId}?period=${p}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(period);
  }, [accountId, period]);

  const maxDaily = data ? Math.max(...data.daily.map((d) => d.total), 0.01) : 1;

  return (
    <div>
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

      <h2 style={{ marginBottom: 16 }}>API利用料</h2>

      {/* 期間切替 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["day", "month", "year"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: "8px 18px",
              border: period === p ? "2px solid #1da1f2" : "1px solid #ccc",
              borderRadius: 6,
              background: period === p ? "#e8f5fd" : "#fff",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: period === p ? 600 : 400,
            }}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: "#888" }}>読み込み中...</p>}

      {data && !loading && (
        <>
          {/* トータルコスト */}
          <div
            style={{
              background: "linear-gradient(135deg, #1da1f2 0%, #0d8bd9 100%)",
              borderRadius: 12,
              padding: "20px 24px",
              color: "#fff",
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.8 }}>
              {periodLabels[period]}の合計
            </div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>
              ${data.totalCost.toFixed(4)}
            </div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
              ≈ ¥{Math.round(data.totalCost * 150).toLocaleString()}
              （$1=¥150換算） ・{data.totalRecords}回のAPI呼び出し
            </div>
          </div>

          {/* プロバイダ別 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 24,
            }}
          >
            {Object.entries(data.byProvider).map(([key, val]) => {
              const info = providerLabels[key] ?? {
                label: key,
                color: "#888",
              };
              return (
                <div
                  key={key}
                  style={{
                    border: `2px solid ${info.color}20`,
                    borderRadius: 10,
                    padding: 16,
                    background: "#fff",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: info.color,
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    {info.label}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>
                    ${val.costUsd.toFixed(4)}
                  </div>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                    {val.count}回
                    {val.inputTokens > 0 &&
                      ` ・ ${val.inputTokens.toLocaleString()}tok入力`}
                    {val.outputTokens > 0 &&
                      ` ・ ${val.outputTokens.toLocaleString()}tok出力`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 日別推移（簡易バーチャート） */}
          {data.daily.length > 0 && (
            <>
              <h3 style={{ fontSize: 15, marginBottom: 12 }}>日別推移</h3>
              <div
                style={{
                  display: "flex",
                  gap: 2,
                  alignItems: "flex-end",
                  height: 120,
                  padding: "0 4px",
                  borderBottom: "1px solid #eee",
                  marginBottom: 4,
                }}
              >
                {data.daily.map((d) => {
                  const claudeH = (d.claude / maxDaily) * 100;
                  const xH = (d.x / maxDaily) * 100;
                  return (
                    <div
                      key={d.date}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-end",
                        minWidth: 0,
                      }}
                      title={`${d.date}\nClaude: $${d.claude.toFixed(4)}\nX: $${d.x.toFixed(4)}\n合計: $${d.total.toFixed(4)}`}
                    >
                      <div
                        style={{
                          height: `${xH}%`,
                          background: "#1da1f2",
                          borderRadius: "2px 2px 0 0",
                          minHeight: d.x > 0 ? 2 : 0,
                        }}
                      />
                      <div
                        style={{
                          height: `${claudeH}%`,
                          background: "#d97706",
                          minHeight: d.claude > 0 ? 2 : 0,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  color: "#999",
                }}
              >
                <span>{data.daily[0]?.date.slice(5)}</span>
                <span>{data.daily[data.daily.length - 1]?.date.slice(5)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  marginTop: 8,
                  fontSize: 11,
                }}
              >
                <span>
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      background: "#d97706",
                      borderRadius: 2,
                      marginRight: 4,
                    }}
                  />
                  Claude
                </span>
                <span>
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      background: "#1da1f2",
                      borderRadius: 2,
                      marginRight: 4,
                    }}
                  />
                  X API
                </span>
              </div>
            </>
          )}

          {data.daily.length === 0 && (
            <p style={{ color: "#888", fontSize: 13 }}>
              この期間のデータはありません
            </p>
          )}
        </>
      )}
    </div>
  );
}
