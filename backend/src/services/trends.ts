import { BigQuery } from "@google-cloud/bigquery";
import Parser from "rss-parser";

const parser = new Parser();

// BigQueryからGoogleトレンド（日本）を取得
async function fetchBigQueryTrends(): Promise<string[]> {
  try {
    const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!keyFile) {
      console.log(
        "[Trends] GOOGLE_SERVICE_ACCOUNT_KEY未設定、BigQueryスキップ",
      );
      return [];
    }

    const bigquery = new BigQuery({ keyFilename: keyFile });
    const query = `
      SELECT
        term,
        MAX(refresh_date) AS refresh_date,
        country_code,
        MIN(rank) AS rank
      FROM \`bigquery-public-data.google_trends.international_top_terms\`
      WHERE refresh_date >= DATE_SUB(
          (SELECT MAX(refresh_date)
           FROM \`bigquery-public-data.google_trends.international_top_terms\`
           WHERE country_code = 'JP'),
          INTERVAL 3 DAY
        )
        AND country_code = 'JP'
      GROUP BY term, country_code
      ORDER BY rank ASC
      LIMIT 50
    `;

    const [rows] = await bigquery.query({ query, location: "US" });
    return rows.slice(0, 25).map((row: { term: string }) => row.term);
  } catch (err) {
    console.error(
      "[Trends] BigQuery取得失敗:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

// Google News RSSからジャンル特化ニュースを取得
async function fetchNewsRss(niche: string): Promise<string[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(niche)}&hl=ja&gl=JP&ceid=JP:ja`;
    const feed = await parser.parseURL(url);
    return feed.items.slice(0, 20).map((item) => item.title || "");
  } catch (err) {
    console.error(
      "[Trends] Google News RSS取得失敗:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

// 2ソースを統合して整形テキストを返す
export async function fetchTopicSources(niche: string): Promise<string> {
  const [trends, news] = await Promise.all([
    fetchBigQueryTrends(),
    fetchNewsRss(niche),
  ]);

  const parts: string[] = [];

  if (trends.length > 0) {
    const trendList = trends.map((t, i) => `${i + 1}. ${t}`).join("\n");
    parts.push(
      `【Googleトレンド（日本で今検索されている話題）】\n${trendList}`,
    );
  }

  if (news.length > 0) {
    const newsList = news.map((t, i) => `${i + 1}. ${t}`).join("\n");
    parts.push(`【Google Newsジャンル特化ニュース（最新記事）】\n${newsList}`);
  }

  if (parts.length === 0) {
    parts.push(`【フォールバック】\n1. ${niche}に関する最新の話題`);
  }

  return parts.join("\n\n");
}
