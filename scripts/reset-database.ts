import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Starting database reset...");

  await prisma.taskActivity.deleteMany();
  await prisma.task.deleteMany();

  await prisma.appointment.deleteMany();

  await prisma.payment.deleteMany();
  await prisma.subscription.deleteMany();

  await prisma.invoicePayment.deleteMany();
  await prisma.invoice.deleteMany();

  await prisma.transaction.deleteMany();
  await prisma.expense.deleteMany();

  await prisma.client.deleteMany();

  await prisma.employee.deleteMany();

  await prisma.user.deleteMany({
    where: {
      role: "EMPLOYEE",
    },
  });

  console.log("✅ Database reset completed.");
}

main()
  .catch((error) => {
    console.error("❌ Reset failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });