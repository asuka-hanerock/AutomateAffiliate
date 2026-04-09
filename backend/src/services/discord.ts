interface NotifyOptions {
  webhookUrl: string;
  accountName: string;
  topic: string;
  posts: string[];
  status: string;
  tweetIds?: string[];
  isQuote?: boolean;
}

export async function notifyDiscord(options: NotifyOptions): Promise<void> {
  if (!options.webhookUrl) return;

  const statusEmoji =
    options.status === "成功"
      ? "✅"
      : options.status === "テスト"
        ? "🧪"
        : "❌";

  const tweetUrl =
    options.tweetIds && options.tweetIds.length > 0
      ? `\nhttps://x.com/i/status/${options.tweetIds[0]}`
      : "";

  const type = options.isQuote ? "引用ポスト" : "スレッド投稿";

  const content = [
    `${statusEmoji} **${type}** — ${options.accountName}`,
    `**話題:** ${options.topic}`,
    "",
    options.posts
      .map((p, i) => `> **${i + 1}.** ${p.replace(/\n/g, "\n> ")}`)
      .join("\n"),
    tweetUrl,
  ].join("\n");

  try {
    await fetch(options.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    console.log("[Discord] 通知送信完了");
  } catch (err) {
    console.error("[Discord] 通知送信失敗:", err);
  }
}
