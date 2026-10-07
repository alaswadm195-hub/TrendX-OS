ALTER TABLE "SubscriptionContentItem"
ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "SubscriptionUsage"
ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "SubscriptionContentItem_archivedAt_idx"
ON "SubscriptionContentItem"("archivedAt");

CREATE INDEX "SubscriptionContentItem_subscriptionId_archivedAt_idx"
ON "SubscriptionContentItem"("subscriptionId", "archivedAt");

CREATE INDEX "SubscriptionUsage_archivedAt_idx"
ON "SubscriptionUsage"("archivedAt");

CREATE INDEX "SubscriptionUsage_subscriptionId_archivedAt_idx"
ON "SubscriptionUsage"("subscriptionId", "archivedAt");
