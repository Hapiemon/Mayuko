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
  const containerRef = useRef<HTMLDivElement | null>(null);

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
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-violet-600 text-white">
        <div>
          <p className="font-bold text-lg leading-tight">{currentUser}</p>
          <p className="text-violet-200 text-xs">MINE</p>
        </div>
        <div className="flex items-center gap-2">
          {notifPermission !== 'granted' && notifPermission !== 'denied' && (
            <button
              onClick={() => registerPush(currentUser)}
              className="text-xs bg-yellow-400 text-yellow-900 font-bold px-3 py-1 rounded-full transition-colors active:scale-95"
            >
              通知を許可
            </button>
          )}
          <button
            onClick={() => { sessionStorage.removeItem('chatUser'); router.push('/'); }}
            className="text-sm bg-violet-700 hover:bg-violet-800 px-3 py-1 rounded-full transition-colors"
          >
            変更
          </button>
        </div>
      </header>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 pb-28 space-y-4 bg-gray-50">
        {messages.map((msg) => {
          const isMine = msg.sender === currentUser;
          const showDelete = isMine && selectedMessageId === msg.id;
          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              {/* Sender name */}
              <span className={`text-xs font-semibold mb-1 ${isMine ? 'text-right text-violet-500' : 'text-left text-gray-500'}`}>
                {msg.sender}
              </span>
              {/* Bubble */}
              <div
                onClick={() => toggleMessageAction(msg)}
                className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${
                  isMine
                    ? 'bg-violet-600 text-white rounded-br-none'
                    : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                } ${isMine ? 'cursor-pointer' : ''}`}
              >
                {msg.content && <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>}
                {msg.media_url && msg.media_type === 'image' && (
                  <Image
                    src={msg.media_url}
                    alt="送信画像"
                    width={280}
                    height={280}
                    className="rounded-xl max-w-full object-cover mt-1"
                    unoptimized
                  />
                )}
                {msg.media_url && msg.media_type === 'video' && (
                  <video
                    src={msg.media_url}
                    controls
                    playsInline
                    preload="metadata"
                    className="rounded-xl max-w-full mt-1"
                    style={{ maxWidth: 280 }}
                  />
                )}
              </div>
              {showDelete && (
                <button
                  onClick={() => deleteMessage(msg.id)}
                  disabled={deletingId === msg.id}
                  className="mt-2 text-xs px-3 py-1 rounded-full bg-red-500 text-white disabled:opacity-50"
                >
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

                        <div className="border-t bg-white px-4 py-3">
                          {uploading && <p className="text-center text-sm text-violet-500 mb-2">アップロード中...</p>}
                          <div className="flex items-end gap-2">
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
