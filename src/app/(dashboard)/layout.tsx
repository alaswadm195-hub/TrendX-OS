import { redirect } from "next/navigation";

import DashboardShell from "@/components/layout/DashboardShell";
import { getCurrentUser } from "@/lib/current-user";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser =
    await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  return (
    <DashboardShell
      role={currentUser.role}
      userName={
        currentUser.name
      }
    >
      {children}
    </DashboardShell>
  );
}