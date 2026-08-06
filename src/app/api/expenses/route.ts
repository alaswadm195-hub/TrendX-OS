import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const expenses =
    await prisma.expense.findMany({
      orderBy: {
        expenseDate: "desc",
      },
    });

  return NextResponse.json(
    expenses
  );
}

export async function POST(
  req: Request
) {
  try {
    const body =
      await req.json();

    const {
      title,
      amount,
      notes,
    } = body;

    const expense =
      await prisma.expense.create({
        data: {
          title,
          amount: Number(
            amount
          ),
          notes,
        },
      });

    return NextResponse.json(
      expense
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Failed to create expense",
      },
      { status: 500 }
    );
  }
}