import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  try {
    const currentUser =
      await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          message: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const clients =
      await prisma.client.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });

    return NextResponse.json(clients);
  } catch (error) {
    console.error(
      "Get Clients Error:",
      error
    );

    return NextResponse.json(
      {
        message: "Server Error",
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
    const currentUser =
      await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          message: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    if (currentUser.role !== "ADMIN") {
      return NextResponse.json(
        {
          message: "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    const body = await req.json();

    /*
     * ============================
     * التحقق من البيانات
     * ============================
     */

    if (
      !body.name ||
      !body.name.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "اسم العميل مطلوب",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !body.phone ||
      !body.phone.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "رقم الهاتف مطلوب",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ============================
     * إنشاء العميل
     * ============================
     */

    const client =
      await prisma.client.create({
        data: {
          name: body.name.trim(),

          phone: body.phone.trim(),

          notes:
            body.notes
              ? body.notes.trim()
              : null,
        },
      });

    return NextResponse.json(
      client,
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Create Client Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "حدث خطأ أثناء إنشاء العميل",
      },
      {
        status: 500,
      }
    );
  }
}