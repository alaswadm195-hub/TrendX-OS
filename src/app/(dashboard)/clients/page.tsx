export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import AddClientModal from "@/components/clients/AddClientModal";
import ClientsTable from "@/components/clients/ClientsTable";

import {
  Users,
  Wallet,
  AlertCircle,
} from "lucide-react";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            العملاء
          </h1>

          <p className="text-slate-500 mt-2">
            إدارة ومتابعة جميع عملاء الشركة
          </p>
        </div>

        <AddClientModal />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl border p-6 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-slate-500">
                إجمالي العملاء
              </p>

              <h3 className="text-3xl font-bold mt-2">
                {clients.length}
              </h3>
            </div>

            <Users
              className="text-blue-600"
              size={30}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-6 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-slate-500">
                إجمالي المدفوع
              </p>

              <h3 className="text-3xl font-bold mt-2 text-green-600">
                0 ج
              </h3>
            </div>

            <Wallet
              className="text-green-600"
              size={30}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-6 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-slate-500">
                المبالغ المتبقية
              </p>

              <h3 className="text-3xl font-bold mt-2 text-orange-500">
                0 ج
              </h3>
            </div>

            <AlertCircle
              className="text-orange-500"
              size={30}
            />
          </div>
        </div>
      </div>

      {/* Clients Table + Search */}
      <ClientsTable clients={clients} />
    </div>
  );
}