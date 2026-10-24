/**
 * Safely consolidate duplicate active Client records without deleting
 * invoices, payments, subscriptions, appointments, or tasks.
 *
 * Preview (read-only):
 *   npx tsx scripts/merge-duplicate-clients.ts --phone=01011775293
 *
 * Apply one reviewed phone only:
 *   npx tsx scripts/merge-duplicate-clients.ts --phone=01011775293 --apply
 *
 * The script requires matching client names as well as normalized phones,
 * preserves archived original Client rows, and writes an audit event.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { normalizeClientPhone } from "../src/lib/client-phone";

const args = process.argv.slice(2);
const phoneArg = args.find((arg) => arg.startsWith("--phone="));
const apply = args.includes("--apply");

if (!phoneArg) {
  throw new Error("Specify exactly one phone: --phone=01XXXXXXXXX");
}
if (args.some((arg) => arg !== phoneArg && arg !== "--apply")) {
  throw new Error("Unexpected argument. Use --phone=... and optionally --apply");
}
const targetPhone = normalizeClientPhone(phoneArg.slice("--phone=".length));
if (!/^01[0125]\d{8}$/.test(targetPhone)) {
  throw new Error("Expected a valid Egyptian mobile number.");
}

const normalizeName = (name: string) =>
  name.trim().replace(/\s+/g, " ").toLocaleLowerCase();

const selection = {
  id: true,
  name: true,
  phone: true,
  createdAt: true,
  archivedAt: true,
  _count: {
    select: {
      appointments: true,
      invoices: true,
      subscriptions: true,
      tasks: true,
    },
  },
} as const;

async function main() {
  const clients = await prisma.client.findMany({
    where: { archivedAt: null, phone: { not: null } },
    select: selection,
    orderBy: { createdAt: "asc" },
  });

  const duplicates = clients.filter(
    (client) => normalizeClientPhone(client.phone) === targetPhone,
  );

  if (duplicates.length < 2) {
    console.log("Nothing to merge: fewer than two active records.");
    return;
  }

  if (new Set(duplicates.map((client) => normalizeName(client.name))).size !== 1) {
    throw new Error(
      "STOP: Multiple customer names share this phone. Review manually; no changes made.",
    );
  }

  const score = (client: (typeof duplicates)[number]) =>
    client._count.appointments +
    client._count.invoices +
    client._count.subscriptions +
    client._count.tasks;

  // Prefer the row carrying the most business history, then the oldest row.
  const ordered = [...duplicates].sort(
    (a, b) =>
      score(b) - score(a) ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const primary = ordered[0];
  const redundant = ordered.slice(1);
  const redundantIds = redundant.map((client) => client.id);

  console.log("PHONE:", targetPhone);
  console.log("PRIMARY:", primary.id, primary.name);
  for (const client of redundant) {
    console.log(
      "ARCHIVE:", client.id, client.name,
      "linked:", JSON.stringify(client._count),
    );
  }
  console.log(
    "All original invoices, invoice payments, appointments, tasks and " +
    "subscriptions will remain. Only Client relations are repointed; " +
    "redundant Client rows will be archived.",
  );

  if (!apply) {
    console.log("DRY RUN ONLY. No data changed.");
    return;
  }

  const result = await prisma.$transaction(
    async (tx) => {
      // Re-read the exact group inside the transaction before any writes.
      const freshClients = await tx.client.findMany({
        where: { id: { in: duplicates.map((client) => client.id) }, archivedAt: null },
        select: selection,
      });

      if (
        freshClients.length !== duplicates.length ||
        freshClients.some(
          (client) =>
            normalizeClientPhone(client.phone) !== targetPhone ||
            normalizeName(client.name) !== normalizeName(primary.name),
        )
      ) {
        throw new Error("Clients changed since preview; transaction aborted.");
      }

      const movedAppointments = await tx.appointment.updateMany({
        where: { clientId: { in: redundantIds } },
        data: { clientId: primary.id },
      });
      const movedInvoices = await tx.invoice.updateMany({
        where: { clientId: { in: redundantIds } },
        data: { clientId: primary.id },
      });
      const movedSubscriptions = await tx.subscription.updateMany({
        where: { clientId: { in: redundantIds } },
        data: { clientId: primary.id },
      });
      const movedTasks = await tx.task.updateMany({
        where: { clientId: { in: redundantIds } },
        data: { clientId: primary.id },
      });

      const [orphanAppointments, orphanInvoices, orphanSubscriptions, orphanTasks] =
        await Promise.all([
          tx.appointment.count({ where: { clientId: { in: redundantIds } } }),
          tx.invoice.count({ where: { clientId: { in: redundantIds } } }),
          tx.subscription.count({ where: { clientId: { in: redundantIds } } }),
          tx.task.count({ where: { clientId: { in: redundantIds } } }),
        ]);

      if (
        orphanAppointments + orphanInvoices + orphanSubscriptions + orphanTasks !== 0
      ) {
        throw new Error("Some relations were not migrated; transaction aborted.");
      }

      const archived = await tx.client.updateMany({
        where: { id: { in: redundantIds }, archivedAt: null },
        data: { archivedAt: new Date() },
      });

      if (archived.count !== redundantIds.length) {
        throw new Error("Not every redundant client was archived; transaction aborted.");
      }

      const counts = {
        appointments: movedAppointments.count,
        invoices: movedInvoices.count,
        subscriptions: movedSubscriptions.count,
        tasks: movedTasks.count,
      };

      await tx.auditLog.create({
        data: {
          action: "CLIENT_DUPLICATE_MERGE",
          entityType: "Client",
          entityId: primary.id,
          metadata: {
            source: "ADMIN_MERGE_SCRIPT",
            sourceClientIds: redundantIds,
            moved: counts,
            archivedCount: archived.count,
          },
        },
      });

      return { counts, archivedCount: archived.count };
    },
    { timeout: 30000 },
  );

  console.log("APPLIED:", JSON.stringify(result));
  console.log("Primary client:", primary.id);
  console.log("Redundant clients archived; no financial records deleted.");
}

main()
  .catch((error) => {
    console.error("Merge stopped:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
