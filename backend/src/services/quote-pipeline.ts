import { prisma } from "../utils/db";
import { decrypt } from "../utils/crypto";
import { createClient, postQuote } from "./twitter";
import Anthropic from "@anthropic-ai/sdk";
import { notifyDiscord } from "./discord";

interface TweetData {
  id: string;
  text: string;
  publicMetrics: {
    likeCount: number;
    retweetCount: number;
    replyCount: number;
    impressionCount: number;
  };
}

// 対象アカウントの最新ポストを取得し、エンゲージメントが高いものを返す
async function fetchTopTweets(
  client: ReturnType<typeof createClient>,
  xUserId: string,
  count: number = 5,
): Promise<TweetData[]> {
  const response = await client.users.getTimeline(xUserId, {
    maxResults: 10,
    exclude: ["retweets", "replies"],
    tweetFields: ["public_metrics", "created_at"],
  });

  const tweets = (response as { data?: Array<Record<string, unknown>> }).data;
  if (!tweets || tweets.length === 0) return [];

  const mapped: TweetData[] = tweets.map((t: Record<string, unknown>) => ({
    id: t.id as string,
    text: t.text as string,
    publicMetrics: {
      likeCount: (t.public_metrics as Record<string, number>)?.like_count ?? 0,
      retweetCount:
        (t.public_metrics as Record<string, number>)?.retweet_count ?? 0,
      replyCount:
        (t.public_metrics as Record<string, number>)?.reply_count ?? 0,
      impressionCount:
        (t.public_metrics as Record<string, number>)?.impression_count ?? 0,
    },
  }));

  // エンゲージメントスコアでソート
  mapped.sort((a, b) => {
    const scoreA =
      a.publicMetrics.likeCount * 2 +
      a.publicMetrics.retweetCount * 3 +
      a.publicMetrics.replyCount;
    const scoreB =
      b.publicMetrics.likeCount * 2 +
      b.publicMetrics.retweetCount * 3 +
      b.publicMetrics.replyCount;
    return scoreB - scoreA;
  });

  return mapped.slice(0, count);
}

// ユーザー名からX APIのユーザーIDを取得
async function resolveUserId(
  client: ReturnType<typeof createClient>,
  username: string,
): Promise<string | null> {
  try {
    const response = await client.users.getByUsername(username);
    const data = response as { data?: { id?: string } };
    return data.data?.id ?? null;
  } catch {
    return null;
  }
}

// Claudeで引用ポストを生成
async function generateQuoteText(
  apiKey: string,
  originalText: string,
  niche: string,
  pronoun: string,
  profileBio: string,
  maxChars: number,
): Promise<string> {
  const client = new Anthropic({ apiKey });

  const profileSection = profileBio
    ? `発信者プロフィール:\n${profileBio}\n`
    : "";

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `あなたはX向けの引用ポストライターです。

以下の元ポストに対する引用ポストを作成してください。

## ルール
- ${maxChars}文字以内（改行含む）
- 一人称は「${pronoun}」
- ジャンル: ${niche}
${profileSection}
## 引用ポストの構成
1. 元ポストの主張を自分の言葉で言い換える
2. その理由を述べる
3. 自分の経験や具体例で補強する

## 注意
- ただの感想や同意ではなく、独自の視点を加えること
- 元ポストの価値を増幅する引用にすること
- AI感を出さない。自然な人間の文体で
- 改行を適度に入れて読みやすくすること

## 元ポスト
${originalText}

引用ポストの本文のみを出力してください。前置き・説明は不要です。`,
      },
    ],
  });

  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  return block.text.trim();
}

export interface QuotePipelineResult {
  targetUsername: string;
  originalTweetId: string;
  originalText: string;
  quoteText: string;
  tweetId?: string;
}

export async function runQuotePipeline(
  accountId: string,
  dryRun = false,
): Promise<QuotePipelineResult | null> {
  const account = await prisma.account.findUniqueOrThrow({
    where: { id: accountId },
    include: { user: true, quoteTargets: { where: { isActive: true } } },
  });

  if (account.quoteTargets.length === 0) {
    console.log("[QuotePipeline] 引用対象アカウントなし、スキップ");
    return null;
  }

  const claudeKey = decrypt(account.claudeApiKey);
  if (!claudeKey) throw new Error("Claude APIキーが設定されていません");

  const twitterCreds = {
    apiKey: decrypt(account.twitterApiKey),
    apiSecret: decrypt(account.twitterApiSecret),
    accessToken: decrypt(account.twitterAccessToken),
    accessTokenSecret: decrypt(account.twitterAccessTokenSecret),
  };
  if (!twitterCreds.apiKey || !twitterCreds.accessToken) {
    throw new Error("X APIキーが設定されていません");
  }

  const xClient = createClient(twitterCreds);

  // ランダムに1つの対象アカウントを選択
  const target =
    account.quoteTargets[
      Math.floor(Math.random() * account.quoteTargets.length)
    ];

  // ユーザーIDが未取得なら解決
  let xUserId = target.xUserId;
  if (!xUserId) {
    console.log(`[QuotePipeline] @${target.xUsername} のユーザーID取得中...`);
    const resolved = await resolveUserId(xClient, target.xUsername);
    if (!resolved) {
      console.error(
        `[QuotePipeline] @${target.xUsername} のユーザーIDが取得できません`,
      );
      return null;
    }
    xUserId = resolved;
    await prisma.quoteTarget.update({
      where: { id: target.id },
      data: { xUserId },
    });
  }

  // 伸びてるポストを取得
  console.log(`[QuotePipeline] @${target.xUsername} のポストを取得中...`);
  const topTweets = await fetchTopTweets(xClient, xUserId, 3);
  if (topTweets.length === 0) {
    console.log(
      `[QuotePipeline] @${target.xUsername} のポストが見つかりません`,
    );
    return null;
  }

  // 一番伸びてるポストを選択
  const selectedTweet = topTweets[0];
  console.log(
    `[QuotePipeline] 選択: "${selectedTweet.text.substring(0, 50)}..." (likes: ${selectedTweet.publicMetrics.likeCount})`,
  );

  // 引用テキスト生成
  console.log("[QuotePipeline] 引用ポスト生成中...");
  const quoteText = await generateQuoteText(
    claudeKey,
    selectedTweet.text,
    account.niche,
    account.pronoun,
    account.profileBio,
    account.maxCharsPerPost,
  );
  console.log(`[QuotePipeline] 生成完了: "${quoteText.substring(0, 50)}..."`);

  let tweetId: string | undefined;
  if (!dryRun) {
    console.log("[QuotePipeline] 引用ポスト投稿中...");
    tweetId = await postQuote(twitterCreds, quoteText, selectedTweet.id);
  } else {
    console.log("[QuotePipeline] テスト（投稿スキップ）");
  }

  // ログ保存
  const status = dryRun ? "テスト" : tweetId ? "成功" : "失敗";
  await prisma.postLog.create({
    data: {
      accountId,
      topic: `引用: @${target.xUsername}`,
      content: JSON.stringify([quoteText]),
      tweetIds: tweetId ?? "",
      status,
    },
  });

  // Discord通知
  if (account.discordWebhookUrl) {
    await notifyDiscord({
      webhookUrl: account.discordWebhookUrl,
      accountName: account.displayName,
      topic: `引用: @${target.xUsername}`,
      posts: [quoteText],
      status,
      tweetIds: tweetId ? [tweetId] : [],
      isQuote: true,
    });
  }

  return {
    targetUsername: target.xUsername,
    originalTweetId: selectedTweet.id,
    originalText: selectedTweet.text,
    quoteText,
    tweetId,
  };
}
