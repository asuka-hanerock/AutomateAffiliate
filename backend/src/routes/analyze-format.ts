import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../utils/db";
import { decrypt } from "../utils/crypto";

const router = Router();

// スクショから構文を分析してTrendFormatとして提案
router.post("/", async (req, res) => {
  const { accountId, imageBase64, mediaType } = req.body;
  if (!accountId || !imageBase64) {
    res.status(400).json({ error: "accountId と imageBase64 は必須です" });
    return;
  }

  const account = await prisma.account.findUniqueOrThrow({
    where: { id: accountId },
  });
  const apiKey = decrypt(account.claudeApiKey);
  if (!apiKey) {
    res.status(400).json({ error: "Claude APIキーが設定されていません" });
    return;
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType || "image/png",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `このXの投稿スクリーンショットから、投稿の「構文パターン」を分析してください。

分析してほしいこと:
1. この投稿はどのような構文・フォーマットで書かれているか
2. 何投稿で構成されているか（スレッドの場合）
3. この構文を別のトピックでも再利用するためのテンプレート説明

以下のJSON形式のみで返してください（JSON以外のテキスト不要）:
{
  "name": "構文の短い名前（例: メリット/デメリット対比）",
  "template": "この構文をAIに再現させるための詳細な説明。構成、各投稿の役割、箇条書きの使い方、対比構造などを具体的に指示する形で書くこと",
  "example": "この投稿の要約（どんな内容だったか1〜2文で）",
  "postCount": 投稿数（数値）
}`,
            },
          ],
        },
      ],
    });

    const block = response.content[0];
    if (block.type !== "text") {
      res.status(500).json({ error: "Unexpected response type" });
      return;
    }

    const cleaned = block.text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    const result = JSON.parse(cleaned);

    res.json({
      ok: true,
      suggestion: result,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
