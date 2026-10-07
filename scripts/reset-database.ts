import "dotenv/config";

import { prisma } from "../src/lib/prisma";

const REQUIRED_CONFIRMATION =
  "RESET_TRENDX_DATABASE";

const REQUIRED_REMOTE_CONFIRMATION =
  "I_UNDERSTAND_THIS_IS_A_REMOTE_DATABASE";

function isLocalDatabaseUrl(
  databaseUrl: string,
) {
  try {
    const url =
      new URL(databaseUrl);

    return (
      url.hostname ===
        "localhost" ||
      url.hostname ===
        "127.0.0.1" ||
      url.hostname ===
        "::1"
    );
  } catch {
    return false;
  }
}

function assertResetAllowed() {
  const nodeEnv =
    process.env.NODE_ENV;

  const vercelEnv =
    process.env.VERCEL_ENV;

  if (
    nodeEnv === "production" ||
    vercelEnv === "production"
  ) {
    throw new Error(
      "Database reset is disabled in production.",
    );
  }

  if (
    process.env.DATABASE_RESET_CONFIRM !==
    REQUIRED_CONFIRMATION
  ) {
    throw new Error(
      `Database reset blocked. Set DATABASE_RESET_CONFIRM=${REQUIRED_CONFIRMATION} explicitly to continue.`,
    );
  }

  const databaseUrl =
    process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is missing.",
    );
  }

  if (
    !isLocalDatabaseUrl(
      databaseUrl,
    ) &&
    process.env
      .DATABASE_RESET_REMOTE_CONFIRM !==
      REQUIRED_REMOTE_CONFIRMATION
  ) {
    throw new Error(
      `Remote database reset blocked. Set DATABASE_RESET_REMOTE_CONFIRM=${REQUIRED_REMOTE_CONFIRMATION} explicitly to continue.`,
    );
  }
}

async function main() {
  assertResetAllowed();

  console.log(
    "Starting guarded database reset...",
  );

  const result =
    await prisma.$transaction(
      async (tx) => {
        const auditLogs =
          await tx.auditLog.deleteMany();

        const taskActivities =
          await tx.taskActivity.deleteMany();

        const tasks =
          await tx.task.deleteMany();

        const appointments =
          await tx.appointment.deleteMany();

        const invoicePayments =
          await tx.invoicePayment.deleteMany();

        const invoices =
          await tx.invoice.deleteMany();

        const payments =
          await tx.payment.deleteMany();

        const subscriptions =
          await tx.subscription.deleteMany();

        const expenses =
          await tx.expense.deleteMany();

        const clients =
          await tx.client.deleteMany();

        const authSessions =
          await tx.authSession.deleteMany();

        const employees =
          await tx.employee.deleteMany();

        const employeeUsers =
          await tx.user.deleteMany({
            where: {
              role: "EMPLOYEE",
            },
          });

        return {
          auditLogs:
            auditLogs.count,
          taskActivities:
            taskActivities.count,
          tasks:
            tasks.count,
          appointments:
            appointments.count,
          invoicePayments:
            invoicePayments.count,
          invoices:
            invoices.count,
          payments:
            payments.count,
          subscriptions:
            subscriptions.count,
          expenses:
            expenses.count,
          clients:
            clients.count,
          authSessions:
            authSessions.count,
          employees:
            employees.count,
          employeeUsers:
            employeeUsers.count,
        };
      },
    );

  console.log(
    "Database reset completed:",
    result,
  );
}

main()
  .catch((error) => {
    console.error(
      "Database reset failed:",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
