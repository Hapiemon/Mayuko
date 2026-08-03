import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ROOM_MAX_PARTICIPANTS = 5;
const PRESENCE_TTL_SECONDS = 30;

type JoinBody = {
  action: 'join';
  roomId: string;
  userName: string;
  sessionId: string;
};

type LeaveBody = {
  action: 'leave';
  roomId: string;
  sessionId: string;
};

type HeartbeatBody = {
  action: 'heartbeat';
  roomId: string;
  sessionId: string;
};

type SignalBody = {
  action: 'signal';
  roomId: string;
  fromSessionId: string;
  toSessionId: string;
  signalType: 'offer' | 'answer' | 'ice';
  payload: unknown;
};

type CallPostBody = JoinBody | LeaveBody | HeartbeatBody | SignalBody;

async function ensureSchema() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS call_participants (
      session_id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_call_participants_room
    ON call_participants (room_id, last_seen DESC)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS call_signals (
      id BIGSERIAL PRIMARY KEY,
      room_id TEXT NOT NULL,
      from_session_id TEXT NOT NULL,
      to_session_id TEXT,
      signal_type TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_call_signals_room_id
    ON call_signals (room_id, id ASC)
  `;
}

async function cleanupStalePresence(roomId: string) {
  const sql = getSql();
  await sql`
    DELETE FROM call_participants
    WHERE room_id = ${roomId}
      AND last_seen < NOW() - (${PRESENCE_TTL_SECONDS} * INTERVAL '1 second')
  `;
}

export async function GET(req: NextRequest) {
  try {
    await ensureSchema();
    const sql = getSql();

    const roomId = req.nextUrl.searchParams.get('roomId') ?? 'main';
    const sessionId = req.nextUrl.searchParams.get('sessionId') ?? '';
    const lastSignalIdRaw = req.nextUrl.searchParams.get('lastSignalId');
    const lastSignalId = lastSignalIdRaw ? Number(lastSignalIdRaw) : 0;

    await cleanupStalePresence(roomId);

    const participantsRows = await sql`
      SELECT session_id, user_name, joined_at, last_seen
      FROM call_participants
      WHERE room_id = ${roomId}
      ORDER BY joined_at ASC
      LIMIT ${ROOM_MAX_PARTICIPANTS}
    `;
    const participants = participantsRows as {
      session_id: string;
      user_name: string;
      joined_at: string;
      last_seen: string;
    }[];

    let signals: Array<{
      id: number;
      from_session_id: string;
      to_session_id: string | null;
      signal_type: string;
      payload: unknown;
    }> = [];

    if (sessionId) {
      const signalRows = await sql`
        SELECT id, from_session_id, to_session_id, signal_type, payload
        FROM call_signals
        WHERE room_id = ${roomId}
          AND id > ${Number.isFinite(lastSignalId) ? Math.max(0, lastSignalId) : 0}
          AND (to_session_id = ${sessionId} OR to_session_id IS NULL)
        ORDER BY id ASC
        LIMIT 400
      `;
      signals = signalRows as {
        id: number;
        from_session_id: string;
        to_session_id: string | null;
        signal_type: string;
        payload: unknown;
      }[];
    }

    const latestRows = (await sql`
      SELECT MAX(id)::bigint AS latest_id
      FROM call_signals
      WHERE room_id = ${roomId}
    `) as Array<{ latest_id: number | null }>;
    const latestSignalId = Number(latestRows[0]?.latest_id ?? 0);

    return NextResponse.json(
      {
        participants,
        signals,
        latestSignalId,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (err) {
    console.error('call GET error:', err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const sql = getSql();
    const body = (await req.json()) as CallPostBody;

    if (!body?.action || !body.roomId) {
      return NextResponse.json({ error: 'action and roomId are required' }, { status: 400 });
    }

    await cleanupStalePresence(body.roomId);

    if (body.action === 'join') {
      if (!body.userName || !body.sessionId) {
        return NextResponse.json({ error: 'userName and sessionId are required' }, { status: 400 });
      }

      const existing = (await sql`
        SELECT session_id
        FROM call_participants
        WHERE session_id = ${body.sessionId}
        LIMIT 1
      `) as Array<{ session_id: string }>;

      if (existing.length === 0) {
        const countRows = (await sql`
          SELECT COUNT(*)::text AS count
          FROM call_participants
          WHERE room_id = ${body.roomId}
        `) as Array<{ count: string }>;
        const count = Number(countRows[0]?.count ?? '0');
        if (count >= ROOM_MAX_PARTICIPANTS) {
          return NextResponse.json({ error: 'room is full', roomMaxParticipants: ROOM_MAX_PARTICIPANTS }, { status: 409 });
        }
      }

      await sql`
        INSERT INTO call_participants (session_id, room_id, user_name, last_seen)
        VALUES (${body.sessionId}, ${body.roomId}, ${body.userName}, NOW())
        ON CONFLICT (session_id)
        DO UPDATE SET
          room_id = EXCLUDED.room_id,
          user_name = EXCLUDED.user_name,
          last_seen = NOW()
      `;

      return NextResponse.json({ ok: true, roomMaxParticipants: ROOM_MAX_PARTICIPANTS });
    }

    if (body.action === 'leave') {
      if (!body.sessionId) {
        return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
      }
      await sql`
        DELETE FROM call_participants
        WHERE room_id = ${body.roomId}
          AND session_id = ${body.sessionId}
      `;
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'heartbeat') {
      if (!body.sessionId) {
        return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
      }
      await sql`
        UPDATE call_participants
        SET last_seen = NOW()
        WHERE room_id = ${body.roomId}
          AND session_id = ${body.sessionId}
      `;
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'signal') {
      if (!body.fromSessionId || !body.toSessionId || !body.signalType) {
        return NextResponse.json({ error: 'fromSessionId, toSessionId, signalType are required' }, { status: 400 });
      }

      await sql`
        INSERT INTO call_signals (room_id, from_session_id, to_session_id, signal_type, payload)
        VALUES (
          ${body.roomId},
          ${body.fromSessionId},
          ${body.toSessionId},
          ${body.signalType},
          ${JSON.stringify(body.payload ?? {})}::jsonb
        )
      `;

      await sql`
        DELETE FROM call_signals
        WHERE room_id = ${body.roomId}
          AND created_at < NOW() - INTERVAL '1 day'
      `;

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'invalid action' }, { status: 400 });
  } catch (err) {
    console.error('call POST error:', err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
