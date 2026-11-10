const CAIRO_TIME_ZONE = "Africa/Cairo";

type NamedAppointment = {
  title: string;
  appointmentDate: Date;
  location?: string | null;
  client: { name: string };
  employee?: { user: { name: string } } | null;
};

function shortText(value: string, max = 100): string {
  const clean = value.replace(/\s+/g, " ").trim().replace(/\*/g, "");
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export function cairoDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CAIRO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (part: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === part)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function tomorrowCairoDateKey(now: Date): string {
  const [year, month, day] = cairoDateKey(now).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1))
    .toISOString()
    .slice(0, 10);
}

export function cairoDayLabel(date: Date): string {
  const weekday = new Intl.DateTimeFormat("ar-EG", {
    timeZone: CAIRO_TIME_ZONE,
    weekday: "long",
  }).format(date);
  const dayMonth = new Intl.DateTimeFormat("en-GB", {
    timeZone: CAIRO_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
  }).format(date);
  return `${weekday} ${dayMonth}`;
}

export function cairoTimeLabel(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CAIRO_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const get = (part: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === part)?.value || "";
  return `${get("hour")}:${get("minute")} ${get("dayPeriod") === "AM" ? "ص" : "م"}`;
}

export function newAppointmentWhatsAppMessage(appointment: NamedAppointment): string {
  const lines = [
    "📌 *حجز جديد | Trend X*",
    "",
    `👤 العميل: ${shortText(appointment.client.name, 80)}`,
    `🎬 الموعد: ${shortText(appointment.title, 120)}`,
    `📅 ${cairoDayLabel(appointment.appointmentDate)}`,
    `⏰ ${cairoTimeLabel(appointment.appointmentDate)}`,
  ];
  if (appointment.employee?.user?.name) {
    lines.push(`👨‍💼 المسؤول: ${shortText(appointment.employee.user.name, 80)}`);
  }
  if (appointment.location?.trim()) {
    lines.push(`📍 ${shortText(appointment.location, 120)}`);
  }
  return lines.join("\n");
}

export function tomorrowAppointmentsWhatsAppMessage(
  targetDate: Date,
  appointments: NamedAppointment[],
): string {
  const sorted = [...appointments].sort(
    (a, b) => a.appointmentDate.getTime() - b.appointmentDate.getTime(),
  );
  const lines = [
    "🌙 *جدول بكرة | Trend X*",
    `📅 ${cairoDayLabel(targetDate)}`,
  ];

  if (sorted.length === 0) {
    lines.push(
      "",
      "✅ مفيش مواعيد محجوزة لبكرة لحد دلوقتي.",
      "",
      "أي حجز جديد هيوصل إشعاره هنا أول بأول.",
      "",
      "ليلة هادية يا تيم 🧡",
    );
    return lines.join("\n");
  }

  lines.push(`📌 إجمالي الحجوزات: ${sorted.length}`, "");

  // Keep WhatsApp readable; if a busy day exceeds this limit, the complete
  // schedule remains available on TrendX OS.
  const visible = sorted.slice(0, 30);
  for (const [i, appointment] of visible.entries()) {
    lines.push(
      `${i + 1}. ${cairoTimeLabel(appointment.appointmentDate)} — ${shortText(appointment.client.name, 65)}`,
      `   ${shortText(appointment.title, 100)}`,
      "",
    );
  }
  if (sorted.length > visible.length) {
    lines.push(
      `وفيه ${sorted.length - visible.length} مواعيد إضافية — راجع جدول TrendX OS.`,
      "",
    );
  }
  lines.push("✅ يوم موفق لفريق Trend X 🧡");
  return lines.join("\n").trim();
}
