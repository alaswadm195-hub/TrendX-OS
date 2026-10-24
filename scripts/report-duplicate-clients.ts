/**
 * Read-only report of possibly duplicated active clients by normalized phone.
 * Does not update, archive or merge any records.
 *
 * Run from the project directory:
 *   ./node_modules/.bin/tsx scripts/report-duplicate-clients.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { normalizeClientPhone } from "../src/lib/client-phone";

async function main() {
  const clients = await prisma.client.findMany({
    where: { archivedAt: null },
    select: {
      id: true,
      name: true,
      phone: true,
      createdAt: true,
      _count: {
        select: {
          appointments: true,
          invoices: true,
          subscriptions: true,
          tasks: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const groups = new Map<string, typeof clients>();
  for (const client of clients) {
    const phone = normalizeClientPhone(client.phone);
    if (phone.length < 8) continue;
    const entries = groups.get(phone) ?? [];
    entries.push(client);
    groups.set(phone, entries);
  }

  let duplicatedGroups = 0;
  for (const [phone, entries] of groups) {
    if (entries.length < 2) continue;
    duplicatedGroups++;
    console.log(`\nPhone identity: ${phone} (${entries.length} active records)`);
    for (const client of entries) {
      console.log(
        JSON.stringify({
          id: client.id,
          name: client.name,
          storedPhone: client.phone,
          createdAt: client.createdAt.toISOString(),
          linkedRecords: client._count,
        }),
      );
    }
  }
  console.log(`\nPotential duplicate groups: ${duplicatedGroups}`);
  console.log("READ ONLY: no data was modified.");
}

main()
  .catch((error) => {
    console.error("Duplicate-client report failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
