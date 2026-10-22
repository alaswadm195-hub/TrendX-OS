import type { Prisma } from "@/generated/prisma/client";

/**
 * Status returned by read-only subscription screens and API responses.
 * No writes to Subscription.status are performed by this function.
 */
export type EffectiveSubscriptionStatus =
  | "CANCELLED"
  | "COMPLETED"
  | "EXPIRED"
  | "ACTIVE";

/**
 * Both stored subscription dates and today's date are interpreted on the
 * Africa/Cairo calendar. An end date is valid through its entire local day.
 */
const cairoCalendar = new Intl.DateTimeFormat("en-US", {
  timeZone: "Africa/Cairo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function cairoDateKey(value: Date): string {
  const parts = cairoCalendar.formatToParts(value);
  const part = (name: "year" | "month" | "day") =>
    parts.find((item) => item.type === name)?.value;

  const year = part("year");
  const month = part("month");
  const day = part("day");
  if (!year || !month || !day) {
    throw new Error("Unable to read subscription date");
  }
  return `${year}-${month}-${day}`;
}

export function getEffectiveSubscriptionStatus(
  subscription: {
    status: string;
    completedAt: Date | null;
    endDate: Date;
  },
  now: Date = new Date(),
): EffectiveSubscriptionStatus {
  if (subscription.status === "CANCELLED") return "CANCELLED";
  if (subscription.completedAt !== null) return "COMPLETED";
  if (cairoDateKey(subscription.endDate) < cairoDateKey(now)) return "EXPIRED";
  return "ACTIVE";
}

/**
 * Recomputes usage completion after adding, archiving or restoring tracking
 * records. Does not change subscription.status, payments or the audit trail.
 */
export async function syncSubscriptionCompletion(
  tx: Prisma.TransactionClient,
  subscriptionId: string,
) {
  const subscription = await tx.subscription.findUnique({
    where: { id: subscriptionId },
    select: {
      id: true,
      status: true,
      serviceCategory: true,
      includedMinutes: true,
      completedAt: true,
      contentQuotas: {
        select: { contentType: true, totalCount: true },
      },
    },
  });

  if (!subscription) return null;

  if (subscription.status === "CANCELLED") {
    return {
      completed: Boolean(subscription.completedAt),
      completedAt: subscription.completedAt,
    };
  }

  let completed = false;

  if (
    subscription.serviceCategory === "SCREEN_PACKAGES" &&
    subscription.includedMinutes !== null
  ) {
    const usage = await tx.subscriptionUsage.aggregate({
      where: { subscriptionId, archivedAt: null },
      _sum: { durationMinutes: true },
    });

    const usedMinutes = usage._sum.durationMinutes ?? 0;
    completed = usedMinutes >= subscription.includedMinutes;
  }

  if (
    subscription.serviceCategory === "PAGE_MANAGEMENT" &&
    subscription.contentQuotas.length > 0
  ) {
    const groups = await tx.subscriptionContentItem.groupBy({
      by: ["contentType"],
      where: { subscriptionId, archivedAt: null },
      _count: { _all: true },
    });

    const usedByType = new Map(
      groups.map((group) => [group.contentType, group._count._all]),
    );

    completed = subscription.contentQuotas.every(
      (quota) => (usedByType.get(quota.contentType) ?? 0) >= quota.totalCount,
    );
  }

  const completedAt = completed
    ? subscription.completedAt ?? new Date()
    : null;

  if (
    completedAt?.getTime() !== subscription.completedAt?.getTime() ||
    (completedAt === null && subscription.completedAt !== null)
  ) {
    await tx.subscription.update({
      where: { id: subscriptionId },
      data: { completedAt },
    });
  }

  return { completed, completedAt };
}
