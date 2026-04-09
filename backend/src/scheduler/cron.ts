import cron from "node-cron";
import { prisma } from "../utils/db";
import { runPipeline } from "../services/pipeline";

const jobs = new Map<string, cron.ScheduledTask>();

export async function initScheduler(): Promise<void> {
  const accounts = await prisma.account.findMany();
  for (const account of accounts) {
    scheduleAccount(account.id, account.cronSchedule);
  }
  console.log(`[Scheduler] ${accounts.length}件のジョブを登録`);
}

export function scheduleAccount(accountId: string, cronSchedule: string): void {
  // 既存ジョブがあれば停止
  const existing = jobs.get(accountId);
  if (existing) {
    existing.stop();
  }

  if (!cron.validate(cronSchedule)) {
    console.error(
      `[Scheduler] 無効なcron式: ${cronSchedule} (account: ${accountId})`,
    );
    return;
  }

  const task = cron.schedule(cronSchedule, async () => {
    console.log(`[Scheduler] ジョブ実行: ${accountId}`);
    try {
      await runPipeline(accountId);
    } catch (err) {
      console.error(`[Scheduler] ジョブ失敗: ${accountId}`, err);
    }
  });

  jobs.set(accountId, task);
  console.log(`[Scheduler] ジョブ登録: ${accountId} (${cronSchedule})`);
}

export function removeSchedule(accountId: string): void {
  const existing = jobs.get(accountId);
  if (existing) {
    existing.stop();
    jobs.delete(accountId);
    console.log(`[Scheduler] ジョブ削除: ${accountId}`);
  }
}
