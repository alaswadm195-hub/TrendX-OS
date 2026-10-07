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
    <div className="group relative overflow-hidden rounded-[24px] border border-[#e5ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(15,47,85,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-[#d7e1ec] hover:shadow-[0_16px_32px_rgba(15,47,85,0.10)] md:p-6">
      <div
        aria-hidden="true"
        className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[#f3a13e] via-[#ec7f31] to-[#17385f] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-500">
            {title}
          </p>

          <h3 className="mt-3 truncate text-2xl font-black tracking-tight text-[#102f55] md:text-3xl">
            {value}
          </h3>
        </div>

        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#e7edf4] bg-[#f5f8fc] shadow-inner transition-all duration-300 group-hover:scale-105 group-hover:border-[#f0d0ad] group-hover:bg-[#fff9f2] md:h-16 md:w-16">
          <div className="scale-110">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}
