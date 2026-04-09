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

export async function deleteTweets(
  credentials: TwitterCredentials,
  tweetIds: string[],
): Promise<{ deleted: string[]; failed: string[] }> {
  const auth = new OAuth1({
    apiKey: credentials.apiKey,
    apiSecret: credentials.apiSecret,
    accessToken: credentials.accessToken,
    accessTokenSecret: credentials.accessTokenSecret,
    callback: "oob",
  });
  const client = new Client({ oauth1: auth });

  const deleted: string[] = [];
  const failed: string[] = [];

  for (let i = 0; i < tweetIds.length; i++) {
    const id = tweetIds[i];
    try {
      await client.posts.delete(id);
      deleted.push(id);
      console.log(`[X] 削除完了: ${id}`);
    } catch (err) {
      failed.push(id);
      console.error(
        `[X] 削除失敗: ${id}`,
        err instanceof Error ? err.message : err,
      );
    }
    if (i < tweetIds.length - 1) {
      await sleep(3000);
    }
  }

  return { deleted, failed };
}
