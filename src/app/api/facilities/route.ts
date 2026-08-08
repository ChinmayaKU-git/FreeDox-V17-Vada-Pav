import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const minCapacity = searchParams.get('minCapacity');

    let sql = 'SELECT * FROM facilities';
    const params: any[] = [];
    const conditions = [];

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (minCapacity) {
      conditions.push('capacity >= ?');
      params.push(parseInt(minCapacity, 10));
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    const facilities = db.prepare(sql).all(...params);
    return NextResponse.json(facilities);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
