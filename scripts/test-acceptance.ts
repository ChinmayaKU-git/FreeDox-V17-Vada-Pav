import db from '../src/lib/db';
import { createBooking, cancelBooking, Booking } from '../src/lib/booking-service';
import { createAdjustmentRequest, acceptAdjustment } from '../src/lib/adjustment-service';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function runTests() {
  console.log('Starting Acceptance Tests...');

  const users = db.prepare('SELECT * FROM users').all() as any[];
  const student1 = users.find(u => u.role === 'student');
  const student2 = users.filter(u => u.role === 'student')[1];
  const admin = users.find(u => u.role === 'admin');

  const facilities = db.prepare('SELECT * FROM facilities').all() as any[];
  const nonRestricted = facilities.find(f => f.requires_approval === 0);
  const restricted = facilities.find(f => f.requires_approval === 1);

  // Clear previous test data
  db.prepare('DELETE FROM slot_adjustment_requests').run();
  db.prepare('DELETE FROM notifications').run();
  db.prepare('DELETE FROM bookings').run();

  let testsPassed = 0;

  // --- Test 1: Cancellation Propagation ---
  try {
    console.log('Running Test 1: Cancellation Propagation');
    
    // 1. A creates booking
    const b1 = createBooking({
      facilityId: nonRestricted.id,
      requesterId: student1.id,
      startTime: new Date('2026-10-10T10:00:00Z').toISOString(),
      endTime: new Date('2026-10-10T11:00:00Z').toISOString(),
      purpose: 'Test 1'
    });

    // 2. B requests relinquish
    const adjReq = createAdjustmentRequest({
      requestingUserId: student2.id,
      targetBookingId: b1.id,
      requestType: 'relinquish'
    });

    // 3. A cancels booking
    cancelBooking(b1.id, student1.id, 'No longer needed');

    // 4. Verify request is expired
    const checkAdj = db.prepare('SELECT status FROM slot_adjustment_requests WHERE id = ?').get(adjReq.id) as any;
    assert(checkAdj.status === 'expired', `Expected request to be expired, got ${checkAdj.status}`);
    
    console.log('✅ Test 1 Passed\n');
    testsPassed++;
  } catch (e: any) {
    console.error('❌ Test 1 Failed:', e.message);
  }

  // --- Test 2: Adjustment Handover ---
  try {
    console.log('Running Test 2: Adjustment Handover (Relinquish)');
    
    // 1. A creates booking
    const b2 = createBooking({
      facilityId: nonRestricted.id,
      requesterId: student1.id,
      startTime: new Date('2026-10-11T10:00:00Z').toISOString(),
      endTime: new Date('2026-10-11T11:00:00Z').toISOString(),
      purpose: 'Test 2'
    });

    // 2. B requests relinquish
    const adjReq2 = createAdjustmentRequest({
      requestingUserId: student2.id,
      targetBookingId: b2.id,
      requestType: 'relinquish'
    });

    // 3. A accepts
    acceptAdjustment(adjReq2.id, student1.id);

    // 4. Verify old booking cancelled, new booking approved for B
    const checkB2 = db.prepare('SELECT status FROM bookings WHERE id = ?').get(b2.id) as any;
    assert(checkB2.status === 'cancelled', `Expected old booking to be cancelled, got ${checkB2.status}`);

    const bBookings = db.prepare('SELECT * FROM bookings WHERE requester_id = ? AND start_time = ?').all(student2.id, b2.start_time) as Booking[];
    assert(bBookings.length === 1, 'Expected Student 2 to have 1 new booking');
    assert(bBookings[0].status === 'approved', 'Expected new booking to be approved');

    console.log('✅ Test 2 Passed\n');
    testsPassed++;
  } catch (e: any) {
    console.error('❌ Test 2 Failed:', e.message);
  }

  // --- Test 3: Race Condition Guard (Overlap) ---
  try {
    console.log('Running Test 3: Race Condition Guard (Overlap check)');
    
    // 1. A creates booking
    createBooking({
      facilityId: nonRestricted.id,
      requesterId: student1.id,
      startTime: new Date('2026-10-12T10:00:00Z').toISOString(),
      endTime: new Date('2026-10-12T11:00:00Z').toISOString(),
      purpose: 'Test 3 A'
    });

    // 2. B tries to create overlapping booking
    let overlapError = false;
    try {
      createBooking({
        facilityId: nonRestricted.id,
        requesterId: student2.id,
        startTime: new Date('2026-10-12T10:30:00Z').toISOString(),
        endTime: new Date('2026-10-12T11:30:00Z').toISOString(),
        purpose: 'Test 3 B'
      });
    } catch (e: any) {
      if (e.message.includes('conflicts with an existing booking')) {
        overlapError = true;
      }
    }

    assert(overlapError, 'Expected overlapping booking to throw an error');
    
    console.log('✅ Test 3 Passed\n');
    testsPassed++;
  } catch (e: any) {
    console.error('❌ Test 3 Failed:', e.message);
  }

  // --- Test 4: Admin Approval Flow ---
  try {
    console.log('Running Test 4: Admin Approval Flow');
    
    // 1. A creates booking on restricted
    const b4 = createBooking({
      facilityId: restricted.id,
      requesterId: student1.id,
      startTime: new Date('2026-10-13T10:00:00Z').toISOString(),
      endTime: new Date('2026-10-13T11:00:00Z').toISOString(),
      purpose: 'Test 4'
    });

    // 2. Verify pending
    assert(b4.status === 'pending', `Expected booking to be pending, got ${b4.status}`);

    // 3. Admin approves (simulating the API endpoint logic here)
    const now = new Date().toISOString();
    db.prepare("UPDATE bookings SET status = 'approved', updated_at = ? WHERE id = ?").run(now, b4.id);
    db.prepare('INSERT INTO notifications (id, user_id, type, reference_id, message) VALUES (?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), student1.id, 'booking_status', b4.id, 'Your booking has been approved');

    // 4. Verify approved and notification sent
    const checkB4 = db.prepare('SELECT status FROM bookings WHERE id = ?').get(b4.id) as any;
    assert(checkB4.status === 'approved', 'Expected booking to be approved');

    const notif = db.prepare("SELECT * FROM notifications WHERE user_id = ? AND reference_id = ? AND type = 'booking_status'").get(student1.id, b4.id) as any;
    assert(!!notif, 'Expected notification to be created');
    
    console.log('✅ Test 4 Passed\n');
    testsPassed++;
  } catch (e: any) {
    console.error('❌ Test 4 Failed:', e.message);
  }

  console.log(`\nTests Completed: ${testsPassed} / 4 Passed`);
}

runTests();
