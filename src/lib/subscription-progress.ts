import type { Prisma } from "@/generated/prisma/client";

export async function syncSubscriptionCompletion(
  tx: Prisma.TransactionClient,
  subscriptionId: string,
) {
  const subscription =
    await tx.subscription.findUnique({
      where: {
        id: subscriptionId,
      },
      select: {
        id: true,
        status: true,
        serviceCategory: true,
        includedMinutes: true,
        completedAt: true,
        contentQuotas: {
          select: {
            contentType: true,
            totalCount: true,
          },
        },
      },
    });

  if (!subscription) {
    return null;
  }

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
      where: {
        subscriptionId,
        archivedAt: null,
      },
      _sum: {
        durationMinutes: true,
      },
    });

    const usedMinutes =
      usage._sum.durationMinutes ?? 0;

    completed =
      usedMinutes >= subscription.includedMinutes;
  }

  if (
    subscription.serviceCategory === "PAGE_MANAGEMENT" &&
    subscription.contentQuotas.length > 0
  ) {
    const groups = await tx.subscriptionContentItem.groupBy({
      by: ["contentType"],
      where: {
        subscriptionId,
        archivedAt: null,
      },
      _count: {
        _all: true,
      },
    });

    const usedByType = new Map(
      groups.map((group) => [
        group.contentType,
        group._count._all,
      ]),
    );

    completed = subscription.contentQuotas.every(
      (quota) =>
        (usedByType.get(quota.contentType) ?? 0) >=
        quota.totalCount,
    );
  }

  const completedAt = completed
    ? subscription.completedAt ?? new Date()
    : null;

  if (
    completedAt?.getTime() !==
      subscription.completedAt?.getTime() ||
    (completedAt === null &&
      subscription.completedAt !== null)
  ) {
    await tx.subscription.update({
      where: {
        id: subscriptionId,
      },
      data: {
        completedAt,
      },
    });
  }

  return {
    completed,
    completedAt,
  };
}
