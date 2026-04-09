import "dotenv/config";
import { appendPostLog } from "../src/services/sheets";

async function main() {
  await appendPostLog({
    datetime: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
    email: "test@example.com",
    niche: "転職",
    topic: "テスト投稿",
    posts: [
      "投稿1テスト",
      "投稿2テスト",
      "投稿3テスト",
      "投稿4テスト",
      "投稿5テスト",
    ],
    status: "success",
  });
  console.log("スプレッドシートへの書き込み完了！");
}

main().catch(console.error);
