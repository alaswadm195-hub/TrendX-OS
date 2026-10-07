import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

async function main() {
  const name = process.env.INITIAL_EMPLOYEE_NAME?.trim();
  const email = process.env.INITIAL_EMPLOYEE_EMAIL?.trim().toLowerCase();
  const position = process.env.INITIAL_EMPLOYEE_POSITION?.trim();
  const password = process.env.INITIAL_EMPLOYEE_PASSWORD;
  if (!name || !email || !password || password.length < 12) throw new Error("Set INITIAL_EMPLOYEE_NAME, INITIAL_EMPLOYEE_EMAIL and INITIAL_EMPLOYEE_PASSWORD (12+ chars)");
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) throw new Error("Employee email already exists");
  const user = await prisma.user.create({ data: { name, email, passwordHash: await hashPassword(password), role: "EMPLOYEE", employee: { create: { position: position || null, status: "ACTIVE" } } }, select: { id: true, name: true, email: true, role: true } });
  console.log(user);
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
