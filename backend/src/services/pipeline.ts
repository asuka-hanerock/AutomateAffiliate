import { prisma } from "../utils/db";
import { decrypt } from "../utils/crypto";
import { fetchTopicSources } from "./trends";
import { selectTopic, generateThread } from "./claude";
import { selectPrompt } from "./prompt-selector";
import { postThread } from "./twitter";
import { appendPostLog } from "./sheets";
import { notifyDiscord } from "./discord";
import { recordClaudeUsage, recordXUsage } from "./api-usage";

// 使用済み話題を直近30件保持（プロセス内メモリ）
const usedTopics: string[] = [];
const MAX_USED_TOPICS = 30;
let usedTopicsInitialized = false;

async function initUsedTopics() {
  if (usedTopicsInitialized) return;
  const recentLogs = await prisma.postLog.findMany({
    orderBy: { postedAt: "desc" },
    take: MAX_USED_TOPICS,
    select: { topic: true },
  });
  for (const log of recentLogs.reverse()) {
    if (!usedTopics.includes(log.topic)) {
      usedTopics.push(log.topic);
    }
  }
  usedTopicsInitialized = true;
  console.log(`[Pipeline] 使用済み話題を${usedTopics.length}件復元`);
}

export interface PreviewResult {
  topic: string;
  topicReason: string;
  topicSource: string;
  posts: string[];
  cta: string | null;
  cost: {
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
  };
}

