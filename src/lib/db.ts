import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'booking.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const globalForDb = global as unknown as { db: Database.Database };

function createDb(): Database.Database {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  
  // Initialize schema
  initSchema(db);
  
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('student','faculty','admin')),
      department TEXT,
      institution TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS facilities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      location TEXT,
      requires_approval INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      facility_id TEXT NOT NULL REFERENCES facilities(id),
      requester_id TEXT NOT NULL REFERENCES users(id),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      purpose TEXT,
      attendee_count INTEGER,
      status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected','cancelled')) DEFAULT 'pending',
      cancellation_reason TEXT,
      cancelled_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      CHECK (end_time > start_time)
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_facility_status ON bookings(facility_id, status);
    CREATE INDEX IF NOT EXISTS idx_bookings_requester ON bookings(requester_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_time ON bookings(start_time, end_time);

    CREATE TABLE IF NOT EXISTS slot_adjustment_requests (
      id TEXT PRIMARY KEY,
      requesting_user_id TEXT NOT NULL REFERENCES users(id),
      target_booking_id TEXT NOT NULL REFERENCES bookings(id),
      request_type TEXT NOT NULL CHECK (request_type IN ('swap','relinquish')),
      proposed_alternative_start TEXT,
      proposed_alternative_end TEXT,
      message TEXT,
      status TEXT NOT NULL CHECK (status IN ('pending','accepted','declined','expired')) DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      responded_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_adjustments_target ON slot_adjustment_requests(target_booking_id);
    CREATE INDEX IF NOT EXISTS idx_adjustments_requesting ON slot_adjustment_requests(requesting_user_id);

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      reference_id TEXT,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
  `);
}

export const db = globalForDb.db || createDb();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db;
}

export default db;
