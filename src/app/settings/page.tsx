'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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

const emptyForm = {
  question: '',
  choice1: '',
  choice2: '',
  choice3: '',
  choice4: '',
  answerIndex: 1,
  difficulty: 1,
};

export default function SettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<string>('');
  const [isClearing, setIsClearing] = useState(false);
  const [isClearingRankings, setIsClearingRankings] = useState(false);
  const [message, setMessage] = useState('');
  const [rankingMessage, setRankingMessage] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [quizMessage, setQuizMessage] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<number | 'all'>('all');
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const user = sessionStorage.getItem('chatUser');
    if (!user) {
      router.push('/');
      return;
    }
    setCurrentUser(user);
  }, [router]);

  const fetchQuizQuestions = async () => {
    setLoadingQuiz(true);
    try {
      const query = difficultyFilter === 'all' ? '' : `?difficulty=${difficultyFilter}`;
      const res = await fetch(`/api/quiz-questions${query}`);
      if (!res.ok) {
        throw new Error('Failed to fetch quiz questions');
      }
      const data = (await res.json()) as QuizQuestion[];
      setQuizQuestions(data);
    } catch (err) {
      console.error(err);
      setQuizMessage('✗ 問題一覧の取得に失敗しました');
    } finally {
      setLoadingQuiz(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    fetchQuizQuestions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, difficultyFilter]);

  const handleClearMayukoRead = async () => {
    if (!window.confirm('すべてのメッセージをまゆこ未読にしますか？')) {
      return;
    }

    setIsClearing(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/clear-mayuko-read', {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Failed to clear read status');
      }

      setMessage('✓ すべてのメッセージをまゆこ未読にしました');
      setTimeout(() => {
        router.push('/chat');
      }, 1500);
    } catch (err) {
      console.error(err);
      setMessage('✗ エラーが発生しました');
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearAllGameRankings = async () => {
    if (!window.confirm('全ユーザーのゲームランキングを初期化しますか？')) {
      return;
    }

    setIsClearingRankings(true);
    setRankingMessage('');

    try {
      const res = await fetch('/api/game-rankings', {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to clear rankings');
      }

      setRankingMessage('✓ 全ユーザーのゲームランキングを初期化しました');
    } catch (err) {
      console.error(err);
      setRankingMessage('✗ ランキング初期化に失敗しました');
    } finally {
      setIsClearingRankings(false);
    }
  };

  const resetQuizForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingQuiz(true);
    setQuizMessage('');

    try {
      const payload = {
        id: editingId,
        question: form.question.trim(),
        choice1: form.choice1.trim(),
        choice2: form.choice2.trim(),
        choice3: form.choice3.trim(),
        choice4: form.choice4.trim(),
        answerIndex: Number(form.answerIndex),
        difficulty: Number(form.difficulty),
      };

      if (!payload.question || !payload.choice1 || !payload.choice2 || !payload.choice3 || !payload.choice4) {
        throw new Error('empty');
      }

      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch('/api/quiz-questions', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to save');
      }

      setQuizMessage(editingId ? '✓ 問題を更新しました' : '✓ 問題を追加しました');
      resetQuizForm();
      await fetchQuizQuestions();
    } catch (err) {
      console.error(err);
      setQuizMessage('✗ 問題の保存に失敗しました');
    } finally {
      setSavingQuiz(false);
    }
  };

  const handleQuizDelete = async (id: number) => {
    if (!window.confirm('この問題を削除しますか？')) {
      return;
    }

    setQuizMessage('');
    try {
      const res = await fetch('/api/quiz-questions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        throw new Error('Failed to delete');
      }

      if (editingId === id) {
        resetQuizForm();
      }
      setQuizMessage('✓ 問題を削除しました');
      await fetchQuizQuestions();
    } catch (err) {
      console.error(err);
      setQuizMessage('✗ 問題の削除に失敗しました');
    }
  };

  const startEdit = (item: QuizQuestion) => {
    setEditingId(item.id);
    setForm({
      question: item.question,
      choice1: item.choice_1,
      choice2: item.choice_2,
      choice3: item.choice_3,
      choice4: item.choice_4,
      answerIndex: item.answer_index,
      difficulty: item.difficulty,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!currentUser) {
    return <div className="flex items-center justify-center h-screen">読込中...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-violet-600 text-white px-4 py-3 shadow">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">設定</h1>
          <button
            onClick={() => router.push('/chat')}
            className="text-sm bg-violet-500 hover:bg-violet-400 px-3 py-1 rounded-full"
          >
            戻る
          </button>
        </div>
      </header>

      <div className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-violet-600">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">ミリオネア問題管理</h2>
                <p className="text-sm text-gray-600 mt-1">15段階の問題を追加・編集・削除できます。</p>
              </div>
              <button
                onClick={() => router.push('/game')}
                className="shrink-0 rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-600"
              >
                ゲームへ
              </button>
            </div>

            <form onSubmit={handleQuizSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">問題文</label>
                <textarea
                  value={form.question}
                  onChange={(e) => setForm((prev) => ({ ...prev, question: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  placeholder="問題文を入力"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((num) => (
                  <div key={num}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">選択肢{num}</label>
                    <input
                      value={form[`choice${num}` as keyof typeof form] as string}
                      onChange={(e) => setForm((prev) => ({ ...prev, [`choice${num}`]: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                      placeholder={`選択肢${num}`}
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">正解番号</label>
                  <select
                    value={form.answerIndex}
                    onChange={(e) => setForm((prev) => ({ ...prev, answerIndex: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  >
                    {[1, 2, 3, 4].map((num) => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">難易度</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm((prev) => ({ ...prev, difficulty: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  >
                    {Array.from({ length: 15 }, (_, i) => i + 1).map((level) => (
                      <option key={level} value={level}>Lv.{level}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={savingQuiz}
                  className="rounded-full bg-violet-500 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-600 disabled:opacity-50"
                >
                  {savingQuiz ? '保存中...' : editingId ? '問題を更新' : '問題を追加'}
                </button>
                <button
                  type="button"
                  onClick={resetQuizForm}
                  className="rounded-full bg-gray-200 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300"
                >
                  入力をクリア
                </button>
              </div>
            </form>

            {quizMessage && (
              <p className={`text-sm mt-3 ${quizMessage.includes('✓') ? 'text-green-600' : 'text-red-600'}`}>
                {quizMessage}
              </p>
            )}
          </div>

          {/* まゆこ未読リセット */}
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-violet-600">
            <h2 className="text-lg font-semibold mb-2 text-gray-800">まゆこ既読管理</h2>
            <p className="text-sm text-gray-600 mb-4">
              すべてのメッセージをまゆこ未読状態にリセットします。
            </p>
            <button
              onClick={handleClearMayukoRead}
              disabled={isClearing}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {isClearing ? '処理中...' : 'すべて未読にする'}
            </button>
            {message && (
              <p className={`text-sm mt-3 ${message.includes('✓') ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <h2 className="text-lg font-semibold mb-2 text-gray-800">ゲームランキング管理</h2>
            <p className="text-sm text-gray-600 mb-4">
              全ユーザーの全ゲーム記録を削除し、ランキングを初期化します。
            </p>
            <button
              onClick={handleClearAllGameRankings}
              disabled={isClearingRankings}
              className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {isClearingRankings ? '処理中...' : 'ランキングを初期化する'}
            </button>
            {rankingMessage && (
              <p className={`text-sm mt-3 ${rankingMessage.includes('✓') ? 'text-green-600' : 'text-red-600'}`}>
                {rankingMessage}
              </p>
            )}
          </div>

          {/* その他の情報 */}
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-300">
            <h2 className="text-lg font-semibold mb-2 text-gray-800">アカウント情報</h2>
            <p className="text-sm text-gray-600">
              現在のユーザー: <span className="font-semibold text-violet-600">{currentUser}</span>
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-amber-400">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">登録済み問題</h2>
                <p className="text-sm text-gray-600">難易度ごとに確認できます。</p>
              </div>
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="rounded-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                <option value="all">全難易度</option>
                {Array.from({ length: 15 }, (_, i) => i + 1).map((level) => (
                  <option key={level} value={level}>Lv.{level}</option>
                ))}
              </select>
            </div>

            {loadingQuiz ? (
              <p className="text-sm text-gray-500">読込中...</p>
            ) : quizQuestions.length === 0 ? (
              <p className="text-sm text-gray-500">問題がまだありません。</p>
            ) : (
              <div className="space-y-3">
                {quizQuestions.map((item) => (
                  <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-violet-600">Lv.{item.difficulty} / 正解: {item.answer_index}</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900 whitespace-pre-wrap">{item.question}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(item)}
                          className="rounded-full bg-violet-500 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-600"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleQuizDelete(item.id)}
                          className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                    <ol className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700 sm:grid-cols-2">
                      {[item.choice_1, item.choice_2, item.choice_3, item.choice_4].map((choice, index) => (
                        <li
                          key={`${item.id}-${index}`}
                          className={`rounded-lg px-3 py-2 ${item.answer_index === index + 1 ? 'bg-emerald-100 text-emerald-800 font-semibold' : 'bg-white'}`}
                        >
                          {index + 1}. {choice}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
