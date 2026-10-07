"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

export type ServiceChartItem = {
  name: string;
  value: number;
};

type Props = {
  data?: ServiceChartItem[];
};

const COLORS = [
  "#123b69",
  "#f28a32",
  "#1598b7",
  "#7c3aed",
  "#16a34a",
  "#db2777",
];

export default function ServicesChart({
  data = [],
}: Props) {
  const cleanData =
    data.filter(
      (item) =>
        item.name.trim().length >
          0 &&
        Number.isFinite(
          item.value,
        ) &&
        item.value > 0,
    );

  const total =
    cleanData.reduce(
      (sum, item) =>
        sum + item.value,
      0,
    );

  return (
    <div className="rounded-[24px] border border-[#e5ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(15,47,85,0.06)] md:p-6">
      <div>
        <h2 className="text-xl font-black text-[#102f55]">
          الخدمات الأكثر مبيعًا
        </h2>

        <p className="mt-1 text-sm font-medium text-slate-500">
          توزيع الاشتراكات حسب
          الخدمة أو الباقة
        </p>
      </div>

      {cleanData.length === 0 ? (
        <div className="mt-6 flex h-80 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-[#fafbfd]">
          <div className="px-4 text-center">
            <p className="font-bold text-[#17385f]">
              لا توجد خدمات مباعة بعد
            </p>

            <p className="mt-1 text-sm text-slate-400">
              سيظهر التوزيع تلقائيًا
              عند إضافة الاشتراكات
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 h-64">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <PieChart>
                <Pie
                  data={cleanData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={96}
                  paddingAngle={3}
                  stroke="transparent"
                >
                  {cleanData.map(
                    (
                      item,
                      index,
                    ) => (
                      <Cell
                        key={`${item.name}-${index}`}
                        fill={
                          COLORS[
                            index %
                              COLORS.length
                          ]
                        }
                      />
                    ),
                  )}
                </Pie>

                <Tooltip
                  formatter={(
                    value,
                    name,
                  ) => [
                    `${Number(
                      value,
                    ).toLocaleString(
                      "ar-EG",
                    )} اشتراك`,
                    String(name),
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
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="-mt-36 mb-20 flex justify-center">
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-400">
                الإجمالي
              </p>

              <p className="mt-1 text-2xl font-black text-[#102f55]">
                {total.toLocaleString(
                  "ar-EG",
                )}
              </p>

              <p className="text-[11px] font-medium text-slate-400">
                اشتراك
              </p>
            </div>
          </div>

          <div className="mt-2 space-y-2.5">
            {cleanData.map(
              (item, index) => {
                const percentage =
                  total > 0
                    ? Math.round(
                        (item.value /
                          total) *
                          100,
                      )
                    : 0;

                return (
                  <div
                    key={`${item.name}-legend-${index}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[#f8fafc] px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            COLORS[
                              index %
                                COLORS.length
                            ],
                        }}
                      />

                      <span className="truncate text-sm font-bold text-[#17385f]">
                        {item.name}
                      </span>
                    </div>

                    <div className="shrink-0 text-left">
                      <span className="text-sm font-black text-[#102f55]">
                        {item.value.toLocaleString(
                          "ar-EG",
                        )}
                      </span>

                      <span className="mr-1 text-xs font-medium text-slate-400">
                        ({percentage}%)
                      </span>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </>
      )}
    </div>
  );
}
