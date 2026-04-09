import { useEffect, useState } from "react";

interface Prompt {
  id: string;
  name: string;
  type: string;
  content: string;
  scheduleType: string;
  scheduleConfig: string;
  isActive: boolean;
  sortOrder: number;
}

interface Props {
  accountId: string;
  onBack: () => void;
}

const typeLabels: Record<string, string> = {
  topic_select: "話題選定",
  thread_generate: "スレッド生成",
};

const scheduleLabels: Record<string, string> = {
  always: "常に使用",
  weekdays: "曜日指定",
  interval: "日数おき",
  rotation: "ローテーション",
};

const dayLabels = ["日", "月", "火", "水", "木", "金", "土"];

const defaultTopicPrompt = `あなたはSNSマーケターの視点を持つトレンド分析の専門家です。
今日は{{date}}です。

2種類のソースが与えられます：
1. Googleトレンド：日本で今まさに検索されている一般的な話題
2. ジャンル特化ニュース：指定ジャンルに直結する最新ニュース

この2つの中から、指定ジャンルの読者に最も刺さる話題を1つだけ選んでください。

選定の考え方：
- Googleトレンドとジャンルが交差する話題があれば最優先
- 交差する話題がなければ、ジャンル特化ニュースから選ぶ
- 【重要】使用済みリストに載っている話題は絶対に選ばないこと

ジャンル名: {{niche}}

{{sources}}

【使用済み】
{{usedTopics}}

出力は以下のJSON形式のみ：
{"選択話題": "話題名", "選定理由": "短い理由", "ソース": "Googleトレンド or ジャンルニュース"}`;

const defaultThreadPrompt = `あなたはX向けの日本語スレッドライターです。
今日は{{date}}です。

各投稿は140文字以内（改行含む）。100〜140文字でフル活用すること。
1文ごとに改行を入れること。

一人称は「{{pronoun}}」を使うこと。
{{trademarkRule}}

ジャンル名: {{niche}}
選択話題: {{topic}}
CTAあり: {{ctaEnabled}}

5投稿のスレッドを生成してください。

出力形式（JSON のみ）：
{"posts": ["1投稿目", "2投稿目", "3投稿目", "4投稿目", "5投稿目"], "cta": "CTA文。不要なら空文字"}`;

