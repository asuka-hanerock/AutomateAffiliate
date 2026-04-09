import { prisma } from "../utils/db";
import fs from "fs";
import path from "path";

const PROMPTS_DIR = path.join(__dirname, "../../prompts");

interface PromptTemplate {
  id: string;
  content: string;
  scheduleType: string;
  scheduleConfig: string;
  sortOrder: number;
}

// ローテーションカウンター（プロセス内メモリ）
const rotationCounters = new Map<string, number>();

function matchesSchedule(template: PromptTemplate): boolean {
  const now = new Date();
  const config = JSON.parse(template.scheduleConfig);

  switch (template.scheduleType) {
    case "always":
      return true;

    case "weekdays": {
      // {"days": [0,1,2,3,4,5,6]} 0=日曜
      const today = now.getDay();
      return Array.isArray(config.days) && config.days.includes(today);
    }

    case "interval": {
      // {"interval": 3} 3日おき（年初からの日数で計算）
      const dayOfYear = Math.floor(
        (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) /
          86400000,
      );
      return dayOfYear % (config.interval || 1) === 0;
    }

    case "rotation":
      // ローテーションは常にtrue（選択時にカウンターで決定）
      return true;

    default:
      return true;
  }
}

export async function selectPrompt(
  accountId: string,
  type: "topic_select" | "thread_generate",
): Promise<string> {
  const templates = await prisma.promptTemplate.findMany({
    where: { accountId, type, isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  if (templates.length === 0) {
    // DBにプロンプトがなければファイルのデフォルトを使用
    const fileName =
      type === "topic_select" ? "select-topic.txt" : "generate-thread.txt";
    return fs.readFileSync(path.join(PROMPTS_DIR, fileName), "utf-8");
  }

  // ローテーション型のプロンプトがあるか
  const rotationTemplates = templates.filter(
    (t) => t.scheduleType === "rotation",
  );
  if (rotationTemplates.length > 0) {
    const key = `${accountId}:${type}`;
    const counter = rotationCounters.get(key) || 0;
    const selected = rotationTemplates[counter % rotationTemplates.length];
    rotationCounters.set(key, counter + 1);
    return selected.content;
  }

  // スケジュールに合致するものを探す
  const matched = templates.filter(matchesSchedule);
  if (matched.length > 0) {
    return matched[0].content;
  }

  // どれも合致しなければ最初のアクティブなものを使用
  return templates[0].content;
}
