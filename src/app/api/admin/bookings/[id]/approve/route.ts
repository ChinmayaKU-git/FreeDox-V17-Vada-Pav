import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createNotification } from '@/lib/notification-service';
import db from '@/lib/db';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const txn = db.transaction(() => {
      const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as { requester_id: string, status: string } | undefined;
      if (!booking) throw new Error('Booking not found');
      if (booking.status !== 'pending') throw new Error('Booking is not pending');

      const now = new Date().toISOString();
      db.prepare(`
        UPDATE bookings SET status = 'approved', updated_at = ? WHERE id = ?
      `).run(now, id);

      createNotification(
        booking.requester_id,
        'booking_status',
        id,
        'Your booking has been approved by an admin.'
      );

      return db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    });

    const approvedBooking = txn();
    return NextResponse.json(approvedBooking);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
