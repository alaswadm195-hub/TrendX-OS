import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const employees =
      await prisma.employee.findMany({
        include: {
          user: true,
          tasks: true,
          appointments: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    return NextResponse.json(
      employees
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Failed to fetch employees",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  req: Request
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    const body =
      await req.json();

    const {
      name,
      email,
      password,
      phone,
      position,
      salary,
      address,
      hireDate,
      status,
    } = body;

    const existingUser =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (existingUser) {
      return NextResponse.json(
        {
          message:
            "Email already exists",
        },
        {
          status: 400,
        }
      );
    }

    const passwordHash =
      await hashPassword(
        password
      );

    const user =
      await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: "EMPLOYEE",

          employee: {
            create: {
              phone,
              position,

              salary: salary
                ? Number(
                    salary
                  )
                : null,

              address,

              hireDate:
                hireDate
                  ? new Date(
                      hireDate
                    )
                  : null,

              status:
                status ||
                "ACTIVE",
            },
          },
        },

        include: {
          employee: true,
        },
      });

    return NextResponse.json(
      user
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Failed to create employee",
      },
      {
        status: 500,
      }
    );
  }
}