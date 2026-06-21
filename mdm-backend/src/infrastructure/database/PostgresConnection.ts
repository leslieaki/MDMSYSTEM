import path from "node:path";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

export const postgresPool = new Pool({
  connectionString: getRequiredEnv("DATABASE_URL"),
  max: 10,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
});