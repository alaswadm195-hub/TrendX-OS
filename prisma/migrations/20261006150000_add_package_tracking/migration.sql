ALTER TABLE "Subscription"
ADD COLUMN "completedAt" TIMESTAMP(3);

CREATE TYPE "SubscriptionContentType" AS ENUM (
  'REEL',
  'DESIGN'
);

CREATE TYPE "SubscriptionContentStatus" AS ENUM (
  'PRODUCED',
  'EDITING',
  'READY',
  'SCHEDULED',
  'PUBLISHED'
);

CREATE TABLE "SubscriptionContentQuota" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "contentType" "SubscriptionContentType" NOT NULL,
  "totalCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubscriptionContentQuota_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SubscriptionContentItem" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "contentType" "SubscriptionContentType" NOT NULL,
  "status" "SubscriptionContentStatus" NOT NULL DEFAULT 'PRODUCED',
  "producedAt" TIMESTAMP(3) NOT NULL,
  "editedAt" TIMESTAMP(3),
  "scheduledAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubscriptionContentItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SubscriptionContentQuota"
ADD CONSTRAINT "SubscriptionContentQuota_subscriptionId_fkey"
FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SubscriptionContentItem"
ADD CONSTRAINT "SubscriptionContentItem_subscriptionId_fkey"
FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "SubscriptionContentQuota_subscriptionId_contentType_key"
ON "SubscriptionContentQuota"("subscriptionId", "contentType");

CREATE INDEX "Subscription_completedAt_idx"
ON "Subscription"("completedAt");

CREATE INDEX "SubscriptionContentQuota_subscriptionId_idx"
ON "SubscriptionContentQuota"("subscriptionId");

CREATE INDEX "SubscriptionContentItem_subscriptionId_idx"
ON "SubscriptionContentItem"("subscriptionId");

CREATE INDEX "SubscriptionContentItem_contentType_idx"
ON "SubscriptionContentItem"("contentType");

CREATE INDEX "SubscriptionContentItem_status_idx"
ON "SubscriptionContentItem"("status");

CREATE INDEX "SubscriptionContentItem_producedAt_idx"
ON "SubscriptionContentItem"("producedAt");

ALTER TABLE "SubscriptionContentQuota"
ADD CONSTRAINT "SubscriptionContentQuota_totalCount_check"
CHECK ("totalCount" > 0);
