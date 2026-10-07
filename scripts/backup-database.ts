import "dotenv/config";

import {
  createHash,
} from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import {
  basename,
  dirname,
  join,
  resolve,
} from "node:path";
import {
  spawnSync,
} from "node:child_process";

function databaseEnv() {
  const raw =
    process.env.DATABASE_URL?.trim();

  if (!raw) {
    throw new Error(
      "DATABASE_URL is missing.",
    );
  }

  const url =
    new URL(raw);

  if (
    url.protocol !==
      "postgres:" &&
    url.protocol !==
      "postgresql:"
  ) {
    throw new Error(
      "DATABASE_URL must be a PostgreSQL URL.",
    );
  }

  const host =
    url.hostname;

  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1";

  return {
    ...process.env,
    PGHOST: host,
    PGPORT:
      url.port || "5432",
    PGUSER:
      decodeURIComponent(
        url.username,
      ),
    PGPASSWORD:
      decodeURIComponent(
        url.password,
      ),
    PGDATABASE:
      decodeURIComponent(
        url.pathname.replace(
          /^\//,
          "",
        ),
      ),
    PGSSLMODE:
      url.searchParams.get(
        "sslmode",
      ) ||
      (isLocal
        ? "prefer"
        : "require"),
    ...(url.searchParams.get(
      "channel_binding",
    )
      ? {
          PGCHANNELBINDING:
            url.searchParams.get(
              "channel_binding",
            )!,
        }
      : {}),
  };
}

function commandExists(
  command: string,
) {
  const probe =
    spawnSync(
      command,
      ["--version"],
      {
        stdio: "ignore",
        shell: false,
      },
    );

  return (
    probe.status === 0
  );
}

function timestamp() {
  const now =
    new Date();

  const pad = (
    value: number,
  ) =>
    String(value).padStart(
      2,
      "0",
    );

  return [
    now.getFullYear(),
    pad(
      now.getMonth() +
        1,
    ),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
}

function sha256(
  filePath: string,
) {
  const hash =
    createHash("sha256");

  hash.update(
    readFileSync(filePath),
  );

  return hash.digest(
    "hex",
  );
}

function main() {
  if (
    !commandExists(
      "pg_dump",
    )
  ) {
    throw new Error(
      "pg_dump was not found. Install PostgreSQL command-line tools and make sure pg_dump is available in PATH.",
    );
  }

  const env =
    databaseEnv();

  const backupRoot =
    resolve(
      process.cwd(),
      "backups",
      "automatic",
    );

  const now =
    new Date();

  const monthDir =
    join(
      backupRoot,
      `${now.getFullYear()}-${String(
        now.getMonth() + 1,
      ).padStart(2, "0")}`,
    );

  mkdirSync(
    monthDir,
    {
      recursive: true,
    },
  );

  const filePath =
    join(
      monthDir,
      `trendx-${timestamp()}.dump`,
    );

  const args = [
    "--format=custom",
    "--compress=9",
    "--no-owner",
    "--no-privileges",
    "--file",
    filePath,
  ];

  const result =
    spawnSync(
      "pg_dump",
      args,
      {
        env,
        stdio: [
          "ignore",
          "inherit",
          "inherit",
        ],
        shell: false,
      },
    );

  if (
    result.status !== 0
  ) {
    try {
      unlinkSync(filePath);
    } catch {}

    throw new Error(
      "Database backup failed.",
    );
  }

  const size =
    statSync(
      filePath,
    ).size;

  if (size <= 0) {
    unlinkSync(filePath);

    throw new Error(
      "Backup file is empty.",
    );
  }

  const checksum =
    sha256(filePath);

  const manifest = {
    createdAt:
      new Date().toISOString(),
    file:
      basename(filePath),
    bytes: size,
    sha256:
      checksum,
    format:
      "PostgreSQL custom",
  };

  const manifestPath =
    `${filePath}.json`;

  writeFileSync(
    manifestPath,
    JSON.stringify(
      manifest,
      null,
      2,
    ),
    "utf8",
  );

  console.log(
    "\nTrendX database backup completed.",
  );

  console.log(
    `Backup: ${filePath}`,
  );

  console.log(
    `Manifest: ${manifestPath}`,
  );

  console.log(
    `Size: ${size.toLocaleString()} bytes`,
  );

  console.log(
    `SHA-256: ${checksum}`,
  );
}

try {
  main();
} catch (error) {
  console.error(
    "\nBackup failed:",
    error instanceof Error
      ? error.message
      : error,
  );

  process.exitCode = 1;
}
