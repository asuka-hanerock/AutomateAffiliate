import { prisma } from "../utils/db";

// Claude Sonnet 4: $3/M input, $15/M output
const CLAUDE_INPUT_RATE = 3 / 1_000_000;
const CLAUDE_OUTPUT_RATE = 15 / 1_000_000;

// X API 従量課金の概算レート（正確な値はプランによる）
const X_POST_COST = 0.01; // 1投稿あたり
const X_READ_COST = 0.01; // 1読取リクエストあたり
const X_SEARCH_COST = 0.01; // 1検索リクエストあたり

export async function recordClaudeUsage(
  accountId: string,
  operation: string,
  inputTokens: number,
  outputTokens: number,
) {
  const costUsd =
    inputTokens * CLAUDE_INPUT_RATE + outputTokens * CLAUDE_OUTPUT_RATE;
  await prisma.apiUsage.create({
    data: {
      accountId,
      provider: "claude",
      operation,
      inputTokens,
      outputTokens,
      costUsd,
    },
  });
}

export async function recordXUsage(
  accountId: string,
  operation: string,
  count: number = 1,
) {
  const rateMap: Record<string, number> = {
    post_thread: X_POST_COST,
    post_quote: X_POST_COST,
    read_timeline: X_READ_COST,
    search: X_SEARCH_COST,
  };
  const costUsd = (rateMap[operation] ?? 0.01) * count;
  await prisma.apiUsage.create({
    data: {
      accountId,
      provider: operation.startsWith("post") ? "x_post" : "x_read",
      operation,
      costUsd,
    },
  });
}
