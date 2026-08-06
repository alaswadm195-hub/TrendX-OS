import bcrypt from "bcryptjs";
import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
  const passwordHash = await bcrypt.hash(
    "123456",
    10
  );

  const user = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@trendx.com",
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log(user);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });