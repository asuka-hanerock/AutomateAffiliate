import { prisma } from "../utils/db";
import { decrypt } from "../utils/crypto";
import { fetchTopicSources } from "./trends";
import { selectTopic, generateThread } from "./claude";
import { postThread } from "./twitter";
import { appendPostLog } from "./sheets";

// 使用済み話題を直近30件保持（プロセス内メモリ）
const usedTopics: string[] = [];
const MAX_USED_TOPICS = 30;

export async function runPipeline(
  accountId: string,
  dryRun = false,
): Promise<void> {
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

  // 1. 話題ソース取得（BigQuery + Google News RSS）
  console.log("[Pipeline] 話題ソース取得中...");
  const sources = await fetchTopicSources(account.niche);
  console.log("[Pipeline] 話題ソース取得完了");

  // 2. 話題選定（使用済み話題を避ける）
  console.log("[Pipeline] 話題選定中...");
  const topicResult = await selectTopic(
    claudeKey,
    account.niche,
    sources,
    usedTopics,
  );
  const topic = topicResult.選択話題;
  console.log(
    `[Pipeline] 話題: ${topic} (理由: ${topicResult.選定理由}, ソース: ${topicResult.ソース})`,
  );

  // 使用済みリストに追加
  usedTopics.push(topic);
  if (usedTopics.length > MAX_USED_TOPICS) {
    usedTopics.shift();
  }

  // 3. スレッド生成（140文字バリデーション+リトライ付き）
  console.log("[Pipeline] スレッド生成中...");
  const threadResult = await generateThread(
    claudeKey,
    account.niche,
    topic,
    account.ctaEnabled,
    account.pronoun,
    account.trademark,
  );
  console.log(
    `[Pipeline] ${threadResult.posts.length}投稿を生成${threadResult.cta ? " + CTA" : ""}`,
  );

  // 4. X投稿（dryRunの場合はスキップ）
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
    } catch (err) {
      status = "失敗";
      errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("[Pipeline] 投稿失敗:", errorMsg);
    }
  }

  // 5. ログ保存（DB + スプレッドシート）
  const allPosts = [...threadResult.posts];
  if (threadResult.cta) allPosts.push(threadResult.cta);

  await prisma.postLog.create({
    data: {
      accountId,
      topic,
      content: JSON.stringify(allPosts),
      tweetIds: tweetIds.join(","),
      status,
    },
  });

  // スプレッドシート記録（Google設定があるアカウントのみ）
  const googleJson = decrypt(account.googleServiceAccountJson);
  const googleUrl = account.googleSpreadsheetUrl;
  if (googleJson && googleUrl) {
    try {
      await appendPostLog(googleJson, googleUrl, {
        datetime: new Date().toLocaleString("ja-JP", {
          timeZone: "Asia/Tokyo",
        }),
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

  if (status === "失敗") {
    throw new Error("X投稿に失敗しました");
  }
}
