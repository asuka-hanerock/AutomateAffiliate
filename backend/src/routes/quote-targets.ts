import { Router } from "express";
import { prisma } from "../utils/db";

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

export default router;
