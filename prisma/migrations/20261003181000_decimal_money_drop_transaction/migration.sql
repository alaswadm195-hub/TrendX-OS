-- AlterTable
ALTER TABLE "Employee"
ALTER COLUMN "salary" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "Expense"
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "Invoice"
ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "paidAmount" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "remainingAmount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "InvoicePayment"
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "Payment"
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "Subscription"
ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "paidAmount" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "remainingAmount" SET DATA TYPE DECIMAL(14,2);

-- DropForeignKey
ALTER TABLE "Transaction"
DROP CONSTRAINT "Transaction_clientId_fkey";

-- DropTable
DROP TABLE "Transaction";
