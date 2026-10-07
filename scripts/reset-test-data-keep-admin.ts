import "dotenv/config";

import readline from "node:readline";
import { stdin, stdout } from "node:process";

import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth";

const REQUIRED_CONFIRMATION =
  "RESET_TRENDX_KEEP_ADMIN";

const REQUIRED_REMOTE_CONFIRMATION =
  "I_UNDERSTAND_THIS_WILL_DELETE_REMOTE_DATA";

function isLocalDatabaseUrl(
  databaseUrl: string,
) {
  try {
    const url = new URL(databaseUrl);

    return (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1"
    );
  } catch {
    return false;
  }
}

function assertResetAllowed() {
  const databaseUrl =
    process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is missing.",
    );
  }

  if (
    process.env
      .DATABASE_RESET_CONFIRM !==
    REQUIRED_CONFIRMATION
  ) {
    throw new Error(
      `Reset blocked. Set DATABASE_RESET_CONFIRM=${REQUIRED_CONFIRMATION} explicitly to continue.`,
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
      `Remote reset blocked. Set DATABASE_RESET_REMOTE_CONFIRM=${REQUIRED_REMOTE_CONFIRMATION} explicitly to continue.`,
    );
  }
}

function ask(
  question: string,
) {
  const rl =
    readline.createInterface({
      input: stdin,
      output: stdout,
    });

  return new Promise<string>(
    (resolve) => {
      rl.question(
        question,
        (answer) => {
          rl.close();
          resolve(
            answer.trim(),
          );
        },
      );
    },
  );
}

function askHidden(
  question: string,
) {
  return new Promise<string>(
    (resolve, reject) => {
      if (
        !stdin.isTTY ||
        typeof stdin.setRawMode !==
          "function"
      ) {
        reject(
          new Error(
            "A TTY terminal is required to enter the password securely.",
          ),
        );
        return;
      }

      let value = "";

      stdout.write(
        question,
      );

      const cleanup = () => {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener(
          "data",
          onData,
        );
      };

      const onData = (
        chunk: Buffer,
      ) => {
        const key =
          chunk.toString(
            "utf8",
          );

        if (
          key === "\r" ||
          key === "\n"
        ) {
          cleanup();
          stdout.write("\n");
          resolve(value);
          return;
        }

        if (
          key === "\u0003"
        ) {
          cleanup();
          stdout.write("\n");
          reject(
            new Error(
              "Reset cancelled.",
            ),
          );
          return;
        }

        if (
          key === "\u007f" ||
          key === "\b"
        ) {
          if (
            value.length > 0
          ) {
            value =
              value.slice(
                0,
                -1,
              );
            stdout.write(
              "\b \b",
            );
          }
          return;
        }

        if (
          key >= " "
        ) {
          value += key;
          stdout.write("*");
        }
      };

      stdin.setRawMode(true);
      stdin.resume();
      stdin.on(
        "data",
        onData,
      );
    },
  );
}

function validatePassword(
  password: string,
) {
  if (
    password.length < 12
  ) {
    throw new Error(
      "New admin password must be at least 12 characters.",
    );
  }

  if (
    password.length > 128
  ) {
    throw new Error(
      "New admin password must be 128 characters or fewer.",
    );
  }
}

async function main() {
  assertResetAllowed();

  const adminEmail =
    (
      process.env
        .ADMIN_EMAIL_TO_KEEP ??
      ""
    )
      .trim()
      .toLowerCase();

  if (!adminEmail) {
    throw new Error(
      "ADMIN_EMAIL_TO_KEEP is required.",
    );
  }

  const admin =
    await prisma.user.findUnique({
      where: {
        email: adminEmail,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

  if (
    !admin ||
    admin.role !== "ADMIN"
  ) {
    throw new Error(
      "The requested account does not exist or is not an ADMIN account.",
    );
  }

  console.log(
    `Admin account to keep: ${admin.email}`,
  );

  const newName =
    await ask(
      `New admin name [${admin.name}]: `,
    );

  const finalName =
    newName ||
    admin.name;

  if (
    finalName.length < 2 ||
    finalName.length > 120
  ) {
    throw new Error(
      "Admin name must be between 2 and 120 characters.",
    );
  }

  const newPassword =
    await askHidden(
      "New admin password: ",
    );

  validatePassword(
    newPassword,
  );

  const passwordAgain =
    await askHidden(
      "Confirm new admin password: ",
    );

  if (
    newPassword !==
    passwordAgain
  ) {
    throw new Error(
      "Password confirmation does not match.",
    );
  }

  const finalConfirmation =
    await ask(
      'Type DELETE ALL TEST DATA to continue: ',
    );

  if (
    finalConfirmation !==
    "DELETE ALL TEST DATA"
  ) {
    throw new Error(
      "Reset cancelled: final confirmation did not match.",
    );
  }

  const passwordHash =
    await hashPassword(
      newPassword,
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

        const otherUsers =
          await tx.user.deleteMany({
            where: {
              id: {
                not: admin.id,
              },
            },
          });

        const updatedAdmin =
          await tx.user.update({
            where: {
              id: admin.id,
            },
            data: {
              name: finalName,
              passwordHash,
              role: "ADMIN",
            },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          });

        return {
          deleted: {
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
            otherUsers:
              otherUsers.count,
          },

          admin:
            updatedAdmin,
        };
      },
      {
        maxWait: 10_000,
        timeout: 60_000,
      },
    );

  console.log(
    "\nTrendX data reset completed.",
  );

  console.log(
    "Deleted records:",
    result.deleted,
  );

  console.log(
    "Admin kept:",
    {
      name:
        result.admin.name,
      email:
        result.admin.email,
      role:
        result.admin.role,
    },
  );

  console.log(
    "\nAll previous sessions were revoked. Sign in again with the new password.",
  );
}

main()
  .catch((error) => {
    console.error(
      "\nReset failed:",
      error instanceof Error
        ? error.message
        : error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
