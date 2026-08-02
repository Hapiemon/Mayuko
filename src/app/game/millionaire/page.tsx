'use client';

import { FAILURE_IMAGE, FINAL_ANSWER_IMAGE, SUCCESS_IMAGE, SUSPENSE_IMAGE } from './character-images';
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

type MessageFontSize = 'small' | 'medium' | 'large';

const FONT_SIZE_CLASSES = {
  small: {
    pageTitle: 'text-lg',
    headerButton: 'text-xs',
    sectionLabel: 'text-xs',
    prizeValue: 'text-2xl',
    badge: 'text-xs',
    questionMeta: 'text-xs',
    questionTitle: 'text-lg md:text-xl',
    choiceLabel: 'text-[10px]',
    choiceText: 'text-sm',
    status: 'text-xs',
    infoLabel: 'text-[10px]',
    infoValue: 'text-sm',
    lifelineLabel: 'text-xs',
    lifelineButton: 'text-xs',
    resultHeading: 'text-3xl md:text-4xl',
    resultLabel: 'text-xs',
    resultValue: 'text-2xl',
    resultButton: 'text-sm',
    ladderLabel: 'text-xs',
    ladderItem: 'text-xs',
    modalTitle: 'text-xl',
    modalBody: 'text-xs leading-5',
    modalButton: 'text-sm',
  },
  medium: {
    pageTitle: 'text-xl',
    headerButton: 'text-sm',
    sectionLabel: 'text-sm',
    prizeValue: 'text-3xl',
    badge: 'text-sm',
    questionMeta: 'text-sm',
    questionTitle: 'text-xl md:text-2xl',
    choiceLabel: 'text-xs',
    choiceText: 'text-base',
    status: 'text-sm',
    infoLabel: 'text-xs',
    infoValue: 'text-base',
    lifelineLabel: 'text-sm',
    lifelineButton: 'text-sm',
    resultHeading: 'text-4xl md:text-5xl',
    resultLabel: 'text-sm',
    resultValue: 'text-3xl',
    resultButton: 'text-base',
    ladderLabel: 'text-sm',
    ladderItem: 'text-sm',
    modalTitle: 'text-2xl',
    modalBody: 'text-sm leading-6',
    modalButton: 'text-base',
  },
  large: {
    pageTitle: 'text-2xl',
    headerButton: 'text-lg',
    sectionLabel: 'text-lg',
    prizeValue: 'text-4xl',
    badge: 'text-lg',
    questionMeta: 'text-lg',
    questionTitle: 'text-2xl md:text-3xl',
    choiceLabel: 'text-base',
    choiceText: 'text-xl',
    status: 'text-lg',
    infoLabel: 'text-sm',
    infoValue: 'text-xl',
    lifelineLabel: 'text-lg',
    lifelineButton: 'text-lg',
    resultHeading: 'text-5xl md:text-6xl',
    resultLabel: 'text-lg',
    resultValue: 'text-4xl',
    resultButton: 'text-xl',
    ladderLabel: 'text-lg',
    ladderItem: 'text-base',
    modalTitle: 'text-3xl',
    modalBody: 'text-lg leading-7',
    modalButton: 'text-xl',
  },
} as const;

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
  const [resultModal, setResultModal] = useState<ResultModalState>({ open: false, title: '', body: '', isSuccess: false, primaryLabel: '閉じる', primaryAction: 'close' });
  const [messageFontSize, setMessageFontSize] = useState<MessageFontSize>('medium');
  const [helpTopic, setHelpTopic] = useState<'lifeline' | 'dropout' | null>(null);
  const [introVisible, setIntroVisible] = useState(false);
  const [suspenseOpen, setSuspenseOpen] = useState(false);

  useEffect(() => {
    const user = sessionStorage.getItem('chatUser');
    if (!user) {
      router.push('/');
      return;
    }
    setCurrentUser(user);
    const savedFontSize = localStorage.getItem(`messageFontSize:${user}`) as MessageFontSize | null;
    if (savedFontSize === 'small' || savedFontSize === 'medium' || savedFontSize === 'large') {
      setMessageFontSize(savedFontSize);
    }
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
  const isModalOpen = confirmChoiceNumber !== null || resultModal.open || helpTopic !== null || suspenseOpen;
  const fs = FONT_SIZE_CLASSES[messageFontSize];

  const getAnswerKey = (question: QuizQuestion) => question.answer_key ?? CHOICE_LABELS[(question.answer_index - 1) as 0 | 1 | 2 | 3];

  useEffect(() => {
    if (!currentQuestion || finished) return;
    setIntroVisible(true);
    const timer = setTimeout(() => setIntroVisible(false), 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.id]);

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
    setConfirmChoiceNumber(choiceNumber);
  };

  const handleFinalAnswer = async () => {
    if (!currentQuestion || confirmChoiceNumber === null || finished || answeredStage === currentStage) return;

    const choiceNumber = confirmChoiceNumber;
    setConfirmChoiceNumber(null);
    setAnsweredStage(currentStage);
    const isCorrect = choiceNumber === currentQuestion.answer_index;

    setSuspenseOpen(true);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setSuspenseOpen(false);

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
      title: '残念…!',
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
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      setResultModal({ open: false, title: '', body: '', isSuccess: false, primaryLabel: '閉じる', primaryAction: 'close' });
      setConfirmChoiceNumber(null);
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
      <div className={isModalOpen ? 'pointer-events-none select-none' : ''}>
        <header className="border-b border-amber-400/20 bg-black/30 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <div>
              <p className={`${fs.badge} text-amber-200`}>GAME / MILLIONAIRE</p>
              <h1 className={`${fs.pageTitle} font-bold`}>クイズ$ミリオネア</h1>
            </div>
            <div className="flex gap-2">
              <button onClick={() => router.push('/game')} className={`rounded-full bg-white/10 px-4 py-2 ${fs.headerButton} font-semibold hover:bg-white/20`}>ランキング</button>
              <button onClick={() => router.push('/chat')} className={`rounded-full bg-amber-500 px-4 py-2 ${fs.headerButton} font-semibold text-slate-950 hover:bg-amber-400`}>チャット</button>
            </div>
          </div>
        </header>

        <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1.5fr_0.8fr]">
          <section className="rounded-[2rem] border border-amber-300/20 bg-slate-950/70 p-6 shadow-2xl shadow-amber-500/10 backdrop-blur">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={`${fs.sectionLabel} text-amber-200`}>現在獲得済み賞金</p>
              <p className={`${fs.prizeValue} font-black text-amber-300`}>¥{wonPrize.toLocaleString('ja-JP')}</p>
            </div>
            <div className={`rounded-full bg-white/10 px-4 py-2 ${fs.badge}`}>
              第{stageNumber}問 / 15問
            </div>
          </div>

          {loading ? (
            <p className={`rounded-2xl bg-white/5 px-4 py-10 text-center ${fs.status} text-white/70`}>問題を読込中...</p>
          ) : !currentQuestion ? (
            <div className={`rounded-2xl bg-white/5 px-4 py-10 text-center ${fs.status} text-white/80`}>
              <p>問題が足りません。設定画面から追加してください。</p>
            </div>
          ) : (
            <>
              <div className="rounded-[1.5rem] border border-amber-400/30 bg-[linear-gradient(135deg,_rgba(251,191,36,0.18),_rgba(15,23,42,0.1))] px-6 py-8 shadow-inner shadow-amber-400/10">
                {introVisible ? (
                  <div className="flex min-h-[8rem] items-center justify-center">
                    <p className={`${fs.resultHeading} animate-[introZoom_0.6s_ease-out] text-center font-black text-amber-300`}>
                      第{currentQuestion.question_number ?? stageNumber}問 / ¥{Number(currentQuestion.prize_amount ?? PRIZE_LADDER[currentStage] ?? 0).toLocaleString('ja-JP')}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className={`${fs.questionMeta} text-amber-200`}>第{currentQuestion.question_number ?? stageNumber}問 / ¥{Number(currentQuestion.prize_amount ?? PRIZE_LADDER[currentStage] ?? 0).toLocaleString('ja-JP')}</p>
                    <h2 className={`mt-4 ${fs.questionTitle} font-bold leading-relaxed`}>{currentQuestion.question}</h2>
                  </>
                )}
              </div>
              <style>{`
                @keyframes introZoom {
                  0% { transform: scale(0.4); opacity: 0; }
                  100% { transform: scale(1); opacity: 1; }
                }
              `}</style>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {visibleChoices.map((choice) => (
                  <button
                    key={choice.number}
                    disabled={choice.hidden || finished || introVisible}
                    onClick={() => openConfirm(choice.number)}
                    className={`rounded-2xl border px-4 py-4 text-left transition-transform duration-100 ${choice.hidden ? 'cursor-not-allowed border-white/10 bg-white/5 text-white/20' : introVisible ? 'invisible border-blue-300/30 bg-blue-500/10 opacity-0' : 'border-blue-300/30 bg-blue-500/10 active:scale-95 active:border-amber-300 active:bg-amber-500/30'}`}
                  >
                    <p className={`${fs.choiceLabel} text-amber-200`}>{choice.label}</p>
                    <p className={`mt-1 ${fs.choiceText} font-semibold`}>{choice.hidden ? '---' : choice.text}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className={`mt-5 rounded-2xl bg-white/5 px-4 py-3 ${fs.status} text-white/90`}>
            {status}
          </div>

          {!finished && (
            <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-3">
              <div>
                <p className={`${fs.infoLabel} text-white/60`}>現在の問題</p>
                <p className={`mt-1 ${fs.infoValue} font-semibold`}>第{stageNumber}問 / ¥{currentPrizeValue.toLocaleString('ja-JP')}</p>
              </div>
              <div>
                <p className={`${fs.infoLabel} text-white/60`}>現在の保証金額</p>
                <p className={`mt-1 ${fs.infoValue} font-semibold`}>¥{safePrize.toLocaleString('ja-JP')}</p>
              </div>
              <div>
                <p className={`${fs.infoLabel} text-white/60`}>ドロップアウト時</p>
                <p className={`mt-1 ${fs.infoValue} font-semibold`}>¥{wonPrize.toLocaleString('ja-JP')}</p>
              </div>
            </div>
          )}

          <div className="mt-5">
            <div className="mb-2 flex items-center gap-2">
              <p className={`${fs.lifelineLabel} font-semibold text-amber-200`}>ライフラインを使用する</p>
              <button
                onClick={() => setHelpTopic('lifeline')}
                aria-label="ライフラインの説明"
                className={`flex h-6 w-6 items-center justify-center rounded-full bg-white/15 ${fs.badge} font-bold text-amber-200 hover:bg-white/25`}
              >？</button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={useFifty} disabled={lifelines.fiftyUsed || !currentQuestion || finished} className={`rounded-full bg-sky-500 px-4 py-2 ${fs.lifelineButton} font-semibold text-slate-950 disabled:opacity-40`}>50:50</button>
              <button onClick={usePhone} disabled={lifelines.phoneUsed || !currentQuestion || finished} className={`rounded-full bg-emerald-400 px-4 py-2 ${fs.lifelineButton} font-semibold text-slate-950 disabled:opacity-40`}>テレフォン</button>
              <button onClick={useSafety} disabled={lifelines.safetyUsed || lifelines.safetyArmed || finished} className={`rounded-full bg-fuchsia-400 px-4 py-2 ${fs.lifelineButton} font-semibold text-slate-950 disabled:opacity-40`}>セイフティ</button>
            </div>

            <div className="mb-2 mt-5 flex items-center gap-2">
              <p className={`${fs.lifelineLabel} font-semibold text-amber-200`}>ドロップアウトする</p>
              <button
                onClick={() => setHelpTopic('dropout')}
                aria-label="ドロップアウトの説明"
                className={`flex h-6 w-6 items-center justify-center rounded-full bg-white/15 ${fs.badge} font-bold text-amber-200 hover:bg-white/25`}
              >？</button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleDropout} disabled={!currentQuestion || finished || answeredStage === currentStage} className={`rounded-full bg-rose-400 px-4 py-2 ${fs.lifelineButton} font-semibold text-slate-950 disabled:opacity-40`}>ドロップアウト</button>
            </div>
          </div>

          {finished && (
            <div className="mt-5 rounded-[2rem] border border-amber-300/20 bg-amber-400/10 p-5 text-center">
              <p className={`${fs.resultHeading} font-black text-amber-200`}>結果</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-white/10 px-4 py-4">
                  <p className={`${fs.resultLabel} text-white/70`}>今回獲得金額</p>
                  <p className={`mt-1 ${fs.resultValue} font-black`}>¥{resultCurrentPrize.toLocaleString('ja-JP')}</p>
                </div>
                <div className="rounded-xl bg-white/10 px-4 py-4">
                  <p className={`${fs.resultLabel} text-white/70`}>最高獲得金額</p>
                  <p className={`mt-1 ${fs.resultValue} font-black`}>¥{resultBestPrize.toLocaleString('ja-JP')}</p>
                </div>
                <div className="rounded-xl bg-white/10 px-4 py-4">
                  <p className={`${fs.resultLabel} text-white/70`}>総獲得金額</p>
                  <p className={`mt-1 ${fs.resultValue} font-black`}>¥{resultTotalPrize.toLocaleString('ja-JP')}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button onClick={restart} className={`rounded-full bg-amber-400 px-5 py-2 ${fs.resultButton} font-semibold text-slate-950 hover:bg-amber-300`}>もう一度挑戦</button>
                <button onClick={() => router.push('/game')} className={`rounded-full bg-white/10 px-5 py-2 ${fs.resultButton} font-semibold hover:bg-white/20`}>ランキングを見る</button>
              </div>
            </div>
          )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-[2rem] border border-white/10 bg-black/25 p-4 backdrop-blur">
              <p className={`${fs.ladderLabel} text-white/60`}>賞金ラダー</p>
              <ol className={`mt-3 space-y-2 ${fs.ladderItem}`}>
                {[...PRIZE_LADDER].reverse().map((prize, index) => {
                  const originalIndex = PRIZE_LADDER.length - 1 - index;
                  const active = currentStage === originalIndex && !finished;
                  const cleared = wonPrize >= prize;
                  const isSafetyNet = prize === FIRST_SAFETY_NET || prize === SECOND_SAFETY_NET;
                  return (
                    <li key={prize} className={`rounded-xl px-3 py-2 ${active ? 'bg-amber-400 text-slate-950' : cleared ? 'bg-emerald-400/20 text-emerald-200' : 'bg-white/5 text-white/80'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span>{originalIndex + 1}. ¥{prize.toLocaleString('ja-JP')}</span>
                        {isSafetyNet && <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-semibold">保証金額</span>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </aside>
        </main>
      </div>

      {confirmChoiceNumber !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-[2rem] border border-amber-300/30 bg-slate-950/95 p-6 shadow-2xl shadow-amber-500/20">
            <button onClick={() => setConfirmChoiceNumber(null)} className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-xl text-white/80 hover:bg-white/20">×</button>
            <div className="flex justify-center">
              <img src={FINAL_ANSWER_IMAGE} alt="ファイナルアンサー" className="max-h-52 w-auto rounded-xl object-contain" />
            </div>
            <h2 className={`mt-4 text-center ${fs.modalTitle} font-black text-amber-300`}>ファイナルアンサー？</h2>
            <button onClick={handleFinalAnswer} className={`mt-5 w-full rounded-full bg-amber-400 px-5 py-3 ${fs.modalButton} font-black text-slate-950 hover:bg-amber-300`}>ファイナルアンサー</button>
          </div>
        </div>
      )}

      {suspenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950/95 p-6 text-center shadow-2xl shadow-amber-500/10">
            <div className="flex justify-center">
              <img src={SUSPENSE_IMAGE} alt="みのもんた" className="max-h-64 w-auto rounded-xl object-contain" />
            </div>
            <p className={`mt-6 ${fs.modalTitle} font-black tracking-widest text-amber-300`}>.............</p>
          </div>
        </div>
      )}

      {resultModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950/95 p-6 shadow-2xl shadow-amber-500/10">
            <button onClick={handleModalPrimaryAction} className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-xl text-white/80 hover:bg-white/20">×</button>
            <div className="flex justify-center">
              <img src={resultModal.isSuccess ? SUCCESS_IMAGE : FAILURE_IMAGE} alt="みのもんた" className="max-h-52 w-auto rounded-xl object-contain" />
            </div>
            <h2 className={`mt-4 text-center ${fs.modalTitle} font-black ${resultModal.isSuccess ? 'text-amber-300' : 'text-rose-300'}`}>{resultModal.title}</h2>
            <p className={`mt-3 text-center ${fs.modalBody} text-white/80`}>{resultModal.body}</p>
            <div className="mt-5 flex flex-col gap-3">
              <button onClick={handleModalPrimaryAction} className={`rounded-full px-5 py-3 ${fs.modalButton} font-black ${resultModal.isSuccess ? 'bg-amber-400 text-slate-950 hover:bg-amber-300' : 'bg-rose-400 text-slate-950 hover:bg-rose-300'}`}>{resultModal.primaryLabel}</button>
              {resultModal.secondaryLabel && (
                <button onClick={handleModalSecondaryAction} className={`rounded-full border border-white/10 bg-white/10 px-5 py-3 ${fs.modalButton} font-semibold text-white hover:bg-white/20`}>{resultModal.secondaryLabel}</button>
              )}
            </div>
          </div>
        </div>
      )}

      {helpTopic !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm" onClick={() => setHelpTopic(null)}>
          <div className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950/95 p-6 shadow-2xl shadow-amber-500/10" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setHelpTopic(null)} className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-xl text-white/80 hover:bg-white/20">×</button>
            {helpTopic === 'lifeline' ? (
              <>
                <h2 className={`${fs.modalTitle} font-black text-amber-300`}>ライフラインとは？</h2>
                <div className={`mt-4 space-y-4 ${fs.modalBody} text-white/85`}>
                  <div>
                    <p className="font-bold text-sky-300">50:50</p>
                    <p className="mt-1">4つの選択肢のうち、不正解の選択肢を2つ消して、正解を選びやすくします。1ゲームに1回だけ使えます。</p>
                  </div>
                  <div>
                    <p className="font-bold text-emerald-300">テレフォン</p>
                    <p className="mt-1">不正解の選択肢をすべて消して、正解候補を1つに絞ります。1ゲームに1回だけ使えます。</p>
                  </div>
                  <div>
                    <p className="font-bold text-fuchsia-300">セイフティ</p>
                    <p className="mt-1">使用すると次に不正解になっても1回だけ無効になり、同じ問題にもう一度挑戦できます。1ゲームに1回だけ使えます。</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h2 className={`${fs.modalTitle} font-black text-rose-300`}>ドロップアウトとは？</h2>
                <div className={`mt-4 space-y-3 ${fs.modalBody} text-white/85`}>
                  <p>現在の問題に回答せず、その時点で獲得している賞金を持ち帰ってゲームを終了することです。</p>
                  <p>間違えるとセーフティネット（¥100,000 / ¥1,000,000）の金額まで賞金が下がってしまうため、自信がないときはドロップアウトして賞金を確保するのが有効な戦略です。</p>
                </div>
              </>
            )}
            <button onClick={() => setHelpTopic(null)} className={`mt-5 w-full rounded-full bg-white/10 px-5 py-3 ${fs.modalButton} font-semibold text-white hover:bg-white/20`}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}
