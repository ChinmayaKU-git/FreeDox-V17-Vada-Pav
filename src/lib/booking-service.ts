import db from './db';
import crypto from 'crypto';

export interface BookingInput {
  facilityId: string;
  requesterId: string;
  startTime: string;
  endTime: string;
  purpose?: string;
  attendeeCount?: number;
}

export interface Booking {
  id: string;
  facility_id: string;
  requester_id: string;
  start_time: string;
  end_time: string;
  purpose: string | null;
  attendee_count: number | null;
  status: string;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Check for overlapping APPROVED or PENDING bookings on the same facility.
 * Returns the conflicting booking if any.
 */
export function checkOverlap(
  facilityId: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Booking | null {
  let sql = `
    SELECT * FROM bookings
    WHERE facility_id = ?
      AND status IN ('approved', 'pending')
      AND start_time < ?
      AND end_time > ?
  `;
  const params: (string)[] = [facilityId, endTime, startTime];

  if (excludeBookingId) {
    sql += ' AND id != ?';
    params.push(excludeBookingId);
  }

  sql += ' LIMIT 1';

  return db.prepare(sql).get(...params) as Booking | null;
}

/**
 * Create a new booking. Auto-approves for non-restricted facilities.
 * Returns the new booking or throws on overlap.
 */
export function createBooking(input: BookingInput): Booking {
  const { facilityId, requesterId, startTime, endTime, purpose, attendeeCount } = input;

  // Validate times
  if (new Date(endTime) <= new Date(startTime)) {
    throw new Error('End time must be after start time');
  }

  // Transaction: check overlap + insert
  const txn = db.transaction(() => {
    // App-layer overlap check
    const conflict = checkOverlap(facilityId, startTime, endTime);
    if (conflict) {
      throw new Error(`Time slot conflicts with an existing booking (${conflict.id})`);
    }

    // Determine auto-approve
    const facility = db.prepare('SELECT requires_approval FROM facilities WHERE id = ?').get(facilityId) as { requires_approval: number } | undefined;
    if (!facility) {
      throw new Error('Facility not found');
    }

    const status = facility.requires_approval ? 'pending' : 'approved';
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO bookings (id, facility_id, requester_id, start_time, end_time, purpose, attendee_count, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, facilityId, requesterId, startTime, endTime, purpose || null, attendeeCount || null, status);

    // Create notification
    if (status === 'pending') {
      // Notify admins
      const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all() as { id: string }[];
      const insertNotif = db.prepare(
        'INSERT INTO notifications (id, user_id, type, reference_id, message) VALUES (?, ?, ?, ?, ?)'
      );
      for (const admin of admins) {
        insertNotif.run(crypto.randomUUID(), admin.id, 'booking_status', id, `New booking request requires your approval`);
      }
    }

    return db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as Booking;
  });

  return txn();
}

/**
 * Cancel a booking. Requires a reason. 
 * Expires all pending adjustment requests targeting this booking.
 */
export function cancelBooking(bookingId: string, userId: string, reason: string): Booking {
  const txn = db.transaction(() => {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as Booking | undefined;
    if (!booking) throw new Error('Booking not found');
    if (booking.requester_id !== userId) throw new Error('You can only cancel your own bookings');
    if (booking.status === 'cancelled') throw new Error('Booking is already cancelled');
    if (booking.status === 'rejected') throw new Error('Cannot cancel a rejected booking');

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE bookings SET status = 'cancelled', cancellation_reason = ?, cancelled_at = ?, updated_at = ?
      WHERE id = ?
    `).run(reason, now, now, bookingId);

    // Expire all pending adjustment requests targeting this booking
    const pendingAdj = db.prepare(
      "SELECT * FROM slot_adjustment_requests WHERE target_booking_id = ? AND status = 'pending'"
    ).all(bookingId) as { id: string; requesting_user_id: string }[];

    for (const adj of pendingAdj) {
      db.prepare("UPDATE slot_adjustment_requests SET status = 'expired', responded_at = ? WHERE id = ?")
        .run(now, adj.id);
      // Notify the requester
      db.prepare(
        'INSERT INTO notifications (id, user_id, type, reference_id, message) VALUES (?, ?, ?, ?, ?)'
      ).run(crypto.randomUUID(), adj.requesting_user_id, 'adjustment_response', adj.id,
        'The booking you requested adjustment for has been cancelled by its owner');
    }

    return db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as Booking;
  });

  return txn();
}

/**
 * Get bookings for a facility within a date range.
 */
export function getFacilityBookings(facilityId: string, start?: string, end?: string) {
  let sql = 'SELECT b.*, u.name as requester_name FROM bookings b JOIN users u ON b.requester_id = u.id WHERE b.facility_id = ?';
  const params: string[] = [facilityId];

  if (start) {
    sql += ' AND b.end_time > ?';
    params.push(start);
  }
  if (end) {
    sql += ' AND b.start_time < ?';
    params.push(end);
  }

  sql += ' ORDER BY b.start_time';
  return db.prepare(sql).all(...params);
}

/**
 * Get all bookings for a user.
 */
export function getUserBookings(userId: string) {
  return db.prepare(`
    SELECT b.*, f.name as facility_name, f.category as facility_category, f.location as facility_location
    FROM bookings b
    JOIN facilities f ON b.facility_id = f.id
    WHERE b.requester_id = ?
    ORDER BY b.start_time DESC
  `).all(userId);
}
