import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const [, , dbPathArg, sqlPathArg] = process.argv;

if (!dbPathArg || !sqlPathArg) {
  console.error("Usage: node scripts/create-local-sqlite-db.mjs <db-path> <sql-path>");
  process.exit(1);
}

const dbPath = resolve(dbPathArg);
const sqlPath = resolve(sqlPathArg);

mkdirSync(dirname(dbPath), { recursive: true });
if (existsSync(dbPath)) {
  rmSync(dbPath);
}

const sql = readFileSync(sqlPath, "utf8");
const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON;");
db.exec(sql);
db.close();

console.log(`Created ${dbPath}`);
