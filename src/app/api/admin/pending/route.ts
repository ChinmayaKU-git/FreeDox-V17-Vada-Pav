import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pendingBookings = db.prepare(`
      SELECT b.*, u.name as requester_name, f.name as facility_name 
      FROM bookings b 
      JOIN users u ON b.requester_id = u.id 
      JOIN facilities f ON b.facility_id = f.id 
      WHERE b.status = 'pending' 
      ORDER BY b.created_at
    `).all();

    return NextResponse.json(pendingBookings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
