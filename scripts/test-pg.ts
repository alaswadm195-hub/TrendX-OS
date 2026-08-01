import "dotenv/config";
import { Client } from "pg";

async function main() {
  console.log(process.env.DATABASE_URL);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  const result = await client.query(
    "SELECT current_database(), current_user"
  );

  console.log(result.rows);

  await client.end();
}

main().catch(console.error);