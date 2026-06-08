import { postgresPool } from "../PostgresConnection";

async function main(): Promise<void> {
  await postgresPool.query("DROP SCHEMA IF EXISTS public CASCADE;");
  await postgresPool.query("CREATE SCHEMA public;");
  await postgresPool.query("GRANT ALL ON SCHEMA public TO public;");

  console.log("database schema reset completed");
  await postgresPool.end();
}

main().catch((error) => {
  console.error("database reset failed");
  console.error(error);
  process.exit(1);
});
