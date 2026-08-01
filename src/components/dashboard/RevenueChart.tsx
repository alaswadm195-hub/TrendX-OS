"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
} from "recharts";

const data = [
  { month: "يناير", revenue: 18000 },
  { month: "فبراير", revenue: 22000 },
  { month: "مارس", revenue: 28000 },
  { month: "أبريل", revenue: 35000 },
  { month: "مايو", revenue: 47000 },
  { month: "يونيو", revenue: 65200 },
];

export default function RevenueChart() {
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-6">
      <h2 className="text-xl font-bold">
        الإيرادات الشهرية
      </h2>

      <p className="text-slate-500 text-sm mt-1 mb-6">
        أداء الإيرادات خلال آخر 6 شهور
      </p>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <XAxis dataKey="month" />

            <Tooltip />

            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#2563eb"
              fill="#93c5fd"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}