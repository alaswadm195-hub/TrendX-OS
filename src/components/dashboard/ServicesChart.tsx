"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

const data = [
  {
    name: "سوشيال ميديا",
    value: 45,
  },
  {
    name: "تصميم",
    value: 25,
  },
  {
    name: "مونتاج",
    value: 20,
  },
  {
    name: "تصوير",
    value: 10,
  },
];

const COLORS = [
  "#2563eb",
  "#06b6d4",
  "#8b5cf6",
  "#f59e0b",
];

export default function ServicesChart() {
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-6">
      <h2 className="text-xl font-bold">
        الخدمات الأكثر مبيعًا
      </h2>

      <p className="text-slate-500 text-sm mt-1 mb-6">
        توزيع الخدمات الحالية
      </p>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              outerRadius={100}
              label
            >
              {data.map((_, index) => (
                <Cell
                  key={index}
                  fill={COLORS[index]}
                />
              ))}
            </Pie>

            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}