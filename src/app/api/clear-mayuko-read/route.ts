import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/clear-mayuko-read — 全メッセージをまゆこ未読にリセット
export async function POST() {
  try {
    const sql = getSql();
    
    // まゆこが送信したメッセージ以外の全メッセージを未読状態にリセット
    await sql`
      UPDATE messages
      SET mayuko_read_at = NULL
      WHERE sender != 'まゆこ'
    `;
    
    return NextResponse.json({ ok: true, message: 'All messages reset to unread' }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
