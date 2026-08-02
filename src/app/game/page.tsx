'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type MessageFontSize = 'small' | 'medium' | 'large';

interface RankingRow {
  id: number;
  user_name: string;
  game_type: string;
  cumulative_value: number;
  best_value: number;
  extra_value: number;
}

type RankingGroupKey = 'millionaire_total' | 'millionaire_best' | 'brain_training' | 'spot_difference';

function renderRankingScore(row: RankingRow, gameType: RankingGroupKey) {
  if (gameType === 'millionaire_total') {
    return `¥${Number(row.cumulative_value).toLocaleString('ja-JP')}`;
  }
  if (gameType === 'millionaire_best') {
    return `¥${Number(row.best_value).toLocaleString('ja-JP')}`;
  }
  if (gameType === 'brain_training') {
    return `${Number(row.cumulative_value).toLocaleString('ja-JP')}`;
  }
  if (gameType === 'spot_difference') {
    return `${Number(row.best_value).toLocaleString('ja-JP')}打`;
  }
  return `${row.cumulative_value}`;
}

const GAME_LABELS: Record<string, string> = {
  millionaire_total: 'クイズ$ミリオネア 総獲得金額',
  millionaire_best: 'クイズ$ミリオネア 最高獲得金額',
  brain_training: '脳トレ',
  spot_difference: '鼻ほじり',
};

export default function GameHubPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState('');
  const [rankings, setRankings] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageFontSize, setMessageFontSize] = useState<MessageFontSize>('medium');

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
    const saved = localStorage.getItem(`messageFontSize:${currentUser}`) as MessageFontSize | null;
    if (saved === 'small' || saved === 'medium' || saved === 'large') {
      setMessageFontSize(saved);
    } else {
      setMessageFontSize('medium');
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const fetchRankings = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/game-rankings');
        if (!res.ok) {
          throw new Error('Failed to fetch rankings');
        }
        const data = (await res.json()) as RankingRow[];
        setRankings(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [currentUser]);

  const grouped = useMemo(() => {
    const millionaireRows = rankings.filter((row) => row.game_type === 'millionaire');

    return [
      {
        key: 'millionaire_total' as const,
        rows: [...millionaireRows]
          .sort((a, b) => {
            if (b.cumulative_value !== a.cumulative_value) return b.cumulative_value - a.cumulative_value;
            if (b.best_value !== a.best_value) return b.best_value - a.best_value;
            return b.extra_value - a.extra_value;
          })
          .slice(0, 10),
      },
      {
        key: 'millionaire_best' as const,
        rows: [...millionaireRows]
          .sort((a, b) => {
            if (b.best_value !== a.best_value) return b.best_value - a.best_value;
            if (b.cumulative_value !== a.cumulative_value) return b.cumulative_value - a.cumulative_value;
            return b.extra_value - a.extra_value;
          })
          .slice(0, 10),
      },
      {
        key: 'brain_training' as const,
        rows: [...rankings.filter((row) => row.game_type === 'brain_training')]
          .sort((a, b) => {
            if (b.cumulative_value !== a.cumulative_value) return b.cumulative_value - a.cumulative_value;
            return b.best_value - a.best_value;
          })
          .slice(0, 10),
      },
      {
        key: 'spot_difference' as const,
        rows: [...rankings.filter((row) => row.game_type === 'spot_difference')]
        .sort((a, b) => {
          const scoreA = a.best_value === 0 ? Number.MAX_SAFE_INTEGER : a.best_value;
          const scoreB = b.best_value === 0 ? Number.MAX_SAFE_INTEGER : b.best_value;
          if (scoreA !== scoreB) return scoreA - scoreB;
          return b.extra_value - a.extra_value;
        })
        .slice(0, 10),
      },
    ];
  }, [rankings]);

  const textSizeClass =
    messageFontSize === 'small'
      ? 'text-xs'
      : messageFontSize === 'large'
        ? 'text-3xl'
        : 'text-sm';

  const secondaryTextSizeClass =
    messageFontSize === 'small'
      ? 'text-xs'
      : messageFontSize === 'large'
        ? 'text-2xl'
        : 'text-sm';

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-950 via-slate-950 to-slate-900 text-white">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs text-violet-200">MINE GAME ROOM</p>
            <h1 className="text-2xl font-bold">ゲームセンター</h1>
          </div>
          <button
            onClick={() => router.push('/chat')}
            className="rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold hover:bg-violet-400"
          >
            チャットへ戻る
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="grid gap-4 md:grid-cols-3">
          <Link href="/game/millionaire" className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5 shadow-lg shadow-amber-500/10 transition hover:-translate-y-1 hover:bg-amber-400/15">
            <h2 className="mt-2 text-2xl font-bold">クイズ$ミリオネア</h2>
          </Link>
          <Link href="/game/brain-training" className="rounded-3xl border border-cyan-400/30 bg-cyan-400/10 p-5 shadow-lg shadow-cyan-500/10 transition hover:-translate-y-1 hover:bg-cyan-400/15">
            <h2 className="mt-2 text-2xl font-bold">神経衰弱</h2>
          </Link>
          <Link href="/game/spot-difference" className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-5 shadow-lg shadow-emerald-500/10 transition hover:-translate-y-1 hover:bg-emerald-400/15">
            <h2 className="mt-2 text-2xl font-bold">鼻ほじり</h2>
          </Link>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div>
            <h2 className="text-xl font-bold">ランキング</h2>
          </div>

          {loading ? (
            <p className={`mt-4 text-white/70 ${textSizeClass}`}>読込中...</p>
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              {grouped.map(({ key, rows }) => (
                <div key={key} className="rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
                  <h3 className="text-lg font-semibold">{GAME_LABELS[key]}</h3>
                  <table className={`mt-3 w-full border-collapse ${textSizeClass}`}>
                    <thead>
                      <tr className="border-b border-white/20 text-left text-white/60">
                        <th className="px-2 py-2 font-semibold">順位</th>
                        <th className="px-2 py-2 font-semibold">名前</th>
                        <th className="px-2 py-2 text-right font-semibold">スコア</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[0, 1, 2, 3, 4].map((index) => {
                        const row = rows[index];
                        return (
                          <tr key={index} className="border-b border-white/10">
                            <td className="whitespace-nowrap px-2 py-2 font-bold text-amber-300">{index + 1}</td>
                            <td className="px-2 py-2 font-semibold">{row ? row.user_name : '---'}</td>
                            <td className="whitespace-nowrap px-2 py-2 text-right">{row ? renderRankingScore(row, key) : '---'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
