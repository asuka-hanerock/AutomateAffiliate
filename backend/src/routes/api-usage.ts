import { Router } from "express";
import { prisma } from "../utils/db";

const router = Router();

function getSince(period: string): Date {
  const now = new Date();
  if (period === "year") return new Date(now.getFullYear(), 0, 1);
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// 利用料サマリー取得
router.get("/:accountId", async (req, res) => {
  const { accountId } = req.params;
  const { period } = req.query;
  const since = getSince((period as string) || "day");

  const usages = await prisma.apiUsage.findMany({
    where: { accountId, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
  });

  // プロバイダ別集計
  const byProvider: Record<
    string,
    {
      count: number;
      costUsd: number;
      inputTokens: number;
      outputTokens: number;
    }
  > = {};
  // 操作別集計
  const byOperation: Record<
    string,
    {
      count: number;
      costUsd: number;
      inputTokens: number;
      outputTokens: number;
    }
  > = {};
  let totalCost = 0;

  for (const u of usages) {
    // プロバイダ別
    if (!byProvider[u.provider]) {
      byProvider[u.provider] = {
        count: 0,
        costUsd: 0,
        inputTokens: 0,
        outputTokens: 0,
      };
    }
    byProvider[u.provider].count += 1;
    byProvider[u.provider].costUsd += u.costUsd;
    byProvider[u.provider].inputTokens += u.inputTokens;
    byProvider[u.provider].outputTokens += u.outputTokens;

    // 操作別
    if (!byOperation[u.operation]) {
      byOperation[u.operation] = {
        count: 0,
        costUsd: 0,
        inputTokens: 0,
        outputTokens: 0,
      };
    }
    byOperation[u.operation].count += 1;
    byOperation[u.operation].costUsd += u.costUsd;
    byOperation[u.operation].inputTokens += u.inputTokens;
    byOperation[u.operation].outputTokens += u.outputTokens;

    totalCost += u.costUsd;
  }

  // 日別推移（直近30日分）
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyUsages = await prisma.apiUsage.findMany({
    where: { accountId, createdAt: { gte: thirtyDaysAgo } },
    orderBy: { createdAt: "asc" },
  });

  const dailyMap: Record<string, { claude: number; x: number; total: number }> =
    {};
  for (const u of dailyUsages) {
    const day = u.createdAt.toISOString().split("T")[0];
    if (!dailyMap[day]) dailyMap[day] = { claude: 0, x: 0, total: 0 };
    if (u.provider === "claude") dailyMap[day].claude += u.costUsd;
    else dailyMap[day].x += u.costUsd;
    dailyMap[day].total += u.costUsd;
  }

  const daily = Object.entries(dailyMap).map(([date, costs]) => ({
    date,
    ...costs,
  }));

  res.json({
    period: period || "day",
    since: since.toISOString(),
    totalCost,
    byProvider,
    byOperation,
    daily,
    totalRecords: usages.length,
  });
});

// 明細一覧（フィルター対応）
router.get("/:accountId/details", async (req, res) => {
  const { accountId } = req.params;
  const { period, provider, operation, limit } = req.query;
  const since = getSince((period as string) || "month");

  const where: Record<string, unknown> = {
    accountId,
    createdAt: { gte: since },
  };
  if (provider) where.provider = provider;
  if (operation) where.operation = operation;

  const records = await prisma.apiUsage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(limit) || 100, 500),
  });

  res.json(records);
});

export default router;
