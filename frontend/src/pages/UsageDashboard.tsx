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
  byOperation: Record<string, ProviderSummary>;
  daily: DailyEntry[];
  totalRecords: number;
}

interface DetailRecord {
  id: string;
  provider: string;
  operation: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  createdAt: string;
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

const operationLabels: Record<string, string> = {
  select_topic: "話題選定",
  generate_thread: "スレッド生成",
  generate_quote: "引用文生成",
  post_thread: "スレッド投稿",
  post_quote: "引用投稿",
  read_timeline: "タイムライン読取",
  search: "検索",
};

export default function UsageDashboard({ accountId, onBack }: Props) {
  const [period, setPeriod] = useState<"day" | "month" | "year">("month");
  const [data, setData] = useState<UsageData | null>(null);
  const [details, setDetails] = useState<DetailRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailFilter, setDetailFilter] = useState<{
    provider: string;
    operation: string;
  }>({ provider: "", operation: "" });
  const [showDetails, setShowDetails] = useState(false);

  const loadSummary = (p: string) => {
    setLoading(true);
    fetch(`/api/usage/${accountId}?period=${p}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  };

  const loadDetails = () => {
    const params = new URLSearchParams({ period });
    if (detailFilter.provider) params.set("provider", detailFilter.provider);
    if (detailFilter.operation) params.set("operation", detailFilter.operation);
    fetch(`/api/usage/${accountId}/details?${params}`)
      .then((r) => r.json())
      .then(setDetails);
  };

  useEffect(() => {
    loadSummary(period);
  }, [accountId, period]);

  useEffect(() => {
    if (showDetails) loadDetails();
  }, [showDetails, period, detailFilter]);

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
              （$1=¥150換算）・{data.totalRecords}回のAPI呼び出し
            </div>
          </div>

          {/* プロバイダ別 */}
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>プロバイダ別</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 20,
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

          {/* 操作別内訳 */}
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>操作別内訳</h3>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: 24,
              fontSize: 13,
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "2px solid #eee",
                  textAlign: "left",
                }}
              >
                <th style={{ padding: "8px 4px" }}>操作</th>
                <th style={{ padding: "8px 4px", textAlign: "right" }}>回数</th>
                <th style={{ padding: "8px 4px", textAlign: "right" }}>
                  コスト
                </th>
                <th style={{ padding: "8px 4px", textAlign: "right" }}>
                  入力tok
                </th>
                <th style={{ padding: "8px 4px", textAlign: "right" }}>
                  出力tok
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.byOperation).map(([op, val]) => (
                <tr key={op} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "6px 4px" }}>
                    {operationLabels[op] ?? op}
                  </td>
                  <td style={{ padding: "6px 4px", textAlign: "right" }}>
                    {val.count}
                  </td>
                  <td
                    style={{
                      padding: "6px 4px",
                      textAlign: "right",
                      fontWeight: 600,
                    }}
                  >
                    ${val.costUsd.toFixed(4)}
                  </td>
                  <td
                    style={{
                      padding: "6px 4px",
                      textAlign: "right",
                      color: "#888",
                    }}
                  >
                    {val.inputTokens > 0
                      ? val.inputTokens.toLocaleString()
                      : "-"}
                  </td>
                  <td
                    style={{
                      padding: "6px 4px",
                      textAlign: "right",
                      color: "#888",
                    }}
                  >
                    {val.outputTokens > 0
                      ? val.outputTokens.toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 日別推移 */}
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

          {/* 明細セクション */}
          <div style={{ marginTop: 24 }}>
            <button
              onClick={() => setShowDetails((v) => !v)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#1da1f2",
                fontSize: 14,
                fontWeight: 600,
                padding: 0,
              }}
            >
              {showDetails ? "明細を閉じる ▲" : "明細を表示 ▼"}
            </button>

            {showDetails && (
              <div style={{ marginTop: 12 }}>
                {/* フィルター */}
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginBottom: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <select
                    value={detailFilter.provider}
                    onChange={(e) =>
                      setDetailFilter((f) => ({
                        ...f,
                        provider: e.target.value,
                      }))
                    }
                    style={{
                      padding: "6px 10px",
                      border: "1px solid #ccc",
                      borderRadius: 4,
                      fontSize: 13,
                    }}
                  >
                    <option value="">全プロバイダ</option>
                    <option value="claude">Claude API</option>
                    <option value="x_post">X 投稿</option>
                    <option value="x_read">X 読取</option>
                  </select>
                  <select
                    value={detailFilter.operation}
                    onChange={(e) =>
                      setDetailFilter((f) => ({
                        ...f,
                        operation: e.target.value,
                      }))
                    }
                    style={{
                      padding: "6px 10px",
                      border: "1px solid #ccc",
                      borderRadius: 4,
                      fontSize: 13,
                    }}
                  >
                    <option value="">全操作</option>
                    <option value="select_topic">話題選定</option>
                    <option value="generate_thread">スレッド生成</option>
                    <option value="generate_quote">引用文生成</option>
                    <option value="post_thread">スレッド投稿</option>
                    <option value="post_quote">引用投稿</option>
                    <option value="read_timeline">タイムライン読取</option>
                    <option value="search">検索</option>
                  </select>
                </div>

                {/* 明細テーブル */}
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: "2px solid #eee",
                        textAlign: "left",
                      }}
                    >
                      <th style={{ padding: "6px 4px" }}>日時</th>
                      <th style={{ padding: "6px 4px" }}>プロバイダ</th>
                      <th style={{ padding: "6px 4px" }}>操作</th>
                      <th
                        style={{
                          padding: "6px 4px",
                          textAlign: "right",
                        }}
                      >
                        コスト
                      </th>
                      <th
                        style={{
                          padding: "6px 4px",
                          textAlign: "right",
                        }}
                      >
                        トークン
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.map((r) => (
                      <tr
                        key={r.id}
                        style={{ borderBottom: "1px solid #f5f5f5" }}
                      >
                        <td
                          style={{
                            padding: "5px 4px",
                            color: "#888",
                          }}
                        >
                          {new Date(r.createdAt).toLocaleString("ja-JP", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td style={{ padding: "5px 4px" }}>
                          <span
                            style={{
                              color:
                                providerLabels[r.provider]?.color ?? "#888",
                              fontWeight: 600,
                              fontSize: 11,
                            }}
                          >
                            {providerLabels[r.provider]?.label ?? r.provider}
                          </span>
                        </td>
                        <td style={{ padding: "5px 4px" }}>
                          {operationLabels[r.operation] ?? r.operation}
                        </td>
                        <td
                          style={{
                            padding: "5px 4px",
                            textAlign: "right",
                            fontWeight: 600,
                          }}
                        >
                          ${r.costUsd.toFixed(4)}
                        </td>
                        <td
                          style={{
                            padding: "5px 4px",
                            textAlign: "right",
                            color: "#888",
                          }}
                        >
                          {r.inputTokens > 0 || r.outputTokens > 0
                            ? `${r.inputTokens.toLocaleString()} / ${r.outputTokens.toLocaleString()}`
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {details.length === 0 && (
                  <p
                    style={{
                      color: "#888",
                      fontSize: 12,
                      textAlign: "center",
                      padding: 16,
                    }}
                  >
                    該当するレコードがありません
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {data && !loading && data.totalRecords === 0 && (
        <p style={{ color: "#888", fontSize: 13 }}>
          この期間のデータはありません
        </p>
      )}
    </div>
  );
}
