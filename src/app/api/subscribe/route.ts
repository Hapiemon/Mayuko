import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/subscribe — Push購読を保存
export async function POST(req: NextRequest) {
  try {
    const sql = getSql();
    const { subscription, user } = await req.json();

    if (!subscription?.endpoint || !user) {
      return NextResponse.json({ error: 'subscription and user are required' }, { status: 400 });
    }

    const endpoint = subscription.endpoint as string;
    const p256dh = subscription.keys?.p256dh as string;
    const auth = subscription.keys?.auth as string;

    // upsert: 同じendpointなら更新
    await sql`
      INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_name)
      VALUES (${endpoint}, ${p256dh}, ${auth}, ${user})
      ON CONFLICT (endpoint)
      DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, user_name = EXCLUDED.user_name, updated_at = NOW()
    `;

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error('subscribe error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
