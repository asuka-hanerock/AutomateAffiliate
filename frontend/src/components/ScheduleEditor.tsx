import { useState } from "react";

interface TimeEntry {
  mode: "time";
  days: number[];
  time: string;
}

interface RandomEntry {
  mode: "random";
  postsPerDay: number;
  activeHoursStart: number;
  activeHoursEnd: number;
}

type ScheduleEntry = TimeEntry | RandomEntry;

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const dayLabels = ["日", "月", "火", "水", "木", "金", "土"];

function parseEntries(value: string): ScheduleEntry[] {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((e: Record<string, unknown>) => {
        if (e.mode === "random") {
          return {
            mode: "random" as const,
            postsPerDay: (e.postsPerDay as number) ?? 10,
            activeHoursStart: (e.activeHoursStart as number) ?? 8,
            activeHoursEnd: (e.activeHoursEnd as number) ?? 23,
          };
        }
        return {
          mode: "time" as const,
          days: (e.days as number[]) ?? [],
          time: (e.time as string) ?? "09:00",
        };
      });
    }
  } catch {}
  return [{ mode: "time", days: [], time: "09:00" }];
}

export default function ScheduleEditor({ value, onChange }: Props) {
  const entries = parseEntries(value);
  const [scheduleMode, setScheduleMode] = useState<"time" | "random">(
    entries.length > 0 && entries[0].mode === "random" ? "random" : "time",
  );

  const update = (newEntries: ScheduleEntry[]) => {
    onChange(JSON.stringify(newEntries));
  };

  // === 固定時刻モード ===
  const timeEntries = entries.filter((e): e is TimeEntry => e.mode === "time");

  const addTimeEntry = () => {
    update([...entries, { mode: "time", days: [], time: "09:00" }]);
  };

  const removeEntry = (index: number) => {
    update(entries.filter((_, i) => i !== index));
  };

  const updateTimeEntry = (index: number, entry: TimeEntry) => {
    const next = [...entries];
    next[index] = entry;
    update(next);
  };

  const toggleDay = (entryIndex: number, day: number) => {
    const entry = entries[entryIndex] as TimeEntry;
    const days = [...entry.days];
    const idx = days.indexOf(day);
    if (idx >= 0) days.splice(idx, 1);
    else days.push(day);
    days.sort();
    updateTimeEntry(entryIndex, { ...entry, days });
  };

  const setAllDays = (entryIndex: number) => {
    updateTimeEntry(entryIndex, {
      ...(entries[entryIndex] as TimeEntry),
      days: [],
    });
  };

  // === ランダムモード ===
  const randomEntry: RandomEntry = (entries.find(
    (e): e is RandomEntry => e.mode === "random",
  ) ?? {
    mode: "random",
    postsPerDay: 10,
    activeHoursStart: 8,
    activeHoursEnd: 23,
  }) as RandomEntry;

  const updateRandom = (patch: Partial<RandomEntry>) => {
    update([{ ...randomEntry, ...patch }]);
  };

  // モード切替
  const switchMode = (mode: "time" | "random") => {
    setScheduleMode(mode);
    if (mode === "random") {
      update([
        {
          mode: "random",
          postsPerDay: 10,
          activeHoursStart: 8,
          activeHoursEnd: 23,
        },
      ]);
    } else {
      update([{ mode: "time", days: [], time: "09:00" }]);
    }
  };

  const formatTimeLabel = (entry: TimeEntry): string => {
    const dayPart =
      entry.days.length === 0
        ? "毎日"
        : entry.days.map((d) => dayLabels[d]).join("・");
    return `${dayPart} ${entry.time}`;
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <label
        style={{
          fontSize: 14,
          fontWeight: 500,
          display: "block",
          marginBottom: 8,
        }}
      >
        投稿スケジュール
      </label>

      {/* モード切替 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => switchMode("time")}
          style={{
            padding: "6px 14px",
            border:
              scheduleMode === "time" ? "2px solid #1da1f2" : "1px solid #ccc",
            borderRadius: 6,
            background: scheduleMode === "time" ? "#e8f5fd" : "#fff",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: scheduleMode === "time" ? 600 : 400,
          }}
        >
          固定時刻
        </button>
        <button
          type="button"
          onClick={() => switchMode("random")}
          style={{
            padding: "6px 14px",
            border:
              scheduleMode === "random"
                ? "2px solid #794bc4"
                : "1px solid #ccc",
            borderRadius: 6,
            background: scheduleMode === "random" ? "#f3eeff" : "#fff",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: scheduleMode === "random" ? 600 : 400,
          }}
        >
          ランダム
        </button>
      </div>

      {scheduleMode === "time" && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 8,
            }}
          >
            <button
              type="button"
              onClick={addTimeEntry}
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

          {timeEntries.length === 0 && (
            <p style={{ color: "#888", fontSize: 13 }}>
              スケジュールが設定されていません
            </p>
          )}

          {entries.map((entry, i) => {
            if (entry.mode !== "time") return null;
            return (
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
                    {formatTimeLabel(entry)}
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
                          border: active
                            ? "2px solid #1da1f2"
                            : "1px solid #ccc",
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

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13 }}>時刻:</span>
                  <input
                    type="time"
                    value={entry.time}
                    onChange={(e) =>
                      updateTimeEntry(i, { ...entry, time: e.target.value })
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
            );
          })}
          <p style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
            設定した時刻に投稿されます
          </p>
        </>
      )}

      {scheduleMode === "random" && (
        <div
          style={{
            border: "1px solid #e0e0e0",
            borderRadius: 8,
            padding: 14,
            background: "#fafafa",
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              1日の投稿回数
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 4,
              }}
            >
              <input
                type="number"
                min={1}
                max={50}
                value={randomEntry.postsPerDay}
                onChange={(e) =>
                  updateRandom({ postsPerDay: Number(e.target.value) })
                }
                style={{
                  width: 70,
                  padding: "6px 8px",
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  fontSize: 14,
                }}
              />
              <span style={{ fontSize: 13, color: "#666" }}>回/日</span>
            </div>
          </div>
          <div style={{ marginBottom: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>活動時間帯</label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 4,
              }}
            >
              <input
                type="number"
                min={0}
                max={23}
                value={randomEntry.activeHoursStart}
                onChange={(e) =>
                  updateRandom({ activeHoursStart: Number(e.target.value) })
                }
                style={{
                  width: 60,
                  padding: "6px 8px",
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  fontSize: 14,
                }}
              />
              <span style={{ fontSize: 13 }}>時 〜</span>
              <input
                type="number"
                min={0}
                max={24}
                value={randomEntry.activeHoursEnd}
                onChange={(e) =>
                  updateRandom({ activeHoursEnd: Number(e.target.value) })
                }
                style={{
                  width: 60,
                  padding: "6px 8px",
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  fontSize: 14,
                }}
              />
              <span style={{ fontSize: 13 }}>時</span>
            </div>
          </div>
          <p style={{ fontSize: 11, color: "#999", marginTop: 8 }}>
            この時間帯にランダムな時刻で投稿されます。毎日0時にスケジュールが再生成されます。
          </p>
        </div>
      )}
    </div>
  );
}
