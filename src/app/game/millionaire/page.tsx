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
  answer_key?: 'A' | 'B' | 'C' | 'D';
  question_number?: number;
  prize_amount?: number;
}

const PRIZE_LADDER = [10000, 20000, 30000, 50000, 100000, 150000, 250000, 500000, 750000, 1000000, 1500000, 2500000, 5000000, 7500000, 10000000];
const CHOICE_LABELS = ['A', 'B', 'C', 'D'] as const;
const FIRST_SAFETY_NET = 100000;
const SECOND_SAFETY_NET = 1000000;
const MINOMONTA_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220"><rect width="220" height="220" rx="36" fill="#f59e0b"/><circle cx="110" cy="95" r="58" fill="#fcd29f"/><circle cx="88" cy="92" r="6" fill="#111827"/><circle cx="132" cy="92" r="6" fill="#111827"/><path d="M82 120c12 14 44 14 56 0" stroke="#111827" stroke-width="8" stroke-linecap="round" fill="none"/><rect x="62" y="32" width="96" height="28" rx="14" fill="#1f2937"/><text x="110" y="52" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#fef3c7">みのもんた</text></svg>`)}`;

type MillionaireRanking = {
  cumulative_value: number;
  best_value: number;
  extra_value: number;
};

type LifelineState = {
  fiftyUsed: boolean;
  phoneUsed: boolean;
  safetyUsed: boolean;
  safetyArmed: boolean;
};

