// Вариант 4 — «сторителлинг», по мотивам ролика-референса (Lego):
// 3D-текст на стене ЗА ведущей (ведущая вырезана из кадра), текст прорывает стену и осыпается,
// рисованная вставка на бумаге, флешбэк «2 года назад», рисованные стикеры, резкие наезды, мелкие субтитры.
import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  OffthreadVideo,
  Series,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Easing,
  random,
} from "remotion";
import { loadFont } from "@remotion/fonts";
import { FPS, SCENES } from "./Promo";

const head = "Montserrat";
const body = "Manrope";
const hand = "Caveat";
for (const subset of ["cyrillic", "latin"]) {
  loadFont({ family: hand, url: staticFile(`fonts/caveat-${subset}-700-normal.woff2`), weight: "700" });
}

const W = 1080;
const H = 1920;
const PAPER = "#F2EBDD";
const INK = "#2A2A2A";
const WOOD = "#B8743A";
const GREEN = "#5E8C3A";

/* ---------- Вырезанная ведущая (прозрачное видео) — для текста «за спиной» ---------- */
// f0 — номер кадра исходника, с которого начинается файл с вырезкой
const CUTOUTS: Record<string, { file: string; f0: number }> = {
  "d.mp4": { file: "cut-d.webm", f0: 252 },
  "a.mp4": { file: "cut-a.webm", f0: 58 },
  "b.mp4": { file: "cut-b.webm", f0: 253 },
};

type Scene = (typeof SCENES)[number];

/* ---------- Время ---------- */
// Секунда исходного ролика для текущего кадра сцены
const useT = (from: number) => {
  const frame = useCurrentFrame();
  return from + frame / FPS;
};
const prog = (t: number, a: number, b: number, ease = true) =>
  interpolate(t, [a, b], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease ? Easing.out(Easing.cubic) : undefined,
  });
// Пружина, запускаемая в момент t0 (секунды исходника)
const useSpringAt = (from: number, t0: number, damping = 12) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - (t0 - from) * fps, fps, config: { damping, mass: 0.6 } });
};

