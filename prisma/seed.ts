import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth";

async function main() {
  const name = process.env.INITIAL_ADMIN_NAME?.trim();
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!name || !email || !password || password.length < 12) throw new Error("Seed requires INITIAL_ADMIN_NAME, INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD (12+ chars)");
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) { console.log("Admin already exists"); return; }
  await prisma.user.create({ data: { name, email, passwordHash: await hashPassword(password), role: "ADMIN" } });
  console.log("Admin created");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
