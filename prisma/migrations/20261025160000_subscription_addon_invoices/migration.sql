-- Optional relation: add-on service invoices are linked to the package
-- but stay in the existing invoice/payment ledger to prevent double counting.
ALTER TABLE "Invoice" ADD COLUMN "subscriptionId" TEXT;
CREATE INDEX "Invoice_subscriptionId_idx" ON "Invoice"("subscriptionId");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
