import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } =
      await params;

    const employee =
      await prisma.employee.findUnique({
        where: {
          id,
        },
        include: {
          user: true,
          tasks: true,
          appointments: true,
        },
      });

    if (!employee) {
      return NextResponse.json(
        {
          error:
            "Employee not found",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      employee
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Failed to fetch employee",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } =
      await params;

    const body =
      await req.json();

    const employee =
      await prisma.employee.update({
        where: {
          id,
        },
        data: {
          phone:
            body.phone ||
            null,

          position:
            body.position ||
            null,

          salary:
            body.salary
              ? Number(
                  body.salary
                )
              : null,

          address:
            body.address ||
            null,

          status:
            body.status,

          hireDate:
            body.hireDate
              ? new Date(
                  body.hireDate
                )
              : null,
        },
        include: {
          user: true,
        },
      });

    return NextResponse.json(
      employee
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Failed to update employee",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } =
      await params;

    const employee =
      await prisma.employee.findUnique({
        where: {
          id,
        },
      });

    if (!employee) {
      return NextResponse.json(
        {
          error:
            "Employee not found",
        },
        {
          status: 404,
        }
      );
    }

    await prisma.user.delete({
      where: {
        id: employee.userId,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Failed to delete employee",
      },
      {
        status: 500,
      }
    );
  }
}