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
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const user = sessionStorage.getItem('chatUser');
    if (!user) {
      router.push('/');
      return;
    }
    setCurrentUser(user);
  }, [router]);

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
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [currentUser, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (selectedMessageId === null) return;
    if (!messages.some((message) => message.id === selectedMessageId)) {
      setSelectedMessageId(null);
    }
  }, [messages, selectedMessageId]);

  const sendText = async () => {
    if (!inputText.trim() || sending) return;
    setSending(true);
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: currentUser, content: inputText.trim() }),
      });
      setInputText('');
      await fetchMessages();
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
      await fetch('/api/upload', { method: 'POST', body: formData });
      await fetchMessages();
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

  return (
    <div className="flex flex-col h-dvh bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-violet-600 text-white">
        <div>
          <p className="font-bold text-lg leading-tight">{currentUser}</p>
          <p className="text-violet-200 text-xs">MINE</p>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem('chatUser'); router.push('/'); }}
          className="text-sm bg-violet-700 hover:bg-violet-800 px-3 py-1 rounded-full transition-colors"
        >
          変更
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
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
                {new Date(msg.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-white px-4 py-3">
        {uploading && (
          <p className="text-center text-sm text-violet-500 mb-2">アップロード中...</p>
        )}
        <div className="flex items-end gap-2">
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
            className="flex-shrink-0 h-10 px-3 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-xs font-semibold disabled:opacity-50"
            title="画像・動画を共有"
          >
            共有
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
