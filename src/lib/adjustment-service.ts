import db from './db';
import crypto from 'crypto';
import { checkOverlap } from './booking-service';

export interface AdjustmentRequestInput {
  requestingUserId: string;
  targetBookingId: string;
  requestType: 'swap' | 'relinquish';
  proposedAlternativeStart?: string;
  proposedAlternativeEnd?: string;
  message?: string;
}

export interface AdjustmentRequest {
  id: string;
  requesting_user_id: string;
  target_booking_id: string;
  request_type: string;
  proposed_alternative_start: string | null;
  proposed_alternative_end: string | null;
  message: string | null;
  status: string;
  created_at: string;
  responded_at: string | null;
}

/**
 * Create a new slot adjustment request (swap or relinquish).
 */
export function createAdjustmentRequest(input: AdjustmentRequestInput): AdjustmentRequest {
  const { requestingUserId, targetBookingId, requestType, proposedAlternativeStart, proposedAlternativeEnd, message } = input;

  // Validate swap has proposed times
  if (requestType === 'swap') {
    if (!proposedAlternativeStart || !proposedAlternativeEnd) {
      throw new Error('Swap requests must include proposed alternative times');
    }
    if (new Date(proposedAlternativeEnd) <= new Date(proposedAlternativeStart)) {
      throw new Error('Proposed alternative end time must be after start time');
    }
  }

  const txn = db.transaction(() => {
    // Verify target booking exists and is approved
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(targetBookingId) as { id: string; requester_id: string; status: string; facility_id: string } | undefined;
    if (!booking) throw new Error('Target booking not found');
    if (booking.status !== 'approved') throw new Error('Can only request adjustments for approved bookings');
    if (booking.requester_id === requestingUserId) throw new Error('Cannot request adjustment on your own booking');

    // Check for duplicate pending request from same user on same booking
    const existing = db.prepare(
      "SELECT id FROM slot_adjustment_requests WHERE requesting_user_id = ? AND target_booking_id = ? AND status = 'pending'"
    ).get(requestingUserId, targetBookingId);
    if (existing) throw new Error('You already have a pending adjustment request for this booking');

    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO slot_adjustment_requests (id, requesting_user_id, target_booking_id, request_type, proposed_alternative_start, proposed_alternative_end, message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, requestingUserId, targetBookingId, requestType, proposedAlternativeStart || null, proposedAlternativeEnd || null, message || null);

    // Notify the booking owner
    const requester = db.prepare('SELECT name FROM users WHERE id = ?').get(requestingUserId) as { name: string };
    db.prepare(
      'INSERT INTO notifications (id, user_id, type, reference_id, message) VALUES (?, ?, ?, ?, ?)'
    ).run(crypto.randomUUID(), booking.requester_id, 'adjustment_request', id,
      `${requester.name} has requested to ${requestType} your booking`);

    return db.prepare('SELECT * FROM slot_adjustment_requests WHERE id = ?').get(id) as AdjustmentRequest;
  });

  return txn();
}

/**
 * Accept an adjustment request.
 * 
 * CRITICAL ATOMIC TRANSACTION:
 * 1. Re-validate the adjustment request is still 'pending'
 * 2. Re-validate the target booking is still 'approved'
 * 3. For RELINQUISH: cancel original booking + create new approved booking for requester
 * 4. For SWAP: update both bookings' time slots
 * 5. Expire all other pending adjustment requests on the same booking
 * 6. Create notifications
 */
