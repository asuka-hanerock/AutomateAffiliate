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
INSERT INTO "new_Account" ("bio", "claudeApiKey", "createdAt", "cronSchedule", "ctaEnabled", "displayName", "googleServiceAccountJson", "googleSpreadsheetUrl", "id", "niche", "profileImageUrl", "pronoun", "skipPreview", "trademark", "twitterAccessToken", "twitterAccessTokenSecret", "twitterApiKey", "twitterApiSecret", "updatedAt", "userId", "xUsername") SELECT "bio", "claudeApiKey", "createdAt", "cronSchedule", "ctaEnabled", "displayName", "googleServiceAccountJson", "googleSpreadsheetUrl", "id", "niche", "profileImageUrl", "pronoun", "skipPreview", "trademark", "twitterAccessToken", "twitterAccessTokenSecret", "twitterApiKey", "twitterApiSecret", "updatedAt", "userId", "xUsername" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
CREATE TABLE "new_TrendFormat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "example" TEXT NOT NULL DEFAULT '',
    "postCount" INTEGER NOT NULL DEFAULT 5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrendFormat_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TrendFormat" ("accountId", "createdAt", "example", "id", "isActive", "name", "sortOrder", "template", "updatedAt") SELECT "accountId", "createdAt", "example", "id", "isActive", "name", "sortOrder", "template", "updatedAt" FROM "TrendFormat";
DROP TABLE "TrendFormat";
ALTER TABLE "new_TrendFormat" RENAME TO "TrendFormat";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
