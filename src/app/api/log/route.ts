import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.error('[client-log]', body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('log endpoint error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
