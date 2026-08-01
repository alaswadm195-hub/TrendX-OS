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
} from "lucide-react";

const menuItems = [
  {
    name: "لوحة التحكم",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    name: "العملاء",
    icon: Users,
    href: "/clients",
  },
  {
    name: "الاشتراكات",
    icon: Repeat,
    href: "/subscriptions",
  },
  {
    name: "المواعيد",
    icon: Calendar,
    href: "/appointments",
  },
  {
    name: "الموظفين",
    icon: Briefcase,
    href: "/employees",
  },
  {
    name: "التاسكات",
    icon: CheckSquare,
    href: "/tasks",
  },
  {
    name: "التقارير",
    icon: BarChart3,
    href: "/reports",
  },
  {
    name: "المالية",
    icon: Wallet,
    href: "/finance",
  },
  {
    name: "الإعدادات",
    icon: Settings,
    href: "/settings",
  },
];

export default function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

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
            Business Management System
          </p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        <p className="text-xs text-slate-500 px-3 mb-3 uppercase tracking-wider">
          القائمة الرئيسية
        </p>

        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

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
          })}
        </div>
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center font-bold">
            أ
          </div>

          <div>
            <p className="font-medium text-sm">
              أحمد محمد
            </p>

            <p className="text-xs text-slate-400">
              مدير النظام
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
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed top-0 right-0 z-50 h-screen w-72 bg-[#0B1020] text-white flex flex-col transform transition-transform duration-300 lg:hidden ${
          isOpen
            ? "translate-x-0"
            : "translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 min-h-screen bg-[#0B1020] text-white flex-col border-r border-slate-800">
        <SidebarContent />
      </aside>
    </>
  );
}