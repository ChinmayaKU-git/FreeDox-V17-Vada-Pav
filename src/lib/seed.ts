/**
 * Seed script for the Facility & Resource Booking System.
 * Run with: npx tsx src/lib/seed.ts
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'booking.db');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Delete existing DB for clean seed
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ──────────────────────────────────────────────────────────
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

// ─── Seed Users ──────────────────────────────────────────────────────
const users = [
  { id: 'user-alice',   name: 'Alice Johnson',   email: 'alice@university.edu',   role: 'student',  department: 'Computer Science', institution: 'State University' },
  { id: 'user-bob',     name: 'Bob Williams',     email: 'bob@university.edu',     role: 'student',  department: 'Mechanical Eng',   institution: 'State University' },
  { id: 'user-carol',   name: 'Dr. Carol Davis',  email: 'carol@university.edu',   role: 'faculty',  department: 'Computer Science', institution: 'State University' },
  { id: 'user-dan',     name: 'Prof. Dan Miller', email: 'dan@university.edu',     role: 'faculty',  department: 'Physics',          institution: 'State University' },
  { id: 'user-admin',   name: 'Eve Admin',        email: 'admin@university.edu',   role: 'admin',    department: 'Administration',   institution: 'State University' },
];

const insertUser = db.prepare(
  'INSERT INTO users (id, name, email, role, department, institution) VALUES (?, ?, ?, ?, ?, ?)'
);
for (const u of users) {
  insertUser.run(u.id, u.name, u.email, u.role, u.department, u.institution);
}

// ─── Seed Facilities ─────────────────────────────────────────────────
const facilities = [
  { id: 'fac-seminar-a',   name: 'Seminar Hall A',               category: 'Seminar Hall',     capacity: 120, location: 'Building A, Floor 2',   requires_approval: 1 },
  { id: 'fac-makerspace',  name: 'Maker Space – 3D Printer Bay', category: 'Maker Space',      capacity: 15,  location: 'Innovation Hub, Room 101', requires_approval: 0 },
  { id: 'fac-conf-2b',     name: 'Conference Room 2B',           category: 'Conference Room',   capacity: 20,  location: 'Admin Block, Floor 1',  requires_approval: 0 },
];

const insertFacility = db.prepare(
  'INSERT INTO facilities (id, name, category, capacity, location, requires_approval) VALUES (?, ?, ?, ?, ?, ?)'
);
for (const f of facilities) {
  insertFacility.run(f.id, f.name, f.category, f.capacity, f.location, f.requires_approval);
}

// ─── Helper: generate dates relative to today ─────────────────────
function futureDate(daysOffset: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function pastDate(daysOffset: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysOffset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

// ─── Seed Bookings ───────────────────────────────────────────────────
const insertBooking = db.prepare(
  `INSERT INTO bookings (id, facility_id, requester_id, start_time, end_time, purpose, attendee_count, status, cancellation_reason, cancelled_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

// 1. Cancelled booking (past) — for audit trail / analytics
insertBooking.run(
  'booking-cancelled',
  'fac-conf-2b',
  'user-carol',
  pastDate(3, 10),
  pastDate(3, 12),
  'Department Meeting',
  12,
  'cancelled',
  'Meeting moved to online format due to scheduling conflicts',
  pastDate(3, 8)
);

// 2. Approved upcoming booking — prime time (target for adjustment requests)
insertBooking.run(
  'booking-prime',
  'fac-conf-2b',
  'user-bob',
  futureDate(3, 14),  // Wednesday 2 PM
  futureDate(3, 16),  // Wednesday 4 PM
  'Robotics Club Weekly Meeting',
  15,
  'approved',
  null,
  null
);

// 3. Pending booking awaiting admin approval (on requires_approval facility)
insertBooking.run(
  'booking-pending',
  'fac-seminar-a',
  'user-alice',
  futureDate(5, 9),
  futureDate(5, 12),
  'Annual CS Department Symposium',
  80,
  'pending',
  null,
  null
);

// 4. Another approved booking (maker space)
insertBooking.run(
  'booking-maker',
  'fac-makerspace',
  'user-dan',
  futureDate(1, 10),
  futureDate(1, 13),
  'Physics Lab Prototyping Session',
  8,
  'approved',
  null,
  null
);

// 5. Past completed booking (for analytics)
insertBooking.run(
  'booking-past-ok',
  'fac-seminar-a',
  'user-carol',
  pastDate(7, 14),
  pastDate(7, 17),
  'Faculty Development Workshop',
  45,
  'approved',
  null,
  null
);

// ─── Seed Slot Adjustment Request ────────────────────────────────────
const insertAdjustment = db.prepare(
  `INSERT INTO slot_adjustment_requests (id, requesting_user_id, target_booking_id, request_type, proposed_alternative_start, proposed_alternative_end, message, status)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);

// Alice → Bob's prime booking, requesting relinquish
insertAdjustment.run(
  'adj-alice-bob',
  'user-alice',
  'booking-prime',
  'relinquish',
  null,
  null,
  'Hi Bob, I need the conference room for an important client demo on Wednesday afternoon. Would you be able to move your Robotics Club meeting? I can help find an alternative slot!',
  'pending'
);

// ─── Seed Notifications ──────────────────────────────────────────────
const insertNotification = db.prepare(
  `INSERT INTO notifications (id, user_id, type, reference_id, message, is_read)
   VALUES (?, ?, ?, ?, ?, ?)`
);

// Notify Bob about the adjustment request
insertNotification.run(
  'notif-bob-adj',
  'user-bob',
  'adjustment_request',
  'adj-alice-bob',
  'Alice Johnson has requested to relinquish your booking "Robotics Club Weekly Meeting" on Conference Room 2B',
  0
);

// Notify Alice about her pending booking
insertNotification.run(
  'notif-alice-pending',
  'user-alice',
  'booking_status',
  'booking-pending',
  'Your booking for Seminar Hall A is pending admin approval',
  0
);

// Notify admin about pending booking
insertNotification.run(
  'notif-admin-pending',
  'user-admin',
  'booking_status',
  'booking-pending',
  'New booking request for Seminar Hall A requires your approval',
  0
);

db.close();
console.log('✅ Database seeded successfully at:', dbPath);
console.log('   Users:', users.length);
console.log('   Facilities:', facilities.length);
console.log('   Bookings: 5 (1 cancelled, 1 prime approved, 1 pending, 1 maker, 1 past)');
console.log('   Adjustment Requests: 1 (Alice → Bob relinquish)');
console.log('   Notifications: 3');
