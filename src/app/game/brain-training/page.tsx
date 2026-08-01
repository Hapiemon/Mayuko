'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type Phase = 'level-select' | 'memorize' | 'playing' | 'finished';

interface Card {
  id: number;
  value: string;
  isMatched: boolean;
  isFree?: boolean;
}

interface RankingRow {
  user_name: string;
  game_type: string;
  best_value: number;
  extra_value: number;
}

const LEVEL_CONFIG: Record<number, { size: number; label: string }> = {
  1: { size: 4, label: '4×4' },
  2: { size: 5, label: '5×5' },
  3: { size: 6, label: '6×6' },
  4: { size: 7, label: '7×7' },
  5: { size: 8, label: '8×8' },
};

const EMOJIS = [
  '🍎', '🍇', '🍊', '🍋', '🍓', '🍒', '🍉', '🥝', '🍑', '🍍', '🥥', '🥕', '🌽', '🍄', '🥐', '🍔',
  '🍟', '🍕', '🍣', '🍩', '🍪', '🍫', '🍿', '🧁', '🎂', '⚽', '🏀', '🎾', '🎯', '🎮', '🎹', '🎸',
  '🚗', '🚕', '🚌', '🚲', '🚂', '✈️', '🚀', '⛵', '🐶', '🐱', '🐼', '🦊', '🐸', '🐵', '🐧', '🦄',
  '🌸', '🌻', '🌈', '⭐', '🌙', '☀️', '🔥', '❄️', '💎', '🎁', '🪄', '📱', '💻', '📷', '🎈', '🎀',
  '🪐', '🐙', '🦋', '🦀', '🦉', '🍀', '🍁', '🌵', '🧩', '🧸', '🛵', '🚁', '🎤', '🎬', '📚', '🧠',
  '🫐', '🥭', '🍞', '🧀', '🥨', '🍜', '🍛', '🍤', '🥟', '🍢', '🍡', '🍦', '🍰', '🍼', '🧃', '🥤',
];

function shuffle<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function generateDeck(level: number): { cards: Card[]; gridSize: number } {
  const gridSize = LEVEL_CONFIG[level].size;
  const totalSlots = gridSize * gridSize;
  const pairCount = Math.floor(totalSlots / 2);
  const selected = shuffle(EMOJIS).slice(0, pairCount);

  const values: Array<{ value: string; isMatched: boolean; isFree?: boolean }> = [];
  selected.forEach((emoji) => {
    values.push(
      { value: emoji, isMatched: false },
      { value: emoji, isMatched: false },
    );
  });

  if (totalSlots % 2 === 1) {
    values.push({ value: '★', isMatched: true, isFree: true });
  }

  const cards = shuffle(values).map((item, index) => ({
    id: index,
    value: item.value,
    isMatched: item.isMatched,
    isFree: item.isFree,
  }));

  return { cards, gridSize };
}

