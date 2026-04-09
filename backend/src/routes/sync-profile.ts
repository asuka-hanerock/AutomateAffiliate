import { Router } from "express";
import { prisma } from "../utils/db";
import { decrypt } from "../utils/crypto";
import { Client, OAuth1 } from "@xdevplatform/xdk";

const router = Router();

// Xプロフィール同期
router.post("/:accountId", async (req, res) => {
  const account = await prisma.account.findUnique({
    where: { id: req.params.accountId },
  });
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const apiKey = decrypt(account.twitterApiKey);
  const apiSecret = decrypt(account.twitterApiSecret);
  const accessToken = decrypt(account.twitterAccessToken);
  const accessTokenSecret = decrypt(account.twitterAccessTokenSecret);

  if (!apiKey || !accessToken) {
    res.status(400).json({ error: "X APIキーが設定されていません" });
    return;
  }

  try {
    const auth = new OAuth1({
      apiKey,
      apiSecret,
      accessToken,
      accessTokenSecret,
      callback: "oob",
    });
    const client = new Client({ oauth1: auth });
    const me = await client.users.getMe({
      "user.fields": ["name", "username", "profile_image_url", "description"],
    });

    const data = me.data;
    if (!data) {
      res.status(500).json({ error: "プロフィール取得に失敗しました" });
      return;
    }

    // アイコンURLは _normal を _400x400 に置換して高解像度にする
    const profileImageUrl = (data.profileImageUrl || "").replace(
      "_normal.",
      "_400x400.",
    );

    await prisma.account.update({
      where: { id: account.id },
      data: {
        displayName: data.name || "",
        profileImageUrl,
        xUsername: data.username || "",
        bio: data.description || "",
      },
    });

    res.json({
      ok: true,
      profile: {
        displayName: data.name,
        username: data.username,
        profileImageUrl,
        bio: data.description,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
