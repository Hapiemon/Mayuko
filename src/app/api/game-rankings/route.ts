import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function ensureSchema() {
  const sql = getSql();
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
}

export async function GET() {
  try {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT * FROM game_rankings
      ORDER BY game_type ASC, cumulative_value DESC, best_value DESC, extra_value DESC
    `;
    return NextResponse.json(rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const sql = getSql();
    const { userName, gameType, cumulativeDelta, bestValue, extraValue } = await req.json();

    if (!userName || !gameType) {
      return NextResponse.json({ error: 'userName and gameType are required' }, { status: 400 });
    }

    if (gameType === 'spot_difference') {
      await sql`
        INSERT INTO game_rankings (user_name, game_type, cumulative_value, best_value, extra_value)
        VALUES (${userName}, ${gameType}, ${cumulativeDelta ?? 0}, ${bestValue ?? 0}, ${extraValue ?? 0})
        ON CONFLICT (user_name, game_type)
        DO UPDATE SET
          cumulative_value = game_rankings.cumulative_value + ${cumulativeDelta ?? 0},
          best_value = CASE
            WHEN game_rankings.best_value = 0 THEN ${bestValue ?? 0}
            ELSE LEAST(game_rankings.best_value, ${bestValue ?? 0})
          END,
          extra_value = GREATEST(game_rankings.extra_value, ${extraValue ?? 0}),
          updated_at = NOW()
      `;
    } else {
      await sql`
        INSERT INTO game_rankings (user_name, game_type, cumulative_value, best_value, extra_value)
        VALUES (${userName}, ${gameType}, ${cumulativeDelta ?? 0}, ${bestValue ?? 0}, ${extraValue ?? 0})
        ON CONFLICT (user_name, game_type)
        DO UPDATE SET
          cumulative_value = game_rankings.cumulative_value + ${cumulativeDelta ?? 0},
          best_value = GREATEST(game_rankings.best_value, ${bestValue ?? 0}),
          extra_value = GREATEST(game_rankings.extra_value, ${extraValue ?? 0}),
          updated_at = NOW()
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await ensureSchema();
    const sql = getSql();
    await sql`DELETE FROM game_rankings`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
