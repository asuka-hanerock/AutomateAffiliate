import { Router } from "express";
import { prisma } from "../utils/db";
import { decrypt } from "../utils/crypto";
import { createClient } from "../services/twitter";

const router = Router();

// 一覧取得
router.get("/:accountId", async (req, res) => {
  const targets = await prisma.quoteTarget.findMany({
    where: { accountId: req.params.accountId },
    orderBy: { createdAt: "desc" },
  });
  res.json(targets);
});

// 作成
router.post("/", async (req, res) => {
  const { accountId, xUsername } = req.body;
  if (!accountId || !xUsername) {
    res.status(400).json({ error: "accountId と xUsername は必須です" });
    return;
  }

  const target = await prisma.quoteTarget.create({
    data: {
      accountId,
      xUsername: xUsername.replace(/^@/, ""),
    },
  });
  res.status(201).json(target);
});

// 更新（ON/OFF切替）
router.put("/:id", async (req, res) => {
  const { isActive, xUserId } = req.body;
  const data: Record<string, unknown> = {};
  if (isActive !== undefined) data.isActive = isActive;
  if (xUserId !== undefined) data.xUserId = xUserId;

  const target = await prisma.quoteTarget.update({
    where: { id: req.params.id },
    data,
  });
  res.json(target);
});

// 削除
router.delete("/:id", async (req, res) => {
  await prisma.quoteTarget.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// おすすめアカウント取得（ジャンルでバズってるポストの投稿者を提案）
router.get("/:accountId/suggestions", async (req, res) => {
  try {
    const account = await prisma.account.findUniqueOrThrow({
      where: { id: req.params.accountId },
      include: { quoteTargets: true },
    });

    const creds = {
      apiKey: decrypt(account.twitterApiKey),
      apiSecret: decrypt(account.twitterApiSecret),
      accessToken: decrypt(account.twitterAccessToken),
      accessTokenSecret: decrypt(account.twitterAccessTokenSecret),
    };
    if (!creds.apiKey || !creds.accessToken) {
      res.status(400).json({ error: "X APIキーが設定されていません" });
      return;
    }

    const client = createClient(creds);
    const query = `${account.niche} lang:ja -is:retweet -is:reply`;

    const result = await client.posts.searchRecent(query, {
      maxResults: 30,
      tweetFields: ["public_metrics", "author_id"],
      expansions: ["author_id"],
      userFields: ["username", "name", "public_metrics", "profile_image_url"],
    });

    const data = result as {
      data?: Array<Record<string, unknown>>;
      includes?: { users?: Array<Record<string, unknown>> };
    };

    if (!data.data || !data.includes?.users) {
      res.json([]);
      return;
    }

    // ユーザーマップ作成
    const userMap = new Map<string, Record<string, unknown>>();
    for (const u of data.includes.users) {
      userMap.set(u.id as string, u);
    }

    // エンゲージメント集計（投稿者ごと）
    const authorScores = new Map<
      string,
      {
        username: string;
        name: string;
        profileImageUrl: string;
        followers: number;
        totalScore: number;
        tweetCount: number;
      }
    >();
    const existingUsernames = new Set(
      account.quoteTargets.map((t) => t.xUsername.toLowerCase()),
    );
    const selfUsername = account.xUsername?.toLowerCase();

    for (const tweet of data.data) {
      const authorId = tweet.author_id as string;
      const user = userMap.get(authorId);
      if (!user) continue;

      const username = (user.username as string) ?? "";
      // 自分自身と既に登録済みのアカウントは除外
      if (username.toLowerCase() === selfUsername) continue;
      if (existingUsernames.has(username.toLowerCase())) continue;

      const metrics = tweet.public_metrics as
        | Record<string, number>
        | undefined;
      const score =
        (metrics?.like_count ?? 0) * 2 +
        (metrics?.retweet_count ?? 0) * 3 +
        (metrics?.reply_count ?? 0);

      const existing = authorScores.get(authorId);
      if (existing) {
        existing.totalScore += score;
        existing.tweetCount += 1;
      } else {
        const userMetrics = user.public_metrics as
          | Record<string, number>
          | undefined;
        authorScores.set(authorId, {
          username,
          name: (user.name as string) ?? "",
          profileImageUrl: (user.profile_image_url as string) ?? "",
          followers: userMetrics?.followers_count ?? 0,
          totalScore: score,
          tweetCount: 1,
        });
      }
    }

    // スコア順でソート、上位10件
    const suggestions = Array.from(authorScores.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 10)
      .map((s) => ({
        username: s.username,
        name: s.name,
        profileImageUrl: s.profileImageUrl,
        followers: s.followers,
        score: s.totalScore,
        recentTweets: s.tweetCount,
      }));

    res.json(suggestions);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
