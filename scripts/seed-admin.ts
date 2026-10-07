import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth";

function requireEnv(
  name: string,
): string {
  const value =
    process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}`,
    );
  }

  return value;
}

async function main() {
  const email =
    requireEnv(
      "SEED_ADMIN_EMAIL",
    ).toLowerCase();

  const password =
    requireEnv(
      "SEED_ADMIN_PASSWORD",
    );

  const name =
    process.env.SEED_ADMIN_NAME?.trim() ||
    "TrendX Admin";

  if (
    password.length < 12
  ) {
    throw new Error(
      "SEED_ADMIN_PASSWORD must be at least 12 characters long",
    );
  }

  const existingUser =
    await prisma.user.findUnique({
      where: {
        email,
      },

      select: {
        id: true,
        email: true,
        role: true,
      },
    });

  if (existingUser) {
    if (
      existingUser.role ===
      "ADMIN"
    ) {
      console.log(
        "Admin already exists:",
        existingUser.email,
      );

      return;
    }

    throw new Error(
      "A non-admin user already exists with SEED_ADMIN_EMAIL. Refusing to change its role automatically.",
    );
  }

  const passwordHash =
    await hashPassword(
      password,
    );

  const admin =
    await prisma.user.create({
      data: {
        name,
        email,
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

  console.log(
    "Admin created successfully:",
    {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  );
}

main()
  .catch((error) => {
    console.error(
      "Failed to seed admin:",
      error instanceof Error
        ? error.message
        : error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
