import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { markAsRead, markAllAsRead } from '@/lib/notification-service';

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { notificationIds, all } = await request.json();

    if (all) {
      markAllAsRead(userId);
    } else if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      markAsRead(notificationIds, userId);
    } else {
      return NextResponse.json({ error: 'Missing notificationIds or all flag' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
