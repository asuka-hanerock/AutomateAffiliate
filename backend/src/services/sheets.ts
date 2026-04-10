import { google } from "googleapis";

const SHEET_NAME = "X投稿v2";

// スプレッドシートURLからIDを自動抽出
export function extractSpreadsheetId(url: string): string {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]+$/.test(url)) return url;
  throw new Error("スプレッドシートのURLまたはIDが無効です");
}

function getAuth(serviceAccountJson: string) {
  const credentials = JSON.parse(serviceAccountJson);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export interface PostLogRow {
  datetime: string;
  displayName: string;
  email: string;
  niche: string;
  topic: string;
  posts: string[];
  status: string;
  error?: string;
  tweetIds?: string[];
}

export async function appendPostLog(
  serviceAccountJson: string,
  spreadsheetUrl: string,
  row: PostLogRow,
): Promise<void> {
  const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
  const auth = getAuth(serviceAccountJson);
  const sheets = google.sheets({ version: "v4", auth });

  // A:日時 B:アカウント名 C:メールアドレス D:ジャンル E:トピック F:投稿内容 G:投稿数 H:ステータス I:エラー J:ツイートID
  const values = [
    row.datetime,
    row.displayName,
    row.email,
    row.niche,
    row.topic,
    row.posts.map((p, i) => `【${i + 1}】${p}`).join("\n\n"),
    String(row.posts.length),
    row.status,
    row.error || "",
    (row.tweetIds || []).join(","),
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAME}!A:J`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}
