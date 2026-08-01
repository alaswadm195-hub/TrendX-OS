import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get("token")?.value;

    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);

    return {
      userId: payload.userId as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}