import StatCard from "@/components/dashboard/StatCard";
import AppointmentsTable from "@/components/dashboard/AppointmentsTable";
import RevenueChart from "@/components/dashboard/RevenueChart";
import ServicesChart from "@/components/dashboard/ServicesChart";
import TasksCard from "@/components/dashboard/TasksCard";

import { requireAuth } from "@/lib/guards";

import {
  Users,
  Calendar,
  Wallet,
  CheckSquare,
  Repeat,
  DollarSign,
  Plus,
} from "lucide-react";

export default async function DashboardPage() {
  const user = await requireAuth();

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Welcome */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold">
            مرحبًا {user.userId} 👋
          </h1>

          <p className="text-slate-500 mt-2">
            إليك نظرة عامة على نشاط الشركة اليوم
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl transition">
            <Plus size={18} />
            إضافة عميل
          </button>

          <button className="flex items-center gap-2 bg-white border hover:bg-slate-50 px-4 py-3 rounded-xl transition">
            <Calendar size={18} />
            موعد جديد
          </button>

          <button className="flex items-center gap-2 bg-white border hover:bg-slate-50 px-4 py-3 rounded-xl transition">
            <CheckSquare size={18} />
            مهمة جديدة
          </button>
        </div>
      </div>

      {/* Main Revenue Card */}
      <div className="bg-gradient-to-l from-blue-600 to-cyan-500 rounded-3xl p-8 text-white mb-8">
        <p className="text-blue-100 text-sm">
          إجمالي إيرادات الشهر
        </p>

        <h2 className="text-4xl font-bold mt-3">
          65,200 ج
        </h2>

        <p className="mt-3 text-blue-100">
          +18% مقارنة بالشهر الماضي
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي العملاء"
          value="152"
          icon={<Users className="text-blue-600" />}
        />

        <StatCard
          title="مواعيد اليوم"
          value="8"
          icon={<Calendar className="text-green-600" />}
        />

        <StatCard
          title="المهام النشطة"
          value="12"
          icon={<CheckSquare className="text-violet-600" />}
        />

        <StatCard
          title="الاشتراكات"
          value="37"
          icon={<Repeat className="text-pink-600" />}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <StatCard
          title="دخل اليوم"
          value="3,500 ج"
          icon={<DollarSign className="text-orange-600" />}
        />

        <StatCard
          title="الرصيد الحالي"
          value="125,000 ج"
          icon={<Wallet className="text-cyan-600" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-8">
        <div className="xl:col-span-2">
          <RevenueChart />
        </div>

        <ServicesChart />
      </div>

      {/* Appointments + Tasks */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-8">
        <div className="xl:col-span-2">
          <AppointmentsTable />
        </div>

        <TasksCard />
      </div>
    </div>
  );
}