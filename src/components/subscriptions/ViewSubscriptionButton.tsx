"use client";

import Link from "next/link";
import { Eye } from "lucide-react";

export default function ViewSubscriptionButton({
  id,
}: {
  id: string;
}) {
  return (
    <Link
      href={`/subscriptions/${id}`}
      className="text-slate-600 hover:text-blue-600"
    >
      <Eye size={18} />
    </Link>
  );
}