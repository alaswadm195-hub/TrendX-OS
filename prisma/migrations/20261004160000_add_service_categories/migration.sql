CREATE TYPE "ServiceCategory" AS ENUM (
  'PAGE_MANAGEMENT',
  'SCREEN_PACKAGES',
  'OUTDOOR_SHOOTING',
  'INDOOR_SHOOTING'
);

ALTER TABLE "Subscription"
ADD COLUMN "serviceCategory" "ServiceCategory";

CREATE INDEX "Subscription_serviceCategory_idx"
ON "Subscription"("serviceCategory");