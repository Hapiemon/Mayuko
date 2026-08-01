'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

interface StageData {
  cells: string[];
  oddIndex: number;
  baseEmoji: string;
  oddEmoji: string;
}

const EMOJI_PAIRS = [
  ['🍎', '🍏'],
  ['🐶', '🐺'],
  ['🌙', '⭐'],
  ['🧁', '🍰'],
  ['🚗', '🚙'],
  ['🎈', '🎉'],
  ['🌷', '🌹'],
  ['🐟', '🐠'],
];

function makeStage(stage: number): StageData {
  const size = Math.min(3 + Math.floor((stage - 1) / 2), 5);
  const total = size * size;
  const [baseEmoji, oddEmoji] = EMOJI_PAIRS[(stage - 1) % EMOJI_PAIRS.length];
  const oddIndex = Math.floor(Math.random() * total);
  const cells = Array.from({ length: total }, (_, index) => (index === oddIndex ? oddEmoji : baseEmoji));
  return { cells, oddIndex, baseEmoji, oddEmoji };
}

export default function SpotDifferencePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState('');
  const [stage, setStage] = useState(1);
  const [cleared, setCleared] = useState(0);
  const [bestRun, setBestRun] = useState(0);
  const [message, setMessage] = useState('左右を見比べて違う1マスをタップ');
  const [finished, setFinished] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stageData, setStageData] = useState<StageData>(() => makeStage(1));

  useEffect(() => {
    const user = sessionStorage.getItem('chatUser');
    if (!user) {
      router.push('/');
      return;
    }
    setCurrentUser(user);
  }, [router]);

  const maxStage = 7;

  const saveResult = async (clearedCount: number, bestStage: number) => {
    if (!currentUser || saved) return;
    try {
      await fetch('/api/game-rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: currentUser,
          gameType: 'spot_difference',
          cumulativeDelta: clearedCount,
          bestValue: bestStage,
          extraValue: 0,
        }),
      });
      setSaved(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePick = async (index: number) => {
    if (finished) return;

    if (index === stageData.oddIndex) {
      const nextCleared = cleared + 1;
      setCleared(nextCleared);
      setBestRun(Math.max(bestRun, stage));
      setMessage(`正解！ ステージ${stage}クリア`);

      if (stage === maxStage) {
        setFinished(true);
        await saveResult(nextCleared, stage);
        return;
      }

      window.setTimeout(() => {
        const nextStage = stage + 1;
        setStage(nextStage);
        setStageData(makeStage(nextStage));
      }, 500);
    } else {
      setFinished(true);
      setMessage('見つからず終了。もう一回挑戦できます。');
      await saveResult(cleared, bestRun);
    }
  };

  const restart = () => {
    setStage(1);
    setCleared(0);
    setBestRun(0);
    setMessage('左右を見比べて違う1マスをタップ');
    setFinished(false);
    setSaved(false);
    setStageData(makeStage(1));
  };

  const gridSize = useMemo(() => Math.sqrt(stageData.cells.length), [stageData.cells.length]);

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#14532d,_#0f172a_60%,_#020617)] text-white">
      <header className="border-b border-emerald-300/20 bg-black/20 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs text-emerald-200">GAME / SPOT THE DIFFERENCE</p>
            <h1 className="text-2xl font-bold">間違い探し</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push('/game')} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">ランキングへ</button>
            <button onClick={() => router.push('/chat')} className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300">チャットへ</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <section className="rounded-[2rem] border border-emerald-300/20 bg-slate-950/60 p-6 shadow-2xl shadow-emerald-500/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-emerald-200">STAGE {stage} / {maxStage}</p>
              <p className="text-3xl font-black">クリア数 {cleared}</p>
            </div>
            <div className="rounded-full bg-white/10 px-4 py-2 text-sm">
              違い: {stageData.baseEmoji} / {stageData.oddEmoji}
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {['左', '右'].map((label) => (
              <div key={label} className="rounded-[1.5rem] bg-white/5 p-4">
                <p className="mb-3 text-sm text-white/70">{label}</p>
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
                  {stageData.cells.map((cell, index) => (
                    <button
                      key={`${label}-${index}`}
                      onClick={() => handlePick(index)}
                      disabled={finished}
                      className="aspect-square rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-3xl transition hover:bg-emerald-400/20 disabled:opacity-40"
                    >
                      {cell}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/90">{message}</div>

          <div className="mt-5 flex gap-2">
            <button onClick={restart} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">最初から</button>
            {finished && <button onClick={() => router.push('/game')} className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300">結果を見る</button>}
          </div>
        </section>
      </main>
    </div>
  );
}
