import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getSql } from '@/lib/db';

// POST /api/upload — 画像・動画アップロード
export async function POST(req: NextRequest) {
  try {
    const sql = getSql();
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const sender = formData.get('sender') as string | null;
    const media_type = formData.get('media_type') as 'image' | 'video' | null;

    if (!file || !sender || !media_type) {
      return NextResponse.json({ error: 'file, sender, media_type are required' }, { status: 400 });
    }

    const storeId = process.env.mayuko_STORE_ID || process.env.BLOB_STORE_ID || process.env.STORE_ID;

    // Vercel Blob にアップロード
    const blob = await put(`chat/${Date.now()}-${file.name}`, file, {
      access: 'public',
      ...(storeId ? { storeId } : {}),
    });

    // DB にメッセージレコードを保存
    await sql`
      INSERT INTO messages (sender, media_url, media_type)
      VALUES (${sender}, ${blob.url}, ${media_type})
    `;

    return NextResponse.json({ url: blob.url }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
