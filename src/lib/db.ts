import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

let instance: Database.Database | null = null;

/** Shared SQLite connection. The schema is applied on first use. */
export function db(): Database.Database {
  if (instance) return instance;

  const file = process.env.SPRINTS_DB_PATH ?? path.join(process.cwd(), "data", "sprints.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const conn = new Database(file);
  conn.pragma("journal_mode = WAL");
  conn.pragma("foreign_keys = ON");
  conn.exec(fs.readFileSync(path.join(process.cwd(), "src", "lib", "schema.sql"), "utf8"));

  instance = conn;
  return conn;
}
