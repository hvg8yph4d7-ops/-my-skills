// «Третий стук» — общий набор для серий: субтитры, полоска-«скотч», плашки,
// рисованные объекты (ночь, дачи, автобус, собака, окно, телефон) и финальная карточка.
import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  random,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/fonts";
import { FPS } from "../Promo"; // там же подключаются Montserrat и Manrope

for (const subset of ["cyrillic", "latin"]) {
  loadFont({ family: "Caveat", url: staticFile(`fonts/caveat-${subset}-700-normal.woff2`), weight: "700" });
}

export const head = "Montserrat";
export const body = "Manrope";
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const sec = (s: number) => Math.round(s * FPS);

export const C = {
  skyTop: "#232741",
  skyBottom: "#141626",
  tree: "#0f111b",
  treeFar: "#1a1d2e",
  ground: "#1b1916",
  wall: "#5b4636",
  plank: "#4a382b",
  roof: "#1d1e26",
  lit: "#ffcf6b",
  red: "#ff3b30",
  yellow: "#ffd23f",
  grey: "#9aa0aa",
  green: "#2f6b45",
  tape: "#e9e2cc",
};

// ——— Субтитры: «/» — перенос, «^» — красное слово, «$» — жёлтое, «~» — серое ———
const wordColor = (w: string): [string, string] => {
  if (w.startsWith("^")) return [w.slice(1), C.red];
  if (w.startsWith("$")) return [w.slice(1), C.yellow];
  if (w.startsWith("~")) return [w.slice(1), C.grey];
  return [w, "#fff"];
};

