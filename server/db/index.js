import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/revision.db');
const schemaPath = path.join(__dirname, 'schema.sql');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run schema
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);

// Add auth columns (safe to re-run — catches "duplicate column" errors)
const alterStatements = [
  'ALTER TABLE profiles ADD COLUMN pin_hash TEXT',
  "ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'child'"
];
for (const sql of alterStatements) {
  try { db.exec(sql); } catch (e) {
    if (!e.message.includes('duplicate column')) throw e;
  }
}

export default db;
