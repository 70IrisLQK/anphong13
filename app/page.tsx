"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type GamePhase = "intro" | "playing" | "won" | "lost";
type CustomerState = "enter" | "shop" | "queue" | "leave";

type Customer = {
  id: number;
  x: number;
  y: number;
  state: CustomerState;
  shelf: number;
  wait: number;
  anomaly: boolean;
  hue: number;
  angry: boolean;
  bob: number;
};

type Game = {
  phase: GamePhase;
  player: { x: number; y: number };
  customers: Customer[];
  stocks: number[];
  money: number;
  time: number;
  power: number;
  hearts: number;
  combo: number;
  bestCombo: number;
  spawnIn: number;
  elapsed: number;
  nextId: number;
  actionCooldown: number;
  flash: number;
  shake: number;
  message: string;
  messageTime: number;
  anomaliesCaught: number;
  customersServed: number;
  blackout: number;
};

const W = 1280;
const H = 720;
const ROUND_TIME = 90;
const TARGET = 120;
const SHELVES = [
  { x: 310, y: 215, label: "MÌ", color: "#ff5d56" },
  { x: 605, y: 215, label: "NƯỚC", color: "#38d9ff" },
  { x: 900, y: 215, label: "SNACK", color: "#ffd54a" },
];

function newGame(): Game {
  return {
    phase: "playing",
    player: { x: 610, y: 455 },
    customers: [],
    stocks: [5, 5, 5],
    money: 0,
    time: ROUND_TIME,
    power: 100,
    hearts: 3,
    combo: 0,
    bestCombo: 0,
    spawnIn: 1.4,
    elapsed: 0,
    nextId: 1,
    actionCooldown: 0,
    flash: 0,
    shake: 0,
    message: "MỞ CỬA — ĐỪNG TIN MỌI VỊ KHÁCH",
    messageTime: 2.8,
    anomaliesCaught: 0,
    customersServed: 0,
    blackout: 0,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function distance(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

function moveToward(entity: { x: number; y: number }, tx: number, ty: number, speed: number, dt: number) {
  const dx = tx - entity.x;
  const dy = ty - entity.y;
  const length = Math.hypot(dx, dy);
  if (length < 2) return true;
  entity.x += (dx / length) * speed * dt;
  entity.y += (dy / length) * speed * dt;
  return length < speed * dt + 3;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color = "#fff",
  align: CanvasTextAlign = "left",
  weight = 700,
) {
  ctx.save();
  ctx.font = `${weight} ${size}px Arial, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawShelf(ctx: CanvasRenderingContext2D, shelf: (typeof SHELVES)[number], stock: number, active: boolean) {
  ctx.save();
  if (active) {
    ctx.shadowColor = shelf.color;
    ctx.shadowBlur = 24;
  }
  ctx.fillStyle = "#132338";
  roundedRect(ctx, shelf.x - 100, shelf.y - 54, 200, 108, 13);
  ctx.fill();
  ctx.strokeStyle = active ? shelf.color : "#2d4661";
  ctx.lineWidth = active ? 4 : 2;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = shelf.color;
  ctx.fillRect(shelf.x - 86, shelf.y - 38, 172, 12);
  ctx.fillStyle = "#0a1422";
  ctx.fillRect(shelf.x - 86, shelf.y + 20, 172, 8);
  for (let i = 0; i < 5; i++) {
    ctx.globalAlpha = i < stock ? 1 : 0.13;
    ctx.fillStyle = i < stock ? shelf.color : "#6c8297";
    roundedRect(ctx, shelf.x - 76 + i * 34, shelf.y - 12, 23, 34, 4);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  drawText(ctx, shelf.label, shelf.x, shelf.y + 75, 17, "#8fa5ba", "center", 800);
  drawText(ctx, `${stock}/5`, shelf.x, shelf.y - 74, 18, stock < 2 ? "#ff5d56" : "#dbe9f4", "center", 900);
  ctx.restore();
}

function drawCustomer(ctx: CanvasRenderingContext2D, c: Customer, t: number) {
  ctx.save();
  const bob = Math.sin(t * 6 + c.bob) * 2;
  ctx.translate(c.x, c.y + bob);
  if (c.anomaly) {
    const glitch = Math.sin(t * 17 + c.id) * 3;
    ctx.globalAlpha = 0.26;
    ctx.fillStyle = "#ff2c5e";
    ctx.fillRect(-22 + glitch, -47, 44, 72);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = c.angry ? "#ff5d56" : `hsl(${c.hue} 52% 48%)`;
  roundedRect(ctx, -19, -22, 38, 48, 11);
  ctx.fill();
  ctx.fillStyle = c.anomaly ? "#d8d1ff" : "#d7b28a";
  ctx.beginPath();
  ctx.arc(0, -32, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0c1420";
  ctx.fillRect(-12, 24, 9, 18);
  ctx.fillRect(4, 24, 9, 18);

  if (c.anomaly) {
    ctx.fillStyle = "#ff174d";
    ctx.shadowColor = "#ff174d";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(-6, -34, 3.8, 0, Math.PI * 2);
    ctx.arc(6, -34, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ff174d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-25, -6);
    ctx.lineTo(25, -13);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#132033";
    ctx.beginPath();
    ctx.arc(-6, -34, 2.5, 0, Math.PI * 2);
    ctx.arc(6, -34, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  if (c.state === "queue") {
    ctx.fillStyle = "#eef6ff";
    roundedRect(ctx, -24, -74, 48, 25, 7);
    ctx.fill();
    drawText(ctx, c.anomaly ? "?" : ["MÌ", "NƯỚC", "SNACK"][c.shelf], 0, -61, 10, c.anomaly ? "#ff174d" : "#172437", "center", 900);
  }
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, active: boolean) {
  ctx.save();
  ctx.translate(x, y);
  if (active) {
    ctx.strokeStyle = "rgba(77, 255, 192, .7)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -8, 35, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(0,0,0,.3)";
  ctx.beginPath();
  ctx.ellipse(0, 28, 25, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#17c98b";
  roundedRect(ctx, -21, -25, 42, 54, 12);
  ctx.fill();
  ctx.fillStyle = "#f1bf91";
  ctx.beginPath();
  ctx.arc(0, -38, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#071421";
  ctx.fillRect(-19, 23, 13, 19);
  ctx.fillRect(6, 23, 13, 19);
  ctx.fillStyle = "#ecf9ff";
  ctx.fillRect(-20, -49, 40, 10);
  ctx.fillStyle = "#17c98b";
  ctx.fillRect(-20, -49, 28, 10);
  drawText(ctx, "13", 0, 0, 15, "#06251b", "center", 900);
  ctx.restore();
}

function drawGame(ctx: CanvasRenderingContext2D, game: Game) {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (game.shake > 0) ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#07111f");
  bg.addColorStop(1, "#0b1d2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(38, 239, 181, .06)";
  for (let x = 0; x < W; x += 48) ctx.fillRect(x, 0, 1, H);
  for (let y = 0; y < H; y += 48) ctx.fillRect(0, y, W, 1);

  ctx.fillStyle = "#101f31";
  roundedRect(ctx, 110, 82, 1060, 580, 22);
  ctx.fill();
  ctx.strokeStyle = "#29445c";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#0a1522";
  ctx.fillRect(110, 82, 1060, 92);
  drawText(ctx, "13", 150, 124, 38, "#42f5bb", "center", 900);
  drawText(ctx, "MART", 190, 123, 25, "#e8f7ff", "left", 900);
  drawText(ctx, "MỞ 24H • CAMERA 04", 1110, 123, 15, "#698197", "right", 800);

  for (let x = 140; x < 1140; x += 46) {
    ctx.fillStyle = (x / 46) % 2 > 1 ? "#15283b" : "#132438";
    ctx.fillRect(x, 174, 46, 432);
  }

  const player = game.player;
  const nearestShelf = SHELVES.findIndex((s) => distance(player.x, player.y, s.x, s.y + 80) < 95);
  SHELVES.forEach((s, i) => drawShelf(ctx, s, game.stocks[i], i === nearestShelf));

  ctx.fillStyle = "#273c50";
  roundedRect(ctx, 270, 510, 470, 78, 14);
  ctx.fill();
  ctx.fillStyle = "#102033";
  roundedRect(ctx, 295, 526, 130, 44, 8);
  ctx.fill();
  drawText(ctx, "QUẦY THU NGÂN", 515, 551, 17, "#87a0b5", "center", 900);
  ctx.fillStyle = "#35e8b1";
  ctx.fillRect(314, 537, 92, 8);

  const nearAlarm = distance(player.x, player.y, 1005, 535) < 105;
  ctx.save();
  if (nearAlarm) {
    ctx.shadowColor = "#ff315e";
    ctx.shadowBlur = 24;
  }
  ctx.fillStyle = "#301225";
  roundedRect(ctx, 940, 492, 132, 96, 16);
  ctx.fill();
  ctx.strokeStyle = "#ff315e";
  ctx.lineWidth = nearAlarm ? 4 : 2;
  ctx.stroke();
  ctx.fillStyle = "#ff315e";
  ctx.beginPath();
  ctx.arc(1006, 526, 21, 0, Math.PI * 2);
  ctx.fill();
  drawText(ctx, "BÁO DỊ THƯỜNG", 1006, 566, 13, "#ff8ca7", "center", 900);
  ctx.restore();

  ctx.fillStyle = "#09131f";
  ctx.fillRect(1090, 555, 80, 107);
  ctx.strokeStyle = "#39e6b0";
  ctx.strokeRect(1090, 555, 80, 107);
  drawText(ctx, "LỐI RA", 1130, 623, 12, "#39e6b0", "center", 900);

  [...game.customers].sort((a, b) => a.y - b.y).forEach((customer) => drawCustomer(ctx, customer, game.elapsed));
  const actionable = nearestShelf >= 0 || nearAlarm || distance(player.x, player.y, 515, 555) < 140;
  drawPlayer(ctx, player.x, player.y, actionable);

  if (actionable && game.phase === "playing") {
    const prompt = nearAlarm ? "E  BÁO CÁO" : nearestShelf >= 0 ? "E  TIẾP HÀNG" : "E  TÍNH TIỀN";
    ctx.fillStyle = "rgba(5, 13, 22, .9)";
    roundedRect(ctx, player.x - 69, player.y - 100, 138, 34, 17);
    ctx.fill();
    drawText(ctx, prompt, player.x, player.y - 83, 13, "#dffcf3", "center", 900);
  }

  if (game.messageTime > 0) {
    ctx.globalAlpha = Math.min(1, game.messageTime * 2);
    ctx.fillStyle = "rgba(5, 12, 20, .93)";
    roundedRect(ctx, 380, 106, 520, 46, 12);
    ctx.fill();
    drawText(ctx, game.message, 640, 130, 17, game.message.includes("DỊ") || game.message.includes("SAI") ? "#ff7895" : "#54f0bd", "center", 900);
    ctx.globalAlpha = 1;
  }

  if (game.blackout > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.82, game.blackout * 0.55)})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (game.flash > 0) {
    ctx.fillStyle = `rgba(255, 25, 73, ${game.flash * 0.45})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game>({ ...newGame(), phase: "intro" });
  const keysRef = useRef<Record<string, boolean>>({});
  const frameRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [hud, setHud] = useState({ time: ROUND_TIME, money: 0, power: 100, hearts: 3, combo: 0 });
  const [summary, setSummary] = useState({ served: 0, caught: 0, bestCombo: 0, money: 0 });

  const sound = useCallback((kind: "ok" | "bad" | "cash") => {
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioRef.current) audioRef.current = new AudioCtx();
    const ac = audioRef.current;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = kind === "bad" ? "sawtooth" : "square";
    osc.frequency.value = kind === "cash" ? 720 : kind === "ok" ? 460 : 105;
    gain.gain.setValueAtTime(0.045, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.12);
  }, []);

  const finish = useCallback((won: boolean) => {
    const g = gameRef.current;
    g.phase = won ? "won" : "lost";
    setPhase(g.phase);
    setSummary({ served: g.customersServed, caught: g.anomaliesCaught, bestCombo: g.bestCombo, money: g.money });
  }, []);

  const act = useCallback(() => {
    const g = gameRef.current;
    if (g.phase !== "playing" || g.actionCooldown > 0) return;
    const p = g.player;
    const nearAlarm = distance(p.x, p.y, 1005, 535) < 105;
    const shelfIndex = SHELVES.findIndex((s) => distance(p.x, p.y, s.x, s.y + 80) < 95);
    const nearCounter = distance(p.x, p.y, 515, 555) < 140;
    g.actionCooldown = 0.28;

    if (nearAlarm) {
      const anomaly = g.customers.find((c) => c.anomaly && c.state !== "leave");
      if (anomaly) {
        anomaly.state = "leave";
        anomaly.angry = true;
        g.money += 15;
        g.combo += 2;
        g.bestCombo = Math.max(g.bestCombo, g.combo);
        g.anomaliesCaught += 1;
        g.message = "BẮT ĐÚNG DỊ THƯỜNG  +15K";
        g.messageTime = 1.6;
        sound("ok");
      } else {
        g.hearts -= 1;
        g.combo = 0;
        g.flash = 0.7;
        g.message = "BÁO SAI — MẤT 1 UY TÍN";
        g.messageTime = 1.6;
        sound("bad");
        if (g.hearts <= 0) finish(false);
      }
    } else if (shelfIndex >= 0) {
      if (g.stocks[shelfIndex] < 5) {
        g.stocks[shelfIndex] += 1;
        g.message = `${SHELVES[shelfIndex].label} ĐÃ ĐƯỢC TIẾP`;
        g.messageTime = 0.8;
        sound("ok");
      }
    } else if (nearCounter) {
      const queued = g.customers.filter((c) => c.state === "queue").sort((a, b) => a.x - b.x)[0];
      if (queued) {
        queued.state = "leave";
        if (queued.anomaly) {
          g.power = Math.max(0, g.power - 32);
          g.combo = 0;
          g.flash = 1;
          g.shake = 15;
          g.blackout = 1.1;
          g.message = "BẠN VỪA PHỤC VỤ… THỨ GÌ ĐÓ";
          g.messageTime = 2;
          sound("bad");
          if (g.power <= 0) finish(false);
        } else {
          g.money += 10 + Math.min(10, g.combo);
          g.combo += 1;
          g.bestCombo = Math.max(g.bestCombo, g.combo);
          g.customersServed += 1;
          g.message = `TING!  +${10 + Math.min(10, g.combo - 1)}K`;
          g.messageTime = 0.75;
          sound("cash");
        }
      }
    }
  }, [finish, sound]);

  const startGame = useCallback(() => {
    gameRef.current = newGame();
    setHud({ time: ROUND_TIME, money: 0, power: 100, hearts: 3, combo: 0 });
    setPhase("playing");
    sound("ok");
  }, [sound]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
      keysRef.current[key] = true;
      if ((key === "e" || key === " ") && !event.repeat) act();
      if (key === "enter" && gameRef.current.phase !== "playing") startGame();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current[event.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [act, startGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = (now: number) => {
      const rawDt = lastRef.current ? (now - lastRef.current) / 1000 : 0;
      const dt = Math.min(rawDt, 0.04);
      lastRef.current = now;
      const g = gameRef.current;

      if (g.phase === "playing") {
        const keys = keysRef.current;
        const dx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
        const dy = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
        const len = Math.hypot(dx, dy) || 1;
        g.player.x = clamp(g.player.x + (dx / len) * 245 * dt, 145, 1115);
        g.player.y = clamp(g.player.y + (dy / len) * 245 * dt, 300, 615);
        g.elapsed += dt;
        g.time = Math.max(0, ROUND_TIME - g.elapsed);
        g.spawnIn -= dt;
        g.actionCooldown = Math.max(0, g.actionCooldown - dt);
        g.messageTime = Math.max(0, g.messageTime - dt);
        g.flash = Math.max(0, g.flash - dt * 1.7);
        g.shake = Math.max(0, g.shake - dt * 22);
        g.blackout = Math.max(0, g.blackout - dt);
        g.power = Math.max(0, g.power - dt * 0.12);

        if (g.spawnIn <= 0 && g.customers.length < 8) {
          const anomalyChance = g.elapsed > 11 ? Math.min(0.32, 0.12 + g.elapsed / 520) : 0;
          g.customers.push({
            id: g.nextId++,
            x: 1140,
            y: 604,
            state: "enter",
            shelf: Math.floor(Math.random() * 3),
            wait: 1.1 + Math.random() * 1.6,
            anomaly: Math.random() < anomalyChance,
            hue: Math.floor(Math.random() * 280),
            angry: false,
            bob: Math.random() * Math.PI * 2,
          });
          g.spawnIn = Math.max(1.25, 3.6 - g.elapsed * 0.022) + Math.random() * 1.1;
        }

        const queue = g.customers.filter((c) => c.state === "queue").sort((a, b) => a.id - b.id);
        g.customers.forEach((c) => {
          if (c.state === "enter") {
            if (moveToward(c, SHELVES[c.shelf].x, 335, 118, dt)) c.state = "shop";
          } else if (c.state === "shop") {
            c.wait -= dt;
            if (c.wait <= 0) {
              if (g.stocks[c.shelf] > 0 || c.anomaly) {
                if (!c.anomaly) g.stocks[c.shelf] -= 1;
                c.state = "queue";
              } else {
                c.state = "leave";
                c.angry = true;
                g.hearts -= 1;
                g.combo = 0;
                g.message = `${SHELVES[c.shelf].label} HẾT HÀNG — KHÁCH BỎ ĐI`;
                g.messageTime = 1.5;
                sound("bad");
              }
            }
          } else if (c.state === "queue") {
            const index = queue.findIndex((q) => q.id === c.id);
            moveToward(c, 665 + index * 64, 455, 105, dt);
          } else if (c.state === "leave") {
            moveToward(c, 1145, 610, c.angry ? 190 : 140, dt);
          }
        });
        g.customers = g.customers.filter((c) => !(c.state === "leave" && c.x > 1135));

        if (g.hearts <= 0 || g.power <= 0) finish(false);
        if (g.time <= 0) finish(g.money >= TARGET && g.power > 0 && g.hearts > 0);

        setHud({ time: Math.ceil(g.time), money: g.money, power: Math.ceil(g.power), hearts: g.hearts, combo: g.combo });
      }

      drawGame(ctx, g);
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [finish, sound]);

  const setMove = (key: string, pressed: boolean) => {
    keysRef.current[key] = pressed;
  };

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#game" aria-label="Ca Đêm 13">
          <span className="brand-mark">13</span>
          <span>CA ĐÊM</span>
        </a>
        <div className="status-pill"><span /> PROTOTYPE 0.1</div>
        <p>Horror shop simulator • Chơi ngay trên trình duyệt</p>
      </header>

      <section className="hero" id="game">
        <div className="eyebrow">90 GIÂY • 1 CA TRỰC • KHÔNG ĐƯỢC CHỚP MẮT</div>
        <h1>Bán hàng. Tiếp kệ.<br /><em>Phát hiện kẻ không phải người.</em></h1>
        <p className="lede">Một mini-game được thiết kế cho những cú la hét, pha xử lý phút chót và clip Shorts có câu chuyện trọn vẹn.</p>

        <div className="game-card">
          <div className="game-hud" aria-live="polite">
            <div className="hud-item"><small>THỜI GIAN</small><strong className={hud.time <= 15 ? "danger" : ""}>{hud.time}s</strong></div>
            <div className="hud-item"><small>DOANH THU</small><strong>{hud.money}K <i>/ {TARGET}K</i></strong></div>
            <div className="hud-item power"><small>ĐIỆN</small><strong>{hud.power}%</strong><span><b style={{ width: `${hud.power}%` }} /></span></div>
            <div className="hud-item"><small>UY TÍN</small><strong>{"♥".repeat(Math.max(0, hud.hearts))}<i>{"♥".repeat(Math.max(0, 3 - hud.hearts))}</i></strong></div>
            <div className="hud-item combo"><small>COMBO</small><strong>×{hud.combo}</strong></div>
          </div>

          <div className="canvas-wrap">
            <canvas ref={canvasRef} width={W} height={H} aria-label="Khu vực chơi game Ca Đêm 13" />

            {phase === "intro" && (
              <div className="game-overlay intro-overlay">
                <div className="warning-tape">⚠ QUY TẮC CA ĐÊM #13</div>
                <h2>Khách bình thường mua hàng.<br />Kẻ dị thường <span>nhìn thẳng vào bạn.</span></h2>
                <div className="rules">
                  <div><b>01</b><span>Tiếp hàng tại<br />3 kệ sản phẩm</span></div>
                  <div><b>02</b><span>Tính tiền cho<br />khách bình thường</span></div>
                  <div><b>03</b><span>Bấm báo động nếu<br />mắt khách phát đỏ</span></div>
                </div>
                <button className="start-button" onClick={startGame}>BẮT ĐẦU CA TRỰC <span>ENTER ↵</span></button>
                <p>WASD / phím mũi tên để di chuyển • E hoặc Space để tương tác</p>
              </div>
            )}

            {(phase === "won" || phase === "lost") && (
              <div className={`game-overlay result-overlay ${phase}`}>
                <div className="result-kicker">BÁO CÁO CA #13</div>
                <h2>{phase === "won" ? "BẠN ĐÃ SỐNG SÓT." : "CỬA HÀNG ĐÃ MẤT KIỂM SOÁT."}</h2>
                <p>{phase === "won" ? "Bình minh tới. Nhưng camera ghi nhận một nhân viên… giống hệt bạn." : "Đèn tắt lúc 03:13. Camera không tìm thấy nhân viên trực."}</p>
                <div className="result-stats">
                  <div><strong>{summary.money}K</strong><small>DOANH THU</small></div>
                  <div><strong>{summary.served}</strong><small>KHÁCH PHỤC VỤ</small></div>
                  <div><strong>{summary.caught}</strong><small>DỊ THƯỜNG BẮT ĐƯỢC</small></div>
                  <div><strong>×{summary.bestCombo}</strong><small>COMBO CAO NHẤT</small></div>
                </div>
                <button className="start-button" onClick={startGame}>CHƠI LẠI <span>ENTER ↵</span></button>
              </div>
            )}
          </div>

          <div className="mobile-controls" aria-label="Điều khiển cảm ứng">
            <div className="dpad">
              <button aria-label="Đi lên" onPointerDown={() => setMove("w", true)} onPointerUp={() => setMove("w", false)} onPointerLeave={() => setMove("w", false)}>▲</button>
              <button aria-label="Sang trái" onPointerDown={() => setMove("a", true)} onPointerUp={() => setMove("a", false)} onPointerLeave={() => setMove("a", false)}>◀</button>
              <button aria-label="Đi xuống" onPointerDown={() => setMove("s", true)} onPointerUp={() => setMove("s", false)} onPointerLeave={() => setMove("s", false)}>▼</button>
              <button aria-label="Sang phải" onPointerDown={() => setMove("d", true)} onPointerUp={() => setMove("d", false)} onPointerLeave={() => setMove("d", false)}>▶</button>
            </div>
            <button className="action-touch" onClick={act}>E<small>TƯƠNG TÁC</small></button>
          </div>
        </div>
      </section>

      <section className="creator-strip" aria-label="Điểm nổi bật">
        <div><span>01</span><strong>Hook trong 3 giây</strong><p>Người xem hiểu ngay: khách nào là quái vật?</p></div>
        <div><span>02</span><strong>Run 90 giây</strong><p>Vừa một Short, cũng vừa một màn speedrun.</p></div>
        <div><span>03</span><strong>Mỗi lượt khác nhau</strong><p>Nhịp khách và dị thường được tạo ngẫu nhiên.</p></div>
      </section>

      <footer>
        <strong>CA ĐÊM 13</strong>
        <p>Concept prototype dựa trên nghiên cứu thị trường game dành cho YouTube • 2026</p>
      </footer>
    </main>
  );
}
