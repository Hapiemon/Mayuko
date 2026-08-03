'use client';

import { useRouter } from 'next/navigation';

const USERS = [
  { name: 'まゆこ', color: 'bg-red-400' },
  { name: 'だいや', color: 'bg-blue-400' },
  { name: 'るちえ', color: 'bg-amber-400' },
  { name: 'あつと', color: 'bg-green-400' },
  { name: 'せれな', color: 'bg-purple-400' },
];

export default function Home() {
  const router = useRouter();

  const selectUser = async (name: string) => {
    sessionStorage.setItem('chatUser', name);
    // まゆこのみログイン通知を送信（自分以外に通知）
    if (name === 'まゆこ') fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'MINE',
        body: `${name}がログインしました`,
        url: '/chat',
        excludeUser: name,
      }),
    }).catch(() => {});
    router.push('/chat');
  };

  return (
    <main className="min-h-dvh bg-gradient-to-b from-violet-100 to-pink-100 px-4 py-6">
      <div className="w-full max-w-sm mx-auto bg-white rounded-2xl shadow-lg p-5">
        <h1 className="text-2xl font-bold text-center text-violet-700 mb-1">MINE</h1>
        <p className="text-center text-gray-500 mb-5 text-sm">ユーザーを選んでください</p>
        <div className="flex flex-col gap-3">
          {USERS.map((user) => (
            <button
              key={user.name}
              onClick={() => selectUser(user.name)}
              className={`${user.color} active:scale-95 transition-all text-white font-bold rounded-xl py-5 text-lg shadow-sm flex items-center justify-center`}
            >
              {user.name}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
