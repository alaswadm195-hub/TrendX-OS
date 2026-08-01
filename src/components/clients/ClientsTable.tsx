"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Eye } from "lucide-react";

import EditClientModal from "./EditClientModal";
import DeleteClientButton from "./DeleteClientButton";

type Client = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  notes: string | null;
};

export default function ClientsTable({
  clients,
}: {
  clients: Client[];
}) {
  const [search, setSearch] = useState("");

  const filteredClients = useMemo(() => {
    const value = search.toLowerCase();

    return clients.filter((client) =>
      [
        client.name,
        client.phone ?? "",
        client.email ?? "",
        client.company ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(value)
    );
  }, [clients, search]);

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      <div className="p-5 border-b">
        <div className="relative max-w-md">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            placeholder="ابحث عن عميل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="text-right p-4">العميل</th>
              <th className="text-right p-4">الشركة</th>
              <th className="text-right p-4">الهاتف</th>
              <th className="text-right p-4">البريد الإلكتروني</th>
              <th className="text-center p-4">الإجراءات</th>
            </tr>
          </thead>

          <tbody>
            {filteredClients.map((client) => (
              <tr
                key={client.id}
                className="border-b hover:bg-slate-50 transition"
              >
                <td className="p-4 font-medium">
                  {client.name}
                </td>

                <td className="p-4">
                  {client.company || "-"}
                </td>

                <td className="p-4">
                  {client.phone || "-"}
                </td>

                <td className="p-4">
                  {client.email || "-"}
                </td>

                <td className="p-4">
                  <div className="flex justify-center gap-2">
                    <Link
                      href={`/clients/${client.id}`}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                    >
                      <Eye size={16} />
                    </Link>

                    <EditClientModal client={client} />

                    <DeleteClientButton
                      clientId={client.id}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="lg:hidden p-4 space-y-4">
        {filteredClients.map((client) => (
          <div
            key={client.id}
            className="border rounded-2xl p-4 bg-white"
          >
            <h3 className="font-bold text-lg">
              {client.name}
            </h3>

            <p className="text-slate-500 mt-2">
              {client.company || "-"}
            </p>

            <p className="text-slate-500">
              {client.phone || "-"}
            </p>

            <p className="text-slate-500">
              {client.email || "-"}
            </p>

            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <Link
                href={`/clients/${client.id}`}
                className="flex items-center justify-center p-2 rounded-lg bg-slate-100 hover:bg-slate-200"
              >
                <Eye size={16} />
              </Link>

              <EditClientModal client={client} />

              <DeleteClientButton
                clientId={client.id}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}