BEGIN;

-- Remove the foreign key owned by the legacy Transaction table before dropping it.
ALTER TABLE "Transaction"
DROP CONSTRAINT "Transaction_clientId_fkey";

-- Money columns: Float / double precision -> Decimal(14,2) / numeric(14,2).
ALTER TABLE "Employee"
ALTER COLUMN "salary" SET DATA TYPE DECIMAL(14,2);

ALTER TABLE "Expense"
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

ALTER TABLE "Invoice"
ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "paidAmount" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "remainingAmount" SET DATA TYPE DECIMAL(14,2);

ALTER TABLE "InvoicePayment"
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

ALTER TABLE "Payment"
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

ALTER TABLE "Subscription"
ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "paidAmount" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "remainingAmount" SET DATA TYPE DECIMAL(14,2);

-- Transaction is a removed legacy model and was verified empty before this migration.
DROP TABLE "Transaction";

COMMIT;