/* ---------- 3D-текст, прорывающий стену и осыпающийся ---------- */
const Text3D: React.FC<{
  from: number;
  lines: string[];
  at: number; // когда прорывается
  breakAt?: number; // когда рассыпается
  top: number;
  size: number;
  face?: string;
  side?: string;
  wall: string; // цвет «обломков стены»
  tilt?: number;
}> = ({ from, lines, at, breakAt, top, size, face = "#FFF6E8", side = WOOD, wall, tilt = -8 }) => {
  const t = useT(from);
  const inP = useSpringAt(from, at, 9);
  if (t < at - 0.05) return null;
  const shake = t - at < 0.25 ? Math.sin((t - at) * 120) * 10 * (1 - (t - at) / 0.25) : 0;
  const broken = breakAt !== undefined && t >= breakAt;
  const fall = breakAt !== undefined ? Math.max(0, t - breakAt) : 0;
  // объём: много слоёв тени
  const depth = Array.from({ length: 14 }, (_, i) => `${i + 1}px ${i + 1}px 0 ${i > 10 ? "#5a3414" : side}`).join(",");
  const glyphStyle: React.CSSProperties = {
    fontFamily: head,
    fontWeight: 900,
    fontSize: size,
    lineHeight: 1.0,
    color: face,
    textShadow: `${depth}, 18px 22px 30px rgba(0,0,0,.45)`,
    WebkitTextStroke: `3px ${side}`,
    display: "inline-block",
  };
  // дыра в стене и обломки — только в момент прорыва
  const debris = Array.from({ length: 26 }, (_, i) => {
    const a = random(`a${i}${at}`) * Math.PI * 2;
    const v = 500 + random(`v${i}${at}`) * 900;
    const dt = Math.max(0, t - at);
    const x = Math.cos(a) * v * dt;
    const y = Math.sin(a) * v * dt * 0.7 + 1400 * dt * dt;
    const s = 14 + random(`s${i}${at}`) * 30;
    const o = interpolate(dt, [0, 0.9], [1, 0], { extrapolateRight: "clamp" });
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: W / 2 + x,
          top: top + size * 0.6 + y,
          width: s,
          height: s * 0.7,
          background: i % 3 === 0 ? "#3a2a1c" : wall,
          transform: `rotate(${dt * 700 * (random(`r${i}`) - 0.5)}deg)`,
          opacity: o,
          borderRadius: 3,
        }}
      />
    );
  });
  let charIndex = 0;
  return (
    <AbsoluteFill style={{ perspective: 1400 }}>
      {/* рваная дыра за текстом */}
      <svg
        width={W}
        height={H}
        style={{ position: "absolute", opacity: interpolate(fall, [0, 0.4], [0.85, 0], { extrapolateRight: "clamp" }) }}
      >
        <path
          d={(() => {
            const cx = W / 2;
            const cy = top + (size * lines.length) / 2;
            const rx = 470 * inP;
            const ry = ((size * lines.length) / 2 + 70) * inP;
            const pts = Array.from({ length: 36 }, (_, i) => {
              const ang = (i / 36) * Math.PI * 2;
              const k = 0.82 + random(`h${i}${at}`) * 0.3;
              return `${cx + Math.cos(ang) * rx * k},${cy + Math.sin(ang) * ry * k}`;
            });
            return `M${pts.join("L")}Z`;
          })()}
          fill="rgba(20,16,12,.55)"
          stroke="rgba(255,255,255,.15)"
          strokeWidth={4}
        />
      </svg>
      {debris}
      <div
        style={{
          position: "absolute",
          top,
          width: "100%",
          textAlign: "center",
          transform: `translateX(${shake}px) rotateY(${tilt}deg) scale(${0.4 + inP * 0.6}) translateZ(${(1 - inP) * -400}px)`,
          opacity: Math.min(1, inP * 2),
        }}
      >
        {lines.map((line, li) => (
          <div key={li}>
            {line.split("").map((ch, ci) => {
              const k = charIndex++;
              if (!broken) {
                return (
                  <span key={ci} style={glyphStyle}>
                    {ch === " " ? " " : ch}
                  </span>
                );
              }
              // осыпание: каждая буква падает со своей скоростью и вращением
              const vx = (random(`fx${k}`) - 0.5) * 500;
              const vy = -200 - random(`fy${k}`) * 300;
              const g = 3200;
              const y = Math.min(vy * fall + 0.5 * g * fall * fall, 1500 - top - li * size);
              const rot = (random(`fr${k}`) - 0.5) * 900 * fall;
              return (
                <span
                  key={ci}
                  style={{
                    ...glyphStyle,
                    transform: `translate(${vx * fall}px, ${y}px) rotate(${rot}deg)`,
                    opacity: interpolate(fall, [0.7, 1.1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                  }}
                >
                  {ch === " " ? " " : ch}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Рисованные стикеры (SVG «от руки» с белой обводкой) ---------- */
const STICKERS: Record<string, React.ReactNode> = {
  coffee: (
    <g>
      <path d="M30 60 h90 l-10 80 h-70 z" fill="#fff" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <path d="M118 75 q35 5 20 40 q-8 15 -26 12" fill="none" stroke={INK} strokeWidth="6" />
      <path d="M45 75 h60 l-4 30 h-52z" fill="#8B5A2B" />
      <path d="M55 45 q-10 -15 5 -30 M80 45 q-10 -15 5 -30 M105 45 q-10 -15 5 -30" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path d="M15 150 h120" stroke={INK} strokeWidth="6" strokeLinecap="round" />
    </g>
  ),
  glass: (
    <g>
      <path d="M45 20 h60 l-6 70 q-24 25 -48 0 z" fill="#F7E7A0" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <path d="M75 110 v40 M50 155 h50" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <circle cx="65" cy="55" r="5" fill="#fff" />
      <circle cx="82" cy="40" r="4" fill="#fff" />
      <circle cx="74" cy="72" r="3.5" fill="#fff" />
      <path d="M115 15 l10 -10 M125 30 l15 -3 M110 0 l2 -12" stroke={INK} strokeWidth="5" strokeLinecap="round" />
    </g>
  ),
  gift: (
    <g>
      <rect x="25" y="65" width="110" height="80" rx="6" fill="#E04B3A" stroke={INK} strokeWidth="6" />
      <rect x="15" y="45" width="130" height="28" rx="6" fill="#F2D24B" stroke={INK} strokeWidth="6" />
      <path d="M80 45 v100" stroke={INK} strokeWidth="6" />
      <path d="M80 45 q-35 -40 -45 -5 q10 10 45 5 q35 -40 45 -5 q-10 10 -45 5" fill="#F2D24B" stroke={INK} strokeWidth="6" />
    </g>
  ),
  question: (
    <g>
      <path d="M50 55 q0 -35 35 -35 q35 0 35 30 q0 22 -30 32 v18" fill="none" stroke={INK} strokeWidth="12" strokeLinecap="round" />
      <circle cx="90" cy="135" r="9" fill={INK} />
    </g>
  ),
  bubble: (
    <g>
      <path d="M20 30 q0 -20 20 -20 h110 q20 0 20 20 v55 q0 20 -20 20 h-75 l-30 25 v-25 h-5 q-20 0 -20 -20 z" fill="#fff" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <text x="95" y="72" textAnchor="middle" fontFamily={head} fontWeight={900} fontSize="40" fill={GREEN}>
        ХОЧУ
      </text>
    </g>
  ),
};

const Sticker: React.FC<{ from: number; kind: keyof typeof STICKERS; at: number; until?: number; x: number; y: number; size?: number; rot?: number }> = ({
  from,
  kind,
  at,
  until,
  x,
  y,
  size = 260,
  rot = -8,
}) => {
  const t = useT(from);
  const p = useSpringAt(from, at, 8);
  if (t < at || (until !== undefined && t > until)) return null;
  const wobble = Math.sin((t - at) * 6) * 3;
  return (
    <svg
      viewBox="0 -20 170 190"
      width={size}
      height={size}
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        transform: `scale(${p}) rotate(${rot + wobble}deg)`,
        filter: "drop-shadow(0 0 0 #fff) drop-shadow(4px 0 0 #fff) drop-shadow(-4px 0 0 #fff) drop-shadow(0 4px 0 #fff) drop-shadow(0 -4px 0 #fff) drop-shadow(0 10px 18px rgba(0,0,0,.35))",
      }}
    >
      {STICKERS[kind]}
    </svg>
  );
};

/* ---------- Мелкие субтитры (1–3 слова, как в референсе) ---------- */
const Subs: React.FC<{ scene: Scene; hideFrom?: number; hideTo?: number; y?: number }> = ({ scene, hideFrom, hideTo, y = 1180 }) => {
  const t = useT(scene.from);
  if (hideFrom !== undefined && t >= hideFrom && t < (hideTo ?? 99)) return null;
  const pages = scene.pages;
  let idx = -1;
  for (let i = 0; i < pages.length; i++) if (t >= pages[i][0][1] - 0.05) idx = i;
  if (idx < 0) return null;
  const page = pages[idx];
  const next = idx < pages.length - 1 ? pages[idx + 1][0][1] : page[page.length - 1][2] + 0.4;
  if (t > next) return null;
  const text = page.map((w) => w[0]).join(" ").toLowerCase().replace("woodnext", "WOODNEXT").replace("каменске-уральском", "Каменске-Уральском");
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        width: "100%",
        textAlign: "center",
        fontFamily: body,
        fontWeight: 600,
        fontSize: 46,
        color: "#fff",
        textShadow: "0 2px 10px rgba(0,0,0,.6), 0 1px 3px rgba(0,0,0,.7)",
      }}
    >
      {text}
    </div>
  );
};

/* ---------- Флешбэк «2 года назад»: ч/б, REC, таймкод, зерно ---------- */
const Flashback: React.FC<{ from: number; at: number; until: number }> = ({ from, at, until }) => {
  const t = useT(from);
  const frame = useCurrentFrame();
  if (t < at || t > until) return null;
  const blink = Math.floor(frame / 15) % 2 === 0;
  return (
    <AbsoluteFill style={{ fontFamily: "monospace", color: "#fff" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,.6) 100%)" }} />
      <div style={{ position: "absolute", top: 250, left: 70, fontSize: 46, fontWeight: 700, display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ width: 26, height: 26, borderRadius: 13, background: blink ? "#ff2d2d" : "transparent" }} />
        REC
      </div>
      <div style={{ position: "absolute", top: 250, right: 70, fontSize: 40 }}>▮▮▮▯</div>
      <div style={{ position: "absolute", bottom: 420, right: 70, fontSize: 40, background: "rgba(0,0,0,.55)", padding: "6px 14px" }}>
        08.11.2024 12:00
      </div>
      <div style={{ position: "absolute", top: 330, left: 70, fontFamily: hand, fontSize: 70, color: "#fff" }}>2 года назад…</div>
    </AbsoluteFill>
  );
};

/* ---------- Рисованная вставка: модули складываются в дом и баню ---------- */
const Doodle: React.FC<{ from: number; at: number; until: number }> = ({ from, at, until }) => {
  const t = useT(from);
  if (t < at || t > until) return null;
  const lt = t - at; // локальное время вставки
  // модули падают по очереди
  const blocks = [
    { x: 170, y: 1180, w: 360, h: 170, c: "#C98A4B", d: 0.05 },
    { x: 530, y: 1180, w: 300, h: 170, c: "#B8743A", d: 0.3 },
    { x: 170, y: 1010, w: 360, h: 170, c: "#D9A066", d: 0.55 },
    { x: 760, y: 1240, w: 200, h: 110, c: "#8E5427", d: 1.15 }, // баня
  ];
  const drawLen = prog(lt, 0, 0.5);
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      {/* бумажная фактура и «дрожание» линий */}
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <defs>
          <filter id="rough">
            <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed={Math.floor(lt * 8)} />
            <feDisplacementMap in="SourceGraphic" scale="6" />
          </filter>
          <pattern id="hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <rect width="14" height="14" fill="transparent" />
            <line x1="0" y1="0" x2="0" y2="14" stroke="rgba(0,0,0,.18)" strokeWidth="5" />
          </pattern>
        </defs>
        <g filter="url(#rough)" transform="translate(-75 -200) scale(1.14)">
          {/* земля рисуется карандашом */}
          <path d="M80 1352 L1000 1352" stroke={INK} strokeWidth="8" strokeLinecap="round" strokeDasharray="920" strokeDashoffset={920 * (1 - drawLen)} />
          {blocks.map((b, i) => {
            const p = interpolate(lt, [b.d, b.d + 0.35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bounce });
            if (lt < b.d) return null;
            const y = b.y - (1 - p) * 900;
            return (
              <g key={i}>
                <rect x={b.x} y={y} width={b.w} height={b.h} fill={b.c} stroke={INK} strokeWidth="7" rx="6" />
                <rect x={b.x} y={y} width={b.w} height={b.h} fill="url(#hatch)" />
                {/* окна */}
                <rect x={b.x + 40} y={y + 40} width={70} height={60} fill="#FFE39A" stroke={INK} strokeWidth="5" />
                {b.w > 250 ? <rect x={b.x + b.w - 120} y={y + 40} width={80} height={b.h - 40} fill="#5a3a22" stroke={INK} strokeWidth="5" /> : null}
              </g>
            );
          })}
          {/* крыши появляются последними */}
          {lt > 0.9 ? (
            <path d="M150 1010 L560 1010" stroke={INK} strokeWidth="14" strokeLinecap="round" strokeDasharray="420" strokeDashoffset={420 * (1 - prog(lt, 0.9, 1.1))} />
          ) : null}
          {lt > 1.5 ? (
            <path d="M745 1240 L975 1240" stroke={INK} strokeWidth="12" strokeLinecap="round" strokeDasharray="240" strokeDashoffset={240 * (1 - prog(lt, 1.5, 1.7))} />
          ) : null}
          {/* труба бани и дымок */}
          {lt > 1.6 ? (
            <path d={`M900 1240 v-60 M890 1170 q-20 -${20 + lt * 10} 10 -${50 + lt * 15}`} stroke={INK} strokeWidth="7" fill="none" strokeLinecap="round" />
          ) : null}
        </g>
      </svg>
      {/* рукописные подписи */}
      <div style={{ position: "absolute", top: 560, width: "100%", textAlign: "center", fontFamily: hand, fontSize: 130, color: INK, opacity: prog(lt, 0.1, 0.4) }}>
        как строим
      </div>
      <div style={{ position: "absolute", top: 1330, left: 230, fontFamily: hand, fontSize: 100, color: INK, opacity: prog(lt, 0.7, 1.0), transform: "rotate(-4deg)" }}>
        дома
      </div>
      <div
        style={{
          position: "absolute",
          top: 1330,
          left: 720,
          fontFamily: hand,
          fontSize: 92,
          color: "#fff",
          background: GREEN,
          padding: "0 18px",
          borderRadius: 10,
          opacity: prog(lt, 1.5, 1.8),
          transform: "rotate(3deg)",
        }}
      >
        и бани
      </div>
      {/* карандаш */}
      <svg width="200" height="200" viewBox="0 0 100 100" style={{ position: "absolute", left: 20 + drawLen * 980, top: 1160, transform: "rotate(-30deg)", opacity: 1 - prog(lt, 0.5, 0.7) }}>
        <rect x="10" y="40" width="70" height="18" fill="#4A7BD0" stroke={INK} strokeWidth="3" />
        <path d="M80 40 l15 9 l-15 9 z" fill="#F2D2A0" stroke={INK} strokeWidth="3" />
      </svg>
    </AbsoluteFill>
  );
};

/* ---------- Финальная рисованная карточка ---------- */
const DoodleEnd: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const arrow = prog(t, 0.9, 1.4);
  return (
    <AbsoluteFill style={{ background: PAPER, alignItems: "center" }}>
      <Img
        src={staticFile("logo.png")}
        style={{ width: 520, marginTop: 300, filter: "brightness(0)", opacity: prog(t, 0, 0.3) }}
      />
      <div style={{ marginTop: 50, fontFamily: hand, fontSize: 110, color: INK, opacity: prog(t, 0.15, 0.45) }}>Ждём вас!</div>
      <div style={{ position: "relative", height: 330, width: "100%" }}>
        <Text3D from={0} lines={["8 НОЯБРЯ", "12:00"]} at={0.3} top={0} size={150} wall="#d8cbb4" tilt={0} />
      </div>
      <div style={{ fontFamily: hand, fontSize: 84, color: INK, textAlign: "center", lineHeight: 1.1, opacity: prog(t, 0.8, 1.1) }}>
        напиши <span style={{ color: "#fff", background: GREEN, padding: "0 16px", borderRadius: 10 }}>«ХОЧУ»</span>
        <br />в комментариях
      </div>
      <svg width="200" height="220" viewBox="0 0 100 110" style={{ marginTop: 20 }}>
        <path
          d="M50 5 q-25 40 0 90 M30 75 l20 22 l22 -20"
          fill="none"
          stroke={INK}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="200"
          strokeDashoffset={200 * (1 - arrow)}
        />
      </svg>
    </AbsoluteFill>
  );
};

/* ---------- Наезды камеры: [секунда исходника, масштаб] ---------- */
const zoomAt = (t: number, cuts: [number, number][]) => {
  let z = 1;
  for (const [at, s] of cuts) if (t >= at) z = s;
  return z;
};

const World: React.FC<{ scene: Scene; zooms: [number, number][]; origin?: string; children?: React.ReactNode; behind?: React.ReactNode; bw?: [number, number] }> = ({
  scene,
  zooms,
  origin = "50% 40%",
  children,
  behind,
  bw,
}) => {
  const t = useT(scene.from);
  const z = zoomAt(t, zooms);
  const cut = CUTOUTS[scene.src];
  const gray = bw && t >= bw[0] && t <= bw[1];
  const filter = gray ? "grayscale(1) contrast(1.25) brightness(.95)" : "saturate(1.1) contrast(1.06)";
  return (
    <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: origin, filter }}>
      <OffthreadVideo src={staticFile(scene.src)} trimBefore={Math.round(scene.from * FPS)} style={{ width: W, height: H, objectFit: "cover" }} />
      {behind}
      {cut && behind ? (
        <AbsoluteFill>
          <OffthreadVideo
            src={staticFile(cut.file)}
            transparent
            muted
            trimBefore={Math.round(scene.from * FPS) - cut.f0}
            style={{ width: W, height: H, objectFit: "cover" }}
          />
        </AbsoluteFill>
      ) : null}
      {children}
    </AbsoluteFill>
  );
};

const len = (s: { from: number; to: number }) => Math.round((s.to - s.from) * FPS);
const [D, A, C, E, B] = SCENES;
const B_END = 14.3;
const END_LEN = Math.round(3.8 * FPS);
export const STORY_TOTAL = len(D) + len(A) + len(C) + len(E) + Math.round((B_END - B.from) * FPS) + END_LEN;

export const PromoStory: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Series>
        {/* 1. Терраса: 3D «ДЕНЬ ОТКРЫТЫХ ДВЕРЕЙ» за спиной, потом флешбэк «2 года назад» */}
        <Series.Sequence durationInFrames={len(D)}>
          <World
            scene={D}
            zooms={[[8.4, 1], [10.44, 1.18], [12.96, 1.06], [13.72, 1.2]]}
            bw={[10.44, 12.9]}
            behind={<Text3D from={D.from} lines={["ДЕНЬ", "ОТКРЫТЫХ", "ДВЕРЕЙ"]} at={9.3} breakAt={10.35} top={330} size={150} wall="#8E5427" />}
          />
          <Flashback from={D.from} at={10.44} until={12.9} />
          <Sticker from={D.from} kind="gift" at={14.6} x={830} y={760} size={240} rot={10} />
          <Subs scene={D} />
        </Series.Sequence>

        {/* 2. Баня: 3D «50 000 ₽» прорывает стену, потом осыпается, вокруг — подарки */}
        <Series.Sequence durationInFrames={len(A)}>
          <World
            scene={A}
            zooms={[[1.95, 1.12], [3.64, 1], [5.74, 1.15]]}
            behind={<Text3D from={A.from} lines={["50 000 ₽"]} at={4.45} breakAt={5.95} top={420} size={190} wall="#9b6a3a" />}
          />
          <Sticker from={A.from} kind="gift" at={5.9} x={230} y={780} size={230} rot={-12} />
          <Sticker from={A.from} kind="gift" at={6.1} x={860} y={980} size={200} rot={14} />
          <Subs scene={A} />
        </Series.Sequence>

        {/* 3. Цех: рисованная вставка «как строим дома и бани», потом вопросики */}
        <Series.Sequence durationInFrames={len(C)}>
          <World scene={C} zooms={[[11.0, 1], [12.4, 1.2], [15.54, 1.08]]} origin="50% 55%" />
          <Doodle from={C.from} at={13.4} until={15.5} />
          <Sticker from={C.from} kind="question" at={16.0} x={250} y={760} size={200} rot={-14} />
          <Sticker from={C.from} kind="question" at={16.35} x={840} y={640} size={240} rot={12} />
          <Sticker from={C.from} kind="question" at={16.7} x={780} y={980} size={170} rot={-6} />
          <Subs scene={C} hideFrom={13.4} hideTo={15.5} />
        </Series.Sequence>

        {/* 4. Кофе и игристое — рисованные стикеры на словах */}
        <Series.Sequence durationInFrames={len(E)}>
          <World scene={E} zooms={[[13.5, 1.06], [15.64, 1.22]]} origin="50% 60%" />
          <Sticker from={E.from} kind="coffee" at={15.0} x={270} y={700} size={280} rot={-10} />
          <Sticker from={E.from} kind="glass" at={16.1} x={820} y={640} size={280} rot={12} />
          <Subs scene={E} y={1450} />
        </Series.Sequence>

        {/* 5. Дверь: 3D «8 НОЯБРЯ 12:00» на синей стене за ней, пузырь «ХОЧУ» */}
        <Series.Sequence durationInFrames={Math.round((B_END - B.from) * FPS)}>
          <World
            scene={{ ...B, to: B_END }}
            zooms={[[8.45, 1], [10.7, 1.16], [12.38, 1.04]]}
            behind={<Text3D from={B.from} lines={["8 НОЯБРЯ", "12:00"]} at={9.5} top={330} size={150} wall="#2348b8" />}
          />
          <Sticker from={B.from} kind="bubble" at={11.42} x={790} y={1000} size={330} rot={8} />
          <Subs scene={B} />
        </Series.Sequence>

        {/* 6. Финал на бумаге */}
        <Series.Sequence durationInFrames={END_LEN}>
          <DoodleEnd />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
