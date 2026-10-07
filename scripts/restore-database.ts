import "dotenv/config";

import {
  existsSync,
} from "node:fs";
import {
  resolve,
} from "node:path";
import {
  spawnSync,
} from "node:child_process";

const REQUIRED_CONFIRMATION =
  "RESTORE_TRENDX_DATABASE";

const REQUIRED_REMOTE_CONFIRMATION =
  "I_UNDERSTAND_THIS_WILL_REPLACE_REMOTE_DATA";

function commandExists(
  command: string,
) {
  const result =
    spawnSync(
      command,
      ["--version"],
      {
        stdio: "ignore",
        shell: false,
      },
    );

  return (
    result.status === 0
  );
}

function connection() {
  const raw =
    process.env.DATABASE_URL?.trim();

  if (!raw) {
    throw new Error(
      "DATABASE_URL is missing.",
    );
  }

  const url =
    new URL(raw);

  const host =
    url.hostname;

  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1";

  return {
    isLocal,
    env: {
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
    },
  };
}

function main() {
  if (
    process.env
      .DATABASE_RESTORE_CONFIRM !==
    REQUIRED_CONFIRMATION
  ) {
    throw new Error(
      `Restore blocked. Set DATABASE_RESTORE_CONFIRM=${REQUIRED_CONFIRMATION}.`,
    );
  }

  const backupFile =
    process.env.BACKUP_FILE?.trim();

  if (!backupFile) {
    throw new Error(
      "BACKUP_FILE is required.",
    );
  }

  const fullPath =
    resolve(
      process.cwd(),
      backupFile,
    );

  if (
    !existsSync(fullPath)
  ) {
    throw new Error(
      "BACKUP_FILE does not exist.",
    );
  }

  if (
    !commandExists(
      "pg_restore",
    )
  ) {
    throw new Error(
      "pg_restore was not found. Install PostgreSQL command-line tools and make sure pg_restore is available in PATH.",
    );
  }

  const {
    isLocal,
    env,
  } = connection();

  if (
    !isLocal &&
    process.env
      .DATABASE_RESTORE_REMOTE_CONFIRM !==
      REQUIRED_REMOTE_CONFIRMATION
  ) {
    throw new Error(
      `Remote restore blocked. Set DATABASE_RESTORE_REMOTE_CONFIRM=${REQUIRED_REMOTE_CONFIRMATION}.`,
    );
  }

  console.log(
    "WARNING: restoring a full database backup will replace current database objects/data.",
  );

  const result =
    spawnSync(
      "pg_restore",
      [
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        "--exit-on-error",
        fullPath,
      ],
      {
        env,
        stdio: "inherit",
        shell: false,
      },
    );

  if (
    result.status !== 0
  ) {
    throw new Error(
      "Database restore failed.",
    );
  }

  console.log(
    "\nTrendX database restore completed.",
  );
}

try {
  main();
} catch (error) {
  console.error(
    "\nRestore failed:",
    error instanceof Error
      ? error.message
      : error,
  );

  process.exitCode = 1;
}
