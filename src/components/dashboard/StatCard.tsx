import { ReactNode } from "react";

type Props = {
  title: string;
  value: string;
  icon: ReactNode;
};

export default function StatCard({
  title,
  value,
  icon,
}: Props) {
  return (
    <div className="group bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-slate-500 text-sm font-medium">
            {title}
          </p>

          <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mt-3">
            {value}
          </h3>
        </div>

        <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
      </div>
    </div>
  );
}