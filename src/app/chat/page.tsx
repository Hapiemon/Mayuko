'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';

const supabaseCall = createClient(
  process.env.NEXT_PUBLIC_MAYUKO_CALL_MAYUKOSUPABASE_URL!,
  process.env.NEXT_PUBLIC_MAYUKO_CALL_MAYUKOSUPABASE_ANON_KEY!
);

interface Message {
  id: number;
  sender: string;
  content: string | null;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  reply_to_id?: number | null;
  reply_to_sender?: string | null;
  reply_to_content?: string | null;
  created_at: string;
  mayuko_read_status?: 'まゆこ未読' | 'まゆこ既読';
}

interface CallParticipant {
  session_id: string;
  user_name: string;
  joined_at: string;
  last_seen: string;
}

interface CallSignal {
  id: number;
  from_session_id: string;
  to_session_id: string | null;
  signal_type: 'offer' | 'answer' | 'ice';
  payload: unknown;
}

interface RemoteAudio {
  sessionId: string;
  stream: MediaStream;
}

interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

type MessageFontSize = 'small' | 'medium' | 'large';

export default function ChatPage() {
  const CALL_ROOM_ID = 'main';
  const CALL_MAX_PARTICIPANTS = 5;
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<number | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const [replyTarget, setReplyTarget] = useState<{ id: number; sender: string; content: string } | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const messageItemRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const shouldScrollOnLoginRef = useRef(false);
  const forceScrollRef = useRef(false);
  const wasAtBottomRef = useRef(true);
  const markingReadRef = useRef(false);
  const highlightTimerRef = useRef<number | null>(null);
  const [cannedOpen, setCannedOpen] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showLoadOlderBtn, setShowLoadOlderBtn] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [messageFontSize, setMessageFontSize] = useState<MessageFontSize>('medium');
  const [activeCannedTab, setActiveCannedTab] = useState<'greeting'|'state'|'emotion'|'people'|'thing'|'syntax'|'entertainment'|'date'|'place'|'body'>('greeting');
  const [gameMenuOpen, setGameMenuOpen] = useState(false);
  const [callMenuOpen, setCallMenuOpen] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [joiningCall, setJoiningCall] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [callParticipants, setCallParticipants] = useState<CallParticipant[]>([]);
  const [remoteAudios, setRemoteAudios] = useState<RemoteAudio[]>([]);
  const [speakingBySessionId, setSpeakingBySessionId] = useState<Record<string, boolean>>({});
  const [callError, setCallError] = useState('');
  const [callNotifyTarget, setCallNotifyTarget] = useState<string>('');  
  const [sendingCallInvite, setSendingCallInvite] = useState(false);

  const KNOWN_USERS = ['まゆこ', 'だいや', 'あつと', 'せれな', 'るちえ'];
  const inCallRef = useRef(false);
  const callSessionIdRef = useRef('');
  const callPollTimerRef = useRef<number | null>(null);
  const heartbeatTimerRef = useRef<number | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const remoteStreamsRef = useRef<Record<string, MediaStream>>({});
  const speakerGainNodesRef = useRef<Record<string, GainNode>>({});
  const latestSignalIdRef = useRef(0);
  const offeredSessionsRef = useRef<Set<string>>(new Set());
  const pendingIceCandidatesRef = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const callChannelRef = useRef<RealtimeChannel | null>(null);
  const speakingAudioContextRef = useRef<AudioContext | null>(null);
  const speakingNodesRef = useRef<
    Record<string, { analyser: AnalyserNode; source: MediaStreamAudioSourceNode; data: Uint8Array<ArrayBuffer> }>
  >({});
  const speakingTimerRef = useRef<number | null>(null);

  const CALL_USER_ICONS: Record<string, string> = {
    まゆこ: '👩',
    だいや: '👦',
    あつと: '👨',
    せれな: '👧',
    るちえ: '👩',
  };

  const getCallUserIcon = (userName: string) => {
    return CALL_USER_ICONS[userName] ?? '🙂';
  };

  const getIceServers = (): IceServerConfig[] => {
    const stunUrls = (process.env.NEXT_PUBLIC_STUN_URLS ?? 'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302')
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);

    const turnUrls = (process.env.NEXT_PUBLIC_TURN_URLS ?? '')
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);

    const iceServers: IceServerConfig[] = [];

    if (stunUrls.length > 0) {
      iceServers.push({ urls: stunUrls });
    }

    if (turnUrls.length > 0 && process.env.NEXT_PUBLIC_TURN_USERNAME && process.env.NEXT_PUBLIC_TURN_CREDENTIAL) {
      iceServers.push({
        urls: turnUrls,
        username: process.env.NEXT_PUBLIC_TURN_USERNAME,
        credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
      });
    }

    return iceServers;
  };

  const TABS: { key: 'greeting'|'state'|'emotion'|'people'|'thing'|'syntax'|'entertainment'|'date'|'place'|'body'; label: string }[] = [
    { key: 'greeting', label: '挨拶' },
    { key: 'state', label: '状態' },
    { key: 'body', label: '体' },
    { key: 'date', label: '日付' },
    { key: 'place', label: '場所' },
    { key: 'emotion', label: '感情' },
    { key: 'people', label: '人名' },
    { key: 'thing', label: '物' },
    { key: 'syntax', label: '構文' },
    { key: 'entertainment', label: 'エンタメ' },
  ];

  const CANNED_PHRASES: Record<string,string[]> = {
    greeting: ['おはよう','おやすみ','ありがとう','よろしく','お願いします','OK'],
    state: ['◯','良い','暑い','×','悪い','寒い','大丈夫','痛い','少し','普通','結構','かなり'],
    emotion: ['楽しい','嬉しい','苦しい','悲しい','寂しい','怖い','眠い','疲れた','元気'],
    place: ['健軍アパート','くもん','病院','おじいちゃん家','市役所','空港','熊本','東京'],
    people: ['ママ','おじいちゃん','だいや','るちえ','あつと','せれな','なっちゃん','ひで兄ちゃん','北海道のおばあちゃん'],
    body: ['あたま','腕','手','おなか','腰','背中','足','目','耳','鼻','口'],
    thing: ['スマホ','食べ物','飲み物','パソコン','車','電話','鍵','財布','マイナンバー'],
    syntax: ['お願いします','不要です','してます','どうかな？','難しい','みたい'],
    date: ['きのう','今日','あした','平日','土日','8月','9月','10月','今年','来年'],
    entertainment: ['ワンエン','EBiDAN','HAYATO','YouTube','動画','テレビ','TVer','アマプラ','SNS','VIVANT'],
  };

  const USER_BUBBLE_CLASSES: Record<string, string> = {
    まゆこ: 'border-red-400 bg-red-50 text-gray-900',
    だいや: 'border-blue-400 bg-blue-50 text-gray-900',
    あつと: 'border-green-400 bg-green-50 text-gray-900',
    せれな: 'border-purple-400 bg-purple-50 text-gray-900',
    るちえ: 'border-amber-400 bg-amber-50 text-gray-900',
  };

  const getBubbleClass = (sender: string) => USER_BUBBLE_CLASSES[sender] ?? 'border-violet-600 bg-violet-50 text-gray-900';

  const USER_BUBBLE_TAIL_BG_CLASSES: Record<string, string> = {
    まゆこ: 'bg-red-50',
    だいや: 'bg-blue-50',
    あつと: 'bg-green-50',
    せれな: 'bg-purple-50',
    るちえ: 'bg-amber-50',
  };

  const USER_BUBBLE_TAIL_BORDER_CLASSES: Record<string, string> = {
    まゆこ: 'border-red-400',
    だいや: 'border-blue-400',
    あつと: 'border-green-400',
    せれな: 'border-purple-400',
    るちえ: 'border-amber-400',
  };

  const getBubbleTailBgClass = (sender: string) => USER_BUBBLE_TAIL_BG_CLASSES[sender] ?? 'bg-violet-50';
  const getBubbleTailBorderClass = (sender: string) => USER_BUBBLE_TAIL_BORDER_CLASSES[sender] ?? 'border-violet-600';

  const USER_THEME_CLASSES: Record<string, { headerBg: string; headerSubText: string; footerBg: string; footerBorder: string; buttonBg: string; buttonHover: string; buttonBgLight: string; buttonHoverLight: string; buttonDarkerBg: string; buttonDarkerHover: string; cannedWindowBg: string; cannedTextColor: string; cannedHover: string; cannedBorder: string }> = {
    まゆこ: { headerBg: 'bg-red-400', headerSubText: 'text-red-100', footerBg: 'bg-red-50', footerBorder: 'border-red-200', buttonBg: 'bg-red-500', buttonHover: 'hover:bg-red-600', buttonBgLight: 'bg-red-100', buttonHoverLight: 'hover:bg-red-200', buttonDarkerBg: 'bg-red-600', buttonDarkerHover: 'hover:bg-red-700', cannedWindowBg: 'bg-red-100', cannedTextColor: 'text-red-700', cannedHover: 'hover:bg-red-200', cannedBorder: 'border-red-300' },
    だいや: { headerBg: 'bg-blue-400', headerSubText: 'text-blue-100', footerBg: 'bg-blue-50', footerBorder: 'border-blue-200', buttonBg: 'bg-blue-500', buttonHover: 'hover:bg-blue-600', buttonBgLight: 'bg-blue-100', buttonHoverLight: 'hover:bg-blue-200', buttonDarkerBg: 'bg-blue-600', buttonDarkerHover: 'hover:bg-blue-700', cannedWindowBg: 'bg-blue-100', cannedTextColor: 'text-blue-700', cannedHover: 'hover:bg-blue-200', cannedBorder: 'border-blue-300' },
    あつと: { headerBg: 'bg-green-400', headerSubText: 'text-green-100', footerBg: 'bg-green-50', footerBorder: 'border-green-200', buttonBg: 'bg-green-500', buttonHover: 'hover:bg-green-600', buttonBgLight: 'bg-green-100', buttonHoverLight: 'hover:bg-green-200', buttonDarkerBg: 'bg-green-600', buttonDarkerHover: 'hover:bg-green-700', cannedWindowBg: 'bg-green-100', cannedTextColor: 'text-green-700', cannedHover: 'hover:bg-green-200', cannedBorder: 'border-green-300' },
    せれな: { headerBg: 'bg-purple-400', headerSubText: 'text-purple-100', footerBg: 'bg-purple-50', footerBorder: 'border-purple-200', buttonBg: 'bg-purple-500', buttonHover: 'hover:bg-purple-600', buttonBgLight: 'bg-purple-100', buttonHoverLight: 'hover:bg-purple-200', buttonDarkerBg: 'bg-purple-600', buttonDarkerHover: 'hover:bg-purple-700', cannedWindowBg: 'bg-purple-100', cannedTextColor: 'text-purple-700', cannedHover: 'hover:bg-purple-200', cannedBorder: 'border-purple-300' },
    るちえ: { headerBg: 'bg-amber-400', headerSubText: 'text-amber-100', footerBg: 'bg-amber-50', footerBorder: 'border-amber-200', buttonBg: 'bg-amber-500', buttonHover: 'hover:bg-amber-600', buttonBgLight: 'bg-amber-100', buttonHoverLight: 'hover:bg-amber-200', buttonDarkerBg: 'bg-amber-600', buttonDarkerHover: 'hover:bg-amber-700', cannedWindowBg: 'bg-amber-100', cannedTextColor: 'text-amber-700', cannedHover: 'hover:bg-amber-200', cannedBorder: 'border-amber-300' },
  };

  const userTheme = USER_THEME_CLASSES[currentUser] ?? {
    headerBg: 'bg-violet-600',
    headerSubText: 'text-violet-200',
    footerBg: 'bg-violet-50',
    footerBorder: 'border-violet-200',
    buttonBg: 'bg-violet-500',
    buttonHover: 'hover:bg-violet-600',
    buttonBgLight: 'bg-violet-100',
    buttonHoverLight: 'hover:bg-violet-200',
    buttonDarkerBg: 'bg-violet-600',
    buttonDarkerHover: 'hover:bg-violet-700',
    cannedWindowBg: 'bg-violet-100',
    cannedTextColor: 'text-violet-700',
    cannedHover: 'hover:bg-violet-200',
    cannedBorder: 'border-violet-300',
  };

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
        ? 'text-3xl'
        : 'text-sm';

  const cannedFontSizeClass =
    messageFontSize === 'small'
      ? 'text-xs'
      : messageFontSize === 'large'
        ? 'text-2xl'
        : 'text-sm';

  const cannedButtonSizeClass =
    messageFontSize === 'small'
      ? 'px-2 py-1.5 text-xs'
      : messageFontSize === 'large'
        ? 'px-5 py-3 text-2xl'
        : 'px-3 py-2 text-sm';

  const cannedGridClass =
    messageFontSize === 'large'
      ? 'grid-cols-2 gap-3'
      : messageFontSize === 'small'
        ? 'grid-cols-3 gap-1.5'
        : 'grid-cols-3 gap-2';

  const cannedTabsWrapClass =
    messageFontSize === 'large'
      ? 'gap-2 pb-2'
      : messageFontSize === 'small'
        ? 'gap-1 pb-1'
        : 'gap-1 pb-1';

  const gameMenuButtonSizeClass =
    messageFontSize === 'small'
      ? 'px-3 py-2 text-xs'
      : messageFontSize === 'large'
        ? 'px-4 py-3 text-2xl'
        : 'px-3 py-2 text-sm';

  const gameMenuWidthClass = messageFontSize === 'large' ? 'w-72' : 'w-56';

  const callMenuWidthClass = messageFontSize === 'large' ? 'w-96' : messageFontSize === 'small' ? 'w-72' : 'w-80';

  const callMenuTitleClass =
    messageFontSize === 'small'
      ? 'text-xs'
      : messageFontSize === 'large'
        ? 'text-2xl'
        : 'text-sm';

  const callMenuSubClass =
    messageFontSize === 'small'
      ? 'text-[11px]'
      : messageFontSize === 'large'
        ? 'text-lg'
        : 'text-xs';

  const callMenuListClass =
    messageFontSize === 'small'
      ? 'text-[11px]'
      : messageFontSize === 'large'
        ? 'text-lg'
        : 'text-xs';

  const callMenuButtonClass =
    messageFontSize === 'small'
      ? 'px-3 py-1.5 text-xs'
      : messageFontSize === 'large'
        ? 'px-5 py-3 text-xl'
        : 'px-4 py-2 text-xs';

  const callMenuBadgeClass =
    messageFontSize === 'small'
      ? 'text-[9px] px-1.5 py-0.5'
      : messageFontSize === 'large'
        ? 'text-sm px-3 py-1'
        : 'text-[10px] px-2 py-0.5';

  useEffect(() => {
    const user = sessionStorage.getItem('chatUser');
    if (!user) {
      router.push('/');
      return;
    }
    setCurrentUser(user);
    shouldScrollOnLoginRef.current = true;
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
      const res = await fetch('/api/messages', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as Message[];
      setMessages((prev) => {
        if (prev.length === 0) {
          return data;
        }
        const oldestFromLatest = data[0]?.id;
        if (!oldestFromLatest) {
          return prev;
        }
        const olderPart = prev.filter((m) => m.id < oldestFromLatest);
        return [...olderPart, ...data];
      });
    } catch (e) {
      // ignore
    }
  };

  const loadOlderMessages = async () => {
    if (loadingOlder || !hasMoreOlder || messages.length === 0) return;
    const oldestId = messages[0]?.id;
    if (!oldestId) return;

    const el = messagesRef.current;
    const prevScrollHeight = el?.scrollHeight ?? 0;
    const prevScrollTop = el?.scrollTop ?? 0;

    setLoadingOlder(true);
    try {
      const res = await fetch(`/api/messages?beforeId=${oldestId}`, { cache: 'no-store' });
      if (!res.ok) return;

      const older = (await res.json()) as Message[];
      if (older.length === 0) {
        setHasMoreOlder(false);
        return;
      }

      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const uniqueOlder = older.filter((m) => !existingIds.has(m.id));
        return [...uniqueOlder, ...prev];
      });

      setHasMoreOlder(older.length === 200);
    } catch {
      // ignore
    } finally {
      setLoadingOlder(false);
      window.requestAnimationFrame(() => {
        const target = messagesRef.current;
        if (!target) return;
        const nextScrollHeight = target.scrollHeight;
        target.scrollTop = nextScrollHeight - prevScrollHeight + prevScrollTop;
      });
    }
  };

  const refreshRemoteAudios = () => {
    const entries = Object.entries(remoteStreamsRef.current).map(([sessionId, stream]) => ({ sessionId, stream }));
    setRemoteAudios(entries);
  };

  const ensureSpeakingAudioContext = () => {
    if (!speakingAudioContextRef.current) {
      speakingAudioContextRef.current = new AudioContext();
    }
    if (speakingAudioContextRef.current.state === 'suspended') {
      void speakingAudioContextRef.current.resume().catch(() => {});
    }
    return speakingAudioContextRef.current;
  };

  const stopSpeakingLoopIfIdle = () => {
    if (Object.keys(speakingNodesRef.current).length > 0) return;
    if (speakingTimerRef.current) {
      window.clearInterval(speakingTimerRef.current);
      speakingTimerRef.current = null;
    }
  };

  const startSpeakingLoop = () => {
    if (speakingTimerRef.current) return;
    speakingTimerRef.current = window.setInterval(() => {
      setSpeakingBySessionId((prev) => {
        const next: Record<string, boolean> = { ...prev };
        let changed = false;

        Object.entries(speakingNodesRef.current).forEach(([sessionId, bundle]) => {
          bundle.analyser.getByteTimeDomainData(bundle.data);
          let sum = 0;
          for (let i = 0; i < bundle.data.length; i += 1) {
            sum += Math.abs((bundle.data[i] - 128) / 128);
          }
          const average = sum / bundle.data.length;
          const isSpeaking = average > 0.03;
          if ((next[sessionId] ?? false) !== isSpeaking) {
            next[sessionId] = isSpeaking;
            changed = true;
          }
        });

        Object.keys(next).forEach((sessionId) => {
          if (!speakingNodesRef.current[sessionId]) {
            delete next[sessionId];
            changed = true;
          }
        });

        return changed ? next : prev;
      });
    }, 180);
  };

  const registerSpeakingStream = (sessionId: string, stream: MediaStream, isRemote = false) => {
    if (speakingNodesRef.current[sessionId]) return;
    if (stream.getAudioTracks().length === 0) return;

    try {
      const ctx = ensureSpeakingAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);

      // リモートストリームはスピーカーに直接接続（autoplay制限をバイパス）
      if (isRemote) {
        const gainNode = ctx.createGain();
        gainNode.gain.value = 1;
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        speakerGainNodesRef.current[sessionId] = gainNode;
      }

      speakingNodesRef.current[sessionId] = {
        analyser,
        source,
        data: new Uint8Array(new ArrayBuffer(analyser.fftSize)),
      };
      startSpeakingLoop();
    } catch (e) {
      console.error('register speaking stream error:', e);
    }
  };

  const unregisterSpeakingStream = (sessionId: string) => {
    const gainNode = speakerGainNodesRef.current[sessionId];
    if (gainNode) {
      try { gainNode.disconnect(); } catch {}
      delete speakerGainNodesRef.current[sessionId];
    }
    const bundle = speakingNodesRef.current[sessionId];
    if (bundle) {
      try {
        bundle.source.disconnect();
      } catch {}
      try {
        bundle.analyser.disconnect();
      } catch {}
      delete speakingNodesRef.current[sessionId];
    }
    setSpeakingBySessionId((prev) => {
      if (!(sessionId in prev)) return prev;
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
    stopSpeakingLoopIfIdle();
  };

  const clearSpeakingResources = () => {
    Object.keys(speakingNodesRef.current).forEach((sessionId) => {
      unregisterSpeakingStream(sessionId);
    });
    speakingNodesRef.current = {};
    speakerGainNodesRef.current = {};
    if (speakingTimerRef.current) {
      window.clearInterval(speakingTimerRef.current);
      speakingTimerRef.current = null;
    }
    if (speakingAudioContextRef.current) {
      void speakingAudioContextRef.current.close().catch(() => {});
      speakingAudioContextRef.current = null;
    }
    setSpeakingBySessionId({});
  };

  const stopCallLoops = () => {
    if (callPollTimerRef.current) {
      window.clearInterval(callPollTimerRef.current);
      callPollTimerRef.current = null;
    }
    if (heartbeatTimerRef.current) {
      window.clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  };

  const closePeer = (remoteSessionId: string) => {
    const peer = peersRef.current[remoteSessionId];
    if (peer) {
      try {
        peer.onicecandidate = null;
        peer.ontrack = null;
        peer.onconnectionstatechange = null;
        peer.close();
      } catch {}
      delete peersRef.current[remoteSessionId];
    }
    delete remoteStreamsRef.current[remoteSessionId];
    delete pendingIceCandidatesRef.current[remoteSessionId];
    unregisterSpeakingStream(remoteSessionId);
    offeredSessionsRef.current.delete(remoteSessionId);
    refreshRemoteAudios();
  };

  const flushPendingIceCandidates = async (remoteSessionId: string, peer: RTCPeerConnection) => {
    const pending = pendingIceCandidatesRef.current[remoteSessionId] ?? [];
    if (pending.length === 0 || !peer.remoteDescription) return;

    delete pendingIceCandidatesRef.current[remoteSessionId];

    for (const candidate of pending) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('pending ice apply error:', e);
      }
    }
  };

  const sendSignal = async (toSessionId: string, signalType: 'offer' | 'answer' | 'ice', payload: unknown) => {
    if (!callSessionIdRef.current || !callChannelRef.current) return;
    try {
      await callChannelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: {
          fromSessionId: callSessionIdRef.current,
          toSessionId,
          signalType,
          payload,
        },
      });
    } catch {}
  };

  const setupCallChannel = (sessionId: string, userName: string) => {
    // 既存チャンネルがあれば削除
    if (callChannelRef.current) {
      supabaseCall.removeChannel(callChannelRef.current).catch(() => {});
      callChannelRef.current = null;
    }

    const channel = supabaseCall.channel(`call:${CALL_ROOM_ID}`, {
      config: { broadcast: { self: false }, presence: { key: sessionId } },
    });

    // 参加者リストを Presence から同期
    const syncParticipants = () => {
      const state = channel.presenceState<{ userName: string; joinedAt: string }>();
      const participants: CallParticipant[] = Object.entries(state).map(([sid, presences]) => {
        const p = presences[0];
        return {
          session_id: sid,
          user_name: p?.userName ?? '?',
          joined_at: p?.joinedAt ?? new Date().toISOString(),
          last_seen: new Date().toISOString(),
        };
      });
      // joined_at 昇順にソート
      participants.sort((a, b) => a.joined_at.localeCompare(b.joined_at));
      setCallParticipants(participants);

      // 自分以外のセッションとの Peer 接続を確立
      const mySessionId = callSessionIdRef.current;
      if (!mySessionId) return;
      const activeRemoteSessionIds = new Set(participants.map((p) => p.session_id).filter((s) => s !== mySessionId));

      // 離脱したピアを閉じる
      Object.keys(peersRef.current).forEach((sid) => {
        if (!activeRemoteSessionIds.has(sid)) closePeer(sid);
      });

      // 新規ピアへオファー
      activeRemoteSessionIds.forEach((remoteSessionId) => {
        ensurePeer(remoteSessionId);
        void makeOfferIfNeeded(remoteSessionId);
      });
    };

    channel
      .on('presence', { event: 'sync' }, syncParticipants)
      .on('broadcast', { event: 'signal' }, ({ payload: p }) => {
        if (!p) return;
        const sig = p as {
          fromSessionId: string;
          toSessionId: string;
          signalType: 'offer' | 'answer' | 'ice';
          payload: unknown;
        };
        // 自分宛て or broadcast のみ処理
        if (sig.toSessionId && sig.toSessionId !== callSessionIdRef.current) return;
        void applySignal({
          id: 0,
          from_session_id: sig.fromSessionId,
          to_session_id: sig.toSessionId ?? null,
          signal_type: sig.signalType,
          payload: sig.payload,
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userName, joinedAt: new Date().toISOString() });
        }
      });

    callChannelRef.current = channel;
  };

  const ensurePeer = (remoteSessionId: string) => {
    if (peersRef.current[remoteSessionId]) {
      return peersRef.current[remoteSessionId];
    }

    const peer = new RTCPeerConnection({
      iceServers: getIceServers(),
      iceCandidatePoolSize: 4,
    });

    const localStream = localStreamRef.current;
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        peer.addTrack(track, localStream);
      });
    }

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        void sendSignal(remoteSessionId, 'ice', event.candidate.toJSON());
      }
    };

    peer.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) {
        remoteStreamsRef.current[remoteSessionId] = stream;
        registerSpeakingStream(remoteSessionId, stream, true);
      } else {
        const existing = remoteStreamsRef.current[remoteSessionId] ?? new MediaStream();
        existing.addTrack(event.track);
        remoteStreamsRef.current[remoteSessionId] = existing;
        registerSpeakingStream(remoteSessionId, existing, true);
      }
      refreshRemoteAudios();
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'failed' || peer.connectionState === 'closed') {
        closePeer(remoteSessionId);
      }
    };

    peersRef.current[remoteSessionId] = peer;
    return peer;
  };

  const makeOfferIfNeeded = async (remoteSessionId: string) => {
    if (!callSessionIdRef.current) return;
    if (callSessionIdRef.current <= remoteSessionId) return;
    if (offeredSessionsRef.current.has(remoteSessionId)) return;

    const peer = ensurePeer(remoteSessionId);
    if (peer.signalingState !== 'stable') return;

    try {
      offeredSessionsRef.current.add(remoteSessionId);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await sendSignal(remoteSessionId, 'offer', offer);
    } catch {
      offeredSessionsRef.current.delete(remoteSessionId);
    }
  };

  const applySignal = async (signal: CallSignal) => {
    if (!callSessionIdRef.current) return;
    if (signal.from_session_id === callSessionIdRef.current) return;

    const peer = ensurePeer(signal.from_session_id);

    try {
      if (signal.signal_type === 'offer') {
        await peer.setRemoteDescription(new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit));
        await flushPendingIceCandidates(signal.from_session_id, peer);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        await sendSignal(signal.from_session_id, 'answer', answer);
        return;
      }

      if (signal.signal_type === 'answer') {
        await peer.setRemoteDescription(new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit));
        await flushPendingIceCandidates(signal.from_session_id, peer);
        return;
      }

      if (signal.signal_type === 'ice') {
        if (signal.payload) {
          if (!peer.remoteDescription) {
            pendingIceCandidatesRef.current[signal.from_session_id] = [
              ...(pendingIceCandidatesRef.current[signal.from_session_id] ?? []),
              signal.payload as RTCIceCandidateInit,
            ];
            return;
          }
          await peer.addIceCandidate(new RTCIceCandidate(signal.payload as RTCIceCandidateInit));
        }
      }
    } catch (e) {
      console.error('signal apply error:', e);
    }
  };

  const syncCallState = async () => {
    if (!inCallRef.current || !callSessionIdRef.current) return;

    try {
      const res = await fetch(
        `/api/call?roomId=${CALL_ROOM_ID}&sessionId=${callSessionIdRef.current}&lastSignalId=${latestSignalIdRef.current}`,
        { cache: 'no-store' }
      );
      if (!res.ok) return;

      const data = (await res.json()) as {
        participants: CallParticipant[];
        signals: CallSignal[];
        latestSignalId: number;
      };

      setCallParticipants(data.participants ?? []);

      const mySessionId = callSessionIdRef.current;
      const activeRemoteSessionIds = new Set(
        (data.participants ?? [])
          .map((p) => p.session_id)
          .filter((sessionId) => sessionId !== mySessionId)
      );

      Object.keys(peersRef.current).forEach((sessionId) => {
        if (!activeRemoteSessionIds.has(sessionId)) {
          closePeer(sessionId);
        }
      });

      for (const remoteSessionId of activeRemoteSessionIds) {
        ensurePeer(remoteSessionId);
        await makeOfferIfNeeded(remoteSessionId);
      }

      for (const signal of data.signals ?? []) {
        await applySignal(signal);
      }

      latestSignalIdRef.current = Math.max(
        latestSignalIdRef.current,
        data.latestSignalId ?? 0,
        ...(data.signals ?? []).map((s) => s.id)
      );
    } catch (e) {
      console.error('sync call state error:', e);
    }
  };

  const fetchCallParticipantsOverview = async () => {
    try {
      const res = await fetch(`/api/call?roomId=${CALL_ROOM_ID}`, { cache: 'no-store' });
      if (!res.ok) return;

      const data = (await res.json()) as {
        participants: CallParticipant[];
      };

      setCallParticipants(data.participants ?? []);
    } catch (e) {
      console.error('fetch call participants overview error:', e);
    }
  };

  const leaveCall = async (notifyServer = true) => {
    stopCallLoops();
    inCallRef.current = false;

    // Supabase Realtime チャンネルを切断
    if (callChannelRef.current) {
      try {
        await callChannelRef.current.untrack();
      } catch {}
      await supabaseCall.removeChannel(callChannelRef.current).catch(() => {});
      callChannelRef.current = null;
    }

    if (notifyServer && callSessionIdRef.current) {
      try {
        await fetch('/api/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'leave',
            roomId: CALL_ROOM_ID,
            sessionId: callSessionIdRef.current,
          }),
        });
      } catch {}
    }

    Object.keys(peersRef.current).forEach((sessionId) => {
      closePeer(sessionId);
    });
    peersRef.current = {};
    remoteStreamsRef.current = {};
    setRemoteAudios([]);
    clearSpeakingResources();
    offeredSessionsRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    callSessionIdRef.current = '';
    latestSignalIdRef.current = 0;
    setMicEnabled(false);
    setInCall(false);
    setCallParticipants([]);
  };

  const startCallLoops = () => {
    stopCallLoops();

    // シグナリングは Supabase Realtime で行うため、ポーリングは不要
    // ハートビートのみ DB 記録保持のために維持（非参加者の参加者一覧表示用）
    heartbeatTimerRef.current = window.setInterval(() => {
      if (!callSessionIdRef.current) return;
      fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'heartbeat',
          roomId: CALL_ROOM_ID,
          sessionId: callSessionIdRef.current,
        }),
      }).catch(() => {});
    }, 10000);
  };

  const joinCall = async () => {
    if (!currentUser || inCall || joiningCall) return;

    setJoiningCall(true);
    setCallError('');

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch {
      setCallError('マイクが使用できません。ブラウザの許可設定を確認してください。');
      setJoiningCall(false);
      return;
    }

    stream.getAudioTracks().forEach((track) => {
      track.enabled = false;
    });

    const sessionId = crypto.randomUUID();
    try {
      const res = await fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          roomId: CALL_ROOM_ID,
          userName: currentUser,
          sessionId,
        }),
      });

      if (res.status === 409) {
        setCallError('通話ルームが満員です（最大5人）。');
        stream.getTracks().forEach((track) => track.stop());
        setJoiningCall(false);
        return;
      }

      if (!res.ok) {
        setCallError('通話ルームへ参加できませんでした。');
        stream.getTracks().forEach((track) => track.stop());
        setJoiningCall(false);
        return;
      }

      callSessionIdRef.current = sessionId;
      localStreamRef.current = stream;
      registerSpeakingStream(sessionId, stream);
      latestSignalIdRef.current = 0;
      offeredSessionsRef.current.clear();
      setMicEnabled(false);
      inCallRef.current = true;
      setInCall(true);
      setCallMenuOpen(true);

      // Supabase Realtime チャンネルをセットアップ
      setupCallChannel(sessionId, currentUser);

      // 通話参加通知：入室時の参加者一覧を取得してからPush送信
      try {
        const stateRes = await fetch(`/api/call?roomId=${CALL_ROOM_ID}`, { cache: 'no-store' });
        if (stateRes.ok) {
          const stateData = (await stateRes.json()) as { participants: { user_name: string }[] };
          const names = (stateData.participants ?? []).map((p) => p.user_name);
          if (!names.includes(currentUser)) names.push(currentUser);
          const body = `通話中：${names.join('、')}`;
          notifyPush(`${currentUser}が通話ルームに入りました！`, body, currentUser);
        }
      } catch {}

      startCallLoops();
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      setCallError('通話ルームへ参加できませんでした。');
    } finally {
      setJoiningCall(false);
    }
  };

  const sendCallInvite = async () => {
    if (!callNotifyTarget || !inCall || sendingCallInvite) return;
    setSendingCallInvite(true);
    try {
      const names = callParticipants.map((p) => p.user_name);
      const body = `通話中：${names.join('、')}`;
      const title = `${currentUser}があなたを通話ルームで待っています！`;
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, url: '/chat', targetUser: callNotifyTarget }),
      });
      setCallNotifyTarget('');
    } catch {}
    setSendingCallInvite(false);
  };

  const toggleMic = () => {
    setMicEnabled((prev) => {
      const next = !prev;
      localStreamRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = next;
      });
      return next;
    });
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

  useEffect(() => {
    if (!callMenuOpen || inCall) return;

    void fetchCallParticipantsOverview();

    const id = window.setInterval(() => {
      void fetchCallParticipantsOverview();
    }, 2000);

    return () => window.clearInterval(id);
  }, [callMenuOpen, inCall]);

  // まゆこ閲覧中に未読メッセージが届いたら随時既読化
  useEffect(() => {
    if (currentUser !== 'まゆこ' || markingReadRef.current) return;
    const hasUnread = messages.some((m) => m.sender !== 'まゆこ' && m.mayuko_read_status === 'まゆこ未読');
    if (!hasUnread) return;
    markingReadRef.current = true;
    markMayukoRead()
      .then(() => fetchMessages())
      .finally(() => {
        markingReadRef.current = false;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, currentUser]);

  const sendText = async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: currentUser,
          content: text,
          replyToId: replyTarget?.id ?? null,
          replyToSender: replyTarget?.sender ?? null,
          replyToContent: replyTarget?.content ?? null,
        }),
      });
      if (!res.ok) {
        return;
      }
      setInputText('');
      setReplyTarget(null);
      setActiveMessageId(null);
      notifyPush(currentUser, `${text}`, currentUser);
      forceScrollRef.current = true;
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
      if (replyTarget) {
        fd.append('replyToId', String(replyTarget.id));
        fd.append('replyToSender', replyTarget.sender);
        fd.append('replyToContent', replyTarget.content);
      }
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        return;
      }
      setReplyTarget(null);
      setActiveMessageId(null);
      notifyPush(currentUser, `${currentUser}がファイルを送信しました`, currentUser);
      forceScrollRef.current = true;
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
      setActiveMessageId(null);
      if (replyTarget?.id === id) {
        setReplyTarget(null);
      }
      await fetchMessages();
    } catch {}
  };

  const jumpToMessage = (messageId: number) => {
    const target = messageItemRefs.current[messageId];
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMessageId(messageId);

    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current);
    }

    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedMessageId(null);
      highlightTimerRef.current = null;
    }, 1800);
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
    const isAtTop = el.scrollTop <= 24;
    wasAtBottomRef.current = distFromBottom <= 60;
    setShowScrollBtn(distFromBottom > 60);
    setShowLoadOlderBtn(isAtTop && hasMoreOlder && !loadingOlder);
  };

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScrollBottom, { passive: true });
    return () => el.removeEventListener('scroll', checkScrollBottom);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, hasMoreOlder, loadingOlder]);

  useEffect(() => {
    checkScrollBottom();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMoreOlder, loadingOlder]);

  // メッセージ更新時にも位置チェック＆最下部なら自動スクロール
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    if (shouldScrollOnLoginRef.current) {
      shouldScrollOnLoginRef.current = false;
      el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
      checkScrollBottom();
      return;
    }
    // 自分が送信した直後、または更新前に最下部にいた（↓ボタン非表示）場合は最下部へスクロール
    if (forceScrollRef.current || wasAtBottomRef.current) {
      forceScrollRef.current = false;
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      // スムーズスクロール完了前に判定すると誤って「最下部でない」と記録されるため、意図した状態を明示的にセット
      wasAtBottomRef.current = true;
      setShowScrollBtn(false);
      return;
    }
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

  // スピーカーON/OFFを GainNode で制御（AudioContext経由再生のため audioエレメント不要）
  useEffect(() => {
    const gain = speakerEnabled ? 1 : 0;
    Object.values(speakerGainNodesRef.current).forEach((gainNode) => {
      gainNode.gain.value = gain;
    });
  }, [speakerEnabled]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current);
      }
      void leaveCall(true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex flex-col h-dvh bg-white">
      <header className={`flex items-center justify-between px-4 py-3 ${userTheme.headerBg} text-white`}>
        <div>
          <p className="font-bold text-lg leading-tight">{currentUser}</p>
          <p className={`${userTheme.headerSubText} text-xs`}>MINE</p>
        </div>
        <div className="relative flex items-center gap-2">
          <div className={`flex h-9 items-center rounded-full px-4 ${userTheme.buttonBg} ${userTheme.buttonHover}`}>
            <select
              value={messageFontSize}
              onChange={(e) => setMessageFontSize(e.target.value as MessageFontSize)}
              aria-label="文字サイズ"
              className="cursor-pointer bg-transparent text-sm font-semibold text-white focus:outline-none"
            >
              <option value="small" className="text-black">小</option>
              <option value="medium" className="text-black">中</option>
              <option value="large" className="text-black">大</option>
            </select>
          </div>
          {pushPermission !== 'granted' && pushPermission !== 'denied' && (
            <button
              onClick={() => requestNotificationPermission(currentUser)}
              aria-label="通知を許可"
              className={`flex items-center gap-1.5 text-sm text-white ${userTheme.buttonBg} ${userTheme.buttonHover} px-4 py-2 rounded-full`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              通知ON
            </button>
          )}
          <button
            onClick={() => setGameMenuOpen((prev) => !prev)}
            aria-label="ゲーム"
            className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-white ${userTheme.buttonBg} ${userTheme.buttonHover}`}
          >
            <span className="text-base">👾</span>
          </button>
          <button
            onClick={() => setCallMenuOpen((prev) => !prev)}
            aria-label="通話"
            className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-white ${inCall ? 'bg-emerald-500 hover:bg-emerald-600' : `${userTheme.buttonBg} ${userTheme.buttonHover}`}`}
          >
            <span className="text-base">📞</span>
          </button>
          {pushPermission === 'denied' && (
            <span className="text-xs text-violet-300">通知ブロック中</span>
          )}
          <button
            onClick={() => {
              void leaveCall(true);
              sessionStorage.removeItem('chatUser');
              router.push('/');
            }}
            aria-label="ユーザー変更"
            className={`w-9 h-9 flex items-center justify-center ${userTheme.buttonDarkerBg} ${userTheme.buttonDarkerHover} rounded-full`}
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

          {gameMenuOpen && (
            <div className={`absolute right-12 top-full z-40 mt-2 ${gameMenuWidthClass} space-y-2 rounded-2xl bg-white p-2 text-gray-800 shadow-2xl ring-1 ring-black/10`}>
              <button
                onClick={() => {
                  setGameMenuOpen(false);
                  router.push('/game');
                }}
                className={`flex w-full items-center justify-between rounded-xl text-left font-semibold bg-yellow-400 text-slate-900 hover:bg-yellow-300 ${gameMenuButtonSizeClass}`}
              >
                <span>ランキング</span>
              </button>
              <button
                onClick={() => {
                  setGameMenuOpen(false);
                  router.push('/game/millionaire');
                }}
                className={`flex w-full items-center justify-between rounded-xl text-left font-semibold bg-red-500 text-white hover:bg-red-400 ${gameMenuButtonSizeClass}`}
              >
                <span>クイズ$ミリオネア</span>
              </button>
              <button
                onClick={() => {
                  setGameMenuOpen(false);
                  router.push('/game/brain-training');
                }}
                className={`flex w-full items-center justify-between rounded-xl text-left font-semibold bg-blue-500 text-white hover:bg-blue-400 ${gameMenuButtonSizeClass}`}
              >
                <span>神経衰弱ゲーム</span>
              </button>
              <button
                onClick={() => {
                  setGameMenuOpen(false);
                  router.push('/game/spot-difference');
                }}
                className={`flex w-full items-center justify-between rounded-xl text-left font-semibold bg-green-500 text-white hover:bg-green-400 ${gameMenuButtonSizeClass}`}
              >
                <span>鼻ほじりゲーム</span>
              </button>
            </div>
          )}

          {callMenuOpen && (
            <div className={`absolute right-0 top-full z-50 mt-2 ${callMenuWidthClass} rounded-2xl bg-white p-3 text-gray-800 shadow-2xl ring-1 ring-black/10`}>
              <div className="mb-2 flex items-center justify-between">
                <p className={`${callMenuTitleClass} font-bold text-gray-800`}>通話ルーム</p>
                <p className={`${callMenuSubClass} text-gray-500`}>{callParticipants.length}/{CALL_MAX_PARTICIPANTS} 人</p>
              </div>

              <div className={`mb-3 max-h-24 overflow-y-auto rounded-lg bg-gray-50 p-2 text-gray-700 ${callMenuListClass}`}>
                {callParticipants.length === 0 ? (
                  <p>参加者はいません</p>
                ) : (
                  callParticipants.map((participant) => (
                    <div key={participant.session_id} className="mb-1 flex items-center justify-between rounded-lg bg-white px-2 py-1.5 last:mb-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 ${callMenuSubClass}`}>
                          {getCallUserIcon(participant.user_name)}
                        </span>
                        <p className={`truncate font-semibold text-gray-700 ${callMenuListClass}`}>
                          {participant.user_name}
                          {participant.session_id === callSessionIdRef.current ? ' (あなた)' : ''}
                        </p>
                      </div>
                      <div className="ml-2 flex items-center gap-1">
                        {speakingBySessionId[participant.session_id] ? (
                          <span className={`inline-flex items-center rounded-full bg-emerald-100 font-semibold text-emerald-700 ${callMenuBadgeClass}`}>
                            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            話し中
                          </span>
                        ) : (
                          <span className={`inline-flex items-center rounded-full bg-gray-100 font-semibold text-gray-500 ${callMenuBadgeClass}`}>
                            待機中
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {!inCall ? (
                  <button
                    onClick={joinCall}
                    disabled={joiningCall}
                    className={`rounded-full font-semibold text-white ${userTheme.buttonBg} ${userTheme.buttonHover} disabled:opacity-60 ${callMenuButtonClass}`}
                  >
                    {joiningCall ? '参加中...' : '通話に参加'}
                  </button>
                ) : (
                  <button
                    onClick={() => void leaveCall(true)}
                    className={`rounded-full bg-red-500 font-semibold text-white hover:bg-red-600 ${callMenuButtonClass}`}
                  >
                    通話を抜ける
                  </button>
                )}

                <button
                  onClick={toggleMic}
                  disabled={!inCall}
                  className={`rounded-full font-semibold text-white ${micEnabled ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-500 hover:bg-gray-600'} disabled:opacity-60 ${callMenuButtonClass}`}
                >
                  {micEnabled ? '🗣️' : '🤐'}
                </button>

                <button
                  onClick={() => setSpeakerEnabled((prev) => !prev)}
                  disabled={!inCall}
                  className={`rounded-full font-semibold text-white ${speakerEnabled ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-gray-500 hover:bg-gray-600'} disabled:opacity-60 ${callMenuButtonClass}`}
                >
                  {speakerEnabled ? '🔊' : '🔇'}
                </button>
              </div>

              {inCall && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <p className={`mb-1.5 font-semibold text-gray-600 ${callMenuSubClass}`}>呼び出し通知</p>
                  <div className="flex items-center gap-2">
                    <select
                      value={callNotifyTarget}
                      onChange={(e) => setCallNotifyTarget(e.target.value)}
                      className={`flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-400 ${callMenuSubClass}`}
                    >
                      <option value="">ユーザーを選択</option>
                      {KNOWN_USERS.filter((u) => u !== currentUser).map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                    <button
                      onClick={sendCallInvite}
                      disabled={!callNotifyTarget || sendingCallInvite}
                      className={`rounded-full bg-violet-500 font-semibold text-white hover:bg-violet-600 disabled:opacity-50 ${callMenuButtonClass}`}
                    >
                      {sendingCallInvite ? '送信中...' : '通知'}
                    </button>
                  </div>
                </div>
              )}
              <p className={`mt-2 text-gray-500 ${callMenuSubClass}`}>入室時はマイクOFFで開始します。</p>
              {callError && <p className={`mt-1 text-red-600 ${callMenuSubClass}`}>{callError}</p>}
            </div>
          )}
        </div>
      </header>

      <div ref={messagesRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
        {showLoadOlderBtn && (
          <div className="sticky top-0 z-20 flex justify-center pb-2">
            <button
              onClick={loadOlderMessages}
              disabled={loadingOlder}
              className={`rounded-full px-4 py-2 text-xs font-semibold text-white shadow ${userTheme.buttonBg} ${userTheme.buttonHover} disabled:opacity-60`}
            >
              {loadingOlder ? '読み込み中...' : '次の200件を読み込む'}
            </button>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            ref={(el) => {
              messageItemRefs.current[m.id] = el;
            }}
            className={`flex flex-col rounded-xl transition-all duration-300 ${m.sender === currentUser ? 'items-end' : 'items-start'} ${highlightedMessageId === m.id ? 'bg-yellow-100/80 ring-2 ring-yellow-300 ring-offset-2' : ''}`}
          >
            <span className={`text-xs font-semibold mb-1 ${m.sender === currentUser ? 'text-right text-violet-500' : 'text-left text-gray-500'}`}>{m.sender}</span>
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                setActiveMessageId((prev) => (prev === m.id ? null : m.id));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveMessageId((prev) => (prev === m.id ? null : m.id));
                }
              }}
              className={`relative max-w-[80%] rounded-2xl px-4 py-2 ${m.sender === currentUser ? `${getBubbleClass(currentUser)} border-2 cursor-pointer active:scale-[0.99]` : `${getBubbleClass(m.sender)} border-2 cursor-pointer active:scale-[0.99]`}`}
            >
              {m.sender === currentUser ? (
                <div
                  className={`pointer-events-none absolute -right-1.5 bottom-3 h-3 w-3 -rotate-45 ${getBubbleTailBgClass(currentUser)} border-r-2 border-b-2 ${getBubbleTailBorderClass(currentUser)}`}
                />
              ) : (
                <div
                  className={`pointer-events-none absolute -left-1.5 bottom-3 h-3 w-3 rotate-45 ${getBubbleTailBgClass(m.sender)} border-l-2 border-b-2 ${getBubbleTailBorderClass(m.sender)}`}
                />
              )}
              {m.reply_to_id && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (m.reply_to_id) {
                      jumpToMessage(m.reply_to_id);
                    }
                  }}
                  className="mb-2 block w-full rounded-lg border-l-2 border-gray-300 bg-white/70 px-2 py-1 text-left transition-colors hover:bg-white"
                >
                  <p className="text-[11px] font-semibold text-gray-600">{m.reply_to_sender}</p>
                  <p className="text-[11px] text-gray-600 break-words">{m.reply_to_content}</p>
                </button>
              )}
              {m.content && <p className={`whitespace-pre-wrap break-words ${fontSizeClass}`}>{m.content}</p>}
              {m.media_url && m.media_type === 'image' && (
                <Image src={m.media_url} alt="image" width={280} height={280} className="rounded-xl max-w-full object-cover mt-1" unoptimized />
              )}
              {m.media_url && m.media_type === 'video' && (
                <video src={m.media_url || undefined} controls className="rounded-xl max-w-full mt-1" style={{ maxWidth: 280 }} />
              )}
              {activeMessageId === m.id && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (replyTarget?.id === m.id) {
                        setReplyTarget(null);
                      } else {
                        const preview = m.content?.trim() || (m.media_type === 'image' ? '[画像]' : m.media_type === 'video' ? '[動画]' : '(本文なし)');
                        setReplyTarget({ id: m.id, sender: m.sender, content: preview });
                      }
                    }}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white ${replyTarget?.id === m.id ? 'bg-gray-500 hover:bg-gray-600' : `${userTheme.buttonBg} ${userTheme.buttonHover}`}`}
                  >
                    {replyTarget?.id === m.id ? 'リプ解除' : 'リプ'}
                  </button>
                  {m.sender === currentUser && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMessage(m.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-red-400 bg-red-500 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-red-600"
                    >
                      削除
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-gray-400">
              <span className="text-xs">{new Date(m.created_at).toLocaleString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</span>
              <span className="text-[11px]">{m.mayuko_read_status ?? 'まゆこ未読'}</span>
            </div>
          </div>
        ))}
      </div>

      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          aria-label="最新へ移動"
          className={`fixed top-[70px] right-4 z-30 w-10 h-10 flex items-center justify-center rounded-full ${userTheme.buttonBg} text-white shadow-lg ${userTheme.buttonHover}`}
        >
          ↓
        </button>
      )}

      <div className={`border-t ${userTheme.footerBorder} ${userTheme.footerBg} px-4 py-3 relative`}>
        {/* canned phrases overlay */}
        <div className={`absolute left-4 right-4 bottom-full mb-3 ${userTheme.cannedWindowBg} border ${userTheme.cannedBorder} rounded-xl shadow-lg p-3 transition-all duration-150 z-20 ${cannedOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className={`grid ${cannedGridClass} mb-3`}>
            {CANNED_PHRASES[activeCannedTab].map((p) => (
              <button key={p} onClick={() => { setInputText((prev)=> (prev && !prev.endsWith(' ') ? prev+' '+p : prev+p)); }} className={`px-3 py-2 bg-white rounded-lg ${cannedFontSizeClass} ${userTheme.cannedTextColor} ${userTheme.cannedHover}`}>{p}</button>
            ))}
          </div>
          <div className={`border-t ${userTheme.cannedBorder} pt-3 flex items-center gap-1`}>
            <div className={`flex overflow-x-auto flex-nowrap flex-1 min-w-0 ${cannedTabsWrapClass}`}>
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveCannedTab(t.key)}
                  className={`flex-shrink-0 rounded-full text-sm font-medium transition-colors ${activeCannedTab === t.key ? `${userTheme.buttonBg} text-white` : `bg-white ${userTheme.cannedTextColor}`} ${cannedButtonSizeClass}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button onClick={() => setCannedOpen(false)} className={`flex-shrink-0 ml-1 rounded-full text-xs font-semibold text-white bg-red-500 hover:bg-red-600 ${cannedButtonSizeClass}`}>閉じる</button>
          </div>
        </div>

        {uploading && <p className="text-center text-sm text-violet-500 mb-2">アップロード中...</p>}

        {replyTarget && (
          <div className={`mb-2 rounded-lg border ${userTheme.cannedBorder} bg-white/80 px-3 py-2`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-600">返信先: {replyTarget.sender}</p>
                <p className="text-xs text-gray-600 break-words">{replyTarget.content}</p>
              </div>
              <button
                onClick={() => setReplyTarget(null)}
                className="shrink-0 rounded-full bg-gray-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-gray-600"
              >
                解除
              </button>
            </div>
          </div>
        )}

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
          <input ref={mediaInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
          <button onClick={() => mediaInputRef.current?.click()} aria-label="共有" className={`flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-full ${userTheme.buttonBgLight} ${userTheme.buttonHoverLight}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3l2-3h6l2 3h3a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setCannedOpen((s) => !s)}
            aria-pressed={cannedOpen}
            aria-label="定型文"
            className={`flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-full ${userTheme.buttonBgLight} ${userTheme.buttonHoverLight}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-700"
            >
              <path d="M7 7h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H10l-4 3v-3H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
            </svg>
          </button>
          <div className="flex-1" />
          <button onClick={sendText} disabled={!inputText.trim()} className={`flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-full ${userTheme.buttonBg} ${userTheme.buttonHover} text-white text-2xl disabled:opacity-50`}>➤</button>
        </div>
      </div>
    </div>
  );
}
