ALTER TABLE "Subscription"
ADD COLUMN "includedMinutes" INTEGER;

CREATE TABLE "SubscriptionUsage" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SubscriptionUsage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SubscriptionUsage"
ADD CONSTRAINT "SubscriptionUsage_subscriptionId_fkey"
FOREIGN KEY ("subscriptionId")
REFERENCES "Subscription"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

CREATE INDEX "Subscription_includedMinutes_idx"
ON "Subscription"("includedMinutes");

CREATE INDEX "SubscriptionUsage_subscriptionId_idx"
ON "SubscriptionUsage"("subscriptionId");

CREATE INDEX "SubscriptionUsage_startAt_idx"
ON "SubscriptionUsage"("startAt");

CREATE INDEX "SubscriptionUsage_subscriptionId_startAt_idx"
ON "SubscriptionUsage"("subscriptionId", "startAt");

ALTER TABLE "SubscriptionUsage"
ADD CONSTRAINT "SubscriptionUsage_durationMinutes_check"
CHECK ("durationMinutes" > 0);

ALTER TABLE "Subscription"
ADD CONSTRAINT "Subscription_includedMinutes_check"
CHECK ("includedMinutes" IS NULL OR "includedMinutes" > 0);
