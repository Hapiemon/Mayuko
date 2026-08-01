'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

interface RankingRow {
  id: number;
  user_name: string;
  game_type: string;
  cumulative_value: number;
  best_value: number;
  extra_value: number;
}

const GAME_LABELS: Record<string, string> = {
  millionaire: 'ミリオネア',
  brain_training: '脳トレ',
  spot_difference: '間違い探し',
};

export default function GameHubPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState('');
  const [rankings, setRankings] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);

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
    return ['millionaire', 'brain_training', 'spot_difference'].map((key) => ({
      key,
      rows: rankings.filter((row) => row.game_type === key).slice(0, 10),
    }));
  }, [rankings]);

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
            <p className="text-sm text-amber-200">15問連続正解でクリア</p>
            <h2 className="mt-2 text-2xl font-bold">💰 ミリオネア</h2>
            <p className="mt-3 text-sm text-white/80">50:50・テレフォン・セイフティを使って全15段を突破。</p>
          </Link>
          <Link href="/game/brain-training" className="rounded-3xl border border-cyan-400/30 bg-cyan-400/10 p-5 shadow-lg shadow-cyan-500/10 transition hover:-translate-y-1 hover:bg-cyan-400/15">
            <p className="text-sm text-cyan-200">レベル制の神経衰弱</p>
            <h2 className="mt-2 text-2xl font-bold">🧠 脳トレ</h2>
            <p className="mt-3 text-sm text-white/80">4×4〜8×8の盤面を暗記して、裏返し後にペアを揃える。めくれた枚数がスコア。</p>
          </Link>
          <Link href="/game/spot-difference" className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-5 shadow-lg shadow-emerald-500/10 transition hover:-translate-y-1 hover:bg-emerald-400/15">
            <p className="text-sm text-emerald-200">タップで探す全7ステージ</p>
            <h2 className="mt-2 text-2xl font-bold">🔎 間違い探し</h2>
            <p className="mt-3 text-sm text-white/80">左右の盤面から違う1マスを見つけてステージを進める。</p>
          </Link>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-violet-200">ランキング</p>
              <h2 className="text-xl font-bold">トップ10</h2>
            </div>
            <p className="rounded-full bg-white/10 px-3 py-1 text-sm">参加ユーザー: {currentUser}</p>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-white/70">読込中...</p>
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {grouped.map(({ key, rows }) => (
                <div key={key} className="rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
                  <h3 className="text-lg font-semibold">{GAME_LABELS[key]}</h3>
                  <div className="mt-3 space-y-2">
                    {rows.length === 0 ? (
                      <p className="text-sm text-white/60">まだ記録がありません。</p>
                    ) : (
                      rows.map((row, index) => (
                        <div key={row.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm">
                          <div>
                            <p className="font-semibold">{index + 1}. {row.user_name}</p>
                            <p className="text-white/60">
                              累計: {key === 'millionaire' ? `¥${Number(row.cumulative_value).toLocaleString('ja-JP')}` : row.cumulative_value}
                            </p>
                          </div>
                          <div className="text-right text-xs text-white/70">
                            <p>ベスト: {row.best_value}</p>
                            <p>補足: {row.extra_value}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
