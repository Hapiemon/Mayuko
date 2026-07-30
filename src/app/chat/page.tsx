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
  mayuko_read_status?: 'まゆこ未読' | 'まゆこ既読';
}

type MessageFontSize = 'small' | 'medium' | 'large';

export default function ChatPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [cannedOpen, setCannedOpen] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [messageFontSize, setMessageFontSize] = useState<MessageFontSize>('medium');
  const [activeCannedTab, setActiveCannedTab] = useState<'greeting'|'state'|'place'|'people'|'body'|'thing'|'syntax'|'date'|'entertainment'>('greeting');

  const TABS: { key: 'greeting'|'state'|'place'|'people'|'body'|'thing'|'syntax'|'date'|'entertainment'; label: string }[] = [
    { key: 'greeting', label: '挨拶' },
    { key: 'state', label: '状態' },
    { key: 'place', label: '場所' },
    { key: 'people', label: '人名' },
    { key: 'body', label: '体' },
    { key: 'thing', label: '物' },
    { key: 'syntax', label: '構文' },
    { key: 'date', label: '日付' },
    { key: 'entertainment', label: 'エンタメ' },
  ];

  const CANNED_PHRASES: Record<string,string[]> = {
    greeting: ['おはよう','おやすみ','ありがとう','よろしく','お願いします','OK'],
    state: ['◯','×','大丈夫','しんどい','良い','悪い','楽しい','嬉しい','苦しい','悲しい','痛い'],
    place: ['健軍アパート','くもん','病院','おじいちゃん家','市役所','空港','熊本','東京'],
    people: ['ママ','おじいちゃん','だいや','るちえ','あつと','せれな','🎀なっちゃん🎀','ひで兄ちゃん','北海道のおばあちゃん'],
    body: ['あたま','腕','手','おなか','腰','背中','足','目','耳','鼻','口'],
    thing: ['スマホ','食べ物','飲み物','書類'],
    syntax: ['お願いします','不要です','してます','どうかな？'],
    date: ['きのう','今日','あした','平日','土日','8月','9月','10月','今年','来年'],
    entertainment: ['ワンエン','EBiDAN','HAYATO','YouTube','動画','テレビ','TVer','アマプラ','SNS','VIVANT'],
  };

  const USER_BUBBLE_CLASSES: Record<string, string> = {
    まゆこ: 'border-pink-400 bg-white text-gray-900',
    だいや: 'border-blue-400 bg-white text-gray-900',
    あつと: 'border-green-400 bg-white text-gray-900',
    せれな: 'border-purple-400 bg-white text-gray-900',
    るちえ: 'border-amber-400 bg-white text-gray-900',
  };

  const getBubbleClass = (sender: string) => USER_BUBBLE_CLASSES[sender] ?? 'border-violet-600 bg-white text-gray-900';

  // VAPID base64 → Uint8Array 変換ユーティリティ
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  };

  // Push購読を登録してサーバーに保存
  const registerPush = async (user: string) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), user }),
      });
    } catch (e) {
      console.error('Push registration failed:', e);
    }
  };

  // 通知許可を要求してPush登録
  const requestNotificationPermission = async (user: string) => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPushPermission(result);
    if (result === 'granted') {
      await registerPush(user);
    }
  };

  // Push通知を送信（自分以外に）
  const notifyPush = (title: string, body: string, excludeUser: string) => {
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, url: '/chat', excludeUser }),
    }).catch(() => {});
  };

  const fontSizeClass =
    messageFontSize === 'small'
      ? 'text-xs'
      : messageFontSize === 'large'
        ? 'text-lg'
        : 'text-sm';

  useEffect(() => {
    const user = sessionStorage.getItem('chatUser');
    if (!user) {
      router.push('/');
      return;
    }
    setCurrentUser(user);
    // 既に許可済みならサイレント登録
    if ('Notification' in window) {
      const perm = Notification.permission;
      setPushPermission(perm);
      if (perm === 'granted') {
        registerPush(user);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    localStorage.setItem(`messageFontSize:${currentUser}`, messageFontSize);
  }, [currentUser, messageFontSize]);

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

  const markMayukoRead = async () => {
    try {
      await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewer: currentUser }),
      });
    } catch {}
  };

  useEffect(() => {
    if (!currentUser) return;
    fetchMessages();
    if (currentUser === 'まゆこ') {
      markMayukoRead().then(() => fetchMessages());
    }
    const id = setInterval(fetchMessages, 3000);
    return () => clearInterval(id);
  }, [currentUser]);

  const sendText = async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: currentUser, content: text }),
      });
      setInputText('');
      notifyPush('MINE', `${currentUser}: ${text}`, currentUser);
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
      notifyPush('MINE', `${currentUser}がファイルを送信しました`, currentUser);
      await fetchMessages();
    } catch (e) {
      // ignore
    } finally {
      setUploading(false);
      if (mediaInputRef.current) mediaInputRef.current.value = '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputText(value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 440) + 'px';
    }
  };

  const deleteMessage = async (id: number) => {
    try {
      const res = await fetch('/api/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, sender: currentUser }),
      });
      if (!res.ok) return;
      setDeleteTargetId(null);
      await fetchMessages();
    } catch {}
  };

  const scrollToBottom = () => {
    if (!messagesRef.current) return;
    try {
      messagesRef.current.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
    } catch (e) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  };

  const checkScrollBottom = () => {
    const el = messagesRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 60);
  };

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScrollBottom, { passive: true });
    return () => el.removeEventListener('scroll', checkScrollBottom);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // メッセージ更新時にも位置チェック
  useEffect(() => {
    checkScrollBottom();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // inputText変更時にtextareaの高さを調整
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 440) + 'px';
    }
  }, [inputText]);

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
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-violet-700 rounded-full p-1">
            <span className="px-1 text-[10px] text-violet-200">文字</span>
            {([
              { value: 'small', label: '小' },
              { value: 'medium', label: '中' },
              { value: 'large', label: '大' },
            ] as const).map((size) => (
              <button
                key={size.value}
                onClick={() => setMessageFontSize(size.value)}
                aria-label={`文字サイズ${size.label}`}
                aria-pressed={messageFontSize === size.value}
                className={`h-8 min-w-8 px-2 rounded-full text-xs font-semibold transition-colors ${messageFontSize === size.value ? 'bg-white text-violet-700' : 'text-white hover:bg-violet-600'}`}
              >
                {size.label}
              </button>
            ))}
          </div>
          {pushPermission !== 'granted' && pushPermission !== 'denied' && (
            <button
              onClick={() => requestNotificationPermission(currentUser)}
              aria-label="通知を許可"
              className="flex items-center gap-1.5 text-sm bg-violet-500 hover:bg-violet-400 px-4 py-2 rounded-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              通知ON
            </button>
          )}
          {pushPermission === 'denied' && (
            <span className="text-xs text-violet-300">通知ブロック中</span>
          )}
          <button
            onClick={() => {
              sessionStorage.removeItem('chatUser');
              router.push('/');
            }}
            aria-label="ユーザー変更"
            className="w-9 h-9 flex items-center justify-center bg-violet-700 hover:bg-violet-800 rounded-full"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      <div ref={messagesRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.sender === currentUser ? 'items-end' : 'items-start'}`}>
            <span className={`text-xs font-semibold mb-1 ${m.sender === currentUser ? 'text-right text-violet-500' : 'text-left text-gray-500'}`}>{m.sender}</span>
            <div
              role={m.sender === currentUser ? 'button' : undefined}
              tabIndex={m.sender === currentUser ? 0 : -1}
              onClick={() => {
                if (m.sender === currentUser) {
                  setDeleteTargetId((prev) => (prev === m.id ? null : m.id));
                }
              }}
              onKeyDown={(e) => {
                if (m.sender === currentUser && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  setDeleteTargetId((prev) => (prev === m.id ? null : m.id));
                }
              }}
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${m.sender === currentUser ? 'border-2 border-violet-600 bg-white text-gray-900 cursor-pointer active:scale-[0.99]' : `${getBubbleClass(m.sender)} border-2 cursor-pointer active:scale-[0.99]`}`}
            >
              {m.content && <p className={`whitespace-pre-wrap break-words ${fontSizeClass}`}>{m.content}</p>}
              {m.media_url && m.media_type === 'image' && (
                <Image src={m.media_url} alt="image" width={280} height={280} className="rounded-xl max-w-full object-cover mt-1" unoptimized />
              )}
              {m.media_url && m.media_type === 'video' && (
                <video src={m.media_url || undefined} controls className="rounded-xl max-w-full mt-1" style={{ maxWidth: 280 }} />
              )}
              {m.sender === currentUser && deleteTargetId === m.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMessage(m.id);
                  }}
                  className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white hover:bg-white/25"
                >
                  削除
                </button>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-gray-400">
              <span className="text-xs">{new Date(m.created_at).toLocaleString('ja-JP')}</span>
              <span className="text-[11px]">{m.mayuko_read_status ?? 'まゆこ未読'}</span>
            </div>
          </div>
        ))}
      </div>

      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          aria-label="最新へ移動"
          className="fixed top-[70px] right-4 z-30 w-10 h-10 flex items-center justify-center rounded-full bg-violet-600 text-white shadow-lg hover:bg-violet-700"
        >
          ↓
        </button>
      )}

      <div className="border-t bg-white px-4 py-3 relative">
        {/* canned phrases overlay */}
        <div className={`absolute left-4 right-4 bottom-full mb-3 bg-white rounded-xl shadow-lg p-3 transition-all duration-150 z-20 ${cannedOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex items-center gap-1 mb-3">
            <div className="flex gap-1 overflow-x-auto flex-nowrap flex-1 min-w-0 pb-1">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveCannedTab(t.key)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${activeCannedTab === t.key ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-700 hover:bg-violet-200'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button onClick={() => setCannedOpen(false)} className="flex-shrink-0 ml-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {CANNED_PHRASES[activeCannedTab].map((p) => (
              <button key={p} onClick={() => { setInputText((prev)=> (prev && !prev.endsWith(' ') ? prev+' '+p : prev+p)); }} className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200">{p}</button>
            ))}
          </div>
        </div>

        {uploading && <p className="text-center text-sm text-violet-500 mb-2">アップロード中...</p>}

        <div className="mb-3">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInputChange}
            placeholder="メッセージを入力..."
            rows={1}
            className={`w-full resize-none rounded-2xl border border-gray-300 px-4 py-2 ${fontSizeClass} focus:outline-none focus:ring-1 focus:ring-violet-600`}
            style={{ maxHeight: '440px', overflow: 'auto', height: '40px' }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); } }}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCannedOpen((s) => !s)}
            aria-pressed={cannedOpen}
            aria-label="定型文"
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-700"
            >
              <path d="M21 15a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3l2-3h6l2 3h3a2 2 0 0 1 2 2z" />
              <path d="M8 8h8" />
              <path d="M8 12h5" />
            </svg>
          </button>
          <input ref={mediaInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
          <button onClick={() => mediaInputRef.current?.click()} className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3l2-3h6l2 3h3a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </button>
          <div className="flex-1" />
          <button onClick={sendText} disabled={!inputText.trim()} className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-violet-600 hover:bg-violet-700 text-white text-xl">➤</button>
        </div>
      </div>
    </div>
  );
}
