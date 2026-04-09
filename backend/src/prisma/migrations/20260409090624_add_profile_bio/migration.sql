-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL DEFAULT '',
    "profileImageUrl" TEXT NOT NULL DEFAULT '',
    "xUsername" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "profileBio" TEXT NOT NULL DEFAULT '',
    "niche" TEXT NOT NULL DEFAULT '転職',
    "pronoun" TEXT NOT NULL DEFAULT '僕',
    "trademark" TEXT NOT NULL DEFAULT '',
    "cronSchedule" TEXT NOT NULL DEFAULT '0 9 * * *',
    "ctaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "skipPreview" BOOLEAN NOT NULL DEFAULT false,
    "maxCharsPerPost" INTEGER NOT NULL DEFAULT 140,
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
INSERT INTO "new_Account" ("bio", "claudeApiKey", "createdAt", "cronSchedule", "ctaEnabled", "displayName", "googleServiceAccountJson", "googleSpreadsheetUrl", "id", "maxCharsPerPost", "niche", "profileImageUrl", "pronoun", "skipPreview", "trademark", "twitterAccessToken", "twitterAccessTokenSecret", "twitterApiKey", "twitterApiSecret", "updatedAt", "userId", "xUsername") SELECT "bio", "claudeApiKey", "createdAt", "cronSchedule", "ctaEnabled", "displayName", "googleServiceAccountJson", "googleSpreadsheetUrl", "id", "maxCharsPerPost", "niche", "profileImageUrl", "pronoun", "skipPreview", "trademark", "twitterAccessToken", "twitterAccessTokenSecret", "twitterApiKey", "twitterApiSecret", "updatedAt", "userId", "xUsername" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
