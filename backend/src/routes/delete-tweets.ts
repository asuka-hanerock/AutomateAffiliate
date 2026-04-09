import { Router } from "express";
import { prisma } from "../utils/db";
import { decrypt } from "../utils/crypto";
import { deleteTweets } from "../services/twitter-delete";

const router = Router();

// PostLogのtweetIdsを使って一括削除
router.post("/", async (req, res) => {
  const { postLogId } = req.body;
  if (!postLogId) {
    res.status(400).json({ error: "postLogId is required" });
    return;
  }

  const postLog = await prisma.postLog.findUnique({
    where: { id: postLogId },
    include: { account: true },
  });
  if (!postLog) {
    res.status(404).json({ error: "PostLog not found" });
    return;
  }
  if (!postLog.tweetIds) {
    res.status(400).json({ error: "ツイートIDが記録されていません" });
    return;
  }

  const tweetIds = postLog.tweetIds.split(",").filter(Boolean);
  if (tweetIds.length === 0) {
    res.status(400).json({ error: "ツイートIDが記録されていません" });
    return;
  }

  const credentials = {
    apiKey: decrypt(postLog.account.twitterApiKey),
    apiSecret: decrypt(postLog.account.twitterApiSecret),
    accessToken: decrypt(postLog.account.twitterAccessToken),
    accessTokenSecret: decrypt(postLog.account.twitterAccessTokenSecret),
  };

  try {
    const result = await deleteTweets(credentials, tweetIds);

    // 削除成功したらPostLogのステータスを更新
    if (result.failed.length === 0) {
      await prisma.postLog.update({
        where: { id: postLogId },
        data: { status: "削除済" },
      });
    }

    res.json({
      ok: true,
      deleted: result.deleted.length,
      failed: result.failed.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
