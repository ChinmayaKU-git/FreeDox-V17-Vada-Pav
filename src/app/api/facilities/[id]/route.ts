import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const facility = db.prepare('SELECT * FROM facilities WHERE id = ?').get(id);

    if (!facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }

    return NextResponse.json(facility);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
