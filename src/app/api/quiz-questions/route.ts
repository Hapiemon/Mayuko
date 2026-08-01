import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function ensureSchema() {
  const sql = getSql();
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
}

export async function GET(req: NextRequest) {
  try {
    await ensureSchema();
    const sql = getSql();
    const difficulty = req.nextUrl.searchParams.get('difficulty');

    const rows = difficulty
      ? await sql`
          SELECT * FROM quiz_questions
          WHERE difficulty = ${Number(difficulty)}
          ORDER BY id DESC
        `
      : await sql`
          SELECT * FROM quiz_questions
          ORDER BY difficulty ASC, id DESC
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
    const { question, choices, answerIndex, difficulty } = await req.json();

    if (!question || !Array.isArray(choices) || choices.length !== 4 || !answerIndex || !difficulty) {
      return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
    }

    await sql`
      INSERT INTO quiz_questions (
        question, choice_1, choice_2, choice_3, choice_4, answer_index, difficulty
      ) VALUES (
        ${question}, ${choices[0]}, ${choices[1]}, ${choices[2]}, ${choices[3]}, ${answerIndex}, ${difficulty}
      )
    `;

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await ensureSchema();
    const sql = getSql();
    const { id, question, choices, answerIndex, difficulty } = await req.json();

    if (!id || !question || !Array.isArray(choices) || choices.length !== 4 || !answerIndex || !difficulty) {
      return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
    }

    await sql`
      UPDATE quiz_questions
      SET
        question = ${question},
        choice_1 = ${choices[0]},
        choice_2 = ${choices[1]},
        choice_3 = ${choices[2]},
        choice_4 = ${choices[3]},
        answer_index = ${answerIndex},
        difficulty = ${difficulty},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureSchema();
    const sql = getSql();
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await sql`DELETE FROM quiz_questions WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
