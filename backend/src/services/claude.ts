import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_MAX_CHARS = 140;
const DEFAULT_POST_COUNT = 5;
const MAX_RETRIES = 3;

function applyVars(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
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
  let cleaned = text
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();
  cleaned = cleaned.replace(/"([^"]*?)"/g, (match) => {
    return match.replace(/\n/g, "\\n");
  });
  return cleaned;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface TopicResult {
  選択話題: string;
  選定理由: string;
  ソース: string;
  usage: TokenUsage;
}

export async function selectTopic(
  apiKey: string,
  promptTemplate: string,
  niche: string,
  sources: string,
  usedTopics: string[],
): Promise<TopicResult> {
  const client = new Anthropic({ apiKey });
  const usedText =
    usedTopics.length > 0
      ? usedTopics.map((t, i) => `${i + 1}. ${t}`).join("\n")
      : "なし";

  const prompt = applyVars(promptTemplate, {
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
  return {
    ...parsed,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  } as TopicResult;
}

export interface ThreadResult {
  posts: string[];
  cta: string;
  usage: TokenUsage;
}

export async function generateThread(
  apiKey: string,
  promptTemplate: string,
  niche: string,
  topic: string,
  ctaEnabled: boolean,
  pronoun: string,
  trademark: string,
  trendFormat?: string,
  postCount: number = DEFAULT_POST_COUNT,
  maxChars: number = DEFAULT_MAX_CHARS,
  profileBio?: string,
): Promise<ThreadResult> {
  const client = new Anthropic({ apiKey });

  const trademarkRule = trademark
    ? `\n- 「${trademark}」をスレッドの最初か最後に1回だけ自然に使うこと\n- 多用しないこと`
    : "\n- トレードマークなし";

  const trendFormatText = trendFormat
    ? `以下の構文・フォーマットに沿ってスレッドを構成すること:\n${trendFormat}`
    : "指定なし。自由な構成でOK";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const profileBioText = profileBio
      ? `以下の発信者プロフィールを踏まえ、この人ならではの視点・経験を反映させること:\n${profileBio}`
      : "プロフィール未設定。一般的な視点でOK";

    const prompt = applyVars(promptTemplate, {
      niche,
      topic,
      pronoun,
      trademarkRule,
      trendFormat: trendFormatText,
      profileBio: profileBioText,
      postCount: String(postCount),
      maxChars: String(maxChars),
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
    const raw = JSON.parse(extractJson(block.text));
    const parsed: ThreadResult = {
      ...raw,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };

    if (!Array.isArray(parsed.posts) || parsed.posts.length !== postCount) {
      throw new Error(
        `Thread must contain exactly ${postCount} posts, got ${parsed.posts?.length}`,
      );
    }

    const allPosts = [...parsed.posts];
    if (parsed.cta && parsed.cta.trim() !== "") {
      allPosts.push(parsed.cta);
    }
    const overLimit = allPosts.filter((p) => p.length > maxChars);

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
