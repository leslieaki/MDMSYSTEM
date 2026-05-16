import path from "node:path";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
  override: true
});

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://mdm_user:mdm_password_2026@127.0.0.1:5433/mdm_db";

export const postgresPool = new Pool({
  connectionString,
  max: 10
});