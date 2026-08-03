import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';

webpush.setVapidDetails(
  'mailto:ikeike.misoshiru@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// POST /api/notify — 全購読者にプッシュ通知送信
export async function POST(req: NextRequest) {
  try {
    const sql = getSql();
    const { title, body, url, excludeUser, targetUser } = await req.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'title and body are required' }, { status: 400 });
    }

    // targetUser: 特定ユーザーにだけ送る / excludeUser: 送信者以外に送る
    let rows;
    if (targetUser) {
      rows = await sql`
        SELECT endpoint, p256dh, auth FROM push_subscriptions
        WHERE user_name = ${targetUser}
      `;
    } else if (excludeUser) {
      rows = await sql`
        SELECT endpoint, p256dh, auth FROM push_subscriptions
        WHERE user_name != ${excludeUser}
      `;
    } else {
      rows = await sql`SELECT endpoint, p256dh, auth FROM push_subscriptions`;
    }

    const payload = JSON.stringify({ title, body, url: url || '/chat' });

    const results = await Promise.allSettled(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (rows as any[]).map((row) =>
        webpush.sendNotification(
          {
            endpoint: row.endpoint as string,
            keys: { p256dh: row.p256dh as string, auth: row.auth as string },
          },
          payload
        )
      )
    );

    // 無効な購読（410/404）を削除
    const expiredEndpoints: string[] = [];
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        const err = result.reason as { statusCode?: number };
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          expiredEndpoints.push((rows as any[])[i].endpoint as string);
        }
      }
    });

    if (expiredEndpoints.length > 0) {
      await Promise.all(
        expiredEndpoints.map((ep) => sql`DELETE FROM push_subscriptions WHERE endpoint = ${ep}`)
      );
    }

    return NextResponse.json({ ok: true, sent: rows.length });
  } catch (err) {
    console.error('notify error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
