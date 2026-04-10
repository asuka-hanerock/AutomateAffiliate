import { Router } from "express";
import { prisma } from "../utils/db";

const router = Router();

// 利用料サマリー取得
router.get("/:accountId", async (req, res) => {
  const { accountId } = req.params;
  const { period } = req.query; // day | month | year

  const now = new Date();
  let since: Date;
  if (period === "year") {
    since = new Date(now.getFullYear(), 0, 1);
  } else if (period === "month") {
    since = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    // day（デフォルト）
    since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const usages = await prisma.apiUsage.findMany({
    where: {
      accountId,
      createdAt: { gte: since },
    },
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
  let totalCost = 0;

  for (const u of usages) {
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
    totalCost += u.costUsd;
  }

  // 日別推移（直近30日分）
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyUsages = await prisma.apiUsage.findMany({
    where: {
      accountId,
      createdAt: { gte: thirtyDaysAgo },
    },
    orderBy: { createdAt: "asc" },
  });

  const dailyMap: Record<string, { claude: number; x: number; total: number }> =
    {};
  for (const u of dailyUsages) {
    const day = u.createdAt.toISOString().split("T")[0];
    if (!dailyMap[day]) {
      dailyMap[day] = { claude: 0, x: 0, total: 0 };
    }
    if (u.provider === "claude") {
      dailyMap[day].claude += u.costUsd;
    } else {
      dailyMap[day].x += u.costUsd;
    }
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
    daily,
    totalRecords: usages.length,
  });
});

export default router;
