"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Point = { x: number; y: number };
type Phase = "intro" | "playing" | "feedback" | "finished";

type Sigil = {
  name: string;
  entity: string;
  warning: string;
  path: Point[];
  closed?: boolean;
};

type RoundResult = {
  accuracy: number;
  coverage: number;
  speedBonus: number;
  points: number;
  verdict: string;
};

const SIZE = 640;
const ROUND_SECONDS = 12;
const TOTAL_ROUNDS = 5;

const SIGILS: Sigil[] = [
  {
    name: "THIRTEENTH EYE",
    entity: "THE WATCHER",
    warning: "Stay inside the eyelid.",
    closed: true,
    path: [
      { x: 125, y: 320 }, { x: 180, y: 258 }, { x: 252, y: 222 }, { x: 320, y: 214 },
      { x: 388, y: 222 }, { x: 460, y: 258 }, { x: 515, y: 320 }, { x: 460, y: 382 },
      { x: 388, y: 418 }, { x: 320, y: 426 }, { x: 252, y: 418 }, { x: 180, y: 382 },
    ],
  },
  {
    name: "SILENT TRIANGLE",
    entity: "THE KNOCKER",
    warning: "Close all three corners before the third knock.",
    closed: true,
    path: [
      { x: 320, y: 128 }, { x: 505, y: 452 }, { x: 135, y: 452 },
    ],
  },
  {
    name: "INVERTED HOOK",
    entity: "SHADOW BENEATH",
    warning: "Start at the top. Never turn back.",
    path: [
      { x: 222, y: 164 }, { x: 278, y: 132 }, { x: 354, y: 142 }, { x: 411, y: 190 },
      { x: 430, y: 255 }, { x: 409, y: 316 }, { x: 359, y: 356 }, { x: 295, y: 374 },
      { x: 252, y: 410 }, { x: 250, y: 469 }, { x: 286, y: 507 }, { x: 338, y: 510 },
    ],
  },
  {
    name: "LOCKING TEETH",
    entity: "THE FACELESS",
    warning: "One stroke. Six teeth. No hesitation.",
    path: [
      { x: 155, y: 230 }, { x: 228, y: 180 }, { x: 320, y: 210 }, { x: 412, y: 180 },
      { x: 485, y: 230 }, { x: 450, y: 320 }, { x: 485, y: 410 }, { x: 410, y: 460 },
      { x: 320, y: 430 }, { x: 230, y: 460 }, { x: 155, y: 410 }, { x: 190, y: 320 },
    ],
    closed: true,
  },
  {
    name: "AXIS SPIRAL",
    entity: "BREATH BEHIND YOU",
    warning: "Follow the spiral into its core.",
    path: [
      { x: 166, y: 252 }, { x: 205, y: 190 }, { x: 275, y: 153 }, { x: 358, y: 156 },
      { x: 433, y: 198 }, { x: 478, y: 270 }, { x: 484, y: 350 }, { x: 449, y: 421 },
      { x: 386, y: 466 }, { x: 312, y: 475 }, { x: 247, y: 448 }, { x: 207, y: 398 },
      { x: 197, y: 339 }, { x: 218, y: 289 }, { x: 260, y: 256 }, { x: 310, y: 247 },
      { x: 351, y: 263 }, { x: 376, y: 294 }, { x: 380, y: 328 }, { x: 365, y: 354 },
      { x: 341, y: 367 }, { x: 319, y: 365 },
    ],
  },
  {
    name: "BROKEN GATE",
    entity: "THE LAST CUSTOMER",
    warning: "Connect both pillars before the lights go out.",
    path: [
      { x: 170, y: 474 }, { x: 170, y: 195 }, { x: 240, y: 154 }, { x: 320, y: 194 },
      { x: 400, y: 154 }, { x: 470, y: 195 }, { x: 470, y: 474 }, { x: 395, y: 474 },
      { x: 395, y: 294 }, { x: 320, y: 252 }, { x: 245, y: 294 }, { x: 245, y: 474 },
    ],
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function samplePath(sigil: Sigil, spacing = 10) {
  const sampled: Point[] = [];
  const points = sigil.closed ? [...sigil.path, sigil.path[0]] : sigil.path;
  for (let i = 1; i < points.length; i += 1) {
    const start = points[i - 1];
    const end = points[i];
    const length = distance(start, end);
    const steps = Math.max(1, Math.ceil(length / spacing));
    for (let step = 0; step < steps; step += 1) {
      const t = step / steps;
      sampled.push({ x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t });
    }
  }
  sampled.push(points[points.length - 1]);
  return sampled;
}

function nearestDistance(point: Point, cloud: Point[]) {
  let best = Number.POSITIVE_INFINITY;
  for (const other of cloud) best = Math.min(best, distance(point, other));
  return best;
}

function scoreTrace(sigil: Sigil, trace: Point[], timeLeft: number): RoundResult {
  if (trace.length < 5) {
    return { accuracy: 0, coverage: 0, speedBonus: 0, points: 0, verdict: "SIGIL INCOMPLETE" };
  }
  const target = samplePath(sigil);
  const traceCloud = trace.filter((_, index) => index % 2 === 0);
  const averageError = traceCloud.reduce((sum, point) => sum + nearestDistance(point, target), 0) / traceCloud.length;
  const precision = clamp(100 - averageError * 1.55, 0, 100);
  const coverage = (target.filter((point) => nearestDistance(point, traceCloud) <= 34).length / target.length) * 100;
  const accuracy = Math.round(precision * 0.46 + coverage * 0.54);
  const speedBonus = accuracy >= 55 ? Math.round(timeLeft * 18) : 0;
  const points = Math.round(accuracy * 10 + speedBonus);
  const verdict = accuracy >= 92 ? "PERFECT SEAL" : accuracy >= 78 ? "ENTITY CONTAINED" : accuracy >= 55 ? "WEAK SEAL — BUT IT HELD" : "ENTITY ESCAPED";
  return { accuracy, coverage: Math.round(coverage), speedBonus, points, verdict };
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  sigil: Sigil,
  trace: Point[],
  time: number,
  feedback: RoundResult | null,
  drawing: boolean,
) {
  ctx.clearRect(0, 0, SIZE, SIZE);
  const bg = ctx.createRadialGradient(320, 300, 30, 320, 320, 430);
  bg.addColorStop(0, "#102b2b");
  bg.addColorStop(0.55, "#081817");
  bg.addColorStop(1, "#030908");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.strokeStyle = "rgba(131, 255, 217, .055)";
  ctx.lineWidth = 1;
  for (let x = 20; x < SIZE; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, SIZE); ctx.stroke();
  }
  for (let y = 20; y < SIZE; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(SIZE, y); ctx.stroke();
  }

  ctx.save();
  ctx.translate(320, 320);
  ctx.rotate(-0.004 + Math.sin(performance.now() / 900) * 0.002);
  ctx.translate(-320, -320);
  ctx.strokeStyle = "rgba(109, 238, 198, .17)";
  ctx.lineWidth = 1;
  for (const radius of [224, 238, 254]) {
    ctx.beginPath(); ctx.arc(320, 320, radius, 0, Math.PI * 2); ctx.stroke();
  }
  for (let i = 0; i < 24; i += 1) {
    const angle = (i / 24) * Math.PI * 2;
    const inner = i % 3 === 0 ? 225 : 234;
    ctx.beginPath();
    ctx.moveTo(320 + Math.cos(angle) * inner, 320 + Math.sin(angle) * inner);
    ctx.lineTo(320 + Math.cos(angle) * 254, 320 + Math.sin(angle) * 254);
    ctx.stroke();
  }
  ctx.restore();

  const path = sigil.closed ? [...sigil.path, sigil.path[0]] : sigil.path;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  path.forEach((point, index) => index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y));
  ctx.strokeStyle = feedback ? "rgba(102, 255, 204, .2)" : "rgba(221, 255, 244, .2)";
  ctx.lineWidth = 34;
  ctx.stroke();
  ctx.strokeStyle = feedback ? "rgba(102, 255, 204, .5)" : "rgba(202, 255, 237, .78)";
  ctx.lineWidth = 3;
  ctx.setLineDash([2, 12]);
  ctx.stroke();
  ctx.setLineDash([]);

  const start = sigil.path[0];
  const pulse = 8 + Math.sin(performance.now() / 180) * 3;
  ctx.shadowColor = "#55f6bd";
  ctx.shadowBlur = 22;
  ctx.fillStyle = "#caffec";
  ctx.beginPath(); ctx.arc(start.x, start.y, pulse, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  if (trace.length > 1) {
    ctx.beginPath();
    trace.forEach((point, index) => index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y));
    ctx.strokeStyle = feedback && feedback.accuracy < 55 ? "#ff365f" : "#55f6bd";
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = drawing ? 16 : 9;
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,.85)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  if (feedback) {
    ctx.fillStyle = feedback.accuracy >= 55 ? "rgba(27, 255, 180, .08)" : "rgba(255, 32, 84, .11)";
    ctx.fillRect(0, 0, SIZE, SIZE);
  }

  const danger = 1 - time / ROUND_SECONDS;
  if (danger > 0.65 && !feedback) {
    ctx.strokeStyle = `rgba(255, 43, 90, ${(danger - 0.65) * 1.8})`;
    ctx.lineWidth = 18;
    ctx.strokeRect(9, 9, SIZE - 18, SIZE - 18);
  }
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const traceRef = useRef<Point[]>([]);
  const drawingRef = useRef(false);
  const timeRef = useRef(ROUND_SECONDS);
  const phaseRef = useRef<Phase>("intro");
  const evaluatedRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);
  const [phase, setPhaseState] = useState<Phase>("intro");
  const [round, setRound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [runResults, setRunResults] = useState<RoundResult[]>([]);

  const sigils = useMemo(() => SIGILS.slice(0, TOTAL_ROUNDS), []);
  const sigil = sigils[Math.min(round, TOTAL_ROUNDS - 1)];

  const setPhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const sound = useCallback((kind: "start" | "good" | "bad" | "tick") => {
    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    if (!audioRef.current) audioRef.current = new AudioCtor();
    const audio = audioRef.current;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = kind === "bad" ? "sawtooth" : "sine";
    oscillator.frequency.value = kind === "good" ? 620 : kind === "bad" ? 86 : kind === "tick" ? 210 : 390;
    gain.gain.setValueAtTime(kind === "tick" ? 0.018 : 0.045, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + (kind === "good" ? 0.32 : 0.16));
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + (kind === "good" ? 0.32 : 0.16));
  }, []);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem("an-phong-13-best") || 0);
    const frame = window.requestAnimationFrame(() => setBest(Number.isFinite(saved) ? saved : 0));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const clearTrace = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    traceRef.current = [];
    evaluatedRef.current = false;
  }, []);

  const evaluate = useCallback(() => {
    if (phaseRef.current !== "playing" || evaluatedRef.current) return;
    evaluatedRef.current = true;
    drawingRef.current = false;
    const nextResult = scoreTrace(sigils[round], traceRef.current, timeRef.current);
    setResult(nextResult);
    setRunResults((current) => [...current, nextResult]);
    setScore((current) => current + nextResult.points);
    setCombo((current) => nextResult.accuracy >= 78 ? current + 1 : 0);
    setPhase("feedback");
    sound(nextResult.accuracy >= 55 ? "good" : "bad");
  }, [round, setPhase, sigils, sound]);

  const startRun = useCallback(() => {
    traceRef.current = [];
    drawingRef.current = false;
    evaluatedRef.current = false;
    timeRef.current = ROUND_SECONDS;
    setRound(0);
    setTimeLeft(ROUND_SECONDS);
    setScore(0);
    setCombo(0);
    setResult(null);
    setRunResults([]);
    setPhase("playing");
    sound("start");
  }, [setPhase, sound]);

  const nextRound = useCallback(() => {
    if (round >= TOTAL_ROUNDS - 1) {
      const finalScore = score;
      if (finalScore > best) {
        setBest(finalScore);
        window.localStorage.setItem("an-phong-13-best", String(finalScore));
      }
      setPhase("finished");
      return;
    }
    traceRef.current = [];
    drawingRef.current = false;
    evaluatedRef.current = false;
    timeRef.current = ROUND_SECONDS;
    setTimeLeft(ROUND_SECONDS);
    setResult(null);
    setRound((current) => current + 1);
    setPhase("playing");
    sound("start");
  }, [best, round, score, setPhase, sound]);

  useEffect(() => {
    if (phase !== "playing") return;
    let frame = 0;
    let previous = performance.now();
    let lastWhole = Math.ceil(timeRef.current);
    const tick = (now: number) => {
      const delta = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      timeRef.current = Math.max(0, timeRef.current - delta);
      const whole = Math.ceil(timeRef.current);
      if (whole !== lastWhole) {
        lastWhole = whole;
        setTimeLeft(timeRef.current);
        if (whole <= 3 && whole > 0) sound("tick");
      }
      if (timeRef.current <= 0) evaluate();
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [evaluate, phase, sound]);

  useEffect(() => {
    let frame = 0;
    const paint = () => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (context && sigil) drawScene(context, sigil, traceRef.current, timeRef.current, result, drawingRef.current);
      frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(frame);
  }, [result, sigil]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "r") clearTrace();
      if (event.key === "Enter" && phaseRef.current === "intro") startRun();
      if (event.key === "Enter" && phaseRef.current === "feedback") nextRound();
      if (event.key === "Enter" && phaseRef.current === "finished") startRun();
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [clearTrace, nextRound, startRun]);

  const canvasPoint = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * SIZE, y: ((event.clientY - rect.top) / rect.height) * SIZE };
  };

  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== "playing") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    traceRef.current = [canvasPoint(event)];
    drawingRef.current = true;
    evaluatedRef.current = false;
  };

  const pointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || phaseRef.current !== "playing") return;
    const point = canvasPoint(event);
    const last = traceRef.current[traceRef.current.length - 1];
    if (!last || distance(last, point) > 3) traceRef.current.push(point);
  };

  const pointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    traceRef.current.push(canvasPoint(event));
    drawingRef.current = false;
    evaluate();
  };

  const averageAccuracy = runResults.length ? Math.round(runResults.reduce((sum, item) => sum + item.accuracy, 0) / runResults.length) : 0;
  const perfects = runResults.filter((item) => item.accuracy >= 92).length;
  const dangerPercent = clamp((timeLeft / ROUND_SECONDS) * 100, 0, 100);

  return (
    <main className="game-shell">
      <div className="noise" aria-hidden="true" />
      <header className="topbar">
        <a className="brand" href="#top" aria-label="An Phong 13">
          <span className="brand-mark">13</span>
          <span><b>AN PHONG</b><small>NIGHT PROTOCOL</small></span>
        </a>
        <div className="top-stats" aria-label="Run information">
          <div><span>SCORE</span><strong>{score.toLocaleString("en-US")}</strong></div>
          <div><span>BEST</span><strong>{best.toLocaleString("en-US")}</strong></div>
          <div className="live"><i /> CAMERA 13</div>
        </div>
      </header>

      <section className="play-layout" id="top">
        <aside className="mission-panel">
          <div className="eyebrow"><i /> ENTITY FILE</div>
          <div className="entity-portrait" aria-hidden="true">
            <div className="portrait-ring" /><div className="entity-head"><i /><i /></div>
            <span>NO SIGNAL</span>
          </div>
          <p className="entity-label">CURRENT TARGET</p>
          <h2>{sigil.entity}</h2>
          <p className="warning">“{sigil.warning}”</p>
          <div className="protocol">
            <span>PROTOCOL</span>
            <ol><li>Touch the glowing point</li><li>Trace the entire sigil</li><li>Close before 0:00</li></ol>
          </div>
        </aside>

        <section className="game-stage" aria-label="Sigil tracing area">
          <div className="stage-head">
            <div><span>SIGIL 0{round + 1}</span><h1>{sigil.name}</h1></div>
            <div className="round-pips" aria-label={`Round ${round + 1} of ${TOTAL_ROUNDS}`}>
              {Array.from({ length: TOTAL_ROUNDS }, (_, index) => <i key={index} className={index < round ? "done" : index === round ? "active" : ""} />)}
            </div>
          </div>

          <div className={`canvas-frame ${timeLeft <= 3 && phase === "playing" ? "critical" : ""}`}>
            <canvas
              ref={canvasRef}
              width={SIZE}
              height={SIZE}
              onPointerDown={pointerDown}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
              onPointerCancel={() => { drawingRef.current = false; }}
              aria-label="Trace the sigil with your mouse or finger"
            />
            {phase === "intro" && (
              <div className="overlay intro-card">
                <span className="seal-icon">13</span>
                <p className="kicker">NIGHT SHIFT 03:13</p>
                <h2>TRACE THE SIGIL.<br />SEAL THE ENTITY.</h2>
                <p>5 sigils · 12 seconds each · one continuous stroke</p>
                <button className="primary-button" onClick={startRun}>START SEALING <b>↗</b></button>
                <small>ENTER TO PLAY · TOUCH ENABLED</small>
              </div>
            )}
            {phase === "feedback" && result && (
              <div className={`overlay result-card ${result.accuracy < 55 ? "failed" : ""}`}>
                <span className="result-tag">SIGIL 0{round + 1} RESULT</span>
                <div className="accuracy-ring" style={{ "--accuracy": `${result.accuracy * 3.6}deg` } as React.CSSProperties}>
                  <strong>{result.accuracy}<small>%</small></strong><span>ACCURACY</span>
                </div>
                <h2>{result.verdict}</h2>
                <div className="result-breakdown"><span>Coverage <b>{result.coverage}%</b></span><span>Speed <b>+{result.speedBonus}</b></span><span>Score <b>+{result.points}</b></span></div>
                <button className="primary-button" onClick={nextRound}>{round === TOTAL_ROUNDS - 1 ? "VIEW SHIFT REPORT" : "NEXT SIGIL"} <b>↗</b></button>
              </div>
            )}
            {phase === "finished" && (
              <div className="overlay final-card">
                <span className="result-tag">SHIFT COMPLETE</span>
                <p className="final-grade">{averageAccuracy >= 90 ? "S" : averageAccuracy >= 78 ? "A" : averageAccuracy >= 60 ? "B" : "C"}</p>
                <h2>{score.toLocaleString("en-US")} POINTS</h2>
                <p>{score >= best && score > 0 ? "NEW HIGH SCORE RECORDED" : "SHIFT REPORT SAVED"}</p>
                <div className="final-stats"><span>Average accuracy <b>{averageAccuracy}%</b></span><span>Perfect seals <b>{perfects}/{TOTAL_ROUNDS}</b></span></div>
                <button className="primary-button" onClick={startRun}>PLAY AGAIN · BEAT YOUR BEST <b>↻</b></button>
              </div>
            )}
          </div>

          <div className="stage-footer">
            <button className="ghost-button" onClick={clearTrace} disabled={phase !== "playing"}>↺ REDRAW <kbd>R</kbd></button>
            <p><i /> Stay inside the glowing path to improve accuracy</p>
          </div>
        </section>

        <aside className="status-panel">
          <div className="timer-card">
            <span>TIME REMAINING</span>
            <strong className={timeLeft <= 3 && phase === "playing" ? "danger" : ""}>00:{Math.ceil(timeLeft).toString().padStart(2, "0")}</strong>
            <div className="timer-track"><i style={{ width: `${dangerPercent}%` }} /></div>
          </div>
          <div className="score-card">
            <span>SEAL STREAK</span>
            <strong>×{combo}</strong>
            <p>{combo >= 3 ? "The energy is resonating" : "Reach 78% to preserve the streak"}</p>
          </div>
          <div className="round-list">
            <span>SHIFT PROGRESS</span>
            {sigils.map((item, index) => (
              <div key={item.name} className={index < round ? "done" : index === round ? "current" : ""}>
                <i>{index < round ? "✓" : index + 1}</i><p><b>{item.name}</b><small>{index < round ? `${runResults[index]?.accuracy ?? 0}% accuracy` : index === round ? "In progress" : "Encrypted"}</small></p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <footer><span>PROTOCOL 13.3</span><p>ONE STROKE · INSTANT FEEDBACK · REPLAY FOR A HIGH SCORE</p><span>SOUND: AUTO</span></footer>
    </main>
  );
}
