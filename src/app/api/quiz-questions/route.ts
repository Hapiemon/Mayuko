import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export const dynamic = 'force-dynamic';

const PRIZE_BY_QUESTION_NUMBER: Record<number, number> = {
  1: 10000,
  2: 20000,
  3: 30000,
  4: 50000,
  5: 100000,
  6: 150000,
  7: 250000,
  8: 500000,
  9: 750000,
  10: 1000000,
  11: 1500000,
  12: 2500000,
  13: 5000000,
  14: 7500000,
  15: 10000000,
};

function answerKeyToIndex(answerKey: string) {
  return ({ A: 1, B: 2, C: 3, D: 4 } as const)[answerKey as 'A' | 'B' | 'C' | 'D'] ?? 0;
}

function normalizeAnswerKey(answerKey?: unknown, answerIndex?: unknown) {
  if (typeof answerKey === 'string') {
    const normalized = answerKey.trim().toUpperCase();
    if (['A', 'B', 'C', 'D'].includes(normalized)) {
      return normalized;
    }
  }

  const index = Number(answerIndex);
  return ({ 1: 'A', 2: 'B', 3: 'C', 4: 'D' } as const)[index as 1 | 2 | 3 | 4] ?? '';
}

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
      answer_key    TEXT,
      question_number INTEGER,
      prize_amount  BIGINT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS answer_key TEXT`;
  await sql`ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS question_number INTEGER`;
  await sql`ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS prize_amount BIGINT`;
  await sql`
    UPDATE quiz_questions
    SET answer_key = CASE answer_index
      WHEN 1 THEN 'A'
      WHEN 2 THEN 'B'
      WHEN 3 THEN 'C'
      WHEN 4 THEN 'D'
      ELSE answer_key
    END
    WHERE answer_key IS NULL OR answer_key = ''
  `;
  await sql`
    UPDATE quiz_questions
    SET question_number = difficulty
    WHERE question_number IS NULL
  `;
  for (const [questionNumber, prizeAmount] of Object.entries(PRIZE_BY_QUESTION_NUMBER)) {
    await sql`
      UPDATE quiz_questions
      SET prize_amount = ${prizeAmount}
      WHERE question_number = ${Number(questionNumber)}
        AND prize_amount IS NULL
    `;
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureSchema();
    const sql = getSql();
    const questionNumber = req.nextUrl.searchParams.get('questionNumber');

    const rows = questionNumber
      ? await sql`
          SELECT * FROM quiz_questions
          WHERE COALESCE(question_number, difficulty) = ${Number(questionNumber)}
          ORDER BY id DESC
        `
      : await sql`
          SELECT * FROM quiz_questions
          ORDER BY COALESCE(question_number, difficulty) ASC, id DESC
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
    const { question, choices, answerKey, questionNumber, prizeAmount } = await req.json();
    const normalizedAnswerKey = normalizeAnswerKey(answerKey);
    const normalizedQuestionNumber = Number(questionNumber);
    const normalizedPrizeAmount = Number(prizeAmount || PRIZE_BY_QUESTION_NUMBER[normalizedQuestionNumber]);
    const answerIndex = answerKeyToIndex(normalizedAnswerKey);

    if (!question || !Array.isArray(choices) || choices.length !== 4 || !normalizedAnswerKey || !normalizedQuestionNumber || !normalizedPrizeAmount || !answerIndex) {
      return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
    }

    await sql`
      INSERT INTO quiz_questions (
        question, choice_1, choice_2, choice_3, choice_4, answer_index, difficulty, answer_key, question_number, prize_amount
      ) VALUES (
        ${question}, ${choices[0]}, ${choices[1]}, ${choices[2]}, ${choices[3]}, ${answerIndex}, ${normalizedQuestionNumber}, ${normalizedAnswerKey}, ${normalizedQuestionNumber}, ${normalizedPrizeAmount}
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
    const { id, question, choices, answerKey, questionNumber, prizeAmount } = await req.json();
    const normalizedAnswerKey = normalizeAnswerKey(answerKey);
    const normalizedQuestionNumber = Number(questionNumber);
    const normalizedPrizeAmount = Number(prizeAmount || PRIZE_BY_QUESTION_NUMBER[normalizedQuestionNumber]);
    const answerIndex = answerKeyToIndex(normalizedAnswerKey);

    if (!id || !question || !Array.isArray(choices) || choices.length !== 4 || !normalizedAnswerKey || !normalizedQuestionNumber || !normalizedPrizeAmount || !answerIndex) {
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
        difficulty = ${normalizedQuestionNumber},
        answer_key = ${normalizedAnswerKey},
        question_number = ${normalizedQuestionNumber},
        prize_amount = ${normalizedPrizeAmount},
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
