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

// DELETE /api/messages — 自分のメッセージのみ削除
export async function DELETE(req: NextRequest) {
  try {
    const sql = getSql();
    const { id, sender } = await req.json();

    if (!id || !sender) {
      return NextResponse.json({ error: 'id and sender are required' }, { status: 400 });
    }

    const rows = await sql`
      DELETE FROM messages
      WHERE id = ${id} AND sender = ${sender}
      RETURNING id
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'message not found or not owned by sender' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
