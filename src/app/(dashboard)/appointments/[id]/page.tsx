import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AppointmentActions from "@/components/appointments/AppointmentActions";

export default async function AppointmentDetailsPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;

  const appointment =
    await prisma.appointment.findUnique({
      where: {
        id,
      },
      include: {
        client: true,
        employee: {
          include: {
            user: true,
          },
        },
      },
    });

  if (!appointment) {
    notFound();
  }

  const statusMap = {
    PENDING: "في انتظار التأكيد",
    CONFIRMED: "مؤكد",
    COMPLETED: "مكتمل",
    CANCELLED: "ملغي",
    NO_SHOW: "لم يحضر",
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
  <div>
    <Link
      href="/appointments"
      className="text-blue-600 hover:underline"
    >
      ← الرجوع للمواعيد
    </Link>

    <h1 className="text-3xl font-bold mt-3">
      {appointment.title}
    </h1>
  </div>

  <AppointmentActions
  appointment={{
    id: appointment.id,
    title: appointment.title,
    clientId: appointment.clientId,
    employeeId: appointment.employeeId,
    customerName: appointment.customerName,
    customerPhone: appointment.customerPhone,
    appointmentDate:
      appointment.appointmentDate.toISOString(),
    endDate:
      appointment.endDate?.toISOString() || null,
    location: appointment.location,
    meetingLink: appointment.meetingLink,
    notes: appointment.notes,
    status: appointment.status,
  }}
/>
</div>

      <div className="bg-white border rounded-2xl p-6">
        <div className="flex flex-wrap gap-3">
          <span
            className={`px-3 py-1 rounded-full text-sm ${
              appointment.status ===
              "CONFIRMED"
                ? "bg-blue-100 text-blue-700"
                : appointment.status ===
                  "COMPLETED"
                ? "bg-green-100 text-green-700"
                : appointment.status ===
                  "CANCELLED"
                ? "bg-red-100 text-red-700"
                : "bg-orange-100 text-orange-700"
            }`}
          >
            {
              statusMap[
                appointment.status
              ]
            }
          </span>
        </div>

        {appointment.notes && (
          <p className="text-slate-600 mt-4">
            {appointment.notes}
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-4">
            بيانات الموعد
          </h2>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500">
                العميل
              </p>

              <p className="font-medium">
                {appointment.client.name}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                الموظف المسؤول
              </p>

              <p className="font-medium">
                {appointment.employee
                  ?.user?.name || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                اسم المسؤول
              </p>

              <p className="font-medium">
                {appointment.customerName ||
                  "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                رقم الهاتف
              </p>

              <p className="font-medium">
                {appointment.customerPhone ||
                  "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                تاريخ الموعد
              </p>

              <p className="font-medium">
                {new Date(
                  appointment.appointmentDate
                ).toLocaleString(
                  "ar-EG"
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-4">
            تفاصيل إضافية
          </h2>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500">
                المكان
              </p>

              <p className="font-medium">
                {appointment.location ||
                  "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                رابط الاجتماع
              </p>

              {appointment.meetingLink ? (
                <a
                  href={
                    appointment.meetingLink
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  فتح الرابط
                </a>
              ) : (
                <p>-</p>
              )}
            </div>

            <div>
              <p className="text-sm text-slate-500">
                تاريخ الإنشاء
              </p>

              <p className="font-medium">
                {new Date(
                  appointment.createdAt
                ).toLocaleString(
                  "ar-EG"
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}