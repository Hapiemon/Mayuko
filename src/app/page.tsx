'use client';

import { useRouter } from 'next/navigation';

const USERS = [
  { name: 'まゆこ', color: 'bg-pink-400' },
  { name: 'だいや', color: 'bg-blue-400' },
  { name: 'あつと', color: 'bg-green-400' },
  { name: 'せれな', color: 'bg-purple-400' },
  { name: 'るちえ', color: 'bg-amber-400' },
];

export default function Home() {
  const router = useRouter();

  const selectUser = (name: string) => {
    sessionStorage.setItem('chatUser', name);
    router.push('/chat');
  };

  return (
    <main className="min-h-dvh bg-gradient-to-b from-violet-100 to-pink-100 px-4 py-6">
      <div className="w-full max-w-sm mx-auto bg-white rounded-2xl shadow-lg p-5">
        <h1 className="text-2xl font-bold text-center text-violet-700 mb-1">Mayuko Chat</h1>
        <p className="text-center text-gray-500 mb-5 text-sm">ユーザーを選んでください</p>
        <div className="grid grid-cols-2 gap-3">
          {USERS.map((user) => (
            <button
              key={user.name}
              onClick={() => selectUser(user.name)}
              className={`${user.color} active:scale-95 transition-all text-white font-bold rounded-xl py-6 text-lg shadow-sm flex items-center justify-center`}
            >
              {user.name}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
