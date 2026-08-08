"use client";

import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";

export default function MonthSelector({
  value,
}: {
  value: string;
}) {
  const router = useRouter();

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const month = event.target.value;

    if (!month) {
      return;
    }

    router.push(
      `/subscriptions?month=${month}`
    );
  }

  return (
    <div className="relative">
      <CalendarDays
        size={18}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />

      <input
        type="month"
        value={value}
        onChange={handleChange}
        className="w-full sm:w-auto border border-slate-200 bg-white rounded-xl py-3 pr-10 pl-4 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      />
    </div>
  );
}