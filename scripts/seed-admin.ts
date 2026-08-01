import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth";

async function main() {
  const email = "admin@trendx.com";
  const password = "TrendX@2026";

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    console.log("Admin already exists");
    return;
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      name: "TrendX Admin",
      email,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Admin created successfully");
  console.log("Email:", email);
  console.log("Password:", password);
}

main()
  .catch(console.error)
  .finally(async () => {
    process.exit(0);
  });