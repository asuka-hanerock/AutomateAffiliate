import { Router } from "express";
import { prisma } from "../utils/db";
import { encrypt, decrypt } from "../utils/crypto";

const router = Router();

// 一覧取得
router.get("/", async (_req, res) => {
  const accounts = await prisma.account.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  // APIキーはマスクして返す
  const masked = accounts.map((a) => ({
    ...a,
    twitterApiKey: a.twitterApiKey ? "***" : "",
    twitterApiSecret: a.twitterApiSecret ? "***" : "",
    twitterAccessToken: a.twitterAccessToken ? "***" : "",
    twitterAccessTokenSecret: a.twitterAccessTokenSecret ? "***" : "",
    claudeApiKey: a.claudeApiKey ? "***" : "",
    googleServiceAccountJson: a.googleServiceAccountJson ? "***" : "",
  }));
  res.json(masked);
});

// 詳細取得
router.get("/:id", async (req, res) => {
  const account = await prisma.account.findUnique({
    where: { id: req.params.id },
    include: {
      user: true,
      postLogs: { orderBy: { postedAt: "desc" }, take: 20 },
    },
  });
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  res.json({
    ...account,
    twitterApiKey: account.twitterApiKey ? "***" : "",
    twitterApiSecret: account.twitterApiSecret ? "***" : "",
    twitterAccessToken: account.twitterAccessToken ? "***" : "",
    twitterAccessTokenSecret: account.twitterAccessTokenSecret ? "***" : "",
    claudeApiKey: account.claudeApiKey ? "***" : "",
    googleServiceAccountJson: account.googleServiceAccountJson ? "***" : "",
  });
});

// 新規作成
router.post("/", async (req, res) => {
  const {
    email,
    displayName,
    niche,
    pronoun,
    trademark,
    cronSchedule,
    ctaEnabled,
    twitterApiKey,
    twitterApiSecret,
    twitterAccessToken,
    twitterAccessTokenSecret,
    claudeApiKey,
    googleServiceAccountJson,
    googleSpreadsheetUrl,
  } = req.body;

  // Userを作成 or 取得
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({ data: { email } });
  }

  const account = await prisma.account.create({
    data: {
      userId: user.id,
      displayName: displayName || "",
      niche: niche || "転職",
      pronoun: pronoun || "僕",
      trademark: trademark || "",
      cronSchedule: cronSchedule || "0 9 * * *",
      ctaEnabled: ctaEnabled || false,
      twitterApiKey: encrypt(twitterApiKey || ""),
      twitterApiSecret: encrypt(twitterApiSecret || ""),
      twitterAccessToken: encrypt(twitterAccessToken || ""),
      twitterAccessTokenSecret: encrypt(twitterAccessTokenSecret || ""),
      claudeApiKey: encrypt(claudeApiKey || ""),
      googleServiceAccountJson: encrypt(googleServiceAccountJson || ""),
      googleSpreadsheetUrl: googleSpreadsheetUrl || "",
    },
    include: { user: true },
  });

  res.status(201).json({
    ...account,
    twitterApiKey: "***",
    twitterApiSecret: "***",
    twitterAccessToken: "***",
    twitterAccessTokenSecret: "***",
    claudeApiKey: "***",
    googleServiceAccountJson: account.googleServiceAccountJson ? "***" : "",
  });
});

// 更新
router.put("/:id", async (req, res) => {
  const {
    displayName,
    niche,
    pronoun,
    trademark,
    cronSchedule,
    ctaEnabled,
    twitterApiKey,
    twitterApiSecret,
    twitterAccessToken,
    twitterAccessTokenSecret,
    claudeApiKey,
    googleServiceAccountJson,
    googleSpreadsheetUrl,
  } = req.body;

  const data: Record<string, unknown> = {};
  if (displayName !== undefined) data.displayName = displayName;
  if (niche !== undefined) data.niche = niche;
  if (pronoun !== undefined) data.pronoun = pronoun;
  if (trademark !== undefined) data.trademark = trademark;
  if (cronSchedule !== undefined) data.cronSchedule = cronSchedule;
  if (ctaEnabled !== undefined) data.ctaEnabled = ctaEnabled;
  if (req.body.skipPreview !== undefined)
    data.skipPreview = req.body.skipPreview;
  if (req.body.maxCharsPerPost !== undefined)
    data.maxCharsPerPost = req.body.maxCharsPerPost;
  if (twitterApiKey !== undefined) data.twitterApiKey = encrypt(twitterApiKey);
  if (twitterApiSecret !== undefined)
    data.twitterApiSecret = encrypt(twitterApiSecret);
  if (twitterAccessToken !== undefined)
    data.twitterAccessToken = encrypt(twitterAccessToken);
  if (twitterAccessTokenSecret !== undefined)
    data.twitterAccessTokenSecret = encrypt(twitterAccessTokenSecret);
  if (claudeApiKey !== undefined) data.claudeApiKey = encrypt(claudeApiKey);
  if (googleServiceAccountJson !== undefined)
    data.googleServiceAccountJson = encrypt(googleServiceAccountJson);
  if (googleSpreadsheetUrl !== undefined)
    data.googleSpreadsheetUrl = googleSpreadsheetUrl;

  const account = await prisma.account.update({
    where: { id: req.params.id },
    data,
    include: { user: true },
  });

  res.json({
    ...account,
    twitterApiKey: "***",
    twitterApiSecret: "***",
    twitterAccessToken: "***",
    twitterAccessTokenSecret: "***",
    claudeApiKey: "***",
    googleServiceAccountJson: account.googleServiceAccountJson ? "***" : "",
  });
});

// 削除
router.delete("/:id", async (req, res) => {
  await prisma.account.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
