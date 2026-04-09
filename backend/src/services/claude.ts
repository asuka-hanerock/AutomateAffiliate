import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const PROMPTS_DIR = path.join(__dirname, "../../prompts");
const MAX_CHARS = 140;
const MAX_RETRIES = 3;

function loadPrompt(name: string, vars: Record<string, string>): string {
  let template = fs.readFileSync(
    path.join(PROMPTS_DIR, `${name}.txt`),
    "utf-8",
  );
  for (const [key, value] of Object.entries(vars)) {
    template = template.replaceAll(`{{${key}}}`, value);
  }
  return template;
}

function getToday(): string {
  return new Date().toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function extractJson(text: string): string {
  // JSON文字列内の生改行をエスケープしてからパース可能にする
  // まずコードフェンスを除去し、JSON構造内の改行を\\nに変換
  let cleaned = text
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();
  // JSON文字列値内の生改行を\\nにエスケープ
  // "..." の中にある実際の改行を置換
  cleaned = cleaned.replace(/"([^"]*?)"/g, (match) => {
    return match.replace(/\n/g, "\\n");
  });
  return cleaned;
}

export interface TopicResult {
  選択話題: string;
  選定理由: string;
  ソース: string;
}

export async function selectTopic(
  apiKey: string,
  niche: string,
  sources: string,
  usedTopics: string[],
): Promise<TopicResult> {
  const client = new Anthropic({ apiKey });
  const usedText =
    usedTopics.length > 0
      ? usedTopics.map((t, i) => `${i + 1}. ${t}`).join("\n")
      : "なし";

  const prompt = loadPrompt("select-topic", {
    niche,
    date: getToday(),
    sources,
    usedTopics: usedText,
  });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  const parsed = JSON.parse(extractJson(block.text));
  return parsed as TopicResult;
}

export interface ThreadResult {
  posts: string[];
  cta: string;
}

export async function generateThread(
  apiKey: string,
  niche: string,
  topic: string,
  ctaEnabled: boolean,
  pronoun: string,
  trademark: string,
): Promise<ThreadResult> {
  const client = new Anthropic({ apiKey });

  const trademarkRule = trademark
    ? `\n- 「${trademark}」をスレッドの最初か最後に1回だけ自然に使うこと\n- 多用しないこと`
    : "\n- トレードマークなし";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const prompt = loadPrompt("generate-thread", {
      niche,
      topic,
      pronoun,
      trademarkRule,
      date: getToday(),
      ctaEnabled: String(ctaEnabled),
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const block = response.content[0];
    if (block.type !== "text") throw new Error("Unexpected response type");
    const parsed = JSON.parse(extractJson(block.text)) as ThreadResult;

    if (!Array.isArray(parsed.posts) || parsed.posts.length !== 5) {
      throw new Error("Thread must contain exactly 5 posts");
    }

    // 140文字バリデーション
    const allPosts = [...parsed.posts];
    if (parsed.cta && parsed.cta.trim() !== "") {
      allPosts.push(parsed.cta);
    }
    const overLimit = allPosts.filter((p) => p.length > MAX_CHARS);

    if (overLimit.length === 0) {
      console.log(`[Claude] 文字数OK (attempt ${attempt + 1})`);
      return parsed;
    }

    if (attempt < MAX_RETRIES) {
      console.log(
        `[Claude] 140文字超過 ${overLimit.length}件、リトライ ${attempt + 1}/${MAX_RETRIES}`,
      );
    } else {
      console.log("[Claude] リトライ上限到達、そのまま使用");
      return parsed;
    }
  }

  throw new Error("Unreachable");
}
