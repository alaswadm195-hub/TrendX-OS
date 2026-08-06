"use client";

import {
  Bell,
  Search,
  Menu,
  LogOut,
} from "lucide-react";

export default function Header({
  onMenuClick,
  userName = "المستخدم",
  role = "EMPLOYEE",
}: {
  onMenuClick: () => void;
  userName?: string;
  role?: string;
}) {
  const handleLogout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
      });

      window.location.href =
        "/login";
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <header className="h-20 bg-white border-b border-slate-200 px-4 md:px-6 lg:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition"
        >
          <Menu size={20} />
        </button>

        <div className="relative hidden md:block">
          <Search
            size={18}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            placeholder="ابحث عن عميل، موعد، موظف..."
            className="w-72 lg:w-[420px] h-11 rounded-xl border border-slate-200 bg-slate-50 pr-11 pl-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative w-11 h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center transition">
          <Bell size={18} />

          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-medium flex items-center justify-center">
            3
          </span>
        </button>

        <button
          onClick={handleLogout}
          className="w-11 h-11 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center transition"
          title="تسجيل الخروج"
        >
          <LogOut size={18} />
        </button>

        <div className="hidden sm:flex items-center gap-3">
          <div className="text-right">
            <p className="font-semibold text-sm">
              {userName}
            </p>

            <p className="text-xs text-slate-500">
              {role === "ADMIN"
                ? "مدير النظام"
                : "موظف"}
            </p>
          </div>

          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
            {userName.charAt(0)}
          </div>
        </div>
      </div>
    </header>
  );
}