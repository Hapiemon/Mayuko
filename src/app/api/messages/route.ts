import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/messages — 全メッセージ取得
export async function GET() {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT id, sender, content, media_url, media_type, created_at
      FROM messages
      ORDER BY created_at ASC
      LIMIT 200
    `;
    return NextResponse.json(rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

// POST /api/messages — テキストメッセージ送信
export async function POST(req: NextRequest) {
  try {
    const sql = getSql();
    const { sender, content } = await req.json();
    if (!sender || !content?.trim()) {
      return NextResponse.json({ error: 'sender and content are required' }, { status: 400 });
    }
    await sql`
      INSERT INTO messages (sender, content)
      VALUES (${sender}, ${content.trim()})
    `;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
