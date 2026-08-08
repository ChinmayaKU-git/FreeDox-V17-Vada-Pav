import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { getNotifications } from '@/lib/notification-service';

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const notifications = getNotifications(userId);
    return NextResponse.json(notifications);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
