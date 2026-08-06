"use client";

import { useState } from "react";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/dashboard/Header";

export default function DashboardShell({
  children,
  role,
  userName,
}: {
  children: React.ReactNode;
  role: string;
  userName: string;
}) {
  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() =>
          setSidebarOpen(false)
        }
        role={role}
        userName={userName}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          onMenuClick={() =>
            setSidebarOpen(true)
          }
          userName={userName}
          role={role}
        />

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}