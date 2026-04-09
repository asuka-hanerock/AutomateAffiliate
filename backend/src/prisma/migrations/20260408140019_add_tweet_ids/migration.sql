-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PostLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tweetIds" TEXT NOT NULL DEFAULT '',
    "postedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    CONSTRAINT "PostLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PostLog" ("accountId", "content", "id", "postedAt", "status", "topic") SELECT "accountId", "content", "id", "postedAt", "status", "topic" FROM "PostLog";
DROP TABLE "PostLog";
ALTER TABLE "new_PostLog" RENAME TO "PostLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
