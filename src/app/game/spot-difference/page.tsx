'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

type Point = { x: number; y: number };
type MessageFontSize = 'small' | 'medium' | 'large';
type GridCell = { col: number; row: number };

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

const COURSE_WIDTH = 860;
const COURSE_HEIGHT = 1700;
const COURSE_LEFT = 80;
const COURSE_TOP = 80;
const COURSE_RIGHT = 780;
const COURSE_BOTTOM = 1620;
const BALL_RADIUS = 18;
const HOLE_RADIUS = 34;
const FRICTION = 0.986;
const MIN_POWER = 4;
const MAX_POWER = 34;
const SPEED_STOP_THRESHOLD = 0.12;
const PIPE_RADIUS = 64;
const BALL_HIT_RADIUS = 104;
const GRID_COLS = 6;
const GRID_ROWS = 14;
const MIN_PATH_LENGTH = 34;
const MAX_PATH_LENGTH = 55;

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function keyOf(cell: GridCell) {
  return `${cell.col},${cell.row}`;
}

function toPoint(cell: GridCell): Point {
  const stepX = (COURSE_RIGHT - COURSE_LEFT) / (GRID_COLS - 1);
  const stepY = (COURSE_BOTTOM - COURSE_TOP) / (GRID_ROWS - 1);
  return {
    x: COURSE_LEFT + cell.col * stepX,
    y: COURSE_TOP + cell.row * stepY,
  };
}

function shuffleArray<T>(items: T[]): T[] {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomCourseLayout(): CourseLayout {
  const directions: GridCell[] = [
    { col: 1, row: 0 },
    { col: -1, row: 0 },
    { col: 0, row: 1 },
    { col: 0, row: -1 },
  ];

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const targetLength = randomInt(MIN_PATH_LENGTH, MAX_PATH_LENGTH);
    const startCell: GridCell = { col: 0, row: 0 };
    const path: GridCell[] = [startCell];
    const visited = new Set<string>([keyOf(startCell)]);
    let safety = 0;

    while (safety < 9000) {
      safety += 1;
      const current = path[path.length - 1];

      if (path.length >= targetLength && current.col >= GRID_COLS - 2) {
        break;
      }

      const nextCandidates = shuffleArray(directions)
        .map((dir) => ({ col: current.col + dir.col, row: current.row + dir.row }))
        .filter((cell) => cell.col >= 0 && cell.col < GRID_COLS && cell.row >= 0 && cell.row < GRID_ROWS)
        .filter((cell) => !visited.has(keyOf(cell)));

      if (nextCandidates.length === 0) {
        if (path.length >= MIN_PATH_LENGTH && current.col >= GRID_COLS - 2) {
          break;
        }

        const removed = path.pop();
        if (!removed || path.length === 0) {
          break;
        }
        visited.delete(keyOf(removed));
        continue;
      }

      const next = nextCandidates[0];
      path.push(next);
      visited.add(keyOf(next));
    }

    if (path.length >= MIN_PATH_LENGTH) {
      const points = path.map(toPoint);
      return {
        points,
        start: points[0],
        hole: points[points.length - 1],
      };
    }
  }

  const fallbackPoints: Point[] = [
    { x: 120, y: 150 },
    { x: 720, y: 150 },
    { x: 720, y: 320 },
    { x: 120, y: 320 },
    { x: 120, y: 500 },
    { x: 720, y: 500 },
    { x: 720, y: 680 },
    { x: 120, y: 680 },
    { x: 120, y: 860 },
    { x: 720, y: 860 },
    { x: 720, y: 1040 },
    { x: 120, y: 1040 },
    { x: 120, y: 1220 },
    { x: 720, y: 1220 },
    { x: 720, y: 1400 },
    { x: 120, y: 1400 },
    { x: 120, y: 1540 },
    { x: 700, y: 1540 },
  ];

  return {
    points: fallbackPoints,
    start: fallbackPoints[0],
    hole: fallbackPoints[fallbackPoints.length - 1],
  };
}

function createInitialCourse() {
  const generated = generateRandomCourseLayout();
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

  useEffect(() => {
    setBall(course.start);
  }, [course]);

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

      velocityRef.current.vx *= FRICTION;
      velocityRef.current.vy *= FRICTION;

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

  const getSvgPoint = (clientX: number, clientY: number): Point | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const scaleX = COURSE_WIDTH / rect.width;
    const scaleY = COURSE_HEIGHT / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

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
    const power = clamp(Math.hypot(dx, dy) / 8, MIN_POWER, MAX_POWER);
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
    const nextCourse = generateRandomCourseLayout();
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
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={`${secondaryTextSizeClass} text-emerald-200`}>現在の打数</p>
              <p className="text-4xl font-black">{strokes}</p>
            </div>
            <div className={`text-right text-white/80 ${secondaryTextSizeClass}`}>
              <p>最短打数: {bestScore === 0 ? '-' : bestScore}</p>
            </div>
          </div>

          <div className={`mb-4 rounded-xl bg-white/5 px-4 py-3 text-white/90 ${textSizeClass}`}>{message}</div>

          <div className="overflow-hidden rounded-[1.75rem] border border-emerald-300/20 bg-[linear-gradient(180deg,_rgba(34,197,94,0.18),_rgba(22,101,52,0.32))] p-3">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${COURSE_WIDTH} ${COURSE_HEIGHT}`}
              className="h-[85vh] min-h-[860px] w-full touch-none select-none"
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
              <rect x="0" y="0" width={COURSE_WIDTH} height={COURSE_HEIGHT} fill="rgba(2,6,23,0.58)" />

              <polyline
                points={course.points.map((point) => `${point.x},${point.y}`).join(' ')}
                fill="none"
                stroke="rgba(30,41,59,0.95)"
                strokeWidth={PIPE_RADIUS * 2 + 14}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points={course.points.map((point) => `${point.x},${point.y}`).join(' ')}
                fill="none"
                stroke="rgba(187,247,208,0.22)"
                strokeWidth={PIPE_RADIUS * 2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <circle cx={course.start.x} cy={course.start.y} r="32" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.35)" strokeDasharray="6 6" />
              <circle cx={course.start.x} cy={course.start.y} r={BALL_HIT_RADIUS} fill="rgba(255,255,255,0.01)" />
              <text x={course.start.x} y={course.start.y + 10} textAnchor="middle" fontSize={startFontSize}>🏁</text>

              <circle cx={course.hole.x} cy={course.hole.y} r={HOLE_RADIUS + 10} fill="rgba(0,0,0,0.35)" />
              <circle cx={course.hole.x} cy={course.hole.y} r={HOLE_RADIUS + 40} fill="rgba(255,255,255,0.01)" />
              <text x={course.hole.x} y={course.hole.y + 18} textAnchor="middle" fontSize={success ? noseFontSize + 10 : noseFontSize}>
                👃
              </text>
              {success && (
                <text x={course.hole.x - 10} y={course.hole.y + 20} textAnchor="middle" fontSize={fingerFontSize}>
                  ☝️
                </text>
              )}

              {isDragging && dragPoint && (
                <line
                  x1={ball.x}
                  y1={ball.y}
                  x2={dragPoint.x}
                  y2={dragPoint.y}
                  stroke="rgba(250,204,21,0.9)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray="10 8"
                />
              )}

              {!success && (
                <text x={ball.x} y={ball.y + 14} textAnchor="middle" fontSize={fingerFontSize}>
                  ☝️
                </text>
              )}
            </svg>
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
