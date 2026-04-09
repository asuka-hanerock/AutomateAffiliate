import { useEffect, useState } from "react";

interface PostLog {
  id: string;
  topic: string;
  content: string;
  tweetIds: string;
  postedAt: string;
  status: string;
}

interface AccountData {
  id: string;
  displayName: string;
  profileImageUrl: string;
  xUsername: string;
  bio: string;
  niche: string;
  pronoun: string;
  trademark: string;
  cronSchedule: string;
  ctaEnabled: boolean;
  skipPreview: boolean;
  user: { email: string };
  postLogs: PostLog[];
}

interface PreviewData {
  topic: string;
  topicReason: string;
  topicSource: string;
  posts: string[];
  cta: string | null;
  cost?: {
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
  };
}

interface Props {
  accountId: string;
  onBack: () => void;
  onEdit: (id: string) => void;
  onSettings: (id: string) => void;
  onApiKeys: (id: string) => void;
  onPrompts: (id: string) => void;
  onFormats: (id: string) => void;
}

const statusLabel: Record<string, { text: string; color: string }> = {
  成功: { text: "成功", color: "#17bf63" },
  失敗: { text: "失敗", color: "#e0245e" },
  テスト: { text: "テスト", color: "#794bc4" },
  削除済: { text: "削除済", color: "#888" },
  success: { text: "成功", color: "#17bf63" },
  failed: { text: "失敗", color: "#e0245e" },
  deleted: { text: "削除済", color: "#888" },
  pending: { text: "待機", color: "#888" },
};

function getStatus(s: string) {
  return statusLabel[s] || { text: s, color: "#888" };
}

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
            : e.days.map((d) => dayNames[d]).join("・");
        return `${dayPart} ${e.time}`;
      })
      .join("、");
  } catch {
    return cronSchedule;
  }
}

