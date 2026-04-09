import cron from "node-cron";
import { prisma } from "../utils/db";
import { runPipeline } from "../services/pipeline";

// accountId -> ScheduledTask[] (複数ジョブ対応)
const jobs = new Map<string, cron.ScheduledTask[]>();

export interface ScheduleEntry {
  days: number[]; // 0=日, 1=月, ..., 6=土。空配列=毎日
  time: string; // "09:30"
}

// ScheduleEntryをcron式に変換
function toCron(entry: ScheduleEntry): string {
  const [hour, minute] = entry.time.split(":").map(Number);
  const dayPart =
    entry.days.length === 0 || entry.days.length === 7
      ? "*"
      : entry.days.join(",");
  return `${minute} ${hour} * * ${dayPart}`;
}

// cronScheduleフィールドからScheduleEntry[]をパース
export function parseSchedules(cronSchedule: string): ScheduleEntry[] {
  try {
    const parsed = JSON.parse(cronSchedule);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // 旧形式のcron式をそのまま使う場合
    if (cron.validate(cronSchedule)) {
      return [{ days: [], time: cronSchedule }];
    }
  }
  return [];
}

export async function initScheduler(): Promise<void> {
  const accounts = await prisma.account.findMany();
  for (const account of accounts) {
    scheduleAccount(account.id, account.cronSchedule);
  }
  console.log(`[Scheduler] ${accounts.length}件のアカウントを登録`);
}

export function scheduleAccount(accountId: string, cronSchedule: string): void {
  // 既存ジョブを全停止
  const existing = jobs.get(accountId);
  if (existing) {
    existing.forEach((t) => t.stop());
  }

  const entries = parseSchedules(cronSchedule);
  const tasks: cron.ScheduledTask[] = [];

  for (const entry of entries) {
    // 旧形式cron式の場合
    if (entry.days.length === 0 && entry.time.includes(" ")) {
      if (!cron.validate(entry.time)) continue;
      const task = cron.schedule(entry.time, async () => {
        console.log(`[Scheduler] ジョブ実行: ${accountId}`);
        try {
          await runPipeline(accountId);
        } catch (err) {
          console.error(`[Scheduler] ジョブ失敗: ${accountId}`, err);
        }
      });
      tasks.push(task);
      console.log(`[Scheduler] ジョブ登録: ${accountId} (${entry.time})`);
      continue;
    }

    const cronExpr = toCron(entry);
    if (!cron.validate(cronExpr)) {
      console.error(
        `[Scheduler] 無効なスケジュール: ${JSON.stringify(entry)} → ${cronExpr}`,
      );
      continue;
    }

    const dayLabel =
      entry.days.length === 0 || entry.days.length === 7
        ? "毎日"
        : entry.days
            .map((d) => ["日", "月", "火", "水", "木", "金", "土"][d])
            .join("");
    const task = cron.schedule(cronExpr, async () => {
      console.log(
        `[Scheduler] ジョブ実行: ${accountId} (${dayLabel} ${entry.time})`,
      );
      try {
        await runPipeline(accountId);
      } catch (err) {
        console.error(`[Scheduler] ジョブ失敗: ${accountId}`, err);
      }
    });
    tasks.push(task);
    console.log(
      `[Scheduler] ジョブ登録: ${accountId} (${dayLabel} ${entry.time})`,
    );
  }

  jobs.set(accountId, tasks);
}

export function removeSchedule(accountId: string): void {
  const existing = jobs.get(accountId);
  if (existing) {
    existing.forEach((t) => t.stop());
    jobs.delete(accountId);
    console.log(`[Scheduler] ジョブ削除: ${accountId}`);
  }
}
