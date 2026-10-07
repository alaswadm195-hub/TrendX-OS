"use client";

import {
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

const paymentMethods = [
  ["CASH", "كاش"],
  ["INSTAPAY", "InstaPay"],
  [
    "BANK_TRANSFER",
    "تحويل بنكي",
  ],
  [
    "VODAFONE_CASH",
    "Vodafone Cash",
  ],
  ["OTHER", "أخرى"],
] as const;

type Props = {
  endpoint: string;
  remainingAmount: number;
  buttonLabel?: string;
};

export default function FinancialPaymentForm({
  endpoint,
  remainingAmount,
  buttonLabel = "تسجيل دفعة",
}: Props) {
  const router =
    useRouter();

  const [amount, setAmount] =
    useState("");

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState("OTHER");

  const [
    referenceNumber,
    setReferenceNumber,
  ] = useState("");

  const [notes, setNotes] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function submit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount,
      ) ||
      numericAmount <= 0
    ) {
      setError(
        "اكتب مبلغ صحيح",
      );
      return;
    }

    if (
      numericAmount >
      remainingAmount
    ) {
      setError(
        "الدفعة أكبر من المبلغ المتبقي",
      );
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response =
        await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            amount:
              numericAmount,
            paymentMethod,
            referenceNumber:
              referenceNumber ||
              null,
            notes:
              notes || null,
          }),
        });

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "تعذر تسجيل الدفعة",
        );
      }

      setAmount("");
      setReferenceNumber(
        "",
      );
      setNotes("");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تسجيل الدفعة",
      );
    } finally {
      setLoading(false);
    }
  }

  if (
    remainingAmount <= 0
  ) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
        الحساب مسدد بالكامل
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-2xl border border-[#e5ebf2] bg-[#fafbfd] p-4"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-bold text-slate-500">
            قيمة الدفعة
          </span>

          <input
            type="number"
            min="0.01"
            step="0.01"
            max={
              remainingAmount
            }
            required
            value={amount}
            onChange={(
              event,
            ) =>
              setAmount(
                event.target
                  .value,
              )
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#f28a32]"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold text-slate-500">
            طريقة الدفع
          </span>

          <select
            value={
              paymentMethod
            }
            onChange={(
              event,
            ) =>
              setPaymentMethod(
                event.target
                  .value,
              )
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#f28a32]"
          >
            {paymentMethods.map(
              ([
                value,
                label,
              ]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold text-slate-500">
            رقم مرجعي
          </span>

          <input
            value={
              referenceNumber
            }
            maxLength={160}
            onChange={(
              event,
            ) =>
              setReferenceNumber(
                event.target
                  .value,
              )
            }
            placeholder="اختياري"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#f28a32]"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold text-slate-500">
            ملاحظات
          </span>

          <input
            value={notes}
            onChange={(
              event,
            ) =>
              setNotes(
                event.target
                  .value,
              )
            }
            placeholder="اختياري"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#f28a32]"
          />
        </label>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-[#123b69] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0f2f55] disabled:opacity-50"
      >
        {loading
          ? "جاري الحفظ..."
          : buttonLabel}
      </button>
    </form>
  );
}