export default function AccountDetail({
  accountId,
  onBack,
  onEdit,
  onSettings,
  onApiKeys,
  onPrompts,
  onFormats,
}: Props) {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [running, setRunning] = useState<"run" | "test" | false>(false);
  const [runResult, setRunResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [showCost, setShowCost] = useState(false);

  const load = () => {
    fetch(`/api/accounts/${accountId}`)
      .then((r) => r.json())
      .then((data) => {
        setAccount(data);
        setSelected(new Set());
      });
  };

  useEffect(() => {
    load();
  }, [accountId]);

  const handleRun = async (dryRun: boolean) => {
    setRunning(dryRun ? "test" : "run");
    setRunResult(null);

    // skipPreviewがfalseで通常実行の場合はプレビューモード
    if (!dryRun && account && !account.skipPreview) {
      try {
        const res = await fetch("/api/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId, preview: true }),
        });
        const data = await res.json();
        if (res.ok && data.data) {
          setPreview(data.data);
        } else {
          setRunResult({
            ok: false,
            message: data.error || "プレビュー取得失敗",
          });
        }
      } catch {
        setRunResult({ ok: false, message: "通信エラー" });
      } finally {
        setRunning(false);
      }
      return;
    }

    // dryRun or skipPreview=true: 従来通り
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, dryRun }),
      });
      const data = await res.json();
      setRunResult({ ok: res.ok, message: data.message || data.error });
      load();
    } catch {
      setRunResult({ ok: false, message: "通信エラー" });
    } finally {
      setRunning(false);
    }
  };

  const handleConfirmPost = async () => {
    if (!preview) return;
    setConfirming(true);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          confirmPosts: preview.posts,
          confirmTopic: preview.topic,
          confirmCta: preview.cta,
        }),
      });
      const data = await res.json();
      setRunResult({ ok: res.ok, message: data.message || data.error });
      setPreview(null);
      load();
    } catch {
      setRunResult({ ok: false, message: "通信エラー" });
    } finally {
      setConfirming(false);
    }
  };

  const handleSyncProfile = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/sync-profile/${accountId}`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        load();
      } else {
        alert(data.error);
      }
    } catch {
      alert("通信エラー");
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteTweets = async (postLogId: string, topic: string) => {
    if (!confirm(`「${topic}」のツイートをXから削除しますか？`)) return;
    setDeleting(postLogId);
    try {
      const res = await fetch("/api/delete-tweets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postLogId }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(
          `${data.deleted}件削除完了${data.failed > 0 ? `、${data.failed}件失敗` : ""}`,
        );
        load();
      } else {
        alert(data.error);
      }
    } catch {
      alert("通信エラー");
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!confirm("このログを削除しますか？")) return;
    await fetch(`/api/logs/${logId}`, { method: "DELETE" });
    load();
  };

  const handleBulkDeleteLogs = async () => {
    if (selected.size === 0) return;
    if (!confirm(`${selected.size}件のログを削除しますか？`)) return;
    await fetch("/api/logs/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected) }),
    });
    load();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!account) return <p>読み込み中...</p>;

  const filteredLogs = account.postLogs.filter((log) => {
    if (filter !== "all") {
      const s = getStatus(log.status).text;
      if (s !== filter) return false;
    }
    if (search && !log.topic.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const toggleSelectAll = () => {
    if (selected.size === filteredLogs.length) setSelected(new Set());
    else setSelected(new Set(filteredLogs.map((l) => l.id)));
  };

  return (
    <div>
      {/* プレビューモーダル */}
      {preview && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => !confirming && setPreview(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              width: "90%",
              maxWidth: 560,
              maxHeight: "85vh",
              overflow: "auto",
              padding: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* モーダルヘッダー */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e0e0e0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16 }}>投稿プレビュー</h3>
              <button
                onClick={() => setPreview(null)}
                disabled={confirming}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 20,
                  cursor: "pointer",
                  color: "#888",
                }}
              >
                ×
              </button>
            </div>

            {/* 話題情報 */}
            <div
              style={{
                padding: "12px 20px",
                background: "#f8f9fa",
                borderBottom: "1px solid #e0e0e0",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                {preview.topic}
              </div>
              <div style={{ fontSize: 12, color: "#666" }}>
                {preview.topicReason} ({preview.topicSource})
              </div>
              {preview.cost && (
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={() => setShowCost((v) => !v)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      fontSize: 11,
                      color: "#1da1f2",
                      cursor: "pointer",
                    }}
                  >
                    {showCost ? "コストを非表示 ▲" : "コストを表示 ▼"}
                  </button>
                  {showCost && (
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 11,
                        color: "#666",
                        display: "flex",
                        gap: 12,
                      }}
                    >
                      <span>
                        入力: {preview.cost.inputTokens.toLocaleString()}tok
                      </span>
                      <span>
                        出力: {preview.cost.outputTokens.toLocaleString()}tok
                      </span>
                      <span style={{ fontWeight: 600 }}>
                        ≈ ${preview.cost.estimatedCostUsd.toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* スレッド内容 */}
            <div style={{ padding: "16px 20px" }}>
              <div
                style={{
                  borderLeft: "2px solid #cfd9de",
                  marginLeft: 16,
                  paddingLeft: 16,
                }}
              >
                {preview.posts.map((post, i) => (
                  <div
                    key={i}
                    style={{
                      paddingBottom: 12,
                      marginBottom: 12,
                      borderBottom:
                        i < preview.posts.length - 1
                          ? "1px solid #f0f0f0"
                          : "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 4,
                      }}
                    >
                      {account.profileImageUrl ? (
                        <img
                          src={account.profileImageUrl}
                          alt=""
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: "#1da1f2",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: 14,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {account.trademark ||
                            (account.displayName ||
                              account.user.email)[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>
                          {account.displayName ||
                            account.user.email.split("@")[0]}
                        </span>
                        <span
                          style={{
                            color: "#888",
                            fontSize: 12,
                            marginLeft: 4,
                          }}
                        >
                          {i + 1}/{preview.posts.length}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                        marginLeft: 38,
                      }}
                    >
                      {post}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#888",
                        marginLeft: 38,
                        marginTop: 4,
                      }}
                    >
                      {post.length}文字
                    </div>
                  </div>
                ))}
                {preview.cta && (
                  <div style={{ paddingBottom: 12 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 4,
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "#f7931a",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        CTA
                      </div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>CTA</span>
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                        marginLeft: 38,
                      }}
                    >
                      {preview.cta}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#888",
                        marginLeft: 38,
                        marginTop: 4,
                      }}
                    >
                      {preview.cta.length}文字
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* アクションボタン */}
            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid #e0e0e0",
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setPreview(null)}
                disabled={confirming}
                style={{
                  background: "#fff",
                  border: "1px solid #ccc",
                  color: "#333",
                  borderRadius: 8,
                  padding: "10px 20px",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirmPost}
                disabled={confirming}
                style={{
                  background: "#17bf63",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 20px",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  opacity: confirming ? 0.6 : 1,
                }}
              >
                {confirming ? "投稿中..." : "投稿する"}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#1da1f2",
          marginBottom: 16,
        }}
      >
        ← 一覧に戻る
      </button>

      {/* プロフィールヘッダー */}
      <div
        style={{
          background: "linear-gradient(135deg, #1da1f2 0%, #0d8bd9 100%)",
          borderRadius: "12px 12px 0 0",
          padding: "20px 24px",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {account.profileImageUrl ? (
            <img
              src={account.profileImageUrl}
              alt=""
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                border: "3px solid rgba(255,255,255,0.3)",
              }}
            />
          ) : (
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
              }}
            >
              {account.trademark ||
                (account.displayName || account.user.email)[0].toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>
              {account.displayName || account.user.email}
            </h2>
            {account.xUsername && (
              <div style={{ fontSize: 13, opacity: 0.8 }}>
                @{account.xUsername}
              </div>
            )}
          </div>
          <button
            onClick={handleSyncProfile}
            disabled={syncing}
            style={{
              background: "rgba(255,255,255,0.2)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 6,
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: 12,
              opacity: syncing ? 0.6 : 1,
            }}
          >
            {syncing ? "同期中..." : "Xプロフィール同期"}
          </button>
        </div>
      </div>

      {/* 設定カード */}
      <div
        style={{
          border: "1px solid #e0e0e0",
          borderTop: "none",
          borderRadius: "0 0 12px 12px",
          padding: 20,
          marginBottom: 20,
          background: "#fff",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px 24px",
            marginBottom: 16,
          }}
        >
          <InfoItem label="ジャンル" value={account.niche} />
          <InfoItem
            label="スケジュール"
            value={formatSchedule(account.cronSchedule)}
          />
          <InfoItem label="一人称" value={account.pronoun} />
          <InfoItem label="CTA" value={account.ctaEnabled ? "ON" : "OFF"} />
          {account.trademark && (
            <InfoItem label="トレードマーク" value={account.trademark} />
          )}
        </div>

        {/* アクションボタン */}
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            paddingTop: 12,
            borderTop: "1px solid #f0f0f0",
          }}
        >
          <button
            onClick={() => handleRun(false)}
            disabled={!!running}
            style={{
              background: "#17bf63",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              opacity: running ? 0.6 : 1,
            }}
          >
            {running === "run" ? "生成中..." : "今すぐ実行"}
          </button>
          <button
            onClick={() => handleRun(true)}
            disabled={!!running}
            style={{
              background: "#794bc4",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              opacity: running ? 0.6 : 1,
            }}
          >
            {running === "test" ? "実行中..." : "テスト"}
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => onEdit(accountId)}
            style={{
              background: "#fff",
              border: "1px solid #ccc",
              color: "#333",
              borderRadius: 8,
              padding: "10px 16px",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            プロフィール
          </button>
          <button
            onClick={() => onSettings(accountId)}
            style={{
              background: "#fff",
              border: "1px solid #1da1f2",
              color: "#1da1f2",
              borderRadius: 8,
              padding: "10px 16px",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            投稿設定
          </button>
          <button
            onClick={() => onPrompts(accountId)}
            style={{
              background: "#fff",
              border: "1px solid #f7931a",
              color: "#f7931a",
              borderRadius: 8,
              padding: "10px 16px",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            プロンプト管理
          </button>
          <button
            onClick={() => onFormats(accountId)}
            style={{
              background: "#fff",
              border: "1px solid #794bc4",
              color: "#794bc4",
              borderRadius: 8,
              padding: "10px 16px",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            流行構文
          </button>
          <button
            onClick={() => onApiKeys(accountId)}
            style={{
              background: "#fff",
              border: "1px solid #888",
              color: "#888",
              borderRadius: 8,
              padding: "10px 16px",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            API連携
          </button>
        </div>

        {runResult && (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 6,
              background: runResult.ok ? "#e6f9ed" : "#fde8ec",
              color: runResult.ok ? "#17bf63" : "#e0245e",
              fontSize: 14,
            }}
          >
            {runResult.message}
          </div>
        )}
      </div>

      {/* 投稿ログ */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h3 style={{ margin: 0 }}>投稿ログ ({filteredLogs.length}件)</h3>
        {selected.size > 0 && (
          <button
            onClick={handleBulkDeleteLogs}
            style={{
              background: "#e0245e",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            選択した{selected.size}件のログを削除
          </button>
        )}
      </div>

      {/* フィルター */}
      <div
        style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="トピックで検索..."
          style={{
            padding: "6px 10px",
            border: "1px solid #ccc",
            borderRadius: 4,
            fontSize: 13,
            flex: 1,
            minWidth: 150,
          }}
        />
        {["all", "成功", "失敗", "テスト", "削除済"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: "6px 12px",
              border: filter === s ? "2px solid #1da1f2" : "1px solid #ccc",
              borderRadius: 4,
              background: filter === s ? "#e8f5fd" : "#fff",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {s === "all" ? "全て" : s}
          </button>
        ))}
      </div>

      {filteredLogs.length === 0 ? (
        <p style={{ color: "#888" }}>該当するログがありません</p>
      ) : (
        <>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 12, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={
                  selected.size === filteredLogs.length &&
                  filteredLogs.length > 0
                }
                onChange={toggleSelectAll}
                style={{ marginRight: 4 }}
              />
              全選択
            </label>
          </div>
          {filteredLogs.map((log) => {
            const st = getStatus(log.status);
            let posts: string[] = [];
            try {
              posts = JSON.parse(log.content);
            } catch {
              posts = [log.content];
            }
            return (
              <div
                key={log.id}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 8,
                  marginBottom: 12,
                  background: selected.has(log.id) ? "#f0f8ff" : "#fff",
                }}
              >
                {/* ヘッダー */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(log.id)}
                    onChange={() => toggleSelect(log.id)}
                  />
                  <div style={{ flex: 1 }}>
                    <strong>{log.topic}</strong>
                    <div style={{ fontSize: 12, color: "#888" }}>
                      {new Date(log.postedAt).toLocaleString("ja-JP")}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: st.color,
                      background: st.color + "18",
                      padding: "2px 8px",
                      borderRadius: 10,
                    }}
                  >
                    {st.text}
                  </span>
                  <div style={{ display: "flex", gap: 4 }}>
                    {(log.status === "成功" || log.status === "success") &&
                      log.tweetIds && (
                        <button
                          onClick={() => handleDeleteTweets(log.id, log.topic)}
                          disabled={deleting === log.id}
                          style={{
                            background: "#e0245e",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            padding: "2px 6px",
                            cursor: "pointer",
                            fontSize: 11,
                          }}
                        >
                          {deleting === log.id ? "..." : "X投稿削除"}
                        </button>
                      )}
                    <button
                      onClick={() => handleDeleteLog(log.id)}
                      style={{
                        background: "none",
                        border: "1px solid #ddd",
                        borderRadius: 4,
                        padding: "2px 6px",
                        cursor: "pointer",
                        fontSize: 11,
                        color: "#888",
                      }}
                    >
                      ログ削除
                    </button>
                  </div>
                </div>
                {/* X風ツイートカード */}
                <details style={{ padding: "0 12px 10px" }}>
                  <summary
                    style={{
                      cursor: "pointer",
                      padding: "8px 0",
                      fontSize: 13,
                      color: "#1da1f2",
                    }}
                  >
                    スレッドを表示 ({posts.length}件)
                  </summary>
                  <div
                    style={{
                      borderLeft: "2px solid #cfd9de",
                      marginLeft: 16,
                      paddingLeft: 16,
                    }}
                  >
                    {posts.map((post, i) => (
                      <div
                        key={i}
                        style={{
                          paddingBottom: 12,
                          marginBottom: 12,
                          borderBottom:
                            i < posts.length - 1 ? "1px solid #f0f0f0" : "none",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginBottom: 4,
                          }}
                        >
                          {account.profileImageUrl ? (
                            <img
                              src={account.profileImageUrl}
                              alt=""
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                background: "#1da1f2",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#fff",
                                fontSize: 14,
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {account.trademark ||
                                (account.displayName ||
                                  account.user.email)[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>
                              {account.displayName ||
                                account.user.email.split("@")[0]}
                            </span>
                            <span
                              style={{
                                color: "#888",
                                fontSize: 12,
                                marginLeft: 4,
                              }}
                            >
                              {i + 1}/{posts.length}
                            </span>
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            lineHeight: 1.5,
                            whiteSpace: "pre-wrap",
                            marginLeft: 38,
                          }}
                        >
                          {post}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#888",
                            marginLeft: 38,
                            marginTop: 4,
                          }}
                        >
                          {post.length}文字
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span
        style={{
          fontSize: 11,
          color: "#888",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{value}</span>
    </div>
  );
}
