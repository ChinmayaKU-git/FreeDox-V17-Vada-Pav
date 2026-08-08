import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { acceptAdjustment } from '@/lib/adjustment-service';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = acceptAdjustment(id, userId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
