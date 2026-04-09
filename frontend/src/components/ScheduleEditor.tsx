import { useState } from "react";

interface ScheduleEntry {
  days: number[];
  time: string;
}

interface Props {
  value: string; // JSON string or legacy cron
  onChange: (value: string) => void;
}

const dayLabels = ["日", "月", "火", "水", "木", "金", "土"];

function parseEntries(value: string): ScheduleEntry[] {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  // デフォルト: 毎日9:00
  return [{ days: [], time: "09:00" }];
}

export default function ScheduleEditor({ value, onChange }: Props) {
  const entries = parseEntries(value);

  const update = (newEntries: ScheduleEntry[]) => {
    onChange(JSON.stringify(newEntries));
  };

  const addEntry = () => {
    update([...entries, { days: [], time: "09:00" }]);
  };

  const removeEntry = (index: number) => {
    update(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, entry: ScheduleEntry) => {
    const next = [...entries];
    next[index] = entry;
    update(next);
  };

  const toggleDay = (entryIndex: number, day: number) => {
    const entry = entries[entryIndex];
    const days = [...entry.days];
    const idx = days.indexOf(day);
    if (idx >= 0) days.splice(idx, 1);
    else days.push(day);
    days.sort();
    updateEntry(entryIndex, { ...entry, days });
  };

  const setAllDays = (entryIndex: number) => {
    updateEntry(entryIndex, { ...entries[entryIndex], days: [] });
  };

  const formatLabel = (entry: ScheduleEntry): string => {
    const dayPart =
      entry.days.length === 0
        ? "毎日"
        : entry.days.map((d) => dayLabels[d]).join("・");
    return `${dayPart} ${entry.time}`;
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <label style={{ fontSize: 14, fontWeight: 500 }}>
          投稿スケジュール
        </label>
        <button
          type="button"
          onClick={addEntry}
          style={{
            background: "#1da1f2",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            padding: "4px 10px",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          + 時間を追加
        </button>
      </div>

      {entries.length === 0 && (
        <p style={{ color: "#888", fontSize: 13 }}>
          スケジュールが設定されていません
        </p>
      )}

      {entries.map((entry, i) => (
        <div
          key={i}
          style={{
            border: "1px solid #e0e0e0",
            borderRadius: 8,
            padding: 12,
            marginBottom: 8,
            background: "#fafafa",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 13, color: "#555" }}>
              {formatLabel(entry)}
            </span>
            {entries.length > 1 && (
              <button
                type="button"
                onClick={() => removeEntry(i)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#e0245e",
                  fontSize: 12,
                }}
              >
                削除
              </button>
            )}
          </div>

          {/* 曜日選択 */}
          <div
            style={{
              display: "flex",
              gap: 4,
              marginBottom: 8,
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={() => setAllDays(i)}
              style={{
                padding: "4px 8px",
                border:
                  entry.days.length === 0
                    ? "2px solid #1da1f2"
                    : "1px solid #ccc",
                borderRadius: 4,
                background: entry.days.length === 0 ? "#1da1f2" : "#fff",
                color: entry.days.length === 0 ? "#fff" : "#333",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              毎日
            </button>
            {dayLabels.map((label, day) => {
              const active = entry.days.includes(day);
              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => toggleDay(i, day)}
                  style={{
                    width: 32,
                    height: 32,
                    border: active ? "2px solid #1da1f2" : "1px solid #ccc",
                    borderRadius: "50%",
                    background: active ? "#1da1f2" : "#fff",
                    color: active ? "#fff" : "#333",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    padding: 0,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* 時刻入力 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13 }}>時刻:</span>
            <input
              type="time"
              value={entry.time}
              onChange={(e) =>
                updateEntry(i, { ...entry, time: e.target.value })
              }
              style={{
                padding: "4px 8px",
                border: "1px solid #ccc",
                borderRadius: 4,
                fontSize: 14,
              }}
            />
          </div>
        </div>
      ))}

      <p style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
        複数の時間を設定すると、それぞれの時刻に投稿されます
      </p>
    </div>
  );
}
