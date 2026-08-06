import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

async function createEmployee(
  name: string,
  email: string,
  position: string
) {
  const existingUser =
    await prisma.user.findUnique({
      where: { email },
    });

  if (existingUser) {
    console.log(
      `${email} already exists`
    );
    return;
  }

  const passwordHash =
    await bcrypt.hash(
      "123456",
      10
    );

  const user =
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "EMPLOYEE",
      },
    });

  await prisma.employee.create({
    data: {
      userId: user.id,
      position,
      status: "ACTIVE",
    },
  });

  console.log(
    `${name} created`
  );
}

async function main() {
  await createEmployee(
    "Ahmed Mohamed",
    "sales@trendx.com",
    "Sales"
  );

  await createEmployee(
    "Mohamed Ali",
    "designer@trendx.com",
    "Graphic Designer"
  );

  await createEmployee(
    "Ali Hassan",
    "social@trendx.com",
    "Social Media"
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });