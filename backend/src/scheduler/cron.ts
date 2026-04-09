import cron from "node-cron";
import { prisma } from "../utils/db";
import { runPipeline } from "../services/pipeline";
import { runQuotePipeline } from "../services/quote-pipeline";

// quoteRatioに基づいて通常or引用を選んで実行
async function runAutoPost(accountId: string) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { quoteRatio: true },
  });
  const ratio = account?.quoteRatio ?? 0;
  const isQuote = Math.random() * 100 < ratio;

  if (isQuote) {
    console.log(`[Scheduler] 引用ポスト実行: ${accountId}`);
    try {
      const result = await runQuotePipeline(accountId);
      if (!result) {
        console.log("[Scheduler] 引用対象なし、通常ポストにフォールバック");
        await runPipeline(accountId);
      }
    } catch (err) {
      console.error(`[Scheduler] 引用ポスト失敗、通常にフォールバック:`, err);
      await runPipeline(accountId);
    }
  } else {
    await runPipeline(accountId);
  }
}

// accountId -> cleanup functions
const jobs = new Map<string, (() => void)[]>();

export interface ScheduleEntry {
  mode: "time" | "random"; // time=固定時刻, random=ランダム
  // mode=time用
  days?: number[]; // 0=日, 1=月, ..., 6=土。空配列=毎日
  time?: string; // "09:30"
  // mode=random用
  postsPerDay?: number; // 1日の投稿回数
  activeHoursStart?: number; // 活動開始時（デフォルト8）
  activeHoursEnd?: number; // 活動終了時（デフォルト23）
}

// 後方互換: 旧形式 {days, time} → mode="time"に変換
function normalizeEntry(raw: Record<string, unknown>): ScheduleEntry {
  if (raw.mode === "random") {
    return {
      mode: "random",
      postsPerDay: (raw.postsPerDay as number) ?? 10,
      activeHoursStart: (raw.activeHoursStart as number) ?? 8,
      activeHoursEnd: (raw.activeHoursEnd as number) ?? 23,
    };
  }
  return {
    mode: "time",
    days: (raw.days as number[]) ?? [],
    time: (raw.time as string) ?? "09:00",
  };
}

// ScheduleEntryをcron式に変換（mode=time用）
function toCron(entry: ScheduleEntry): string {
  const [hour, minute] = (entry.time ?? "09:00").split(":").map(Number);
  const days = entry.days ?? [];
  const dayPart = days.length === 0 || days.length === 7 ? "*" : days.join(",");
  return `${minute} ${hour} * * ${dayPart}`;
}

export function parseSchedules(cronSchedule: string): ScheduleEntry[] {
  try {
    const parsed = JSON.parse(cronSchedule);
    if (Array.isArray(parsed)) return parsed.map(normalizeEntry);
  } catch {
    if (cron.validate(cronSchedule)) {
      return [{ mode: "time", days: [], time: cronSchedule }];
    }
  }
  return [];
}

// ランダムモード: 1日の投稿時刻をランダム生成してスケジュール
function scheduleRandomPosts(
  accountId: string,
  postsPerDay: number,
  startHour: number,
  endHour: number,
): () => void {
  let dailyTimers: ReturnType<typeof setTimeout>[] = [];
  let stopped = false;

  function scheduleDailyBatch() {
    if (stopped) return;
    // 今日のランダム時刻を生成
    const now = new Date();
    const totalMinutes = (endHour - startHour) * 60;
    const times: number[] = [];
    for (let i = 0; i < postsPerDay; i++) {
      times.push(Math.floor(Math.random() * totalMinutes));
    }
    times.sort((a, b) => a - b);

    for (const minuteOffset of times) {
      const execTime = new Date(now);
      execTime.setHours(startHour, 0, 0, 0);
      execTime.setMinutes(execTime.getMinutes() + minuteOffset);

      const delay = execTime.getTime() - Date.now();
      if (delay < 0) continue; // 既に過ぎた時刻はスキップ

      const timer = setTimeout(async () => {
        if (stopped) return;
        console.log(
          `[Scheduler] ランダム実行: ${accountId} (${execTime.toLocaleTimeString("ja-JP")})`,
        );
        try {
          await runAutoPost(accountId);
        } catch (err) {
          console.error(`[Scheduler] ジョブ失敗: ${accountId}`, err);
        }
      }, delay);
      dailyTimers.push(timer);
    }

    const scheduled = times
      .map((m) => {
        const h = startHour + Math.floor(m / 60);
        const min = m % 60;
        return `${h}:${String(min).padStart(2, "0")}`;
      })
      .join(", ");
    console.log(
      `[Scheduler] ランダム ${postsPerDay}回/日 登録: ${accountId} (${scheduled})`,
    );
  }

  // 初回: 今日分をスケジュール
  scheduleDailyBatch();

  // 毎日0:05に翌日分を再スケジュール
  const dailyReset = cron.schedule("5 0 * * *", () => {
    dailyTimers.forEach((t) => clearTimeout(t));
    dailyTimers = [];
    scheduleDailyBatch();
  });

  return () => {
    stopped = true;
    dailyTimers.forEach((t) => clearTimeout(t));
    dailyReset.stop();
  };
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
    existing.forEach((stop) => stop());
  }

  const entries = parseSchedules(cronSchedule);
  const cleanups: (() => void)[] = [];

  for (const entry of entries) {
    // ランダムモード
    if (entry.mode === "random") {
      const cleanup = scheduleRandomPosts(
        accountId,
        entry.postsPerDay ?? 10,
        entry.activeHoursStart ?? 8,
        entry.activeHoursEnd ?? 23,
      );
      cleanups.push(cleanup);
      continue;
    }

    // 旧形式cron式の場合
    const time = entry.time ?? "";
    if ((entry.days ?? []).length === 0 && time.includes(" ")) {
      if (!cron.validate(time)) continue;
      const task = cron.schedule(time, async () => {
        console.log(`[Scheduler] ジョブ実行: ${accountId}`);
        try {
          await runAutoPost(accountId);
        } catch (err) {
          console.error(`[Scheduler] ジョブ失敗: ${accountId}`, err);
        }
      });
      cleanups.push(() => task.stop());
      console.log(`[Scheduler] ジョブ登録: ${accountId} (${time})`);
      continue;
    }

    // 標準: 曜日+時刻のcron式
    const cronExpr = toCron(entry);
    if (!cron.validate(cronExpr)) {
      console.error(
        `[Scheduler] 無効なスケジュール: ${JSON.stringify(entry)} → ${cronExpr}`,
      );
      continue;
    }

    const days = entry.days ?? [];
    const dayLabel =
      days.length === 0 || days.length === 7
        ? "毎日"
        : days
            .map((d) => ["日", "月", "火", "水", "木", "金", "土"][d])
            .join("");
    const task = cron.schedule(cronExpr, async () => {
      console.log(`[Scheduler] ジョブ実行: ${accountId} (${dayLabel} ${time})`);
      try {
        await runAutoPost(accountId);
      } catch (err) {
        console.error(`[Scheduler] ジョブ失敗: ${accountId}`, err);
      }
    });
    cleanups.push(() => task.stop());
    console.log(`[Scheduler] ジョブ登録: ${accountId} (${dayLabel} ${time})`);
  }

  jobs.set(accountId, cleanups);
}

export function removeSchedule(accountId: string): void {
  const existing = jobs.get(accountId);
  if (existing) {
    existing.forEach((stop) => stop());
    jobs.delete(accountId);
    console.log(`[Scheduler] ジョブ削除: ${accountId}`);
  }
}
