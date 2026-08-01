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
        reply_to_id INTEGER,
        reply_to_sender TEXT,
        reply_to_content TEXT,
        mayuko_read_at TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
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
    await sql`
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id            SERIAL PRIMARY KEY,
        question      TEXT NOT NULL,
        choice_1      TEXT NOT NULL,
        choice_2      TEXT NOT NULL,
        choice_3      TEXT NOT NULL,
        choice_4      TEXT NOT NULL,
        answer_index  INTEGER NOT NULL,
        difficulty    INTEGER NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS game_rankings (
        id                SERIAL PRIMARY KEY,
        user_name         TEXT NOT NULL,
        game_type         TEXT NOT NULL,
        cumulative_value  BIGINT NOT NULL DEFAULT 0,
        best_value        BIGINT NOT NULL DEFAULT 0,
        extra_value       BIGINT NOT NULL DEFAULT 0,
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_name, game_type)
      )
    `;
    return NextResponse.json({ ok: true, message: 'テーブルを作成しました' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
