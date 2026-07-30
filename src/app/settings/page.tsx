'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<string>('');
  const [isClearing, setIsClearing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const user = sessionStorage.getItem('chatUser');
    if (!user) {
      router.push('/');
      return;
    }
    setCurrentUser(user);
  }, [router]);

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

          {/* その他の情報 */}
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-300">
            <h2 className="text-lg font-semibold mb-2 text-gray-800">アカウント情報</h2>
            <p className="text-sm text-gray-600">
              現在のユーザー: <span className="font-semibold text-violet-600">{currentUser}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