export const Caption: React.FC<{ text: string; dur: number }> = ({ text, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines = text.split("/").map((l) => l.trim().split(/\s+/));
  const longest = Math.max(...lines.map((ws) => ws.map((w) => wordColor(w)[0]).join(" ").length));
  const size = Math.min(118, 960 / (longest * 0.74));
  const out = interpolate(f, [dur - 4, dur], [1, 0], clamp);
  let i = 0;
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 1150 }}>
      <div style={{ textAlign: "center", opacity: out, width: 1040 }}>
        {lines.map((ws, li) => (
          <div key={li} style={{ lineHeight: 1.08 }}>
            {ws.map((raw) => {
              const [w, color] = wordColor(raw);
              const s = spring({ frame: f - i++ * 3, fps, config: { damping: 11, stiffness: 220 } });
              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    margin: `0 ${size * 0.13}px`,
                    transform: `scale(${0.6 + 0.4 * Math.min(s, 1.04)}) translateY(${(1 - s) * 24}px)`,
                    opacity: Math.min(1, s * 2),
                    color,
                    fontFamily: head,
                    fontWeight: 900,
                    fontSize: size,
                    letterSpacing: -1,
                    textShadow: "0 6px 0 rgba(0,0,0,.6), 0 0 18px rgba(0,0,0,.85), 0 0 50px rgba(0,0,0,.7)",
                  }}
                >
                  {w}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ——— Полоска-«скотч» сверху ———
export const Tape: React.FC<{ num: string; text: string }> = ({ num, text }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 16, stiffness: 120 } });
  const bang = num === "!";
  return (
    <div
      style={{
        position: "absolute",
        top: 150,
        left: -40,
        width: 1180,
        height: 124,
        background: `linear-gradient(180deg, #f1ebd8, ${C.tape} 60%, #d8cfb5)`,
        transform: `translateX(${(1 - s) * -1250}px) rotate(-2.2deg)`,
        boxShadow: "0 10px 24px rgba(0,0,0,.6)",
        display: "flex",
        alignItems: "center",
        paddingLeft: 80,
        gap: 22,
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
    >
      <span
        style={{
          fontFamily: bang ? head : "Caveat",
          fontWeight: bang ? 900 : 700,
          fontSize: bang ? 68 : 84,
          color: "#c62828",
        }}
      >
        {num}
      </span>
      <span style={{ fontFamily: head, fontWeight: 900, fontSize: 60, color: "#16171b", letterSpacing: -0.5 }}>
        {text}
      </span>
    </div>
  );
};

// ——— Плашка-подпись ———
export const Plate: React.FC<{ x: number; y: number; text: string; delay?: number; color?: string }> = ({
  x,
  y,
  text,
  delay = 0,
  color = C.green,
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 13 } });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${s})`,
        background: color,
        color: "#fff",
        fontFamily: body,
        fontWeight: 700,
        fontSize: 36,
        padding: "12px 26px",
        borderRadius: 14,
        whiteSpace: "nowrap",
        boxShadow: "0 8px 20px rgba(0,0,0,.5)",
        letterSpacing: 1,
      }}
    >
      {text}
    </div>
  );
};

// ——— Рисованные объекты (SVG 1080×1920) ———
export const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute" }}>
    {children}
  </svg>
);

export const Sky: React.FC<{ moon?: boolean; dusk?: boolean }> = ({ moon = true, dusk = false }) => (
  <>
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={dusk ? "#2b2f4d" : C.skyTop} />
        <stop offset="1" stopColor={dusk ? "#4a3c4e" : C.skyBottom} />
      </linearGradient>
    </defs>
    <rect width={1080} height={1920} fill="url(#sky)" />
    {new Array(45).fill(0).map((_, i) => (
      <circle
        key={i}
        cx={random(`sx${i}`) * 1080}
        cy={random(`sy${i}`) * 750}
        r={1 + random(`sr${i}`) * 2}
        fill="#fff"
        opacity={(dusk ? 0.1 : 0.2) + random(`so${i}`) * 0.4}
      />
    ))}
    {moon && <circle cx={860} cy={430} r={52} fill="#e6e1cc" opacity={0.8} />}
  </>
);

export const Forest: React.FC<{ y: number; shift?: number }> = ({ y, shift = 0 }) => (
  <>
    {new Array(30).fill(0).map((_, i) => {
      const x = -60 + i * 42 + random(`fx${i}`) * 20 - shift * 0.4;
      const h = 240 + random(`fh${i}`) * 260;
      return <polygon key={`b${i}`} points={`${x - 34},${y} ${x},${y - h} ${x + 34},${y}`} fill={C.treeFar} />;
    })}
    {new Array(22).fill(0).map((_, i) => {
      const x = -40 + i * 56 + random(`tx${i}`) * 24 - shift;
      const h = 320 + random(`th${i}`) * 300;
      return <polygon key={`f${i}`} points={`${x - 42},${y} ${x},${y - h} ${x + 42},${y}`} fill={C.tree} />;
    })}
    <rect x={0} y={y} width={1080} height={1920 - y} fill={C.ground} />
  </>
);

// Дачный домик; lit — 0..1 (свет в окне), glow — ореол вокруг окна
export const Dacha: React.FC<{ x: number; y: number; s?: number; lit?: number; wall?: string }> = ({
  x,
  y,
  s = 1,
  lit = 0,
  wall = C.wall,
}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    {lit > 0 && (
      <>
        <defs>
          <radialGradient id={`glow${x}`}>
            <stop offset="0" stopColor={C.lit} stopOpacity={0.45 * lit} />
            <stop offset="1" stopColor={C.lit} stopOpacity={0} />
          </radialGradient>
        </defs>
        <ellipse cx={-30} cy={-140} rx={260} ry={200} fill={`url(#glow${x})`} />
      </>
    )}
    <rect x={-170} y={-250} width={340} height={250} fill={wall} />
    {new Array(10).fill(0).map((_, i) => (
      <line key={i} x1={-170} x2={170} y1={-250 + i * 25} y2={-250 + i * 25} stroke={C.plank} strokeWidth={3} />
    ))}
    <polygon points="-210,-245 0,-410 210,-245" fill={C.roof} />
    <rect x={-95} y={-190} width={120} height={110} fill="#0b0d14" stroke="#cfcfcf" strokeWidth={7} />
    <rect x={-95} y={-190} width={120} height={110} fill={C.lit} opacity={lit} />
    <line x1={-35} x2={-35} y1={-190} y2={-80} stroke="#cfcfcf" strokeWidth={6} />
    <line x1={-95} x2={25} y1={-135} y2={-135} stroke="#cfcfcf" strokeWidth={6} />
    <rect x={70} y={-160} width={70} height={160} fill="#2a1f17" />
  </g>
);

export const Fence: React.FC<{ y: number; from?: number; to?: number }> = ({ y, from = 0, to = 1080 }) => (
  <g>
    <rect x={from} y={y - 70} width={to - from} height={10} fill="#3a2f26" />
    <rect x={from} y={y - 30} width={to - from} height={10} fill="#3a2f26" />
    {new Array(Math.ceil((to - from) / 34)).fill(0).map((_, i) => (
      <polygon
        key={i}
        points={`${from + i * 34},${y} ${from + i * 34},${y - 95} ${from + i * 34 + 11},${y - 108} ${from + i * 34 + 22},${y - 95} ${from + i * 34 + 22},${y}`}
        fill="#2e251e"
      />
    ))}
  </g>
);

