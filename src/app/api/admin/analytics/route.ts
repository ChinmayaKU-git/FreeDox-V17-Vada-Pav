import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookedHoursPerFacility = db.prepare(`
      SELECT f.name as facility_name, 
             SUM((julianday(b.end_time) - julianday(b.start_time)) * 24) as total_hours
      FROM bookings b
      JOIN facilities f ON b.facility_id = f.id
      WHERE b.status = 'approved'
      GROUP BY f.id
      ORDER BY total_hours DESC
    `).all();

    const cancellationRate = db.prepare(`
      SELECT f.name as facility_name,
             COUNT(b.id) as total,
             SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
             CAST(SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(b.id) as rate
      FROM bookings b
      JOIN facilities f ON b.facility_id = f.id
      GROUP BY f.id
    `).all();

    const peakDemand = db.prepare(`
      SELECT strftime('%H', start_time) as hour, COUNT(id) as booking_count
      FROM bookings
      GROUP BY hour
      ORDER BY hour
    `).all();

    const topUsers = db.prepare(`
      SELECT u.name, u.department, COUNT(b.id) as booking_count
      FROM bookings b
      JOIN users u ON b.requester_id = u.id
      GROUP BY u.id
      ORDER BY booking_count DESC
      LIMIT 10
    `).all();

    const topDepartments = db.prepare(`
      SELECT u.department, COUNT(b.id) as booking_count
      FROM bookings b
      JOIN users u ON b.requester_id = u.id
      WHERE u.department IS NOT NULL
      GROUP BY u.department
      ORDER BY booking_count DESC
    `).all();

    return NextResponse.json({
      bookedHoursPerFacility,
      cancellationRate,
      peakDemand,
      topUsers,
      topDepartments
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
