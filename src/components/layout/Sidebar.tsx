"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  LayoutDashboard,
  Users,
  Repeat,
  Calendar,
  Briefcase,
  CheckSquare,
  BarChart3,
  Wallet,
  Settings,
  LogOut,
  FileText,
} from "lucide-react";

const workItems = [
  {
    name: "العملاء",
    icon: Users,
    href: "/clients",
    adminOnly: false,
  },
  {
    name: "الاشتراكات",
    icon: Repeat,
    href: "/subscriptions",
    adminOnly: false,
  },
  {
    name: "المواعيد",
    icon: Calendar,
    href: "/appointments",
    adminOnly: false,
  },
  {
    name: "الموظفين",
    icon: Briefcase,
    href: "/employees",
    adminOnly: true,
  },
  {
    name: "التاسكات",
    icon: CheckSquare,
    href: "/tasks",
    adminOnly: false,
  },
];

const financeItems = [
  {
    name: "المالية",
    icon: Wallet,
    href: "/finance",
    adminOnly: true,
  },
  {
    name: "أرشيف الفواتير",
    icon: FileText,
    href: "/finance/archive",
    adminOnly: true,
  },
  {
    name: "التقارير المالية",
    icon: BarChart3,
    href: "/finance/reports",
    adminOnly: true,
  },
];

export default function Sidebar({
  isOpen,
  onClose,
  role = "ADMIN",
  userName = "أحمد محمد",
}: {
  isOpen: boolean;
  onClose: () => void;
  role?: string;
  userName?: string;
}) {
  const pathname = usePathname();

  const isAdmin =
    role === "ADMIN";

  const renderItem = (
    item: {
      name: string;
      icon: any;
      href: string;
      adminOnly?: boolean;
    }
  ) => {
    if (
      item.adminOnly &&
      !isAdmin
    ) {
      return null;
    }

    const Icon = item.icon;

    const isActive =
      pathname === item.href ||
      (item.href !== "/dashboard" &&
        pathname.startsWith(
          item.href
        ));

    return (
      <Link
        key={item.name}
        href={item.href}
        onClick={onClose}
        className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${
          isActive
            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
        }`}
      >
        <Icon size={20} />

        <span className="font-medium">
          {item.name}
        </span>
      </Link>
    );
  };

  const SidebarContent = () => (
    <>
      <div className="border-b border-slate-800 px-6 py-8">
        <div className="flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="TrendX"
            width={90}
            height={90}
            priority
            className="object-contain"
          />

          <h2 className="mt-3 text-lg font-bold">
            TrendX OS
          </h2>

          <p className="text-xs text-slate-400 mt-1">
            Business Management
            System
          </p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="space-y-2">
          <Link
            href="/dashboard"
            onClick={onClose}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${
              pathname ===
              "/dashboard"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <LayoutDashboard
              size={20}
            />

            <span className="font-medium">
              لوحة التحكم
            </span>
          </Link>
        </div>

        <div className="mt-8">
          <p className="text-xs text-slate-500 px-3 mb-3 uppercase tracking-wider">
            إدارة العمل
          </p>

          <div className="space-y-2">
            {workItems.map(
              renderItem
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="mt-8">
            <p className="text-xs text-slate-500 px-3 mb-3 uppercase tracking-wider">
              الإدارة المالية
            </p>

            <div className="space-y-2">
              {financeItems.map(
                renderItem
              )}
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="mt-8">
            <p className="text-xs text-slate-500 px-3 mb-3 uppercase tracking-wider">
              النظام
            </p>

            <div className="space-y-2">
              <Link
                href="/settings"
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${
                  pathname ===
                  "/settings"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Settings
                  size={20}
                />

                <span className="font-medium">
                  الإعدادات
                </span>
              </Link>
            </div>
          </div>
        )}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center font-bold">
            {userName.charAt(0)}
          </div>

          <div>
            <p className="font-medium text-sm">
              {userName}
            </p>

            <p className="text-xs text-slate-400">
              {isAdmin
                ? "مدير النظام"
                : "موظف"}
            </p>
          </div>
        </div>

        <button className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-orange-400 hover:bg-slate-800 transition">
          <LogOut size={18} />

          <span>
            تسجيل الخروج
          </span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 right-0 z-50 h-screen w-72 bg-[#0B1020] text-white flex flex-col transform transition-transform duration-300 lg:hidden ${
          isOpen
            ? "translate-x-0"
            : "translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>

      <aside className="hidden lg:flex w-72 min-h-screen bg-[#0B1020] text-white flex-col border-r border-slate-800">
        <SidebarContent />
      </aside>
    </>
  );
}