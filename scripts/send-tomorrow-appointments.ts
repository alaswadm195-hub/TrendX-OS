/**
 * Send the *next calendar day's* appointment agenda to the appointment
 * WhatsApp group. Cairo timezone (including DST) is authoritative.
 *
 * Preview only (does NOT send): npx tsx scripts/send-tomorrow-appointments.ts
 * Real send:                  npx tsx scripts/send-tomorrow-appointments.ts --send
 *
 * The systemd timer uses flock to prevent concurrent runs. AuditLog records
 * successful requests so ordinary reruns do not re-send the same day's agenda.
 */
import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { sendWhatsAppMessage } from "../src/lib/whatsapp";
import {
  cairoDateKey,
  tomorrowCairoDateKey,
  tomorrowAppointmentsWhatsAppMessage,
} from "../src/lib/appointment-whatsapp";

const ACTION = "APPOINTMENTS_NEXT_DAY_DIGEST_SENT";
const ENTITY_TYPE = "ScheduledWhatsApp";

async function main() {
  const now = new Date();
  const dateKey = tomorrowCairoDateKey(now);
  const [year, month, day] = dateKey.split("-").map(Number);
  const targetDate = new Date(Date.UTC(year, month - 1, day, 12));

  // Use a slightly wider UTC scan and a Cairo-day filter. This works both
  // during Egypt's summer time and during DST transitions.
  const midnightUtc = Date.UTC(year, month - 1, day);
  const start = new Date(midnightUtc - 6 * 60 * 60 * 1000);
  const end = new Date(midnightUtc + 30 * 60 * 60 * 1000);

  const rows = await prisma.appointment.findMany({
    where: {
      appointmentDate: { gte: start, lt: end },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    select: {
      title: true,
      appointmentDate: true,
      location: true,
      client: { select: { name: true } },
      employee: { select: { user: { select: { name: true } } } },
    },
    orderBy: { appointmentDate: "asc" },
  });

  const appointments = rows.filter(
    (appointment) => cairoDateKey(appointment.appointmentDate) === dateKey,
  );
  const message = tomorrowAppointmentsWhatsAppMessage(targetDate, appointments);

  if (!process.argv.includes("--send")) {
    console.log("PREVIEW ONLY - no WhatsApp messages have been sent.");
    console.log("Cairo agenda date:", dateKey);
    console.log("Active appointments:", appointments.length);
    console.log("\n" + message);
    return;
  }

  const destination = process.env.ADMIN_WHATSAPP_GROUP_ID?.trim();
  if (!destination || !/^\d+@g\.us$/.test(destination)) {
    throw new Error("ADMIN_WHATSAPP_GROUP_ID missing or invalid; refusing to send");
  }

  const prior = await prisma.auditLog.findFirst({
    where: {
      action: ACTION,
      entityType: ENTITY_TYPE,
      entityId: dateKey,
    },
    select: { id: true },
  });

  if (prior) {
    console.log("Agenda already sent for", dateKey, "- skipping duplicate");
    return;
  }

  const response = await sendWhatsAppMessage({ to: destination, message });
  if (!response?.success) {
    throw new Error("WhatsApp service did not acknowledge the agenda request");
  }

  await prisma.auditLog.create({
    data: {
      action: ACTION,
      entityType: ENTITY_TYPE,
      entityId: dateKey,
      metadata: {
        date: dateKey,
        appointmentCount: appointments.length,
        destinationType: "APPOINTMENTS_GROUP",
        messageId: response.messageId ?? null,
      },
    },
  });

  console.log("WhatsApp agenda request accepted for", dateKey);
  console.log("Appointments:", appointments.length);
}

main()
  .catch((error) => {
    console.error("Daily appointments digest failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