export default function PromptManager({ accountId, onBack }: Props) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [editing, setEditing] = useState<Prompt | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "thread_generate",
    content: "",
    scheduleType: "always",
    scheduleConfig: "{}",
    isActive: true,
    sortOrder: 0,
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch(`/api/prompts/${accountId}`)
      .then((r) => r.json())
      .then(setPrompts);
  };

  useEffect(() => {
    load();
  }, [accountId]);

  const resetForm = () => {
    setForm({
      name: "",
      type: "thread_generate",
      content: "",
      scheduleType: "always",
      scheduleConfig: "{}",
      isActive: true,
      sortOrder: 0,
    });
    setEditing(null);
    setCreating(false);
  };

  const startCreate = (type: string) => {
    const defaultContent =
      type === "topic_select" ? defaultTopicPrompt : defaultThreadPrompt;
    setForm({
      name: "",
      type,
      content: defaultContent,
      scheduleType: "always",
      scheduleConfig: "{}",
      isActive: true,
      sortOrder: prompts.filter((p) => p.type === type).length,
    });
    setCreating(true);
    setEditing(null);
  };

  const startEdit = (p: Prompt) => {
    setForm({
      name: p.name,
      type: p.type,
      content: p.content,
      scheduleType: p.scheduleType,
      scheduleConfig: p.scheduleConfig,
      isActive: p.isActive,
      sortOrder: p.sortOrder,
    });
    setEditing(p);
    setCreating(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await fetch(`/api/prompts/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await fetch("/api/prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, accountId }),
        });
      }
      resetForm();
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このプロンプトを削除しますか？")) return;
    await fetch(`/api/prompts/${id}`, { method: "DELETE" });
    load();
  };

  const handleToggle = async (p: Prompt) => {
    await fetch(`/api/prompts/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    load();
  };

  const getScheduleLabel = (p: Prompt) => {
    const base = scheduleLabels[p.scheduleType] || p.scheduleType;
    try {
      const config = JSON.parse(p.scheduleConfig);
      if (p.scheduleType === "weekdays" && config.days) {
        return (
          base + ": " + config.days.map((d: number) => dayLabels[d]).join("")
        );
      }
      if (p.scheduleType === "interval" && config.interval) {
        return base + `: ${config.interval}日おき`;
      }
    } catch {}
    return base;
  };

  // 曜日選択のトグル
  const toggleDay = (day: number) => {
    try {
      const config = JSON.parse(form.scheduleConfig);
      const days: number[] = config.days || [];
      const idx = days.indexOf(day);
      if (idx >= 0) days.splice(idx, 1);
      else days.push(day);
      days.sort();
      setForm((f) => ({ ...f, scheduleConfig: JSON.stringify({ days }) }));
    } catch {
      setForm((f) => ({
        ...f,
        scheduleConfig: JSON.stringify({ days: [day] }),
      }));
    }
  };

  const topicPrompts = prompts.filter((p) => p.type === "topic_select");
  const threadPrompts = prompts.filter((p) => p.type === "thread_generate");
  const showForm = creating || editing;

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
        }}
      >
        ← アカウント詳細に戻る
      </button>

      <h2 style={{ marginBottom: 16 }}>プロンプト管理</h2>
      <p style={{ color: "#666", fontSize: 13, marginBottom: 20 }}>
        プロンプトが未登録の場合はデフォルトのプロンプトが使われます。 変数:{" "}
        {
          "{{niche}}, {{date}}, {{sources}}, {{usedTopics}}, {{topic}}, {{pronoun}}, {{trademarkRule}}, {{ctaEnabled}}"
        }
      </p>

      {/* 話題選定プロンプト */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <h3 style={{ margin: 0 }}>
            話題選定プロンプト ({topicPrompts.length}件)
          </h3>
          <button onClick={() => startCreate("topic_select")} style={btnSmall}>
            + 追加
          </button>
        </div>
        {topicPrompts.length === 0 && (
          <p style={{ color: "#888", fontSize: 13 }}>
            デフォルトプロンプトを使用中
          </p>
        )}
        {topicPrompts.map((p) => (
          <PromptCard
            key={p.id}
            prompt={p}
            onEdit={() => startEdit(p)}
            onDelete={() => handleDelete(p.id)}
            onToggle={() => handleToggle(p)}
            scheduleLabel={getScheduleLabel(p)}
          />
        ))}
      </div>

      {/* スレッド生成プロンプト */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <h3 style={{ margin: 0 }}>
            スレッド生成プロンプト ({threadPrompts.length}件)
          </h3>
          <button
            onClick={() => startCreate("thread_generate")}
            style={btnSmall}
          >
            + 追加
          </button>
        </div>
        {threadPrompts.length === 0 && (
          <p style={{ color: "#888", fontSize: 13 }}>
            デフォルトプロンプトを使用中
          </p>
        )}
        {threadPrompts.map((p) => (
          <PromptCard
            key={p.id}
            prompt={p}
            onEdit={() => startEdit(p)}
            onDelete={() => handleDelete(p.id)}
            onToggle={() => handleToggle(p)}
            scheduleLabel={getScheduleLabel(p)}
          />
        ))}
      </div>

      {/* 編集フォーム */}
      {showForm && (
        <div
          style={{
            border: "2px solid #1da1f2",
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
            background: "#f8fbff",
          }}
        >
          <h3 style={{ marginBottom: 12 }}>
            {editing ? "プロンプト編集" : "新規プロンプト"}
          </h3>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>プロンプト名</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              style={inputStyle}
              placeholder="例: 煽り系スレッド"
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>種類</label>
            <span style={{ fontSize: 14 }}>{typeLabels[form.type]}</span>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>スケジュール</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.entries(scheduleLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      scheduleType: key,
                      scheduleConfig:
                        key === "weekdays"
                          ? '{"days":[]}'
                          : key === "interval"
                            ? '{"interval":2}'
                            : "{}",
                    }))
                  }
                  style={{
                    padding: "4px 10px",
                    border:
                      form.scheduleType === key
                        ? "2px solid #1da1f2"
                        : "1px solid #ccc",
                    borderRadius: 4,
                    background: form.scheduleType === key ? "#e8f5fd" : "#fff",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {form.scheduleType === "weekdays" && (
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>曜日選択</label>
              <div style={{ display: "flex", gap: 4 }}>
                {dayLabels.map((d, i) => {
                  const days: number[] = (() => {
                    try {
                      return JSON.parse(form.scheduleConfig).days || [];
                    } catch {
                      return [];
                    }
                  })();
                  return (
                    <button
                      key={i}
                      onClick={() => toggleDay(i)}
                      style={{
                        width: 36,
                        height: 36,
                        border: days.includes(i)
                          ? "2px solid #1da1f2"
                          : "1px solid #ccc",
                        borderRadius: "50%",
                        background: days.includes(i) ? "#1da1f2" : "#fff",
                        color: days.includes(i) ? "#fff" : "#333",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {form.scheduleType === "interval" && (
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>何日おき</label>
              <input
                type="number"
                min={1}
                value={(() => {
                  try {
                    return JSON.parse(form.scheduleConfig).interval || 2;
                  } catch {
                    return 2;
                  }
                })()}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    scheduleConfig: JSON.stringify({
                      interval: parseInt(e.target.value) || 2,
                    }),
                  }))
                }
                style={{ ...inputStyle, width: 80 }}
              />
              <span style={{ fontSize: 13, marginLeft: 4 }}>日おき</span>
            </div>
          )}

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>順序（ローテーション用）</label>
            <input
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  sortOrder: parseInt(e.target.value) || 0,
                }))
              }
              style={{ ...inputStyle, width: 80 }}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>プロンプト本文</label>
            <textarea
              value={form.content}
              onChange={(e) =>
                setForm((f) => ({ ...f, content: e.target.value }))
              }
              style={{
                ...inputStyle,
                minHeight: 300,
                fontFamily: "monospace",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleSave}
              disabled={saving || !form.name || !form.content}
              style={{
                background: "#1da1f2",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 20px",
                cursor: "pointer",
                fontSize: 14,
                opacity: saving || !form.name || !form.content ? 0.5 : 1,
              }}
            >
              {saving ? "保存中..." : "保存"}
            </button>
            <button
              onClick={resetForm}
              style={{
                background: "#f0f0f0",
                border: "1px solid #ccc",
                borderRadius: 6,
                padding: "8px 20px",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PromptCard({
  prompt,
  onEdit,
  onDelete,
  onToggle,
  scheduleLabel,
}: {
  prompt: Prompt;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  scheduleLabel: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 6,
        padding: 12,
        marginBottom: 8,
        opacity: prompt.isActive ? 1 : 0.5,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <div>
          <strong>{prompt.name}</strong>
          <span style={{ fontSize: 12, color: "#888", marginLeft: 8 }}>
            {scheduleLabel}
          </span>
          {!prompt.isActive && (
            <span style={{ fontSize: 11, color: "#e0245e", marginLeft: 8 }}>
              無効
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={onToggle}
            style={{
              background: "none",
              border: "1px solid #ccc",
              borderRadius: 4,
              padding: "2px 8px",
              cursor: "pointer",
              fontSize: 11,
            }}
          >
            {prompt.isActive ? "無効化" : "有効化"}
          </button>
          <button
            onClick={onEdit}
            style={{
              background: "none",
              border: "1px solid #1da1f2",
              borderRadius: 4,
              padding: "2px 8px",
              cursor: "pointer",
              fontSize: 11,
              color: "#1da1f2",
            }}
          >
            編集
          </button>
          <button
            onClick={onDelete}
            style={{
              background: "none",
              border: "1px solid #e0245e",
              borderRadius: 4,
              padding: "2px 8px",
              cursor: "pointer",
              fontSize: 11,
              color: "#e0245e",
            }}
          >
            削除
          </button>
        </div>
      </div>
      <details style={{ fontSize: 12 }}>
        <summary style={{ cursor: "pointer", color: "#1da1f2" }}>
          プロンプトを表示
        </summary>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            background: "#f8f8f8",
            padding: 8,
            borderRadius: 4,
            marginTop: 4,
            maxHeight: 200,
            overflow: "auto",
            fontSize: 11,
          }}
        >
          {prompt.content}
        </pre>
      </details>
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
const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 4,
  fontSize: 13,
  fontWeight: 600,
};
const btnSmall: React.CSSProperties = {
  background: "#1da1f2",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  padding: "4px 12px",
  cursor: "pointer",
  fontSize: 12,
};
