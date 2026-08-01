'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

interface BrainQuestion {
  prompt: string;
  choices: number[];
  answer: number;
}

function makeQuestion(): BrainQuestion {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  const operators = ['+', '-', '×'] as const;
  const op = operators[Math.floor(Math.random() * operators.length)];
  const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
  const distractors = new Set<number>([answer]);
  while (distractors.size < 3) {
    distractors.add(answer + (Math.floor(Math.random() * 11) - 5 || 2));
  }
  const choices = [...distractors].sort(() => Math.random() - 0.5);
  return {
    prompt: `${a} ${op} ${b} = ?`,
    choices,
    answer,
  };
}

export default function BrainTrainingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState('');
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [question, setQuestion] = useState<BrainQuestion | null>(null);
  const [message, setMessage] = useState('10ラウンドでスコアを伸ばそう');
  const [finished, setFinished] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const user = sessionStorage.getItem('chatUser');
    if (!user) {
      router.push('/');
      return;
    }
    setCurrentUser(user);
    setQuestion(makeQuestion());
  }, [router]);

  const maxRounds = 10;

  const saveResult = async (finalScore: number, comboValue: number) => {
    if (!currentUser || saved) return;
    try {
      await fetch('/api/game-rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: currentUser,
          gameType: 'brain_training',
          cumulativeDelta: finalScore,
          bestValue: finalScore,
          extraValue: comboValue,
        }),
      });
      setSaved(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnswer = async (value: number) => {
    if (!question || finished) return;

    if (value === question.answer) {
      const nextCombo = combo + 1;
      const gained = 100 + nextCombo * 20;
      const nextScore = score + gained;
      setCombo(nextCombo);
      setBestCombo((prev) => Math.max(prev, nextCombo));
      setScore(nextScore);
      setMessage(`正解！ +${gained}点`);

      if (round === maxRounds) {
        setFinished(true);
        await saveResult(nextScore, Math.max(bestCombo, nextCombo));
        return;
      }
    } else {
      setCombo(0);
      setMessage(`不正解… 正解は ${question.answer}`);
      if (round === maxRounds) {
        setFinished(true);
        await saveResult(score, bestCombo);
        return;
      }
    }

    window.setTimeout(() => {
      setRound((prev) => prev + 1);
      setQuestion(makeQuestion());
    }, 500);
  };

  const restart = () => {
    setRound(1);
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setQuestion(makeQuestion());
    setMessage('10ラウンドでスコアを伸ばそう');
    setFinished(false);
    setSaved(false);
  };

  const progress = useMemo(() => Math.min((round / maxRounds) * 100, 100), [round]);

  if (!currentUser || !question) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#164e63,_#0f172a_60%,_#020617)] text-white">
      <header className="border-b border-cyan-300/20 bg-black/20 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs text-cyan-200">GAME / BRAIN TRAINING</p>
            <h1 className="text-2xl font-bold">脳トレ</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push('/game')} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">ランキングへ</button>
            <button onClick={() => router.push('/chat')} className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300">チャットへ</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <section className="rounded-[2rem] border border-cyan-300/20 bg-slate-950/60 p-6 shadow-2xl shadow-cyan-500/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-cyan-200">ROUND {round} / {maxRounds}</p>
              <p className="text-3xl font-black">{score} 点</p>
            </div>
            <div className="text-right text-sm text-white/80">
              <p>コンボ: {combo}</p>
              <p>最大コンボ: {bestCombo}</p>
            </div>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-8 rounded-[1.5rem] bg-white/5 px-6 py-10 text-center">
            <p className="text-sm text-cyan-200">問題</p>
            <h2 className="mt-3 text-4xl font-black tracking-wide">{question.prompt}</h2>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {question.choices.map((choice) => (
              <button
                key={choice}
                disabled={finished}
                onClick={() => handleAnswer(choice)}
                className="rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-5 text-xl font-bold transition hover:bg-cyan-400/20 disabled:opacity-40"
              >
                {choice}
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/90">{message}</div>

          <div className="mt-5 flex gap-2">
            <button onClick={restart} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">最初から</button>
            {finished && <button onClick={() => router.push('/game')} className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300">結果を見る</button>}
          </div>
        </section>
      </main>
    </div>
  );
}
