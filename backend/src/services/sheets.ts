import { google } from "googleapis";

const SHEET_NAME = "X投稿";

// スプレッドシートURLからIDを自動抽出
export function extractSpreadsheetId(url: string): string {
  // https://docs.google.com/spreadsheets/d/{ID}/edit...
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  // IDそのものが渡された場合
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

  const values = [
    row.datetime,
    row.email,
    row.niche,
    row.topic,
    ...row.posts,
    row.status,
    row.error || "",
    (row.tweetIds || []).join(","),
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAME}!A:L`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}
