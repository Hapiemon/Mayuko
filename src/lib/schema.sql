-- Neonコンソールまたは初回マイグレーションAPIで実行するSQL

CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  sender      TEXT NOT NULL,
  content     TEXT,
  media_url   TEXT,
  media_type  TEXT,  -- 'image' | 'video' | NULL
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at ASC);
