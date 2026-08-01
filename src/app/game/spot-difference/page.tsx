'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Point = { x: number; y: number };
type MessageFontSize = 'small' | 'medium' | 'large';

interface CourseLayout {
  points: Point[];
  start: Point;
  hole: Point;
}

interface RankingRow {
  user_name: string;
  game_type: string;
  best_value: number;
}

const BASE_COURSE_WIDTH = 860;
const COURSE_HEIGHT = 1260;
const COURSE_LEFT = 80;
const COURSE_TOP = 80;
const COURSE_RIGHT = 780;
const COURSE_BOTTOM = 1180;
const BALL_RADIUS = 18;
const HOLE_RADIUS = 34;
// 基本摩擦係数（線形減速）
const FRICTION = 0.984;
// 毎フレームの一定減速量（低速ほど素早く止まる）
const DECELERATION = 0.18;
// 最大発射パワー
const MAX_POWER = 44;
const SPEED_STOP_THRESHOLD = 0.12;
const PIPE_RADIUS = 54;
const BALL_HIT_RADIUS = 104;
function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const FIXED_PIPE_POINTS: Point[] = [
  // 迷路風。盤面全体を大きく使いつつ、壁に区切られた通路っぽく見える蛇行コース。
  { x: 430, y: 130 },
  { x: 770, y: 130 },
  { x: 770, y: 250 },
  { x: 620, y: 250 },
  { x: 620, y: 330 },
  { x: 130, y: 330 },
  { x: 130, y: 450 },
  { x: 340, y: 450 },
  { x: 340, y: 530 },
  { x: 730, y: 530 },
  { x: 730, y: 650 },
  { x: 500, y: 650 },
  { x: 500, y: 730 },
  { x: 170, y: 730 },
  { x: 170, y: 850 },
  { x: 650, y: 850 },
  { x: 650, y: 930 },
  { x: 430, y: 980 },
  { x: 740, y: 1050 },
  { x: 740, y: 1140 },
  { x: 130, y: 1140 },
];

function buildFixedCourseLayout(): CourseLayout {
  return {
    points: FIXED_PIPE_POINTS,
    start: FIXED_PIPE_POINTS[0],
    hole: FIXED_PIPE_POINTS[FIXED_PIPE_POINTS.length - 1],
  };
}

function createInitialCourse() {
  const generated = buildFixedCourseLayout();
  return {
    course: generated,
    ball: generated.start,
  };
}

function reflectVelocityByNormal(vx: number, vy: number, nx: number, ny: number) {
  const dot = vx * nx + vy * ny;
  return {
    vx: (vx - 2 * dot * nx) * 0.92,
    vy: (vy - 2 * dot * ny) * 0.92,
  };
}

function closestPointOnSegment(point: Point, a: Point, b: Point): Point {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const c2 = vx * vx + vy * vy;
  if (c2 === 0) return a;
  const t = clamp(((point.x - a.x) * vx + (point.y - a.y) * vy) / c2, 0, 1);
  return { x: a.x + vx * t, y: a.y + vy * t };
}

function findClosestPointOnPipe(point: Point, pipePoints: Point[]) {
  let bestPoint = pipePoints[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < pipePoints.length - 1; index += 1) {
    const a = pipePoints[index];
    const b = pipePoints[index + 1];
    const candidate = closestPointOnSegment(point, a, b);
    const d = distance(point, candidate);
    if (d < bestDistance) {
      bestDistance = d;
      bestPoint = candidate;
    }
  }

  return { point: bestPoint, distance: bestDistance };
}

