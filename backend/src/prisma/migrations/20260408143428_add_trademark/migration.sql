-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "niche" TEXT NOT NULL DEFAULT '転職',
    "pronoun" TEXT NOT NULL DEFAULT '僕',
    "trademark" TEXT NOT NULL DEFAULT '',
    "cronSchedule" TEXT NOT NULL DEFAULT '0 9 * * *',
    "ctaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twitterApiKey" TEXT NOT NULL DEFAULT '',
    "twitterApiSecret" TEXT NOT NULL DEFAULT '',
    "twitterAccessToken" TEXT NOT NULL DEFAULT '',
    "twitterAccessTokenSecret" TEXT NOT NULL DEFAULT '',
    "claudeApiKey" TEXT NOT NULL DEFAULT '',
    "googleServiceAccountJson" TEXT NOT NULL DEFAULT '',
    "googleSpreadsheetUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Account" ("claudeApiKey", "createdAt", "cronSchedule", "ctaEnabled", "googleServiceAccountJson", "googleSpreadsheetUrl", "id", "niche", "pronoun", "twitterAccessToken", "twitterAccessTokenSecret", "twitterApiKey", "twitterApiSecret", "updatedAt", "userId") SELECT "claudeApiKey", "createdAt", "cronSchedule", "ctaEnabled", "googleServiceAccountJson", "googleSpreadsheetUrl", "id", "niche", "pronoun", "twitterAccessToken", "twitterAccessTokenSecret", "twitterApiKey", "twitterApiSecret", "updatedAt", "userId" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
