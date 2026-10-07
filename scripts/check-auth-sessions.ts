import "dotenv/config";

import { prisma } from "../src/lib/prisma";

async function main() {
  const now = new Date();

  const [
    total,
    active,
    revoked,
    expired,
  ] = await Promise.all([
    prisma.authSession.count(),

    prisma.authSession.count({
      where: {
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
      },
    }),

    prisma.authSession.count({
      where: {
        revokedAt: {
          not: null,
        },
      },
    }),

    prisma.authSession.count({
      where: {
        expiresAt: {
          lte: now,
        },
      },
    }),
  ]);

  console.log(
    "=== TrendX AuthSession audit ===",
  );

  console.log({
    total,
    active,
    revoked,
    expired,
  });
}

main()
  .catch((error) => {
    console.error(
      "AuthSession audit failed:",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
