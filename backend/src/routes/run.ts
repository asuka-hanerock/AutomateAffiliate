import { Router } from "express";
import { runPipeline } from "../services/pipeline";

const router = Router();

// 手動トリガー
router.post("/", async (req, res) => {
  const { accountId, dryRun, preview, confirmPosts, confirmTopic, confirmCta } =
    req.body;
  if (!accountId) {
    res.status(400).json({ error: "accountId is required" });
    return;
  }

  try {
    // プレビューモード: 生成結果を返す（投稿しない）
    if (preview) {
      const result = await runPipeline(accountId, false, { preview: true });
      res.json({ ok: true, preview: true, data: result });
      return;
    }

    // 確認投稿モード: プレビュー済みの内容をそのまま投稿
    if (confirmPosts && confirmTopic) {
      await runPipeline(accountId, false, {
        confirmPosts,
        confirmTopic,
        confirmCta: confirmCta ?? null,
      });
      res.json({ ok: true, message: "投稿完了" });
      return;
    }

    // 従来モード: dryRun or 即投稿
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
