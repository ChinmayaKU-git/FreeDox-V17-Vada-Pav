import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { cancelBooking } from '@/lib/booking-service';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { reason } = await request.json();
    if (!reason) return NextResponse.json({ error: 'Reason is required' }, { status: 400 });

    const booking = cancelBooking(id, userId, reason);
    return NextResponse.json(booking);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
