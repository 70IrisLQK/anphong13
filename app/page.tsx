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
  bg.addColorStop(0, "#03090f");
  bg.addColorStop(0.55, "#071521");
  bg.addColorStop(1, "#0a1c27");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const ambient = ctx.createRadialGradient(640, 300, 30, 640, 330, 620);
  ambient.addColorStop(0, "rgba(74, 255, 204, .1)");
  ambient.addColorStop(0.48, "rgba(30, 99, 101, .04)");
  ambient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = ambient;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#0d1b27";
  roundedRect(ctx, 110, 82, 1060, 580, 22);
  ctx.fill();
  ctx.strokeStyle = "#234154";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#07131e";
  ctx.fillRect(110, 82, 1060, 92);
  ctx.fillStyle = "#39e6b0";
  ctx.fillRect(110, 171, 1060, 3);
  drawText(ctx, "13", 150, 124, 38, "#42f5bb", "center", 900);
  drawText(ctx, "MART", 190, 123, 25, "#e8f7ff", "left", 900);
  drawText(ctx, "MỞ 24H • CAMERA 04", 1110, 123, 15, "#698197", "right", 800);

  const floor = ctx.createLinearGradient(0, 174, 0, 650);
  floor.addColorStop(0, "#142839");
  floor.addColorStop(1, "#0c1d2a");
  ctx.fillStyle = floor;
  ctx.fillRect(112, 174, 1056, 486);
  ctx.strokeStyle = "rgba(93, 145, 164, .11)";
  ctx.lineWidth = 1;
  for (let y = 205; y < 650; y += 52) {
    ctx.beginPath();
    ctx.moveTo(112, y);
    ctx.lineTo(1168, y);
    ctx.stroke();
  }
  for (let x = 145; x < 1160; x += 74) {
    ctx.beginPath();
    ctx.moveTo(x, 174);
    ctx.lineTo(640 + (x - 640) * 1.22, 660);
    ctx.stroke();
  }

  for (const x of [275, 565, 855]) {
    const glow = ctx.createRadialGradient(x, 192, 5, x, 240, 155);
    glow.addColorStop(0, "rgba(210, 255, 242, .16)");
    glow.addColorStop(1, "rgba(210, 255, 242, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 180, 164, 360, 260);
    ctx.fillStyle = "#c9f9ec";
    ctx.globalAlpha = 0.7;
    roundedRect(ctx, x - 58, 182, 116, 6, 3);
    ctx.fill();
    ctx.globalAlpha = 1;
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

  const vignette = ctx.createRadialGradient(640, 360, 240, 640, 360, 710);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(0.72, "rgba(0, 0, 0, .08)");
  vignette.addColorStop(1, "rgba(0, 0, 0, .62)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(204, 255, 240, .48)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 7]);
  ctx.strokeRect(30, 28, W - 60, H - 56);
  ctx.setLineDash([]);
  ctx.fillStyle = game.elapsed % 1 > 0.5 ? "#ff315e" : "#8d1935";
  ctx.beginPath();
  ctx.arc(57, 54, 6, 0, Math.PI * 2);
  ctx.fill();
  drawText(ctx, "REC  CAM-04", 72, 55, 13, "#d7ebe5", "left", 800);
  drawText(ctx, `03:13:${String(Math.floor(game.elapsed) % 60).padStart(2, "0")}`, 1218, 666, 13, "#a9c2ba", "right", 700);
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
      <div className="ambient-orb orb-one" />
      <div className="ambient-orb orb-two" />

      <header className="topbar">
        <a className="brand" href="#game" aria-label="Ca Đêm 13">
          <span className="brand-mark"><i>13</i></span>
          <span className="brand-copy"><b>CA ĐÊM</b><small>NIGHT SHIFT PROTOCOL</small></span>
        </a>
        <div className="topbar-center"><span /> HỆ THỐNG ĐANG GHI HÌNH</div>
        <div className="status-pill"><span /> BUILD 0.2</div>
      </header>

      <section className="hero" id="game">
        <div className="hero-intro">
          <div className="hero-copy">
            <div className="eyebrow"><span>CASE FILE / 013</span><i>HORROR SHOP SIMULATOR</i></div>
            <h1>Đừng phục vụ<br /><em>kẻ không phải người.</em></h1>
            <p className="lede">Ca trực 90 giây tại cửa hàng cuối phố. Bán hàng, tiếp kệ và nhìn thật kỹ từng vị khách trước khi bấm máy tính tiền.</p>
            <div className="hero-actions">
              <button className="hero-play" onClick={startGame}>CHƠI NGAY <span>↘</span></button>
              <div className="control-hint"><kbd>WASD</kbd><span>DI CHUYỂN</span><kbd>E</kbd><span>TƯƠNG TÁC</span></div>
            </div>
          </div>
          <aside className="shift-card">
            <div className="shift-card-head"><span>THẺ NHÂN VIÊN</span><b>#013</b></div>
            <div className="shift-time">03<span>:</span>13<small>AM</small></div>
            <div className="shift-grid"><div><small>CA TRỰC</small><strong>90 GIÂY</strong></div><div><small>MỤC TIÊU</small><strong>120K</strong></div></div>
            <div className="shift-warning"><i /> KHÔNG RỜI MẮT KHỎI CAMERA 04</div>
          </aside>
        </div>

        <div className="game-stage">
          <div className="stage-tag">LIVE GAMEPLAY</div>
          <div className="game-card">
            <div className="monitor-bar">
              <div className="monitor-lights"><i /><i /><i /></div>
              <span>SECURITY TERMINAL · CHANNEL 04</span>
              <b><i /> REC</b>
            </div>

            <div className="game-hud" aria-live="polite">
              <div className="hud-item time"><small>THỜI GIAN</small><strong className={hud.time <= 15 ? "danger" : ""}>{String(hud.time).padStart(2, "0")}<i>SEC</i></strong></div>
              <div className="hud-item revenue"><small>DOANH THU / MỤC TIÊU</small><strong>{hud.money}<i>K / {TARGET}K</i></strong></div>
              <div className="hud-item power"><small>NGUỒN ĐIỆN</small><strong>{hud.power}<i>%</i></strong><span><b style={{ width: `${hud.power}%` }} /></span></div>
              <div className="hud-item reputation"><small>UY TÍN</small><strong>{Array.from({ length: 3 }, (_, i) => <i key={i} className={i < hud.hearts ? "active" : ""}>♥</i>)}</strong></div>
              <div className="hud-item combo"><small>COMBO</small><strong>×{hud.combo}</strong></div>
            </div>

            <div className="canvas-wrap">
              <canvas ref={canvasRef} width={W} height={H} aria-label="Khu vực chơi game Ca Đêm 13" />
              <div className="screen-glass" aria-hidden="true"><i /><i /><i /><i /></div>

              {phase === "intro" && (
                <div className="game-overlay intro-overlay">
                  <div className="briefing-panel">
                    <div className="anomaly-portrait" aria-hidden="true">
                      <div className="portrait-noise" />
                      <div className="portrait-head"><i /><i /></div>
                      <span>SUBJECT / UNKNOWN</span>
                    </div>
                    <div className="briefing-copy">
                      <div className="warning-tape"><span>!</span> QUY TẮC CA ĐÊM #13</div>
                      <h2>Khách bình thường mua hàng.<br />Dị thường <em>nhìn thẳng vào bạn.</em></h2>
                      <div className="rules">
                        <div><b>01</b><span><strong>TIẾP KỆ</strong>Giữ đủ hàng hóa</span></div>
                        <div><b>02</b><span><strong>TÍNH TIỀN</strong>Phục vụ khách thật</span></div>
                        <div><b>03</b><span><strong>BÁO ĐỘNG</strong>Loại kẻ mắt đỏ</span></div>
                      </div>
                      <button className="start-button" onClick={startGame}>BẮT ĐẦU CA TRỰC <span>ENTER ↵</span></button>
                      <p>WASD / phím mũi tên để di chuyển · E hoặc Space để tương tác</p>
                    </div>
                  </div>
                </div>
              )}

              {(phase === "won" || phase === "lost") && (
                <div className={`game-overlay result-overlay ${phase}`}>
                  <div className="case-stamp">{phase === "won" ? "SURVIVED" : "LOST SIGNAL"}</div>
                  <div className="result-kicker">BÁO CÁO CA #13 · 03:13 AM</div>
                  <h2>{phase === "won" ? "BẠN ĐÃ SỐNG SÓT." : "CỬA HÀNG ĐÃ MẤT KIỂM SOÁT."}</h2>
                  <p>{phase === "won" ? "Bình minh tới. Nhưng camera ghi nhận một nhân viên… giống hệt bạn." : "Đèn tắt lúc 03:13. Camera không tìm thấy nhân viên trực."}</p>
                  <div className="result-stats">
                    <div><strong>{summary.money}K</strong><small>DOANH THU</small></div>
                    <div><strong>{summary.served}</strong><small>KHÁCH PHỤC VỤ</small></div>
                    <div><strong>{summary.caught}</strong><small>DỊ THƯỜNG</small></div>
                    <div><strong>×{summary.bestCombo}</strong><small>BEST COMBO</small></div>
                  </div>
                  <button className="start-button" onClick={startGame}>CHƠI LẠI <span>ENTER ↵</span></button>
                </div>
              )}
            </div>

            <div className="desktop-controls">
              <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>DI CHUYỂN NHÂN VIÊN</span></div>
              <div><kbd>E</kbd><span>TIẾP KỆ · TÍNH TIỀN · BÁO ĐỘNG</span></div>
              <p><i /> MẸO: DỊ THƯỜNG CÓ MẮT ĐỎ VÀ HÌNH ẢNH NHIỄU</p>
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
        </div>
      </section>

      <div className="signal-strip" aria-hidden="true"><span>CA ĐÊM 13</span><i /> KHÁCH BÌNH THƯỜNG KHÔNG NHÌN VÀO CAMERA <i /> DO NOT TRUST THE RED EYES <i /> CAMERA 04</div>

      <section className="creator-section" aria-label="Điểm nổi bật">
        <div className="section-heading"><span>DESIGNED FOR REACTIONS</span><h2>Một lượt chơi.<br />Một câu chuyện để kể.</h2></div>
        <div className="creator-grid">
          <article><span>01 / HOOK</span><b>◉</b><h3>Hiểu trong 3 giây</h3><p>Luật chơi trực quan: nhìn khách, phát hiện mắt đỏ, quyết định trước khi quá muộn.</p></article>
          <article><span>02 / FORMAT</span><b>90</b><h3>Vừa khít một Short</h3><p>Mỗi ca trực kéo dài 90 giây với mở đầu, cao trào và kết quả rõ ràng.</p></article>
          <article><span>03 / REPLAY</span><b>∞</b><h3>Không ca nào giống nhau</h3><p>Nhịp khách, hàng hóa và dị thường thay đổi ngẫu nhiên sau mỗi lượt chơi.</p></article>
        </div>
      </section>

      <footer>
        <a className="brand footer-brand" href="#game"><span className="brand-mark"><i>13</i></span><span className="brand-copy"><b>CA ĐÊM</b><small>NIGHT SHIFT PROTOCOL</small></span></a>
        <p>Horror shop simulator · Prototype 2026</p>
        <a href="#game">TRỞ LẠI CAMERA 04 ↑</a>
      </footer>
    </main>
  );
}