export function acceptAdjustment(adjustmentId: string, currentUserId: string) {
  const txn = db.transaction(() => {
    const now = new Date().toISOString();

    // Step 1: Re-validate adjustment request
    const adjReq = db.prepare('SELECT * FROM slot_adjustment_requests WHERE id = ?').get(adjustmentId) as AdjustmentRequest | undefined;
    if (!adjReq) throw new Error('Adjustment request not found');
    if (adjReq.status !== 'pending') throw new Error('This adjustment request has already been handled');

    // Step 2: Re-validate target booking
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(adjReq.target_booking_id) as {
      id: string; facility_id: string; requester_id: string; start_time: string; end_time: string;
      purpose: string; attendee_count: number; status: string;
    } | undefined;
    if (!booking) throw new Error('Target booking no longer exists');
    if (booking.status !== 'approved') throw new Error('This booking is no longer active — the slot was already handled');
    if (booking.requester_id !== currentUserId) throw new Error('Only the booking owner can accept adjustment requests');

    if (adjReq.request_type === 'relinquish') {
      // Step 3a: RELINQUISH — Cancel original, create new for requester
      db.prepare(`
        UPDATE bookings SET status = 'cancelled', cancellation_reason = 'Relinquished to another user via adjustment request',
        cancelled_at = ?, updated_at = ? WHERE id = ?
      `).run(now, now, booking.id);

      // Create new approved booking for the requester with the same slot
      const newBookingId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO bookings (id, facility_id, requester_id, start_time, end_time, purpose, attendee_count, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?)
      `).run(newBookingId, booking.facility_id, adjReq.requesting_user_id,
        booking.start_time, booking.end_time,
        booking.purpose, booking.attendee_count, now, now);

    } else if (adjReq.request_type === 'swap') {
      // Step 3b: SWAP — Update both sides
      if (!adjReq.proposed_alternative_start || !adjReq.proposed_alternative_end) {
        throw new Error('Swap request is missing proposed alternative times');
      }

      // Check overlap for the requester's proposed slot on the same facility
      const conflict = checkOverlap(booking.facility_id, adjReq.proposed_alternative_start, adjReq.proposed_alternative_end, booking.id);
      if (conflict) {
        throw new Error('The proposed alternative slot conflicts with an existing booking');
      }

      // Move the original booking to the proposed alternative slot
      db.prepare(`
        UPDATE bookings SET start_time = ?, end_time = ?, updated_at = ? WHERE id = ?
      `).run(adjReq.proposed_alternative_start, adjReq.proposed_alternative_end, now, booking.id);

      // Create a new booking for the requester in the original slot
      const newBookingId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO bookings (id, facility_id, requester_id, start_time, end_time, purpose, attendee_count, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?)
      `).run(newBookingId, booking.facility_id, adjReq.requesting_user_id,
        booking.start_time, booking.end_time,
        booking.purpose, booking.attendee_count, now, now);
    }

    // Step 5: Mark this request as accepted
    db.prepare("UPDATE slot_adjustment_requests SET status = 'accepted', responded_at = ? WHERE id = ?")
      .run(now, adjustmentId);

    // Step 6: Expire ALL OTHER pending adjustment requests targeting the same booking
    const otherPending = db.prepare(
      "SELECT * FROM slot_adjustment_requests WHERE target_booking_id = ? AND id != ? AND status = 'pending'"
    ).all(adjReq.target_booking_id, adjustmentId) as AdjustmentRequest[];

    for (const other of otherPending) {
      db.prepare("UPDATE slot_adjustment_requests SET status = 'expired', responded_at = ? WHERE id = ?")
        .run(now, other.id);
      // Notify the other requesters
      db.prepare(
        'INSERT INTO notifications (id, user_id, type, reference_id, message) VALUES (?, ?, ?, ?, ?)'
      ).run(crypto.randomUUID(), other.requesting_user_id, 'adjustment_response', other.id,
        'Your adjustment request has expired because the booking was already handled');
    }

    // Step 7: Notify the requester about acceptance
    const owner = db.prepare('SELECT name FROM users WHERE id = ?').get(currentUserId) as { name: string };
    db.prepare(
      'INSERT INTO notifications (id, user_id, type, reference_id, message) VALUES (?, ?, ?, ?, ?)'
    ).run(crypto.randomUUID(), adjReq.requesting_user_id, 'adjustment_response', adjustmentId,
      `${owner.name} has accepted your ${adjReq.request_type} request!`);

    return { success: true };
  });

  return txn();
}

/**
 * Decline an adjustment request.
 */
export function declineAdjustment(adjustmentId: string, currentUserId: string) {
  const txn = db.transaction(() => {
    const now = new Date().toISOString();

    const adjReq = db.prepare('SELECT * FROM slot_adjustment_requests WHERE id = ?').get(adjustmentId) as AdjustmentRequest | undefined;
    if (!adjReq) throw new Error('Adjustment request not found');
    if (adjReq.status !== 'pending') throw new Error('This adjustment request has already been handled');

    // Verify the current user owns the target booking
    const booking = db.prepare('SELECT requester_id FROM bookings WHERE id = ?').get(adjReq.target_booking_id) as { requester_id: string } | undefined;
    if (!booking || booking.requester_id !== currentUserId) throw new Error('Only the booking owner can decline adjustment requests');

    db.prepare("UPDATE slot_adjustment_requests SET status = 'declined', responded_at = ? WHERE id = ?")
      .run(now, adjustmentId);

    // Notify the requester
    const owner = db.prepare('SELECT name FROM users WHERE id = ?').get(currentUserId) as { name: string };
    db.prepare(
      'INSERT INTO notifications (id, user_id, type, reference_id, message) VALUES (?, ?, ?, ?, ?)'
    ).run(crypto.randomUUID(), adjReq.requesting_user_id, 'adjustment_response', adjustmentId,
      `${owner.name} has declined your ${adjReq.request_type} request`);

    return { success: true };
  });

  return txn();
}

/**
 * Get incoming adjustment requests for a user (requests targeting their bookings).
 */
export function getIncomingAdjustments(userId: string) {
  return db.prepare(`
    SELECT sar.*, 
           u.name as requester_name, u.email as requester_email,
           b.start_time as booking_start, b.end_time as booking_end, b.purpose as booking_purpose,
           f.name as facility_name
    FROM slot_adjustment_requests sar
    JOIN bookings b ON sar.target_booking_id = b.id
    JOIN users u ON sar.requesting_user_id = u.id
    JOIN facilities f ON b.facility_id = f.id
    WHERE b.requester_id = ?
    ORDER BY sar.created_at DESC
  `).all(userId);
}

/**
 * Get outgoing adjustment requests sent by a user.
 */
export function getOutgoingAdjustments(userId: string) {
  return db.prepare(`
    SELECT sar.*,
           u.name as owner_name,
           b.start_time as booking_start, b.end_time as booking_end, b.purpose as booking_purpose,
           f.name as facility_name
    FROM slot_adjustment_requests sar
    JOIN bookings b ON sar.target_booking_id = b.id
    JOIN users u ON b.requester_id = u.id
    JOIN facilities f ON b.facility_id = f.id
    WHERE sar.requesting_user_id = ?
    ORDER BY sar.created_at DESC
  `).all(userId);
}
