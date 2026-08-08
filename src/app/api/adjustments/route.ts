import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { createAdjustmentRequest } from '@/lib/adjustment-service';

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const input = { ...body, requestingUserId: userId };
    
    const adjustment = createAdjustmentRequest(input);
    return NextResponse.json(adjustment);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
