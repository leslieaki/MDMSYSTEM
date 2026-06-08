import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { postgresPool } from "../PostgresConnection";

async function main(): Promise<void> {
  const migrationsDirectory = path.resolve(process.cwd(), "database", "migrations");
  const client = await postgresPool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const migrationFiles = (await readdir(migrationsDirectory))
      .filter((fileName) => fileName.endsWith(".sql"))
      .sort();

    for (const fileName of migrationFiles) {
      const appliedResult = await client.query(
        "SELECT 1 FROM schema_migrations WHERE file_name = $1",
        [fileName]
      );

      if ((appliedResult.rowCount ?? 0) > 0) {
        console.log(`skip ${fileName}`);
        continue;
      }

      const migrationPath = path.join(migrationsDirectory, fileName);
      const migrationSql = await readFile(migrationPath, "utf8");

      console.log(`apply ${fileName}`);

      await client.query("BEGIN");
      await client.query(migrationSql);
      await client.query(
        "INSERT INTO schema_migrations (file_name) VALUES ($1)",
        [fileName]
      );
      await client.query("COMMIT");
    }

    console.log("database migrations completed");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await postgresPool.end();
  }
}

main().catch((error) => {
  console.error("database migration failed");
  console.error(error);
  process.exit(1);
});