type ResultModalState = {
  open: boolean;
  title: string;
  body: string;
  isSuccess: boolean;
  primaryLabel: string;
  primaryAction: 'next' | 'result' | 'retry' | 'close';
  secondaryLabel?: string;
  secondaryAction?: 'retry' | 'close';
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
  const [rankingStats, setRankingStats] = useState<MillionaireRanking>({ cumulative_value: 0, best_value: 0, extra_value: 0 });
  const [resultBestPrize, setResultBestPrize] = useState(0);
  const [resultTotalPrize, setResultTotalPrize] = useState(0);
  const [resultCurrentPrize, setResultCurrentPrize] = useState(0);
  const [confirmChoiceNumber, setConfirmChoiceNumber] = useState<number | null>(null);
  const [selectedChoiceText, setSelectedChoiceText] = useState('');
  const [resultModal, setResultModal] = useState<ResultModalState>({ open: false, title: '', body: '', isSuccess: false, primaryLabel: '閉じる', primaryAction: 'close' });

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

  useEffect(() => {
    if (!currentUser) return;

    const loadRanking = async () => {
      try {
        const res = await fetch('/api/game-rankings');
        if (!res.ok) {
          throw new Error('failed');
        }
        const data = (await res.json()) as Array<{ user_name: string; game_type: string; cumulative_value: number; best_value: number; extra_value: number }>;
        const row = data.find((item) => item.user_name === currentUser && item.game_type === 'millionaire');
        setRankingStats({
          cumulative_value: Number(row?.cumulative_value ?? 0),
          best_value: Number(row?.best_value ?? 0),
          extra_value: Number(row?.extra_value ?? 0),
        });
      } catch (err) {
        console.error(err);
      }
    };

    loadRanking();
  }, [currentUser]);

  const buildStageQuestions = (source: QuizQuestion[]) => {
    const pool = [...source];
    const chosen: QuizQuestion[] = [];

    for (let questionNumber = 1; questionNumber <= 15; questionNumber += 1) {
      const exact = pool.filter((item) => (item.question_number ?? 0) === questionNumber);
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
  const currentPrizeValue = PRIZE_LADDER[currentStage] ?? 0;
  const safePrize = wonPrize >= SECOND_SAFETY_NET ? SECOND_SAFETY_NET : wonPrize >= FIRST_SAFETY_NET ? FIRST_SAFETY_NET : 0;

  const getAnswerKey = (question: QuizQuestion) => question.answer_key ?? CHOICE_LABELS[(question.answer_index - 1) as 0 | 1 | 2 | 3];

  const visibleChoices = useMemo(() => {
    if (!currentQuestion) return [];
    return [currentQuestion.choice_1, currentQuestion.choice_2, currentQuestion.choice_3, currentQuestion.choice_4].map((text, index) => ({
      number: index + 1,
      label: CHOICE_LABELS[index],
      text,
      hidden: hiddenChoices.includes(index + 1),
    }));
  }, [currentQuestion, hiddenChoices]);

  const saveRanking = async (prize: number, cleared: boolean) => {
    if (!currentUser || saved) {
      return {
        bestPrize: Math.max(rankingStats.best_value, prize),
        totalPrize: rankingStats.cumulative_value + prize,
      };
    }
    try {
      await fetch('/api/game-rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: currentUser,
          gameType: 'millionaire',
          cumulativeDelta: prize,
          bestValue: prize,
          extraValue: rankingStats.extra_value + (cleared ? 1 : 0),
        }),
      });
      setSaved(true);
      const next = {
        cumulative_value: rankingStats.cumulative_value + prize,
        best_value: Math.max(rankingStats.best_value, prize),
        extra_value: rankingStats.extra_value + (cleared ? 1 : 0),
      };
      setRankingStats(next);
      return {
        bestPrize: next.best_value,
        totalPrize: next.cumulative_value,
      };
    } catch (err) {
      console.error(err);
      return {
        bestPrize: Math.max(rankingStats.best_value, prize),
        totalPrize: rankingStats.cumulative_value + prize,
      };
    }
  };

  const finishGame = async (message: string, prize: number, cleared: boolean) => {
    setFinished(true);
    setWonPrize(prize);
    setStatus(message);
    setResultCurrentPrize(prize);
    const result = await saveRanking(prize, cleared);
    setResultBestPrize(result.bestPrize);
    setResultTotalPrize(result.totalPrize);
  };

  const openConfirm = (choiceNumber: number) => {
    if (!currentQuestion || finished || answeredStage === currentStage) return;
    const selected = visibleChoices.find((choice) => choice.number === choiceNumber);
    setConfirmChoiceNumber(choiceNumber);
    setSelectedChoiceText(selected?.text ?? '');
  };

  const handleFinalAnswer = async () => {
    if (!currentQuestion || confirmChoiceNumber === null || finished || answeredStage === currentStage) return;

    const choiceNumber = confirmChoiceNumber;
    setConfirmChoiceNumber(null);
    setAnsweredStage(currentStage);
    const isCorrect = choiceNumber === currentQuestion.answer_index;

    if (isCorrect) {
      const prize = currentQuestion.prize_amount ?? currentPrizeValue;
      setWonPrize(prize);

      if (currentStage === 14 || currentStage === stageQuestions.length - 1) {
        await finishGame('🎉 全問正解でクリア！', prize, true);
        setResultModal({
          open: true,
          title: '🎉 全問正解でクリア！',
          body: `¥${new Intl.NumberFormat('ja-JP').format(prize)}を獲得しました。`,
          isSuccess: true,
          primaryLabel: '結果を見る',
          primaryAction: 'result',
          secondaryLabel: 'もう一度挑戦',
          secondaryAction: 'retry',
        });
        return;
      }

      setStatus(`正解！ ¥${new Intl.NumberFormat('ja-JP').format(prize)}獲得。`);
      setResultModal({
        open: true,
        title: '正解！',
        body: `¥${new Intl.NumberFormat('ja-JP').format(prize)}を獲得しました。`,
        isSuccess: true,
        primaryLabel: '次の問題へ',
        primaryAction: 'next',
      });
      return;
    }

    if (lifelines.safetyArmed) {
      setLifelines((prev) => ({ ...prev, safetyArmed: false, safetyUsed: true }));
      setAnsweredStage(null);
      setStatus('セイフティ発動！ 1回だけ復活しました。もう一度答えてください。');
      setResultModal({
        open: true,
        title: 'セイフティ発動！',
        body: '1回だけ復活しました。もう一度答えてください。',
        isSuccess: false,
        primaryLabel: '閉じる',
        primaryAction: 'close',
      });
      return;
    }

    await finishGame(
      `不正解… 正解は ${getAnswerKey(currentQuestion)} でした。セーフティネットにより ¥${safePrize.toLocaleString('ja-JP')} 獲得です。`,
      safePrize,
      false,
    );
    setResultModal({
      open: true,
      title: '不正解…',
      body: `正解は ${getAnswerKey(currentQuestion)} でした。セーフティネットにより ¥${safePrize.toLocaleString('ja-JP')} です。`,
      isSuccess: false,
      primaryLabel: 'リザルト画面',
      primaryAction: 'result',
      secondaryLabel: 'もう一度挑戦',
      secondaryAction: 'retry',
    });
  };

  const handleDropout = async () => {
    if (!currentQuestion || finished || answeredStage === currentStage) return;
    await finishGame(`ドロップアウトしました。¥${wonPrize.toLocaleString('ja-JP')} を獲得して終了です。`, wonPrize, false);
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
    setConfirmChoiceNumber(null);
    setSelectedChoiceText('');
    setResultModal({ open: false, title: '', body: '', isSuccess: false, primaryLabel: '閉じる', primaryAction: 'close' });
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
    setResultBestPrize(0);
    setResultTotalPrize(0);
    setResultCurrentPrize(0);
  };

  const handleModalPrimaryAction = () => {
    if (resultModal.primaryAction === 'next') {
      setResultModal({ open: false, title: '', body: '', isSuccess: false, primaryLabel: '閉じる', primaryAction: 'close' });
      setCurrentStage((prev) => prev + 1);
      setHiddenChoices([]);
      setAnsweredStage(null);
      return;
    }

    if (resultModal.primaryAction === 'retry') {
      restart();
      return;
    }

    if (resultModal.primaryAction === 'result') {
      setResultModal({ open: false, title: '', body: '', isSuccess: false, primaryLabel: '閉じる', primaryAction: 'close' });
      return;
    }

    setResultModal({ open: false, title: '', body: '', isSuccess: false, primaryLabel: '閉じる', primaryAction: 'close' });
  };

  const handleModalSecondaryAction = () => {
    if (resultModal.secondaryAction === 'retry') {
      restart();
      return;
    }
    setResultModal({ open: false, title: '', body: '', isSuccess: false, primaryLabel: '閉じる', primaryAction: 'close' });
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
            <h1 className="text-xl font-bold">クイズ$ミリオネア</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push('/game')} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">ランキング</button>
            <button onClick={() => router.push('/chat')} className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400">チャット</button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1.5fr_0.8fr]">
        <section className="rounded-[2rem] border border-amber-300/20 bg-slate-950/70 p-6 shadow-2xl shadow-amber-500/10 backdrop-blur">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-amber-200">現在獲得済み賞金</p>
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
            </div>
          ) : (
            <>
              <div className="rounded-[1.5rem] border border-amber-400/30 bg-[linear-gradient(135deg,_rgba(251,191,36,0.18),_rgba(15,23,42,0.1))] px-6 py-8 shadow-inner shadow-amber-400/10">
                <p className="text-sm text-amber-200">第{currentQuestion.question_number ?? stageNumber}問 / ¥{Number(currentQuestion.prize_amount ?? PRIZE_LADDER[currentStage] ?? 0).toLocaleString('ja-JP')}</p>
                <h2 className="mt-4 text-xl font-bold leading-relaxed md:text-2xl">{currentQuestion.question}</h2>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {visibleChoices.map((choice) => (
                  <button
                    key={choice.number}
                    disabled={choice.hidden || finished}
                    onClick={() => openConfirm(choice.number)}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${choice.hidden ? 'cursor-not-allowed border-white/10 bg-white/5 text-white/20' : 'border-blue-300/30 bg-blue-500/10 hover:border-amber-300/60 hover:bg-amber-500/15'}`}
                  >
                    <p className="text-xs text-amber-200">{choice.label}</p>
                    <p className="mt-1 text-base font-semibold">{choice.hidden ? '---' : choice.text}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="mt-5 rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/90">
            {status}
          </div>

          {!finished && (
            <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-3">
              <div>
                <p className="text-xs text-white/60">現在の問題</p>
                <p className="mt-1 font-semibold">第{stageNumber}問 / ¥{currentPrizeValue.toLocaleString('ja-JP')}</p>
              </div>
              <div>
                <p className="text-xs text-white/60">現在の保証金額</p>
                <p className="mt-1 font-semibold">¥{safePrize.toLocaleString('ja-JP')}</p>
              </div>
              <div>
                <p className="text-xs text-white/60">ドロップアウト時</p>
                <p className="mt-1 font-semibold">¥{wonPrize.toLocaleString('ja-JP')}</p>
              </div>
            </div>
          )}

          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold text-amber-200">ライフラインを使用する</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={useFifty} disabled={lifelines.fiftyUsed || !currentQuestion || finished} className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40">50:50</button>
              <button onClick={usePhone} disabled={lifelines.phoneUsed || !currentQuestion || finished} className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40">テレフォン</button>
              <button onClick={useSafety} disabled={lifelines.safetyUsed || lifelines.safetyArmed || finished} className="rounded-full bg-fuchsia-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40">セイフティ</button>
              <button onClick={handleDropout} disabled={!currentQuestion || finished || answeredStage === currentStage} className="rounded-full bg-rose-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40">ドロップアウト</button>
            </div>
          </div>

          {finished && (
            <div className="mt-5 rounded-[2rem] border border-amber-300/20 bg-amber-400/10 p-5 text-center">
              <p className="text-4xl font-black text-amber-200 md:text-5xl">結果</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-white/10 px-4 py-4">
                  <p className="text-sm text-white/70">今回獲得金額</p>
                  <p className="mt-1 text-3xl font-black">¥{resultCurrentPrize.toLocaleString('ja-JP')}</p>
                </div>
                <div className="rounded-xl bg-white/10 px-4 py-4">
                  <p className="text-sm text-white/70">最高獲得金額</p>
                  <p className="mt-1 text-3xl font-black">¥{resultBestPrize.toLocaleString('ja-JP')}</p>
                </div>
                <div className="rounded-xl bg-white/10 px-4 py-4">
                  <p className="text-sm text-white/70">総獲得金額</p>
                  <p className="mt-1 text-3xl font-black">¥{resultTotalPrize.toLocaleString('ja-JP')}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button onClick={restart} className="rounded-full bg-amber-400 px-5 py-2 font-semibold text-slate-950 hover:bg-amber-300">もう一度挑戦</button>
                <button onClick={() => router.push('/game')} className="rounded-full bg-white/10 px-5 py-2 font-semibold hover:bg-white/20">ランキングを見る</button>
              </div>
            </div>
          )}
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
                const isSafetyNet = prize === FIRST_SAFETY_NET || prize === SECOND_SAFETY_NET;
                return (
                  <li key={prize} className={`rounded-xl px-3 py-2 ${active ? 'bg-amber-400 text-slate-950' : cleared ? 'bg-emerald-400/20 text-emerald-200' : 'bg-white/5 text-white/80'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span>{originalIndex + 1}. ¥{prize.toLocaleString('ja-JP')}</span>
                      {isSafetyNet && <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-semibold">セーフティ</span>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </main>

      {confirmChoiceNumber !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-[2rem] border border-amber-300/30 bg-slate-950/95 p-6 shadow-2xl shadow-amber-500/20">
            <button onClick={() => setConfirmChoiceNumber(null)} className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-xl text-white/80 hover:bg-white/20">×</button>
            <div className="flex justify-center">
              <img src={MINOMONTA_IMAGE} alt="みのもんた" className="h-28 w-28 rounded-full border border-amber-300/30 object-cover" />
            </div>
            <h2 className="mt-4 text-center text-2xl font-black text-amber-300">ファイナルアンサー？</h2>
            <p className="mt-3 text-center text-sm leading-6 text-white/80">「{selectedChoiceText || '選択肢'}」で回答しますか？</p>
            <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-center">
              <p className="text-sm text-amber-200">この一手で勝敗が決まります</p>
              <button onClick={handleFinalAnswer} className="mt-3 rounded-full bg-amber-400 px-5 py-2.5 text-lg font-black text-slate-950 hover:bg-amber-300">ファイナルアンサー</button>
            </div>
          </div>
        </div>
      )}

      {resultModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950/95 p-6 shadow-2xl shadow-amber-500/10">
            <button onClick={handleModalPrimaryAction} className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-xl text-white/80 hover:bg-white/20">×</button>
            <div className="flex justify-center">
              <img src={MINOMONTA_IMAGE} alt="みのもんた" className="h-24 w-24 rounded-full border border-amber-300/30 object-cover" />
            </div>
            <h2 className={`mt-4 text-center text-2xl font-black ${resultModal.isSuccess ? 'text-amber-300' : 'text-rose-300'}`}>{resultModal.title}</h2>
            <p className="mt-3 text-center text-sm leading-6 text-white/80">{resultModal.body}</p>
            <div className="mt-5 flex flex-col gap-3">
              <button onClick={handleModalPrimaryAction} className={`rounded-full px-5 py-3 text-base font-black ${resultModal.isSuccess ? 'bg-amber-400 text-slate-950 hover:bg-amber-300' : 'bg-rose-400 text-slate-950 hover:bg-rose-300'}`}>{resultModal.primaryLabel}</button>
              {resultModal.secondaryLabel && (
                <button onClick={handleModalSecondaryAction} className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-base font-semibold text-white hover:bg-white/20">{resultModal.secondaryLabel}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