export async function runPipeline(
  accountId: string,
  dryRun = false,
  options?: {
    preview?: boolean;
    confirmPosts?: string[];
    confirmTopic?: string;
    confirmCta?: string | null;
  },
): Promise<PreviewResult | void> {
  await initUsedTopics();

  const account = await prisma.account.findUniqueOrThrow({
    where: { id: accountId },
    include: { user: true },
  });

  const claudeKey = decrypt(account.claudeApiKey);
  if (!claudeKey) {
    throw new Error("Claude APIキーが設定されていません");
  }

  const twitterCreds = {
    apiKey: decrypt(account.twitterApiKey),
    apiSecret: decrypt(account.twitterApiSecret),
    accessToken: decrypt(account.twitterAccessToken),
    accessTokenSecret: decrypt(account.twitterAccessTokenSecret),
  };
  if (!twitterCreds.apiKey || !twitterCreds.accessToken) {
    throw new Error("X APIキーが設定されていません");
  }

  console.log(`[Pipeline] アカウント ${accountId} の実行開始`);

  // confirmモード: 生成済みの投稿をそのまま投稿する
  if (options?.confirmPosts && options?.confirmTopic) {
    console.log("[Pipeline] 確認済み投稿を実行中...");
    const posts = options.confirmPosts;
    const cta = options.confirmCta ?? null;
    const topic = options.confirmTopic;

    let status = "成功";
    let errorMsg: string | undefined;
    let tweetIds: string[] = [];
    console.log("[Pipeline] X投稿中...");
    try {
      tweetIds = await postThread(twitterCreds, posts, cta ?? undefined);
      console.log("[Pipeline] 投稿完了");
      await recordXUsage(
        accountId,
        "post_thread",
        posts.length + (cta ? 1 : 0),
      );
    } catch (err) {
      status = "失敗";
      errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("[Pipeline] 投稿失敗:", errorMsg);
    }

    const allPosts = [...posts];
    if (cta) allPosts.push(cta);

    await saveLog(
      account,
      accountId,
      topic,
      allPosts,
      tweetIds,
      status,
      errorMsg,
    );

    if (status === "失敗") {
      throw new Error("X投稿に失敗しました");
    }
    return;
  }

  // 1. 話題ソース取得（BigQuery + Google News RSS）
  console.log("[Pipeline] 話題ソース取得中...");
  const sources = await fetchTopicSources(account.niche);
  console.log("[Pipeline] 話題ソース取得完了");

  // 2. プロンプト選択
  const topicPrompt = await selectPrompt(accountId, "topic_select");
  const threadPrompt = await selectPrompt(accountId, "thread_generate");

  // 3. 話題選定（使用済み話題を避ける）
  console.log("[Pipeline] 話題選定中...");
  const topicResult = await selectTopic(
    claudeKey,
    topicPrompt,
    account.niche,
    sources,
    usedTopics,
  );
  const topic = topicResult.選択話題;
  console.log(
    `[Pipeline] 話題: ${topic} (理由: ${topicResult.選定理由}, ソース: ${topicResult.ソース})`,
  );
  await recordClaudeUsage(
    accountId,
    "select_topic",
    topicResult.usage.inputTokens,
    topicResult.usage.outputTokens,
  );

  // 使用済みリストに追加
  usedTopics.push(topic);
  if (usedTopics.length > MAX_USED_TOPICS) {
    usedTopics.shift();
  }

  // 4. 流行構文テンプレート選択
  const activeFormats = await prisma.trendFormat.findMany({
    where: { accountId, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  let selectedFormat: string | undefined;
  let postCount: number;
  if (activeFormats.length > 0) {
    const picked =
      activeFormats[Math.floor(Math.random() * activeFormats.length)];
    selectedFormat = picked.template;
    postCount = picked.postCount;
    console.log(`[Pipeline] 流行構文: ${picked.name} (${postCount}投稿)`);
  } else {
    // 構文未指定時はランダム（1〜6投稿）
    postCount = Math.floor(Math.random() * 6) + 1;
    console.log(`[Pipeline] 投稿数ランダム: ${postCount}投稿`);
  }

  const maxChars = account.maxCharsPerPost;

  // 5. スレッド生成（文字数バリデーション+リトライ付き）
  console.log("[Pipeline] スレッド生成中...");
  const threadResult = await generateThread(
    claudeKey,
    threadPrompt,
    account.niche,
    topic,
    account.ctaEnabled,
    account.pronoun,
    account.trademark,
    selectedFormat,
    postCount,
    maxChars,
    account.profileBio || undefined,
  );
  console.log(
    `[Pipeline] ${threadResult.posts.length}投稿を生成${threadResult.cta ? " + CTA" : ""}`,
  );
  await recordClaudeUsage(
    accountId,
    "generate_thread",
    threadResult.usage.inputTokens,
    threadResult.usage.outputTokens,
  );

  // previewモード: 生成結果を返して終了（投稿しない）
  if (options?.preview) {
    console.log("[Pipeline] プレビューモード（投稿スキップ）");
    // Claude Sonnet 4: $3/M input, $15/M output
    const totalInput =
      topicResult.usage.inputTokens + threadResult.usage.inputTokens;
    const totalOutput =
      topicResult.usage.outputTokens + threadResult.usage.outputTokens;
    const estimatedCostUsd = (totalInput * 3 + totalOutput * 15) / 1_000_000;
    return {
      topic,
      topicReason: topicResult.選定理由,
      topicSource: topicResult.ソース,
      posts: threadResult.posts,
      cta: threadResult.cta,
      cost: {
        inputTokens: totalInput,
        outputTokens: totalOutput,
        estimatedCostUsd,
      },
    };
  }

  // 5. X投稿（dryRunの場合はスキップ）
  let status = dryRun ? "テスト" : "成功";
  let errorMsg: string | undefined;
  let tweetIds: string[] = [];
  if (dryRun) {
    console.log("[Pipeline] テスト（X投稿スキップ）");
  } else {
    console.log("[Pipeline] X投稿中...");
    try {
      tweetIds = await postThread(
        twitterCreds,
        threadResult.posts,
        threadResult.cta,
      );
      console.log("[Pipeline] 投稿完了");
      await recordXUsage(
        accountId,
        "post_thread",
        threadResult.posts.length + (threadResult.cta ? 1 : 0),
      );
    } catch (err) {
      status = "失敗";
      errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("[Pipeline] 投稿失敗:", errorMsg);
    }
  }

  // 6. ログ保存（DB + スプレッドシート）
  const allPosts = [...threadResult.posts];
  if (threadResult.cta) allPosts.push(threadResult.cta);

  await saveLog(
    account,
    accountId,
    topic,
    allPosts,
    tweetIds,
    status,
    errorMsg,
  );

  if (status === "失敗") {
    throw new Error("X投稿に失敗しました");
  }
}

async function saveLog(
  account: {
    displayName: string;
    googleServiceAccountJson: string;
    googleSpreadsheetUrl: string;
    discordWebhookUrl: string;
    user: { email: string };
    niche: string;
  },
  accountId: string,
  topic: string,
  allPosts: string[],
  tweetIds: string[],
  status: string,
  errorMsg?: string,
) {
  await prisma.postLog.create({
    data: {
      accountId,
      topic,
      content: JSON.stringify(allPosts),
      tweetIds: tweetIds.join(","),
      status,
    },
  });

  const googleJson = decrypt(account.googleServiceAccountJson);
  const googleUrl = account.googleSpreadsheetUrl;
  if (googleJson && googleUrl) {
    try {
      await appendPostLog(googleJson, googleUrl, {
        datetime: new Date().toLocaleString("ja-JP", {
          timeZone: "Asia/Tokyo",
        }),
        displayName: account.displayName,
        email: account.user.email,
        niche: account.niche,
        topic,
        posts: allPosts,
        status,
        error: errorMsg,
        tweetIds,
      });
      console.log("[Pipeline] スプレッドシートに記録完了");
    } catch (sheetErr) {
      console.error("[Pipeline] スプレッドシート記録失敗:", sheetErr);
    }
  } else {
    console.log("[Pipeline] スプレッドシート未設定、スキップ");
  }
  console.log(`[Pipeline] ログ保存 (status=${status})`);

  // Discord通知
  if (account.discordWebhookUrl) {
    await notifyDiscord({
      webhookUrl: account.discordWebhookUrl,
      accountName: account.displayName,
      topic,
      posts: allPosts,
      status,
      tweetIds,
    });
  }
}
