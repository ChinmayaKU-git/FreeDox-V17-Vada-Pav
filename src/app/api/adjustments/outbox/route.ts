import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { getOutgoingAdjustments } from '@/lib/adjustment-service';

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adjustments = getOutgoingAdjustments(userId);
    return NextResponse.json(adjustments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