export default function BrainTrainingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState('');
  const [phase, setPhase] = useState<Phase>('level-select');
  const [level, setLevel] = useState<number | null>(null);
  const [gridSize, setGridSize] = useState(4);
  const [cards, setCards] = useState<Card[]>([]);
  const [openedIndices, setOpenedIndices] = useState<number[]>([]);
  const [lockBoard, setLockBoard] = useState(false);
  const [flippedCount, setFlippedCount] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [totalPairs, setTotalPairs] = useState(0);
  const [message, setMessage] = useState('レベルを選んで開始してください');
  const [saved, setSaved] = useState(false);
  const [bestScore, setBestScore] = useState(0);
  const [resultScore, setResultScore] = useState(0);
  const [resultBestScore, setResultBestScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [resultTitle, setResultTitle] = useState('');

  useEffect(() => {
    const user = sessionStorage.getItem('chatUser');
    if (!user) {
      router.push('/');
      return;
    }
    setCurrentUser(user);
  }, [router]);

  useEffect(() => {
    if (!currentUser) return;

    const fetchBestScore = async () => {
      try {
        const res = await fetch('/api/game-rankings');
        if (!res.ok) {
          throw new Error('Failed to fetch rankings');
        }
        const data = (await res.json()) as RankingRow[];
        const myRow = data.find((row) => row.user_name === currentUser && row.game_type === 'brain_training');
        setBestScore(Number(myRow?.best_value ?? 0));
      } catch (err) {
        console.error(err);
      }
    };

    fetchBestScore();
  }, [currentUser]);

  const score = useMemo(() => flippedCount, [flippedCount]);
  const isAllMatched = useMemo(() => matchedPairs >= totalPairs && totalPairs > 0, [matchedPairs, totalPairs]);

  const startLevel = (selectedLevel: number) => {
    const generated = generateDeck(selectedLevel);
    setLevel(selectedLevel);
    setGridSize(generated.gridSize);
    setCards(generated.cards);
    setOpenedIndices([]);
    setLockBoard(false);
    setFlippedCount(0);
    setMatchedPairs(0);
    setTotalPairs(Math.floor((generated.gridSize * generated.gridSize) / 2));
    setSaved(false);
    setResultScore(0);
    setResultBestScore(bestScore);
    setIsNewBest(false);
    setResultTitle('');
    setPhase('memorize');
    setMessage('盤面を覚えてください。「覚えた」を押すとスタートします。');
  };

  const saveResult = async (finalScore: number, bestLevel: number) => {
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
          extraValue: bestLevel,
        }),
      });
      setBestScore((prev) => Math.max(prev, finalScore));
      setSaved(true);
    } catch (err) {
      console.error(err);
    }
  };

  const finishGame = async (title: string, finalScore: number) => {
    const nextBestScore = Math.max(bestScore, finalScore);
    setPhase('finished');
    setResultTitle(title);
    setResultScore(finalScore);
    setResultBestScore(nextBestScore);
    setIsNewBest(finalScore > bestScore);
    setMessage(title);
    await saveResult(finalScore, level ?? 1);
  };

  const handleRemembered = () => {
    if (phase !== 'memorize') return;
    setPhase('playing');
    setMessage('神経衰弱スタート！2枚ずつめくってペアを揃えてください。');
  };

  const handleCardClick = (index: number) => {
    if (phase !== 'playing' || lockBoard) return;
    const card = cards[index];
    if (!card || card.isMatched) return;
    if (openedIndices.includes(index)) return;

    const nextScore = flippedCount + 1;
    setFlippedCount(nextScore);

    const nextOpened = [...openedIndices, index];
    setOpenedIndices(nextOpened);

    if (nextOpened.length < 2) return;

    setLockBoard(true);

    const [firstIndex, secondIndex] = nextOpened;
    const first = cards[firstIndex];
    const second = cards[secondIndex];

    if (first.value === second.value) {
      const nextCards = cards.map((item, cardIndex) =>
        cardIndex === firstIndex || cardIndex === secondIndex ? { ...item, isMatched: true } : item,
      );
      const nextMatchedPairs = matchedPairs + 1;
      setCards(nextCards);
      setMatchedPairs(nextMatchedPairs);
      setOpenedIndices([]);
      setLockBoard(false);
      setMessage('ナイス！ペア一致です。');

      if (nextMatchedPairs >= totalPairs && totalPairs > 0) {
        finishGame('全ペア達成！おめでとうございます。', nextScore);
      }
      return;
    }

    finishGame('不一致でゲームオーバーです。', nextScore);
  };

  const resetToLevelSelect = () => {
    setPhase('level-select');
    setLevel(null);
    setGridSize(4);
    setCards([]);
    setOpenedIndices([]);
    setLockBoard(false);
    setFlippedCount(0);
    setMatchedPairs(0);
    setTotalPairs(0);
    setSaved(false);
    setResultScore(0);
    setResultBestScore(bestScore);
    setIsNewBest(false);
    setResultTitle('');
    setMessage('レベルを選んで開始してください');
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#164e63,_#0f172a_60%,_#020617)] text-white">
      <header className="border-b border-cyan-300/20 bg-black/20 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs text-cyan-200">GAME / BRAIN TRAINING</p>
            <h1 className="text-2xl font-bold">脳トレ（神経衰弱）</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push('/game')} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">ランキングへ</button>
            <button onClick={() => router.push('/chat')} className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300">チャットへ</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="rounded-[2rem] border border-cyan-300/20 bg-slate-950/60 p-6 shadow-2xl shadow-cyan-500/10">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-cyan-200">スコア（めくれた枚数）</p>
              <p className="text-3xl font-black">{score}</p>
            </div>
            <div className="text-right text-sm text-white/80">
              <p>レベル: {level ? `${level} (${LEVEL_CONFIG[level].label})` : '-'}</p>
              <p>最高スコア: {bestScore}</p>
              <p>ペア: {matchedPairs}/{totalPairs}</p>
            </div>
          </div>

          {phase === 'level-select' && (
            <div className="rounded-2xl bg-white/5 p-5">
              <p className="text-sm text-cyan-200 mb-3">レベルを選択</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {Object.entries(LEVEL_CONFIG).map(([key, cfg]) => {
                  const numericKey = Number(key);
                  return (
                    <button
                      key={key}
                      onClick={() => startLevel(numericKey)}
                      className="rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-4 text-left transition hover:bg-cyan-400/20"
                    >
                      <p className="text-xs text-cyan-200">LEVEL {key}</p>
                      <p className="mt-1 text-lg font-bold">{cfg.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(phase === 'memorize' || phase === 'playing' || phase === 'finished') && (
            <>
              <div className="mb-4 rounded-xl bg-white/5 px-4 py-3 text-sm text-white/90">{message}</div>

              <div
                className="grid gap-2 sm:gap-3"
                style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
              >
                {cards.map((card, index) => {
                  const isOpen = phase === 'memorize' || card.isMatched || openedIndices.includes(index) || (phase === 'finished' && isAllMatched);
                  return (
                    <button
                      key={card.id}
                      onClick={() => handleCardClick(index)}
                      disabled={phase !== 'playing' || card.isMatched || openedIndices.includes(index) || lockBoard}
                      className={`aspect-square rounded-xl border text-xl transition sm:text-2xl md:text-3xl ${isOpen ? 'border-cyan-200/40 bg-cyan-300/20' : 'border-cyan-300/30 bg-cyan-500/10 hover:bg-cyan-500/20'} disabled:cursor-default`}
                    >
                      {isOpen ? card.value : '?'}
                    </button>
                  );
                })}
              </div>

              {phase === 'finished' && (
                <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-5">
                  <p className="text-sm text-cyan-200">結果</p>
                  <h2 className="mt-2 text-2xl font-bold">{resultTitle}</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-white/10 px-4 py-3">
                      <p className="text-xs text-white/70">今回のスコア</p>
                      <p className="mt-1 text-2xl font-black">{resultScore}</p>
                    </div>
                    <div className="rounded-xl bg-white/10 px-4 py-3">
                      <p className="text-xs text-white/70">最高スコア</p>
                      <p className="mt-1 text-2xl font-black">{resultBestScore}</p>
                    </div>
                  </div>
                  {isNewBest && (
                    <p className="mt-3 text-sm font-semibold text-emerald-300">新記録を更新しました。</p>
                  )}
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                {phase === 'memorize' && (
                  <button
                    onClick={handleRemembered}
                    className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
                  >
                    覚えた
                  </button>
                )}
                <button
                  onClick={resetToLevelSelect}
                  className="rounded-full bg-white/10 px-5 py-2 text-sm font-semibold hover:bg-white/20"
                >
                  レベル選択画面へ
                </button>
                {phase === 'finished' && (
                  <button
                    onClick={resetToLevelSelect}
                    className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
                  >
                    レベル選択画面へ戻る
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
