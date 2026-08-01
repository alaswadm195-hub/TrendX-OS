import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ClientDetailsPage({
  params,
}: Props) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      subscriptions: true,
      appointments: true,
      transactions: true,
      tasks: true,
    },
  });

  if (!client) {
    notFound();
  }

  const totalPaid = client.transactions.reduce(
    (sum, tx) => sum + tx.amount,
    0
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          {client.name}
        </h1>

        <p className="text-slate-500 mt-2">
          تفاصيل العميل
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl border p-6">
          <p className="text-slate-500">
            الاشتراكات
          </p>

          <h3 className="text-3xl font-bold mt-2">
            {client.subscriptions.length}
          </h3>
        </div>

        <div className="bg-white rounded-2xl border p-6">
          <p className="text-slate-500">
            المواعيد
          </p>

          <h3 className="text-3xl font-bold mt-2">
            {client.appointments.length}
          </h3>
        </div>

        <div className="bg-white rounded-2xl border p-6">
          <p className="text-slate-500">
            المهام
          </p>

          <h3 className="text-3xl font-bold mt-2">
            {client.tasks.length}
          </h3>
        </div>

        <div className="bg-white rounded-2xl border p-6">
          <p className="text-slate-500">
            المدفوعات
          </p>

          <h3 className="text-3xl font-bold mt-2 text-green-600">
            {totalPaid} ج
          </h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-6">
        <h2 className="text-xl font-bold mb-6">
          بيانات العميل
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-slate-500 text-sm">
              الاسم
            </p>

            <p className="font-medium mt-1">
              {client.name}
            </p>
          </div>

          <div>
            <p className="text-slate-500 text-sm">
              الهاتف
            </p>

            <p className="font-medium mt-1">
              {client.phone || "-"}
            </p>
          </div>

          <div>
            <p className="text-slate-500 text-sm">
              البريد الإلكتروني
            </p>

            <p className="font-medium mt-1">
              {client.email || "-"}
            </p>
          </div>

          <div>
            <p className="text-slate-500 text-sm">
              الشركة
            </p>

            <p className="font-medium mt-1">
              {client.company || "-"}
            </p>
          </div>

          <div className="md:col-span-2">
            <p className="text-slate-500 text-sm">
              الملاحظات
            </p>

            <p className="font-medium mt-1">
              {client.notes || "-"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}