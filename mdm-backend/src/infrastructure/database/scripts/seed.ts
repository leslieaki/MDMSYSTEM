import { postgresPool } from "../PostgresConnection";

async function main(): Promise<void> {
  const result = await postgresPool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM parts) AS parts_count,
      (SELECT COUNT(*)::int FROM part_nomenclature) AS nomenclature_count,
      (SELECT COUNT(*)::int FROM purchases) AS purchases_count,
      (SELECT COUNT(*)::int FROM departments) AS departments_count,
      (SELECT COUNT(*)::int FROM employees) AS employees_count,
      (SELECT COUNT(*)::int FROM auth_users) AS users_count;
  `);

  console.log("current seed data state:", result.rows[0]);
  console.log("demo data is created by SQL migrations if tables are empty");

  await postgresPool.end();
}

main().catch((error) => {
  console.error("database seed failed");
  console.error(error);
  process.exit(1);
});
