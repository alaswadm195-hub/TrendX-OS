import { cookies } from "next/headers";
import { verifyToken } from "./auth"; // عدل المسار حسب اسم الملف

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get("token")?.value;

    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);

    return payload;
  } catch {
    return null;
  }
}