export const Man: React.FC<{
  x: number;
  y: number;
  s?: number;
  phone?: boolean;
  bag?: boolean;
  color?: string;
  back?: boolean;
}> = ({ x, y, s = 1, phone = false, bag = false, color = "#2a2f45", back = false }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <rect x={-34} y={-200} width={30} height={200} fill="#101117" />
    <rect x={4} y={-200} width={30} height={200} fill="#101117" />
    <rect x={-48} y={-420} width={96} height={230} rx={12} fill={color} />
    {phone ? (
      <>
        <path d="M40,-400 L70,-300 L20,-280" stroke={color} strokeWidth={26} fill="none" strokeLinejoin="round" />
        <rect x={4} y={-320} width={26} height={44} rx={4} fill="#9fd0ff" />
      </>
    ) : (
      <rect x={40} y={-400} width={24} height={180} rx={10} fill={color} />
    )}
    {bag && <rect x={-110} y={-260} width={70} height={90} rx={10} fill="#3d3328" />}
    <circle cx={0} cy={-470} r={44} fill={back ? "#1a1a1f" : "#d9ad8c"} />
    {!back && <path d="M-44,-475 a44,44 0 0 1 88,0 q-44,-18 -88,0" fill="#1a1a1f" />}
  </g>
);

// Сельский автобус (ПАЗ)
export const Bus: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x},${y})`}>
    <rect x={-260} y={-250} width={520} height={190} rx={34} fill="#c9b98f" />
    <rect x={-260} y={-130} width={520} height={30} fill="#8c3b2f" />
    {[-220, -120, -20, 80].map((wx) => (
      <rect key={wx} x={wx} y={-225} width={80} height={70} rx={8} fill="#2a2d3d" />
    ))}
    <rect x={180} y={-225} width={60} height={110} rx={8} fill="#1d2030" />
    <circle cx={-150} cy={-60} r={40} fill="#15161b" />
    <circle cx={160} cy={-60} r={40} fill="#15161b" />
    <rect x={-268} y={-120} width={14} height={26} rx={4} fill="#ff3b30" />
    <ellipse cx={-300} cy={-108} rx={60} ry={30} fill="#ff3b30" opacity={0.25} />
  </g>
);

// Собака; alert 0..1 — поднимает голову, светятся глаза
export const Dog: React.FC<{ x: number; y: number; s?: number; alert?: number }> = ({ x, y, s = 1, alert = 0 }) => {
  const hy = -60 - alert * 70;
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={0} cy={-40} rx={130} ry={48} fill="#3b3029" />
      <path d="M120,-50 q60,-10 70,30" stroke="#3b3029" strokeWidth={16} fill="none" strokeLinecap="round" />
      <g transform={`translate(-120,${hy})`}>
        <ellipse cx={0} cy={0} rx={52} ry={44} fill="#3b3029" />
        <ellipse cx={-62} cy={16} rx={44} ry={24} fill="#33291f" />
        <circle cx={-100} cy={10} r={9} fill="#0d0b09" />
        <ellipse cx={26} cy={6} rx={20} ry={42} fill="#2a211b" transform="rotate(-18 26 6)" />
        <circle cx={-16} cy={-6} r={7} fill={alert > 0.5 ? "#ffe9a8" : "#111"} />
        {alert > 0.5 && <circle cx={-16} cy={-6} r={18} fill="#ffe9a8" opacity={0.25} />}
      </g>
    </g>
  );
};

// Свет в окне: мигает при включении, гаснет резко
export const useLight = (on: number, off = Infinity) => {
  const f = useCurrentFrame();
  if (f < on || f >= off) return 0;
  if (f < on + 8) return random(`lt${f}`) > 0.5 ? 1 : 0.2;
  return 0.93 + random(`lf${Math.floor(f / 3)}`) * 0.07;
};

// Вид из окна на дом Ковалёвых (используется в комнате и в телефоне)
export const Outside: React.FC<{ lit: number; eyes?: boolean }> = ({ lit, eyes }) => (
  <>
    <Sky />
    <Forest y={1040} />
    <Dacha x={540} y={1040} s={1.3} lit={lit} />
    <Fence y={1110} />
    {eyes && (
      <>
        <circle cx={480} cy={862} r={5} fill="#f4f0dc" />
        <circle cx={506} cy={862} r={5} fill="#f4f0dc" />
      </>
    )}
  </>
);

// Медленный «наезд камеры»
export const Camera: React.FC<{
  dur: number;
  from?: number;
  to?: number;
  ox?: string;
  oy?: string;
  shake?: number;
  children: React.ReactNode;
}> = ({ dur, from = 1, to = 1.07, ox = "50%", oy = "45%", shake = 0, children }) => {
  const f = useCurrentFrame();
  const sc = interpolate(f, [0, dur], [from, to], clamp);
  const dx = shake ? (random(`cx${f}`) - 0.5) * shake : 0;
  const dy = shake ? (random(`cy${f}`) - 0.5) * shake : 0;
  return (
    <AbsoluteFill style={{ transform: `translate(${dx}px,${dy}px) scale(${sc})`, transformOrigin: `${ox} ${oy}` }}>
      {children}
    </AbsoluteFill>
  );
};

// Виньетка + плёночное зерно с лёгким мерцанием
export const Mood: React.FC = () => {
  const f = useCurrentFrame();
  const flicker = 0.92 + random(`fl${Math.floor(f / 2)}`) * 0.08;
  return (
    <>
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0) 40%, rgba(0,0,0,.7) 100%)",
          opacity: flicker,
        }}
      />
      <AbsoluteFill style={{ opacity: 0.09, mixBlendMode: "screen" }}>
        <svg width={1080} height={1920}>
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={f % 30} />
          </filter>
          <rect width={1080} height={1920} filter="url(#grain)" />
        </svg>
      </AbsoluteFill>
    </>
  );
};

// Звук, начинающийся с кадра `at` текущей сцены
export const Sfx: React.FC<{ src: string; at: number; volume?: number }> = ({ src, at, volume = 1 }) => (
  <Sequence from={Math.max(0, at)}>
    <Audio src={staticFile(`stuk/sfx/${src}`)} volume={volume} />
  </Sequence>
);

// Финальная карточка: три удара и название
export const EndCard: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const knock = [0, 18, 36]; // совпадает с knock3.mp3: удар 0,35 с + пауза 0,25 с
  const title = spring({ frame: f - 44, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ background: "#07080c", alignItems: "center", paddingTop: 420 }}>
      <svg width={420} height={520} viewBox="0 0 420 520">
        <rect x={60} y={20} width={300} height={500} rx={6} fill="#2a1f17" stroke="#4a382b" strokeWidth={10} />
        <circle cx={300} cy={290} r={12} fill="#8a7a5a" />
        {knock.map((k, i) => {
          const s = spring({ frame: f - k, fps, config: { damping: 9, stiffness: 260 } });
          return (
            <g key={i} transform={`translate(${170 + i * 36},${150 + i * 70}) scale(${s})`}>
              <circle r={26} fill={C.red} opacity={0.25} />
              <circle r={11} fill={C.red} />
            </g>
          );
        })}
      </svg>
      <div
        style={{
          marginTop: 40,
          fontFamily: head,
          fontWeight: 900,
          fontSize: 104,
          color: "#fff",
          letterSpacing: 2,
          opacity: title,
          transform: `scale(${0.85 + 0.15 * title})`,
          textShadow: "0 0 40px rgba(255,59,48,.35)",
        }}
      >
        ТРЕТИЙ СТУК
      </div>
      <Sfx src="knock3.mp3" at={0} volume={1} />
    </AbsoluteFill>
  );
};

// ——— Субтитры «караоке» (как у surv_protocol): по 2–3 слова, ещё не сказанные — серые ———
export type KWord = { text: string; color: string; at: number }; // at — кадр начала слова в куске

export const splitWords = (caption: string): { text: string; color: string }[] =>
  caption
    .replace(/\//g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const [text, color] = wordColor(w);
      return { text, color };
    });

export const KaraokeCaption: React.FC<{ words: KWord[]; dur: number }> = ({ words, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = words.map((w) => w.text).join(" ").length;
  const size = Math.min(108, 1500 / Math.max(len, 8));
  const out = interpolate(f, [dur - 2, dur], [1, 0], clamp);
  const appear = spring({ frame: f, fps, config: { damping: 14, stiffness: 260 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 1170 }}>
      <div
        style={{
          width: 900,
          textAlign: "center",
          opacity: out,
          transform: `scale(${0.85 + 0.15 * appear})`,
          lineHeight: 1.05,
        }}
      >
        {words.map((w, i) => {
          const said = f >= w.at;
          const pop = spring({ frame: f - w.at, fps, config: { damping: 12, stiffness: 300 } });
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                margin: `0 ${size * 0.14}px`,
                color: said ? w.color : "#7d828c",
                opacity: said ? 1 : 0.75,
                transform: `scale(${said ? 1 + 0.06 * (1 - Math.min(pop, 1)) : 1})`,
                fontFamily: head,
                fontWeight: 900,
                fontSize: size,
                letterSpacing: -0.5,
                textShadow: "0 5px 0 rgba(0,0,0,.6), 0 0 18px rgba(0,0,0,.85)",
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Маленькая отметка времени сверху: «НОЧЬ 4 · 02:41»
export const Stamp: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      position: "absolute",
      top: 300,
      width: "100%",
      textAlign: "center",
      fontFamily: body,
      fontWeight: 700,
      fontSize: 30,
      letterSpacing: 6,
      color: "rgba(235,232,220,.75)",
    }}
  >
    {text}
  </div>
);

// Плашки, которые копятся на экране (как у surv_protocol): [текст, кадр появления, цвет]
export const Pills: React.FC<{ y: number; items: [string, number, string?][] }> = ({ y, items }) => (
  <>
    {items.map(([text, at, color], i) => (
      <Sequence key={i} from={Math.max(0, at)}>
        <Plate x={540} y={y + i * 76} text={text} color={color ?? C.green} />
      </Sequence>
    ))}
  </>
);
