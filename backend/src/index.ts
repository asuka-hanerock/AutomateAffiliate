import "dotenv/config";
import express from "express";
import cors from "cors";
import accountsRouter from "./routes/accounts";
import runRouter from "./routes/run";
import logsRouter from "./routes/logs";
import deleteTweetsRouter from "./routes/delete-tweets";
import syncProfileRouter from "./routes/sync-profile";
import promptsRouter from "./routes/prompts";
import formatsRouter from "./routes/formats";
import analyzeFormatRouter from "./routes/analyze-format";
import { initScheduler } from "./scheduler/cron";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ルート
app.use("/api/accounts", accountsRouter);
app.use("/api/run", runRouter);
app.use("/api/logs", logsRouter);
app.use("/api/delete-tweets", deleteTweetsRouter);
app.use("/api/sync-profile", syncProfileRouter);
app.use("/api/prompts", promptsRouter);
app.use("/api/formats", formatsRouter);
app.use("/api/analyze-format", analyzeFormatRouter);

// ヘルスチェック
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.listen(PORT, async () => {
  console.log(`[Server] http://localhost:${PORT} で起動`);
  await initScheduler();
});
