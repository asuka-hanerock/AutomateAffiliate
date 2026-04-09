import { Router } from "express";
import { prisma } from "../utils/db";

const router = Router();

router.get("/:accountId", async (req, res) => {
  const logs = await prisma.postLog.findMany({
    where: { accountId: req.params.accountId },
    orderBy: { postedAt: "desc" },
    take: 50,
  });
  res.json(logs);
});

// ログ1件削除
router.delete("/:id", async (req, res) => {
  await prisma.postLog.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// 複数ログ一括削除
router.post("/bulk-delete", async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "ids is required" });
    return;
  }
  const result = await prisma.postLog.deleteMany({
    where: { id: { in: ids } },
  });
  res.json({ ok: true, deleted: result.count });
});

export default router;
