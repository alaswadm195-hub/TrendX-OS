import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function getSession() {
  const cookieStore = await cookies();

  const token = cookieStore.get("token")?.value;

  if (!token) {
    return null;
  }

  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}