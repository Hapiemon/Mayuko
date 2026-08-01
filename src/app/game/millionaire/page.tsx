'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

interface QuizQuestion {
  id: number;
  question: string;
  choice_1: string;
  choice_2: string;
  choice_3: string;
  choice_4: string;
  answer_index: number;
  difficulty: number;
}

const PRIZE_LADDER = [1000, 3000, 5000, 10000, 30000, 50000, 100000, 300000, 500000, 1000000, 3000000, 5000000, 10000000, 30000000, 100000000];

type LifelineState = {
  fiftyUsed: boolean;
  phoneUsed: boolean;
  safetyUsed: boolean;
  safetyArmed: boolean;
};

export default function MillionairePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState('');
  const [allQuestions, setAllQuestions] = useState<QuizQuestion[]>([]);
  const [stageQuestions, setStageQuestions] = useState<QuizQuestion[]>([]);
  const [currentStage, setCurrentStage] = useState(0);
  const [hiddenChoices, setHiddenChoices] = useState<number[]>([]);
  const [lifelines, setLifelines] = useState<LifelineState>({ fiftyUsed: false, phoneUsed: false, safetyUsed: false, safetyArmed: false });
  const [status, setStatus] = useState('問題を準備しています...');
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [wonPrize, setWonPrize] = useState(0);
  const [answeredStage, setAnsweredStage] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

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

    const loadQuestions = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/quiz-questions');
        if (!res.ok) {
          throw new Error('failed');
        }
        const data = (await res.json()) as QuizQuestion[];
        setAllQuestions(data);
      } catch (err) {
        console.error(err);
        setStatus('問題の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, [currentUser]);

  const buildStageQuestions = (source: QuizQuestion[]) => {
    const pool = [...source];
    const chosen: QuizQuestion[] = [];

    for (let difficulty = 1; difficulty <= 15; difficulty += 1) {
      const exact = pool.filter((item) => item.difficulty === difficulty);
      const fallback = pool.filter((item) => !chosen.some((picked) => picked.id === item.id));
      const candidates = exact.length > 0 ? exact : fallback;
      if (candidates.length === 0) {
        break;
      }
      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      chosen.push(picked);
      const pickedIndex = pool.findIndex((item) => item.id === picked.id);
      if (pickedIndex >= 0) {
        pool.splice(pickedIndex, 1);
      }
    }

    return chosen;
  };

  useEffect(() => {
    if (allQuestions.length === 0) return;
    const next = buildStageQuestions(allQuestions);
    setStageQuestions(next);
    setCurrentStage(0);
    setHiddenChoices([]);
    setFinished(false);
    setWonPrize(0);
    setAnsweredStage(null);
    setSaved(false);
    setLifelines({ fiftyUsed: false, phoneUsed: false, safetyUsed: false, safetyArmed: false });
    setStatus(next.length >= 15 ? '第1問スタート' : `問題数が不足しています（${next.length}/15問で開始）`);
  }, [allQuestions]);

  const currentQuestion = stageQuestions[currentStage];
  const stageNumber = currentStage + 1;

  const visibleChoices = useMemo(() => {
    if (!currentQuestion) return [];
    return [currentQuestion.choice_1, currentQuestion.choice_2, currentQuestion.choice_3, currentQuestion.choice_4].map((text, index) => ({
      number: index + 1,
      text,
      hidden: hiddenChoices.includes(index + 1),
    }));
  }, [currentQuestion, hiddenChoices]);

  const saveRanking = async (prize: number, bestStage: number, clearCount: number) => {
    if (!currentUser || saved) return;
    try {
      await fetch('/api/game-rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: currentUser,
          gameType: 'millionaire',
          cumulativeDelta: prize,
          bestValue: bestStage,
          extraValue: clearCount,
        }),
      });
      setSaved(true);
    } catch (err) {
      console.error(err);
    }
  };

  const finishGame = async (message: string, prize: number, bestStage: number, clearCount: number) => {
    setFinished(true);
    setWonPrize(prize);
    setStatus(message);
    await saveRanking(prize, bestStage, clearCount);
  };

  const handleAnswer = async (choiceNumber: number) => {
    if (!currentQuestion || finished || answeredStage === currentStage) return;

    setAnsweredStage(currentStage);
    const isCorrect = choiceNumber === currentQuestion.answer_index;

    if (isCorrect) {
      const prize = PRIZE_LADDER[currentStage] ?? wonPrize;
      if (currentStage === 14 || currentStage === stageQuestions.length - 1) {
        await finishGame('🎉 全問正解でクリア！', prize, stageNumber, 1);
        return;
      }

      setWonPrize(prize);
      setStatus(`正解！ ${new Intl.NumberFormat('ja-JP').format(prize)}円獲得。次の問題へ。`);
      window.setTimeout(() => {
        setCurrentStage((prev) => prev + 1);
        setHiddenChoices([]);
        setAnsweredStage(null);
      }, 900);
      return;
    }

    if (lifelines.safetyArmed) {
      setLifelines((prev) => ({ ...prev, safetyArmed: false, safetyUsed: true }));
      setAnsweredStage(null);
      setStatus('セイフティ発動！ 1回だけ復活しました。もう一度答えてください。');
      return;
    }

    await finishGame(
      `不正解… 正解は ${currentQuestion.answer_index}番でした。`,
      wonPrize,
      Math.max(currentStage, 0),
      0,
    );
  };

  const useFifty = () => {
    if (!currentQuestion || lifelines.fiftyUsed || lifelines.phoneUsed) return;
    const wrongChoices = [1, 2, 3, 4].filter((num) => num !== currentQuestion.answer_index);
    const shuffled = [...wrongChoices].sort(() => Math.random() - 0.5);
    setHiddenChoices(shuffled.slice(0, 2));
    setLifelines((prev) => ({ ...prev, fiftyUsed: true }));
    setStatus('50:50を使用しました。');
  };

  const usePhone = () => {
    if (!currentQuestion || lifelines.phoneUsed) return;
    const wrongChoices = [1, 2, 3, 4].filter((num) => num !== currentQuestion.answer_index);
    setHiddenChoices(wrongChoices);
    setLifelines((prev) => ({ ...prev, phoneUsed: true }));
    setStatus('テレフォンで正解候補を1つに絞りました。');
  };

  const useSafety = () => {
    if (lifelines.safetyUsed || lifelines.safetyArmed) return;
    setLifelines((prev) => ({ ...prev, safetyArmed: true }));
    setStatus('セイフティ待機中。次の不正解を1回だけ無効化します。');
  };

  const restart = () => {
    const next = buildStageQuestions(allQuestions);
    setStageQuestions(next);
    setCurrentStage(0);
    setHiddenChoices([]);
    setLifelines({ fiftyUsed: false, phoneUsed: false, safetyUsed: false, safetyArmed: false });
    setStatus('第1問スタート');
    setFinished(false);
    setWonPrize(0);
    setAnsweredStage(null);
    setSaved(false);
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#312e81,_#0f172a_55%,_#020617)] text-white">
      <header className="border-b border-amber-400/20 bg-black/30 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs text-amber-200">GAME / MILLIONAIRE</p>
            <h1 className="text-2xl font-bold">クイズミリオネア</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push('/game')} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">ランキングへ</button>
            <button onClick={() => router.push('/chat')} className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400">チャットへ</button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1.5fr_0.8fr]">
        <section className="rounded-[2rem] border border-amber-300/20 bg-slate-950/70 p-6 shadow-2xl shadow-amber-500/10 backdrop-blur">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-amber-200">現在賞金</p>
              <p className="text-3xl font-black text-amber-300">¥{wonPrize.toLocaleString('ja-JP')}</p>
            </div>
            <div className="rounded-full bg-white/10 px-4 py-2 text-sm">
              第{stageNumber}問 / 15問
            </div>
          </div>

          {loading ? (
            <p className="rounded-2xl bg-white/5 px-4 py-10 text-center text-white/70">問題を読込中...</p>
          ) : !currentQuestion ? (
            <div className="rounded-2xl bg-white/5 px-4 py-10 text-center text-white/80">
              <p>問題が足りません。設定画面から追加してください。</p>
              <button onClick={() => router.push('/settings')} className="mt-4 rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold hover:bg-violet-400">問題管理へ</button>
            </div>
          ) : (
            <>
              <div className="rounded-[1.5rem] border border-amber-400/30 bg-[linear-gradient(135deg,_rgba(251,191,36,0.18),_rgba(15,23,42,0.1))] px-6 py-8 shadow-inner shadow-amber-400/10">
                <p className="text-sm text-amber-200">難易度 Lv.{currentQuestion.difficulty}</p>
                <h2 className="mt-4 text-xl font-bold leading-relaxed md:text-2xl">{currentQuestion.question}</h2>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {visibleChoices.map((choice) => (
                  <button
                    key={choice.number}
                    disabled={choice.hidden || finished}
                    onClick={() => handleAnswer(choice.number)}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${choice.hidden ? 'cursor-not-allowed border-white/10 bg-white/5 text-white/20' : 'border-blue-300/30 bg-blue-500/10 hover:border-amber-300/60 hover:bg-amber-500/15'}`}
                  >
                    <p className="text-xs text-amber-200">{choice.number}</p>
                    <p className="mt-1 text-base font-semibold">{choice.hidden ? '---' : choice.text}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="mt-5 rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/90">
            {status}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={useFifty} disabled={lifelines.fiftyUsed || !currentQuestion || finished} className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40">50:50</button>
            <button onClick={usePhone} disabled={lifelines.phoneUsed || !currentQuestion || finished} className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40">テレフォン</button>
            <button onClick={useSafety} disabled={lifelines.safetyUsed || lifelines.safetyArmed || finished} className="rounded-full bg-fuchsia-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40">セイフティ</button>
            <button onClick={restart} disabled={allQuestions.length === 0} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-40">最初から</button>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[2rem] border border-white/10 bg-black/25 p-4 backdrop-blur">
            <p className="text-sm text-white/60">ライフライン</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="rounded-xl bg-white/5 px-3 py-2">50:50: {lifelines.fiftyUsed ? '使用済み' : '未使用'}</li>
              <li className="rounded-xl bg-white/5 px-3 py-2">テレフォン: {lifelines.phoneUsed ? '使用済み' : '未使用'}</li>
              <li className="rounded-xl bg-white/5 px-3 py-2">セイフティ: {lifelines.safetyUsed ? '使用済み' : lifelines.safetyArmed ? '待機中' : '未使用'}</li>
            </ul>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/25 p-4 backdrop-blur">
            <p className="text-sm text-white/60">賞金ラダー</p>
            <ol className="mt-3 space-y-2 text-sm">
              {[...PRIZE_LADDER].reverse().map((prize, index) => {
                const originalIndex = PRIZE_LADDER.length - 1 - index;
                const active = currentStage === originalIndex && !finished;
                const cleared = wonPrize >= prize;
                return (
                  <li key={prize} className={`rounded-xl px-3 py-2 ${active ? 'bg-amber-400 text-slate-950' : cleared ? 'bg-emerald-400/20 text-emerald-200' : 'bg-white/5 text-white/80'}`}>
                    {originalIndex + 1}. ¥{prize.toLocaleString('ja-JP')}
                  </li>
                );
              })}
            </ol>
          </div>

          {finished && (
            <div className="rounded-[2rem] border border-amber-300/20 bg-amber-400/10 p-4">
              <p className="text-sm text-amber-200">結果</p>
              <p className="mt-2 text-lg font-bold">獲得賞金: ¥{wonPrize.toLocaleString('ja-JP')}</p>
              <p className="mt-1 text-sm text-white/80">到達: 第{Math.max(currentStage, wonPrize > 0 ? currentStage + 1 : 1)}問</p>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
