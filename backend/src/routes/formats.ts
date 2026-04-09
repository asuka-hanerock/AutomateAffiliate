import { Router } from "express";
import { prisma } from "../utils/db";

const router = Router();

// 一覧取得
router.get("/:accountId", async (req, res) => {
  const formats = await prisma.trendFormat.findMany({
    where: { accountId: req.params.accountId },
    orderBy: { sortOrder: "asc" },
  });
  res.json(formats);
});

// 作成
router.post("/", async (req, res) => {
  const { accountId, name, template, example, isActive } = req.body;
  if (!accountId || !name || !template) {
    res.status(400).json({ error: "accountId, name, template は必須です" });
    return;
  }

  const maxOrder = await prisma.trendFormat.aggregate({
    where: { accountId },
    _max: { sortOrder: true },
  });

  const format = await prisma.trendFormat.create({
    data: {
      accountId,
      name,
      template,
      example: example || "",
      isActive: isActive ?? true,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });
  res.status(201).json(format);
});

// 更新
router.put("/:id", async (req, res) => {
  const { name, template, example, isActive, sortOrder, postCount } = req.body;
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (template !== undefined) data.template = template;
  if (example !== undefined) data.example = example;
  if (postCount !== undefined) data.postCount = postCount;
  if (isActive !== undefined) data.isActive = isActive;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;

  const format = await prisma.trendFormat.update({
    where: { id: req.params.id },
    data,
  });
  res.json(format);
});

// 削除
router.delete("/:id", async (req, res) => {
  await prisma.trendFormat.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
