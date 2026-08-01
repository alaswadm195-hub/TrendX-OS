import { CheckCircle2, Clock3 } from "lucide-react";

const appointments = [
  {
    id: 1,
    client: "أحمد محمد",
    service: "تصميم بوست",
    employee: "محمد",
    time: "03:00 PM",
    status: "pending",
  },
  {
    id: 2,
    client: "شركة الأمانة",
    service: "إدارة سوشيال ميديا",
    employee: "علي",
    time: "05:00 PM",
    status: "pending",
  },
  {
    id: 3,
    client: "Smart Academy",
    service: "تصوير فيديو",
    employee: "أحمد",
    time: "07:00 PM",
    status: "done",
  },
];

export default function AppointmentsTable() {
  return (
    <div className="bg-white rounded-2xl border shadow-sm">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold">
          مواعيد اليوم
        </h2>

        <p className="text-slate-500 text-sm mt-1">
          متابعة جميع المواعيد المحجوزة اليوم
        </p>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="text-right p-4">العميل</th>
              <th className="text-right p-4">الخدمة</th>
              <th className="text-right p-4">الموظف</th>
              <th className="text-right p-4">الوقت</th>
              <th className="text-right p-4">الحالة</th>
              <th className="text-right p-4">إجراء</th>
            </tr>
          </thead>

          <tbody>
            {appointments.map((appointment) => (
              <tr
                key={appointment.id}
                className="border-b last:border-none"
              >
                <td className="p-4 font-medium">
                  {appointment.client}
                </td>

                <td className="p-4">
                  {appointment.service}
                </td>

                <td className="p-4">
                  {appointment.employee}
                </td>

                <td className="p-4">
                  {appointment.time}
                </td>

                <td className="p-4">
                  {appointment.status === "done" ? (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                      تم
                    </span>
                  ) : (
                    <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">
                      قيد الانتظار
                    </span>
                  )}
                </td>

                <td className="p-4">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm">
                    Done
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden p-4 space-y-4">
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className="border rounded-2xl p-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">
                  {appointment.client}
                </h3>

                <p className="text-sm text-slate-500 mt-1">
                  {appointment.service}
                </p>
              </div>

              {appointment.status === "done" ? (
                <CheckCircle2 className="text-green-600" />
              ) : (
                <Clock3 className="text-yellow-600" />
              )}
            </div>

            <div className="mt-4 text-sm text-slate-600 space-y-1">
              <p>
                الموظف: {appointment.employee}
              </p>

              <p>
                الوقت: {appointment.time}
              </p>
            </div>

            <button className="w-full mt-4 bg-blue-600 text-white py-2 rounded-xl">
              Done
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}