export default function SpotDifferencePage() {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const velocityRef = useRef({ vx: 0, vy: 0 });
  const aimingStartRef = useRef<Point | null>(null);
  const [currentUser, setCurrentUser] = useState('');
  const initialCourse = useMemo(() => createInitialCourse(), []);
  const [course, setCourse] = useState<CourseLayout>(initialCourse.course);
  const [ball, setBall] = useState<Point>(initialCourse.ball);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPoint, setDragPoint] = useState<Point | null>(null);
  const [strokes, setStrokes] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [message, setMessage] = useState('☝️をドラッグして👃へ突き刺そう！');
  const [finished, setFinished] = useState(false);
  const [saved, setSaved] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resultScore, setResultScore] = useState(0);
  const [resultBestScore, setResultBestScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [messageFontSize, setMessageFontSize] = useState<MessageFontSize>('medium');
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgWidth, setSvgWidth] = useState(BASE_COURSE_WIDTH);
  const trailRef = useRef<Point[]>([]);
  const speedRef = useRef(0);

  useEffect(() => {
    setBall(course.start);
  }, [course]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSvgWidth(el.clientWidth || BASE_COURSE_WIDTH);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const user = sessionStorage.getItem('chatUser');
    if (!user) {
      router.push('/');
      return;
    }
    setCurrentUser(user);
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
    const fetchBest = async () => {
      try {
        const res = await fetch('/api/game-rankings');
        if (!res.ok) {
          throw new Error('Failed to fetch rankings');
        }
        const data = (await res.json()) as RankingRow[];
        const row = data.find((item) => item.user_name === currentUser && item.game_type === 'spot_difference');
        setBestScore(Number(row?.best_value ?? 0));
      } catch (err) {
        console.error(err);
      }
    };
    fetchBest();
  }, [currentUser]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const textSizeClass =
    messageFontSize === 'small'
      ? 'text-sm'
      : messageFontSize === 'large'
        ? 'text-4xl'
        : 'text-lg';

  const secondaryTextSizeClass =
    messageFontSize === 'small'
      ? 'text-sm'
      : messageFontSize === 'large'
        ? 'text-3xl'
        : 'text-base';

  const fingerFontSize =
    messageFontSize === 'small'
      ? 54
      : messageFontSize === 'large'
        ? 98
        : 74;

  const noseFontSize =
    messageFontSize === 'small'
      ? 66
      : messageFontSize === 'large'
        ? 124
        : 92;

  const startFontSize =
    messageFontSize === 'small'
      ? 28
      : messageFontSize === 'large'
        ? 44
        : 34;

  const canShoot = useMemo(() => !finished && Math.hypot(velocityRef.current.vx, velocityRef.current.vy) < SPEED_STOP_THRESHOLD, [finished, ball]);

  const saveResult = async (finalStrokes: number) => {
    if (!currentUser || saved) return;
    try {
      await fetch('/api/game-rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: currentUser,
          gameType: 'spot_difference',
          cumulativeDelta: finalStrokes,
          bestValue: finalStrokes,
          extraValue: 1,
        }),
      });
      setSaved(true);
      setBestScore((prev) => (prev === 0 ? finalStrokes : Math.min(prev, finalStrokes)));
    } catch (err) {
      console.error(err);
    }
  };

  const finishGame = async (finalStrokes: number) => {
    const nextBest = bestScore === 0 ? finalStrokes : Math.min(bestScore, finalStrokes);
    setFinished(true);
    setSuccess(true);
    setResultScore(finalStrokes);
    setResultBestScore(nextBest);
    setIsNewBest(bestScore === 0 || finalStrokes < bestScore);
    setMessage('鼻ほじり成功！');
    await saveResult(finalStrokes);
  };

  const stepBall = () => {
    setBall((prev) => {
      let nextX = prev.x + velocityRef.current.vx;
      let nextY = prev.y + velocityRef.current.vy;

      const closest = findClosestPointOnPipe({ x: nextX, y: nextY }, course.points);
      const limit = PIPE_RADIUS - BALL_RADIUS;
      if (closest.distance > limit) {
        const nxRaw = nextX - closest.point.x;
        const nyRaw = nextY - closest.point.y;
        const nLen = Math.hypot(nxRaw, nyRaw) || 1;
        const nx = nxRaw / nLen;
        const ny = nyRaw / nLen;

        const reflected = reflectVelocityByNormal(velocityRef.current.vx, velocityRef.current.vy, nx, ny);
        velocityRef.current.vx = reflected.vx;
        velocityRef.current.vy = reflected.vy;

        nextX = closest.point.x + nx * limit;
        nextY = closest.point.y + ny * limit;
      }

      // 速度依存摩擦: 一定量を速度から引く（低速ほど素早く止まる）
      const speed = Math.hypot(velocityRef.current.vx, velocityRef.current.vy);
      const newSpeed = Math.max(0, speed * FRICTION - DECELERATION);
      if (speed > 0) {
        const ratio = newSpeed / speed;
        velocityRef.current.vx *= ratio;
        velocityRef.current.vy *= ratio;
      }

      // トレイル・速度を更新
      speedRef.current = newSpeed;
      trailRef.current = [...trailRef.current.slice(-6), { x: prev.x, y: prev.y }];

      if (distance({ x: nextX, y: nextY }, course.hole) <= HOLE_RADIUS) {
        velocityRef.current.vx = 0;
        velocityRef.current.vy = 0;
        window.setTimeout(() => {
          finishGame(strokes);
        }, 120);
        return { x: course.hole.x, y: course.hole.y };
      }

      if (Math.hypot(velocityRef.current.vx, velocityRef.current.vy) <= SPEED_STOP_THRESHOLD) {
        velocityRef.current.vx = 0;
        velocityRef.current.vy = 0;
        speedRef.current = 0;
        trailRef.current = [];
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
      } else {
        animationRef.current = requestAnimationFrame(stepBall);
      }

      return { x: nextX, y: nextY };
    });
  };

  // 物理演算はベース座標 (0..BASE_COURSE_WIDTH) で行う。
  // getSvgPoint はスクリーン座標 → ベース座標 に変換する。
  const getSvgPoint = useCallback((clientX: number, clientY: number): Point | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    // viewBox 横幅 = svgWidth、物理座標空間 = BASE_COURSE_WIDTH
    // scaleX = BASE_COURSE_WIDTH / rect.width で物理座標へ変換
    const scaleX = BASE_COURSE_WIDTH / rect.width;
    const scaleY = COURSE_HEIGHT / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const beginDragPoint = (point: Point) => {
    if (!canShoot) return;
    if (distance(point, ball) > BALL_HIT_RADIUS) return;
    aimingStartRef.current = ball;
    setIsDragging(true);
    setDragPoint(point);
  };

  const beginDrag = (clientX: number, clientY: number) => {
    const point = getSvgPoint(clientX, clientY);
    if (!point) return;
    beginDragPoint(point);
  };

  const moveDrag = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const point = getSvgPoint(clientX, clientY);
    if (!point) return;
    setDragPoint(point);
  };

  const beginPointerDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    const point = getSvgPoint(event.clientX, event.clientY);
    if (!point) return;
    beginDragPoint(point);
    if (isDragging) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const movePointerDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    const point = getSvgPoint(event.clientX, event.clientY);
    if (!point) return;
    setDragPoint(point);
  };

  const endPointerDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    endDrag();
  };

  const endDrag = () => {
    if (!isDragging || !dragPoint || !aimingStartRef.current) {
      setIsDragging(false);
      setDragPoint(null);
      return;
    }

    const dx = aimingStartRef.current.x - dragPoint.x;
    const dy = aimingStartRef.current.y - dragPoint.y;
    // ドラッグ距離を二乗カーブでパワーにマッピング（長いほど急激に強くなる）
    const dragDist = Math.hypot(dx, dy);
    const power = clamp((dragDist / 220) ** 1.7 * MAX_POWER, 0.5, MAX_POWER);
    const angle = Math.atan2(dy, dx);

    velocityRef.current = {
      vx: Math.cos(angle) * power,
      vy: Math.sin(angle) * power,
    };

    setStrokes((prev) => prev + 1);
    setMessage('☝️発射！');
    setIsDragging(false);
    setDragPoint(null);

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(stepBall);
  };

  const restart = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    velocityRef.current = { vx: 0, vy: 0 };
    trailRef.current = [];
    speedRef.current = 0;
    const nextCourse = buildFixedCourseLayout();
    setCourse(nextCourse);
    setBall(nextCourse.start);
    setIsDragging(false);
    setDragPoint(null);
    setStrokes(0);
    setMessage('☝️をドラッグして👃へ突き刺そう！');
    setFinished(false);
    setSaved(false);
    setSuccess(false);
    setResultScore(0);
    setResultBestScore(bestScore);
    setIsNewBest(false);
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#14532d,_#0f172a_60%,_#020617)] text-white">
      <header className="border-b border-emerald-300/20 bg-black/20 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs text-emerald-200">GAME / NOSE PICKING GOLF</p>
            <h1 className="text-2xl font-bold">鼻ほじり</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push('/game')} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">ランキング</button>
            <button onClick={() => router.push('/chat')} className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300">チャット</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="rounded-[2rem] border border-emerald-300/20 bg-slate-950/60 p-6 shadow-2xl shadow-emerald-500/10">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className={`${secondaryTextSizeClass} text-emerald-200`}>現在の打数</p>
              <p className="text-3xl font-black">{strokes}</p>
            </div>
            <div className={`text-right text-white/80 ${secondaryTextSizeClass}`}>
              <p>最短打数: {bestScore === 0 ? '-' : bestScore}</p>
            </div>
          </div>

          <div className={`mb-3 rounded-xl bg-white/5 px-3 py-2 text-white/90 ${secondaryTextSizeClass}`}>{message}</div>

          <div ref={containerRef} className="rounded-[1.5rem] border border-emerald-300/20 bg-[linear-gradient(180deg,_rgba(34,197,94,0.18),_rgba(22,101,52,0.32))] p-2">
            {/* xScale: SVG描画用にベース座標(860)をコンテナ幅にスケール */}
            {(() => {
            const xScale = svgWidth / BASE_COURSE_WIDTH;
            return (
            <svg
              ref={svgRef}
              viewBox={`0 0 ${svgWidth} ${COURSE_HEIGHT}`}
              className="w-full touch-none select-none"
              style={{ display: 'block' }}
              onPointerDown={beginPointerDrag}
              onPointerMove={movePointerDrag}
              onPointerUp={endPointerDrag}
              onPointerCancel={endPointerDrag}
              onMouseDown={(e) => beginDrag(e.clientX, e.clientY)}
              onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
              onMouseUp={endDrag}
              onMouseLeave={() => { if (isDragging) endDrag(); }}
              onTouchStart={(e) => {
                const touch = e.touches[0];
                if (touch) beginDrag(touch.clientX, touch.clientY);
              }}
              onTouchMove={(e) => {
                const touch = e.touches[0];
                if (touch) moveDrag(touch.clientX, touch.clientY);
              }}
              onTouchEnd={endDrag}
            >
              {/* SVGフィルター定義 */}
              <defs>
                {/* 白い発光（移動時） */}
                <filter id="glow-white" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="10" result="blur1" />
                  <feGaussianBlur stdDeviation="20" result="blur2" />
                  <feMerge>
                    <feMergeNode in="blur2" />
                    <feMergeNode in="blur1" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {/* 超強い発光（高速時） */}
                <filter id="glow-intense" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation="6" result="tight" />
                  <feGaussianBlur stdDeviation="18" result="mid" />
                  <feGaussianBlur stdDeviation="36" result="wide" />
                  <feMerge>
                    <feMergeNode in="wide" />
                    <feMergeNode in="mid" />
                    <feMergeNode in="tight" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <rect x="0" y="0" width={svgWidth} height={COURSE_HEIGHT} fill="rgba(2,6,23,0.58)" />

              <rect
                x={COURSE_LEFT * xScale - 28}
                y={COURSE_TOP - 28}
                width={(COURSE_RIGHT - COURSE_LEFT) * xScale + 56}
                height={COURSE_BOTTOM - COURSE_TOP + 56}
                rx="34"
                fill="rgba(8,15,28,0.94)"
                stroke="rgba(148,163,184,0.16)"
                strokeWidth="6"
              />

              <polyline
                points={course.points.map((point) => `${point.x * xScale},${point.y}`).join(' ')}
                fill="none"
                stroke="rgba(15,23,42,0.98)"
                strokeWidth={PIPE_RADIUS * 2 + 32}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points={course.points.map((point) => `${point.x * xScale},${point.y}`).join(' ')}
                fill="none"
                stroke="rgba(16,185,129,0.18)"
                strokeWidth={PIPE_RADIUS * 2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points={course.points.map((point) => `${point.x * xScale},${point.y}`).join(' ')}
                fill="none"
                stroke="rgba(187,247,208,0.12)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="10 14"
              />

              <circle cx={course.start.x * xScale} cy={course.start.y} r="32" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.35)" strokeDasharray="6 6" />
              <circle cx={course.start.x * xScale} cy={course.start.y} r={BALL_HIT_RADIUS} fill="rgba(255,255,255,0.01)" />
              <text x={course.start.x * xScale} y={course.start.y + 10} textAnchor="middle" fontSize={startFontSize}>🏁</text>

              <circle cx={course.hole.x * xScale} cy={course.hole.y} r={HOLE_RADIUS + 10} fill="rgba(0,0,0,0.35)" />
              <circle cx={course.hole.x * xScale} cy={course.hole.y} r={HOLE_RADIUS + 40} fill="rgba(255,255,255,0.01)" />
              <text x={course.hole.x * xScale} y={course.hole.y + 18} textAnchor="middle" fontSize={success ? noseFontSize + 10 : noseFontSize}>
                👃
              </text>
              {success && (
                <g>
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values={`${course.hole.x * xScale - 10} ${course.hole.y + 62}; ${course.hole.x * xScale - 10} ${course.hole.y + 36}; ${course.hole.x * xScale - 10} ${course.hole.y + 62}`}
                    dur="0.85s"
                    repeatCount="indefinite"
                  />
                  <text x="0" y="0" textAnchor="middle" fontSize={fingerFontSize}>
                    ☝️
                  </text>
                </g>
              )}

              {isDragging && dragPoint && (
                <line
                  x1={ball.x * xScale}
                  y1={ball.y}
                  x2={dragPoint.x * xScale}
                  y2={dragPoint.y}
                  stroke="rgba(250,204,21,0.9)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray="10 8"
                />
              )}

              {!success && (() => {
                const spd = speedRef.current;
                const isMoving = spd > SPEED_STOP_THRESHOLD;
                const isFast = spd > 14;
                const filterId = isFast ? 'glow-intense' : isMoving ? 'glow-white' : undefined;
                const scale = isFast ? 1.28 : isMoving ? 1.1 : 1.0;
                const trail = trailRef.current;
                return (
                  <>
                    {/* 残像トレイル */}
                    {isMoving && trail.map((pt, i) => {
                      const t = (i + 1) / trail.length;
                      return (
                        <text
                          key={i}
                          x={pt.x * xScale}
                          y={pt.y + 14}
                          textAnchor="middle"
                          fontSize={fingerFontSize * (0.45 + t * 0.45)}
                          opacity={t * 0.55}
                          style={{ filter: i >= trail.length - 2 ? 'url(#glow-white)' : undefined }}
                        >
                          ☝️
                        </text>
                      );
                    })}
                    {/* メイン指 */}
                    <text
                      x={ball.x * xScale}
                      y={ball.y + 14}
                      textAnchor="middle"
                      fontSize={fingerFontSize * scale}
                      style={filterId ? { filter: `url(#${filterId})` } : undefined}
                    >
                      ☝️
                    </text>
                  </>
                );
              })()}
            </svg>
            );
            })()}
          </div>

          {finished && (
            <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-5 text-center">
              <p className="text-4xl font-black text-emerald-200 md:text-6xl">鼻ほじり成功！</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-white/10 px-4 py-4">
                  <p className={`${secondaryTextSizeClass} text-white/70`}>今回のスコア</p>
                  <p className="mt-1 text-4xl font-black">{resultScore} 打</p>
                </div>
                <div className="rounded-xl bg-white/10 px-4 py-4">
                  <p className={`${secondaryTextSizeClass} text-white/70`}>最高スコア</p>
                  <p className="mt-1 text-4xl font-black">{resultBestScore} 打</p>
                </div>
              </div>
              {isNewBest && <p className={`mt-4 font-semibold text-amber-300 ${secondaryTextSizeClass}`}>最短打数を更新しました！</p>}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button onClick={restart} className={`rounded-full bg-emerald-400 px-5 py-2 font-semibold text-slate-950 hover:bg-emerald-300 ${secondaryTextSizeClass}`}>もう一度挑戦</button>
                <button onClick={() => router.push('/game')} className={`rounded-full bg-white/10 px-5 py-2 font-semibold hover:bg-white/20 ${secondaryTextSizeClass}`}>ランキングを見る</button>
              </div>
            </div>
          )}

          {!finished && (
            <div className="mt-5 flex gap-2">
              <button onClick={restart} className={`rounded-full bg-white/10 px-4 py-2 font-semibold hover:bg-white/20 ${secondaryTextSizeClass}`}>最初から</button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
