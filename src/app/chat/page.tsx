'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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
  const [sending, setSending] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cannedOpen, setCannedOpen] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [activeCannedTab, setActiveCannedTab] = useState<'greeting' | 'state' | 'place' | 'people' | 'body' | 'thing' | 'syntax'>('greeting');

  const TABS: { key: 'greeting' | 'state' | 'place' | 'people' | 'body' | 'thing' | 'syntax'; label: string }[] = [
    { key: 'greeting', label: '挨拶' },
    { key: 'state', label: '状態' },
    { key: 'place', label: '場所' },
    { key: 'people', label: '人名' },
    { key: 'body', label: '体' },
    { key: 'thing', label: '物' },
    { key: 'syntax', label: '構文' },
  ];

  const CANNED_PHRASES: Record<string, string[]> = {
    greeting: ['おはよう', 'おやすみ', 'ありがとう', 'よろしく', 'お願いします', 'OK'],
    state: ['◯', '×', '大丈夫', 'しんどい', '良い', '悪い', '楽しい', '嬉しい', '苦しい', '悲しい', '痛い'],
    place: ['健軍アパート', 'くもん', '病院', 'おじいちゃん家', '市役所', '空港', '熊本', '東京'],
    people: ['おじいちゃん', 'ぼけまら', 'お姉ちゃん', 'あつと', '妹', 'なんとか兄ちゃん', '北海道のおばあちゃん'],
    body: ['あたま', '腕', '手', 'おなか', '腰', '背中', '足', '目', '耳', '鼻', '口'],
    thing: ['スマホ', '食べ物', '飲み物', '書類'],
    syntax: ['お願いします', '不要です', 'してます', 'どうかな？'],
  };

  useEffect(() => {
    const user = sessionStorage.getItem('chatUser');
    if (!user) {
      router.push('/');
      return;
    }
    setCurrentUser(user);
    // 初期パーミッション状態を反映
    if (typeof Notification !== 'undefined') {
      setNotifPermission(Notification.permission);
    }
  }, [router]);

  // プッシュ通知の購読登録
  const registerPush = useCallback(async (user: string) => {
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission !== 'granted') return;

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      // applicationServerKey は Uint8Array で渡す必要があるため変換
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      const applicationServerKey = urlBase64ToUint8Array(vapidKey);

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), user }),
      });
    } catch (err) {
      console.error('push register error:', err);
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/messages');
      if (res.ok) {
        const data: Message[] = await res.json();
        setMessages(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    fetchMessages();
    pollingRef.current = setInterval(fetchMessages, 3000);
    // 既に許可済みの場合はサイレントに登録
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      registerPush(currentUser);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [currentUser, fetchMessages, registerPush]);

  useEffect(() => {
    if (selectedMessageId === null) return;
    if (!messages.some((message) => message.id === selectedMessageId)) {
      setSelectedMessageId(null);
    }
  }, [messages, selectedMessageId]);

  const sendText = async () => {
    if (!inputText.trim() || sending) return;
    setSending(true);
    const textToSend = inputText.trim();
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: currentUser, content: textToSend }),
      });
      setInputText('');
      await fetchMessages();
      // 他のユーザーに通知
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentUser,
          body: textToSend,
          url: '/chat',
          excludeUser: currentUser,
        }),
      }).catch(() => {});
    } finally {
      setSending(false);
    }
  };

  const uploadMedia = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      alert('画像または動画ファイルを選択してください');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sender', currentUser);
      formData.append('media_type', isImage ? 'image' : 'video');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        let message = 'アップロードに失敗しました';
        try {
          const data = await res.json();
          if (typeof data?.error === 'string' && data.error.length > 0) {
            message = data.error;
          }
        } catch {
          // ignore parse error
        }

        if (isVideo) {
          alert(`動画の共有に失敗しました。\n${message}\n\n※Vercelのサーバー経由アップロードでは大きい動画(目安4.5MB超)は失敗することがあります。`);
        } else {
          alert(`画像の共有に失敗しました。\n${message}`);
        }
        return;
      }
      await fetchMessages();
      // 他のユーザーに通知
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentUser,
          body: 'ファイルが送信されました',
          url: '/chat',
          excludeUser: currentUser,
        }),
      }).catch(() => {});
    } finally {
      setUploading(false);
    }
  };

  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadMedia(file);
    if (mediaInputRef.current) mediaInputRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
  };

  const toggleMessageAction = (message: Message) => {
    if (message.sender !== currentUser) return;
    setSelectedMessageId((prev) => (prev === message.id ? null : message.id));
  };

  const deleteMessage = async (messageId: number) => {
    if (deletingId !== null) return;
    setDeletingId(messageId);
    try {
      const res = await fetch('/api/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: messageId, sender: currentUser }),
      });

      if (!res.ok) {
        alert('削除に失敗しました');
        return;
      }

      setSelectedMessageId(null);
      await fetchMessages();
    } finally {
      setDeletingId(null);
    }
  };

  if (!currentUser) return null;

  const scrollToBottom = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  // スクロール位置を監視して一番下ならボタンを隠す
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const check = () => {
      const threshold = 20; // px
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
      setShowScrollBtn(!atBottom);
    };

    // 初期チェック
    check();

    el.addEventListener('scroll', check, { passive: true });
    // 画面リサイズ時も再チェック
    window.addEventListener('resize', check);

    return () => {
      el.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [messages]);

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
                  {deletingId === msg.id ? '削除中...' : '削除'}
                </button>
              )}
              <span className="text-xs text-gray-400 mt-1">
                {new Date(msg.created_at).toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })}
              </span>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="border-t bg-white px-4 py-3 relative">
        {/* 定型文パネル（フッター上にオーバーレイ表示） */}
        <div
          className={`absolute left-4 right-4 bottom-full mb-3 bg-white rounded-xl shadow-lg p-3 transform transition-all duration-200 origin-bottom z-20 ${cannedOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-4 opacity-0 pointer-events-none'}`}
        >
          <div className="flex gap-2 mb-2 overflow-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`px-3 py-1 rounded-full text-sm ${activeCannedTab === t.key ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setActiveCannedTab(t.key)}
              >
                {t.label}
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={() => setCannedOpen(false)}
              className="px-2 py-1 text-xs text-gray-500"
            >
              閉じる
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {CANNED_PHRASES[activeCannedTab].map((phrase) => (
              <button
                key={phrase}
                onClick={() => {
                  setInputText((prev) => {
                    const needSpace = prev && !prev.endsWith(' ');
                    return prev + (needSpace ? ' ' : '') + phrase;
                  });
                }}
                className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200"
              >
                {phrase}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={scrollToBottom}
          aria-label="最新へ移動"
          className="absolute -top-10 right-4 w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-md z-10"
        >
          ↓
        </button>
        {uploading && (
          <p className="text-center text-sm text-violet-500 mb-2">アップロード中...</p>
        )}
        <div className="flex items-end gap-2">
          <button
            onClick={() => setCannedOpen((s) => !s)}
            aria-label="定型文"
            aria-expanded={cannedOpen}
            aria-pressed={cannedOpen}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 mr-2"
            title="定型文"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleMediaChange}
          />
          <button
            onClick={() => mediaInputRef.current?.click()}
            disabled={uploading || sending}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
            title="画像・動画を共有"
            aria-label="画像・動画を共有"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3l2-3h6l2 3h3a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力... (Enterで送信)"
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 max-h-32"
            style={{ overflowY: 'auto' }}
          />
          <button
            onClick={sendText}
            disabled={!inputText.trim() || sending}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-violet-600 hover:bg-violet-700 disabled:opacity-40 transition-colors text-white text-xl"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
