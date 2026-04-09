import { Router } from "express";
import { prisma } from "../utils/db";

const router = Router();

// 一覧取得
router.get("/:accountId", async (req, res) => {
  const prompts = await prisma.promptTemplate.findMany({
    where: { accountId: req.params.accountId },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
  });
  res.json(prompts);
});

// 新規作成
router.post("/", async (req, res) => {
  const {
    accountId,
    name,
    type,
    content,
    scheduleType,
    scheduleConfig,
    isActive,
    sortOrder,
  } = req.body;
  if (!accountId || !name || !type || !content) {
    res
      .status(400)
      .json({ error: "accountId, name, type, content は必須です" });
    return;
  }
  const prompt = await prisma.promptTemplate.create({
    data: {
      accountId,
      name,
      type,
      content,
      scheduleType: scheduleType || "always",
      scheduleConfig: scheduleConfig || "{}",
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder || 0,
    },
  });
  res.status(201).json(prompt);
});

// 更新
router.put("/:id", async (req, res) => {
  const { name, content, scheduleType, scheduleConfig, isActive, sortOrder } =
    req.body;
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (content !== undefined) data.content = content;
  if (scheduleType !== undefined) data.scheduleType = scheduleType;
  if (scheduleConfig !== undefined) data.scheduleConfig = scheduleConfig;
  if (isActive !== undefined) data.isActive = isActive;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;

  const prompt = await prisma.promptTemplate.update({
    where: { id: req.params.id },
    data,
  });
  res.json(prompt);
});

// 削除
router.delete("/:id", async (req, res) => {
  await prisma.promptTemplate.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
