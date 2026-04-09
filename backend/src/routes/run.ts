import { Router } from "express";
import { runPipeline } from "../services/pipeline";

const router = Router();

// 手動トリガー
router.post("/", async (req, res) => {
  const { accountId, dryRun } = req.body;
  if (!accountId) {
    res.status(400).json({ error: "accountId is required" });
    return;
  }

  try {
    await runPipeline(accountId, !!dryRun);
    const message = dryRun
      ? "テスト完了。スレッド生成のみ実行しました"
      : "パイプライン実行完了";
    res.json({ ok: true, message });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
