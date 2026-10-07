import { requireAuth } from "@/lib/guards";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import AddAppointmentModal from "@/components/appointments/AddAppointmentModal";
import AppointmentsTable from "@/components/appointments/AppointmentsTable";

export default async function AppointmentsPage() {
  const currentUser = await requireAuth();
  const [appointments, employees, clients] =
    await Promise.all([
      prisma.appointment.findMany({
        where: currentUser.role === "ADMIN" ? {} : { employeeId: currentUser.employeeId || "__none__" },
        include: {
          client: true,
          employee: {
            include: {
              user: { select: { id: true, name: true, email: true, role: true } },
            },
          },
        },
        orderBy: {
          appointmentDate: "asc",
        },
      }),

      currentUser.role === "ADMIN" ? prisma.employee.findMany({
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: {
          createdAt: "desc",
        },
      }) : Promise.resolve([]),

      currentUser.role === "ADMIN" ? prisma.client.findMany({
        orderBy: {
          name: "asc",
        },
      }) : Promise.resolve([]),
    ]);

  const totalAppointments =
    appointments.length;

  const pendingAppointments =
    appointments.filter(
      (appointment) =>
        appointment.status === "PENDING"
    ).length;

  const confirmedAppointments =
    appointments.filter(
      (appointment) =>
        appointment.status === "CONFIRMED"
    ).length;

  const completedAppointments =
    appointments.filter(
      (appointment) =>
        appointment.status === "COMPLETED"
    ).length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            المواعيد
          </h1>

          <p className="text-slate-500 mt-2">
            إدارة ومتابعة المواعيد
          </p>
        </div>

        <AddAppointmentModal
          employees={employees}
          clients={clients}
          whatsappNotificationPhone={
            process.env.WHATSAPP_NOTIFICATION_PHONE ||
            ""
          }
        />
      </div>

      <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            إجمالي المواعيد
          </p>

          <h3 className="text-3xl font-bold mt-2">
            {totalAppointments}
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            انتظار التأكيد
          </p>

          <h3 className="text-3xl font-bold mt-2 text-orange-600">
            {pendingAppointments}
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            المؤكدة
          </p>

          <h3 className="text-3xl font-bold mt-2 text-blue-600">
            {confirmedAppointments}
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            المكتملة
          </p>

          <h3 className="text-3xl font-bold mt-2 text-green-600">
            {completedAppointments}
          </h3>
        </div>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <AppointmentsTable
          appointments={appointments}
        />
      </div>
    </div>
  );
}