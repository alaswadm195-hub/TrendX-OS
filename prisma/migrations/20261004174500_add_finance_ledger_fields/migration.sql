CREATE TYPE "PaymentMethod" AS ENUM (
  'CASH',
  'INSTAPAY',
  'BANK_TRANSFER',
  'VODAFONE_CASH',
  'OTHER'
);

CREATE TYPE "ExpenseCategory" AS ENUM (
  'SALARIES',
  'RENT',
  'ADS',
  'EQUIPMENT',
  'TRANSPORT',
  'PURCHASES',
  'OTHER'
);

ALTER TABLE "Payment"
ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'OTHER',
ADD COLUMN "referenceNumber" TEXT;

ALTER TABLE "InvoicePayment"
ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'OTHER',
ADD COLUMN "referenceNumber" TEXT;

ALTER TABLE "Expense"
ADD COLUMN "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'OTHER',
ADD COLUMN "referenceNumber" TEXT;

CREATE INDEX "Payment_paymentMethod_idx"
ON "Payment"("paymentMethod");

CREATE INDEX "InvoicePayment_paymentMethod_idx"
ON "InvoicePayment"("paymentMethod");

CREATE INDEX "Expense_category_idx"
ON "Expense"("category");

CREATE INDEX "Expense_paymentMethod_idx"
ON "Expense"("paymentMethod");
