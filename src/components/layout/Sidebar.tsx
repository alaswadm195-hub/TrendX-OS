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
  type LucideIcon,
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

  const itemClassName = (
    isActive: boolean,
  ) =>
    `group relative flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-3.5 transition-all duration-200 ${
      isActive
        ? "bg-white/[0.09] text-white shadow-[0_10px_24px_rgba(0,0,0,0.16)] ring-1 ring-white/10"
        : "text-slate-300 hover:bg-white/[0.055] hover:text-white"
    }`;

  const renderItem = (
    item: {
      name: string;
      icon: LucideIcon;
      href: string;
      adminOnly?: boolean;
    },
  ) => {
    if (
      item.adminOnly &&
      !isAdmin
    ) {
      return null;
    }

    const Icon =
      item.icon;

    const isActive =
      pathname === item.href ||
      (item.href !==
        "/dashboard" &&
        pathname.startsWith(
          item.href,
        ));

    return (
      <Link
        key={item.name}
        href={item.href}
        onClick={onClose}
        className={itemClassName(
          isActive,
        )}
      >
        {isActive && (
          <span
            aria-hidden="true"
            className="absolute right-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-l-full bg-gradient-to-b from-[#f6a43d] to-[#ee7c31]"
          />
        )}

        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
            isActive
              ? "bg-[#f28a32]/15 text-[#ffad55]"
              : "bg-white/[0.04] text-slate-400 group-hover:bg-white/[0.07] group-hover:text-white"
          }`}
        >
          <Icon size={19} />
        </span>

        <span className="font-semibold">
          {item.name}
        </span>
      </Link>
    );
  };

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="border-b border-white/[0.07] px-5 py-7">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/[0.07] bg-white/[0.04] shadow-[0_16px_36px_rgba(0,0,0,0.18)]">
            <Image
              src="/logo.png"
              alt="TrendX"
              width={82}
              height={82}
              priority
              className="h-auto w-[76px] object-contain"
            />
          </div>

          <h2 className="mt-4 text-xl font-black tracking-tight text-white">
            TrendX OS
          </h2>

          <p className="mt-1 text-[11px] font-medium tracking-wide text-slate-500">
            Business Management System
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-2">
          {(() => {
            const isActive =
              pathname ===
              "/dashboard";

            return (
              <Link
                href="/dashboard"
                onClick={onClose}
                className={itemClassName(
                  isActive,
                )}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute right-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-l-full bg-gradient-to-b from-[#f6a43d] to-[#ee7c31]"
                  />
                )}

                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                    isActive
                      ? "bg-[#f28a32]/15 text-[#ffad55]"
                      : "bg-white/[0.04] text-slate-400"
                  }`}
                >
                  <LayoutDashboard size={19} />
                </span>

                <span className="font-semibold">
                  لوحة التحكم
                </span>
              </Link>
            );
          })()}
        </div>

        <div className="mt-8">
          <p className="mb-3 px-3 text-[11px] font-bold tracking-wide text-slate-600">
            إدارة العمل
          </p>

          <div className="space-y-2">
            {workItems.map(
              renderItem,
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="mt-8">
            <p className="mb-3 px-3 text-[11px] font-bold tracking-wide text-slate-600">
              الإدارة المالية
            </p>

            <div className="space-y-2">
              {financeItems.map(
                renderItem,
              )}
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="mt-8">
            <p className="mb-3 px-3 text-[11px] font-bold tracking-wide text-slate-600">
              النظام
            </p>

            <div className="space-y-2">
              {(() => {
                const isActive =
                  pathname ===
                  "/settings";

                return (
                  <Link
                    href="/settings"
                    onClick={onClose}
                    className={itemClassName(
                      isActive,
                    )}
                  >
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute right-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-l-full bg-gradient-to-b from-[#f6a43d] to-[#ee7c31]"
                      />
                    )}

                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        isActive
                          ? "bg-[#f28a32]/15 text-[#ffad55]"
                          : "bg-white/[0.04] text-slate-400"
                      }`}
                    >
                      <Settings size={19} />
                    </span>

                    <span className="font-semibold">
                      الإعدادات
                    </span>
                  </Link>
                );
              })()}
            </div>
          </div>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-white/[0.07] p-4">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f59b3c] to-[#ee7c31] text-base font-black text-white shadow-[0_8px_18px_rgba(238,124,49,0.24)]">
              {userName
                .trim()
                .charAt(0)}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">
                {userName}
              </p>

              <p className="mt-0.5 text-xs font-medium text-slate-500">
                {isAdmin
                  ? "مدير النظام"
                  : "موظف"}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-orange-400/10 bg-orange-400/[0.06] px-4 py-2.5 text-sm font-semibold text-[#ffad66] transition hover:bg-orange-400/[0.10]"
          >
            <LogOut size={17} />
            <span>
              تسجيل الخروج
            </span>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        className={`fixed right-0 top-0 z-50 flex h-screen w-72 flex-col border-l border-white/[0.05] bg-[#081326] text-white shadow-2xl transition-transform duration-300 lg:hidden ${
          isOpen
            ? "translate-x-0"
            : "translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      <aside className="hidden min-h-screen w-72 shrink-0 flex-col border-l border-white/[0.05] bg-[#081326] text-white lg:flex">
        {sidebarContent}
      </aside>
    </>
  );
}
