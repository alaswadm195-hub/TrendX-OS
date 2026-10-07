"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type RevenuePoint = {
  month: string;
  revenue: number;
};

type Props = {
  data: RevenuePoint[];
};

export default function RevenueChart({
  data,
}: Props) {
  const hasData =
    data.some(
      (item) =>
        item.revenue > 0,
    );

  return (
    <div className="rounded-[24px] border border-[#e5ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(15,47,85,0.06)] md:p-6">
      <div className="mb-6">
        <h2 className="text-xl font-black text-[#102f55]">
          الإيرادات الشهرية
        </h2>

        <p className="mt-1 text-sm font-medium text-slate-500">
          أداء الإيرادات الفعلية خلال آخر 6 شهور
        </p>
      </div>

      {!hasData ? (
        <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-[#fafbfd]">
          <div className="text-center">
            <p className="font-bold text-[#17385f]">
              لا توجد إيرادات مسجلة بعد
            </p>

            <p className="mt-1 text-sm text-slate-400">
              سيظهر الرسم تلقائيًا عند تسجيل المدفوعات
            </p>
          </div>
        </div>
      ) : (
        <div className="h-80">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <AreaChart
              data={data}
              margin={{
                top: 10,
                right: 4,
                left: 4,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient
                  id="revenueFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="#f28a32"
                    stopOpacity={0.28}
                  />

                  <stop
                    offset="95%"
                    stopColor="#f28a32"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
                stroke="#e8edf3"
              />

              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "#64748b",
                  fontSize: 12,
                }}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                width={58}
                tick={{
                  fill: "#94a3b8",
                  fontSize: 11,
                }}
                tickFormatter={(value) =>
                  Number(
                    value,
                  ).toLocaleString(
                    "ar-EG",
                    {
                      notation:
                        "compact",
                      maximumFractionDigits: 1,
                    },
                  )
                }
              />

              <Tooltip
                cursor={{
                  stroke:
                    "#dbe4ee",
                  strokeWidth: 1,
                }}
                formatter={(value) => [
                  `${Number(
                    value,
                  ).toLocaleString(
                    "ar-EG",
                  )} ج`,
                  "الإيرادات",
                ]}
                contentStyle={{
                  borderRadius:
                    "14px",
                  border:
                    "1px solid #e5ebf2",
                  boxShadow:
                    "0 10px 30px rgba(15,47,85,0.10)",
                }}
              />

              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#123b69"
                strokeWidth={3}
                fill="url(#revenueFill)"
                activeDot={{
                  r: 5,
                  fill: "#f28a32",
                  stroke:
                    "#ffffff",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
