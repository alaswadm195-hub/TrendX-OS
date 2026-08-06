import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get("token")?.value;

    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);

    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId as string,
      },
      include: {
        employee: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      role: user.role,
      employeeId: user.employee?.id || null,
      name: user.name,
      email: user.email,
    };
  } catch {
    return null;
  }
}