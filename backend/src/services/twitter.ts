import { Client, OAuth1 } from "@xdevplatform/xdk";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface TwitterCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

function createClient(credentials: TwitterCredentials): Client {
  const auth = new OAuth1({
    apiKey: credentials.apiKey,
    apiSecret: credentials.apiSecret,
    accessToken: credentials.accessToken,
    accessTokenSecret: credentials.accessTokenSecret,
    callback: "oob",
  });
  return new Client({ oauth1: auth });
}

export { type TwitterCredentials, createClient };

// 引用ポスト投稿
export async function postQuote(
  credentials: TwitterCredentials,
  text: string,
  quoteTweetId: string,
): Promise<string> {
  const client = createClient(credentials);
  const result = await client.posts.create({
    text,
    quoteTweetId,
  });
  const id = (result as { data?: { id?: string } }).data?.id;
  if (!id) throw new Error("引用ポストのIDが取得できませんでした");
  console.log(`[X] 引用ポスト完了 (id: ${id})`);
  return id;
}

export async function postThread(
  credentials: TwitterCredentials,
  posts: string[],
  cta?: string,
): Promise<string[]> {
  const client = createClient(credentials);

  const allPosts = [...posts];
  if (cta && cta.trim() !== "") {
    allPosts.push(cta);
  }

  const tweetIds: string[] = [];
  let previousTweetId: string | undefined;

  for (let i = 0; i < allPosts.length; i++) {
    const params: Record<string, unknown> = { text: allPosts[i] };
    if (previousTweetId) {
      params.reply = { in_reply_to_tweet_id: previousTweetId };
    }

    const result = await client.posts.create(params);
    const id = (result as { data?: { id?: string } }).data?.id;
    if (!id) throw new Error(`投稿 ${i + 1} のIDが取得できませんでした`);

    tweetIds.push(id);
    previousTweetId = id;
    console.log(`[X] 投稿 ${i + 1}/${allPosts.length} 完了 (id: ${id})`);

    if (i < allPosts.length - 1) {
      await sleep(10000);
    }
  }

  return tweetIds;
}
