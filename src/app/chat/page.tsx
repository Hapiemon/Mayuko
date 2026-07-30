'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Message {
  id: number;
  sender: string;
  content: string | null;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  created_at: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [uploading, setUploading] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const [cannedOpen, setCannedOpen] = useState(false);
  const [activeCannedTab, setActiveCannedTab] = useState<'greeting'|'state'|'place'|'people'|'body'|'thing'|'syntax'>('greeting');

  const TABS: { key: 'greeting'|'state'|'place'|'people'|'body'|'thing'|'syntax'; label: string }[] = [
    { key: 'greeting', label: 'あいさつ系' },
    { key: 'state', label: '状態' },
    { key: 'place', label: '場所' },
    { key: 'people', label: '人名' },
    { key: 'body', label: '体のパーツ' },
    { key: 'thing', label: '物' },
    { key: 'syntax', label: '構文' },
  ];

  const CANNED_PHRASES: Record<string,string[]> = {
    greeting: ['おはよう','おやすみ','ありがとう','よろしく','お願いします','OK'],
    state: ['◯','×','大丈夫','しんどい','良い','悪い','楽しい','嬉しい','苦しい','悲しい','痛い'],
    place: ['健軍アパート','くもん','病院','おじいちゃん家','市役所','空港','熊本','東京'],
    people: ['おじいちゃん','ぼけまら','お姉ちゃん','あつと','妹','なんとか兄ちゃん','北海道のおばあちゃん'],
    body: ['あたま','腕','手','おなか','腰','背中','足','目','耳','鼻','口'],
    thing: ['スマホ','食べ物','飲み物','書類'],
    syntax: ['お願いします','不要です','してます','どうかな？'],
  };

  useEffect(() => {
    const user = sessionStorage.getItem('chatUser');
    if (!user) {
      router.push('/');
      return;
    }
    setCurrentUser(user);
  }, [router]);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/messages');
      if (!res.ok) return;
      const data = (await res.json()) as Message[];
      setMessages(data);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    fetchMessages();
    const id = setInterval(fetchMessages, 3000);
    return () => clearInterval(id);
  }, [currentUser]);

  const sendText = async () => {
    if (!inputText.trim()) return;
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: currentUser, content: inputText.trim() }),
      });
      setInputText('');
      await fetchMessages();
    } catch {}
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('sender', currentUser);
      fd.append('media_type', file.type.startsWith('image/') ? 'image' : 'video');
      await fetch('/api/upload', { method: 'POST', body: fd });
      await fetchMessages();
    } catch (e) {
      // ignore
    } finally {
      setUploading(false);
      if (mediaInputRef.current) mediaInputRef.current.value = '';
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex flex-col h-dvh bg-white">
      <header className="flex items-center justify-between px-4 py-3 bg-violet-600 text-white">
        <div>
          <p className="font-bold text-lg leading-tight">{currentUser}</p>
          <p className="text-violet-200 text-xs">MINE</p>
        </div>
        <button
          onClick={() => {
            sessionStorage.removeItem('chatUser');
            router.push('/');
          }}
          className="text-sm bg-violet-700 hover:bg-violet-800 px-3 py-1 rounded-full"
        >
          変更
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.sender === currentUser ? 'items-end' : 'items-start'}`}>
            <span className={`text-xs font-semibold mb-1 ${m.sender === currentUser ? 'text-right text-violet-500' : 'text-left text-gray-500'}`}>{m.sender}</span>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${m.sender === currentUser ? 'bg-violet-600 text-white' : 'bg-white text-gray-800 border border-gray-200'}`}>
              {m.content && <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>}
              {m.media_url && m.media_type === 'image' && (
                <Image src={m.media_url} alt="image" width={280} height={280} className="rounded-xl max-w-full object-cover mt-1" unoptimized />
              )}
              {m.media_url && m.media_type === 'video' && (
                <video src={m.media_url || undefined} controls className="rounded-xl max-w-full mt-1" style={{ maxWidth: 280 }} />
              )}
            </div>
            <span className="text-xs text-gray-400 mt-1">{new Date(m.created_at).toLocaleString('ja-JP')}</span>
          </div>
        ))}
      </div>

      <div className="border-t bg-white px-4 py-3 relative">
        {/* canned phrases overlay */}
        <div className={`absolute left-4 right-4 bottom-full mb-3 bg-white rounded-xl shadow-lg p-3 transition-all duration-150 z-20 ${cannedOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex gap-2 mb-2 overflow-auto">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setActiveCannedTab(t.key)} className={`px-3 py-1 rounded-full text-sm ${activeCannedTab===t.key? 'bg-violet-600 text-white':'bg-gray-100 text-gray-700'}`}>
                {t.label}
              </button>
            ))}
            <div className="flex-1" />
            <button onClick={() => setCannedOpen(false)} className="px-2 py-1 text-xs text-gray-500">閉じる</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {CANNED_PHRASES[activeCannedTab].map((p) => (
              <button key={p} onClick={() => { setInputText((prev)=> (prev && !prev.endsWith(' ') ? prev+' '+p : prev+p)); }} className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200">{p}</button>
            ))}
          </div>
        </div>

        {uploading && <p className="text-center text-sm text-violet-500 mb-2">アップロード中...</p>}
        <div className="flex items-end gap-2">
          <button onClick={() => setCannedOpen(s=>!s)} aria-pressed={cannedOpen} className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 mr-2">冊</button>
          <input ref={mediaInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
          <button onClick={() => mediaInputRef.current?.click()} className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3l2-3h6l2 3h3a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </button>
          <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="メッセージを入力... (Enterで送信)" rows={1} className="flex-1 resize-none rounded-2xl border border-gray-300 px-4 py-2 text-sm focus:outline-none" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); } }} />
          <button onClick={sendText} disabled={!inputText.trim()} className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-violet-600 hover:bg-violet-700 text-white text-xl">➤</button>
        </div>
      </div>
    </div>
  );
}
