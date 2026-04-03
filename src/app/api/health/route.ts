import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET(): Promise<NextResponse> {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ status: 'error', details: message }, { status: 503 });
  }
}
