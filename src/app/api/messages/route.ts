import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function ensureSchema() {
  const sql = getSql();
  await sql`
    ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS mayuko_read_at TIMESTAMPTZ
  `;
  await sql`
    ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS reply_to_id INTEGER
  `;
  await sql`
    ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS reply_to_sender TEXT
  `;
  await sql`
    ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS reply_to_content TEXT
  `;
}

// GET /api/messages — 全メッセージ取得
export async function GET() {
  try {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT *
      FROM (
        SELECT id, sender, content, media_url, media_type, created_at,
          reply_to_id, reply_to_sender, reply_to_content,
          CASE
            WHEN sender = 'まゆこ' THEN 'まゆこ既読'
            WHEN mayuko_read_at IS NULL THEN 'まゆこ未読'
            ELSE 'まゆこ既読'
          END AS mayuko_read_status
        FROM messages
        ORDER BY created_at DESC, id DESC
        LIMIT 200
      ) AS latest
      ORDER BY created_at ASC, id ASC
    `;
    return NextResponse.json(rows, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

// POST /api/messages — テキストメッセージ送信
export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const sql = getSql();
    const { sender, content, replyToId, replyToSender, replyToContent } = await req.json();
    if (!sender || !content?.trim()) {
      return NextResponse.json({ error: 'sender and content are required' }, { status: 400 });
    }
    await sql`
      INSERT INTO messages (sender, content, reply_to_id, reply_to_sender, reply_to_content)
      VALUES (
        ${sender},
        ${content.trim()},
        ${replyToId ?? null},
        ${replyToSender ?? null},
        ${replyToContent ?? null}
      )
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
    await ensureSchema();
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

// PATCH /api/messages — まゆこが表示した時点で既読化
export async function PATCH(req: NextRequest) {
  try {
    await ensureSchema();
    const sql = getSql();
    const { viewer } = await req.json();

    if (viewer !== 'まゆこ') {
      return NextResponse.json({ ok: true, skipped: true });
    }

    await sql`
      UPDATE messages
      SET mayuko_read_at = NOW()
      WHERE sender != 'まゆこ' AND mayuko_read_at IS NULL
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
