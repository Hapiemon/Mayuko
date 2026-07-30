import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

// GET /api/init — テーブル初期作成 (初回のみ呼び出す)
export async function GET() {
  try {
    const sql = getSql();
    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id          SERIAL PRIMARY KEY,
        sender      TEXT NOT NULL,
        content     TEXT,
        media_url   TEXT,
        media_type  TEXT,
        mayuko_read_at TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS mayuko_read_at TIMESTAMPTZ
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at ASC)
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id          SERIAL PRIMARY KEY,
        endpoint    TEXT NOT NULL UNIQUE,
        p256dh      TEXT NOT NULL,
        auth        TEXT NOT NULL,
        user_name   TEXT NOT NULL,
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    return NextResponse.json({ ok: true, message: 'テーブルを作成しました' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
