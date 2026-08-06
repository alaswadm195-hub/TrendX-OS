import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const passwordHash =
    await bcrypt.hash(
      "12345678",
      10
    );

  await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@trendx.com",
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log(
    "Admin Created"
  );
}

main();