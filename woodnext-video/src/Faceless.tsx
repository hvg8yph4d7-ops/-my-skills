// Серия «faceless» — как ролики surv_protocol («СНТ: Рассвет»):
// плоская векторная анимация в ночной палитре, огромные субтитры по центру
// с цветными ключевыми словами, полоска-«скотч» сверху с номером пункта,
// экран телефона с перепиской, зелёные плашки-подписи.
// Первый выпуск: «3 ошибки при выборе модульного дома».
import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  random,
  Sequence,
  Series,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/fonts";
import { FPS } from "./Promo"; // там же подключаются Montserrat и Manrope

for (const subset of ["cyrillic", "latin"]) {
  loadFont({
    family: "Caveat",
    url: staticFile(`fonts/caveat-${subset}-700-normal.woff2`),
    weight: "700",
  });
}

const head = "Montserrat";
const body = "Manrope";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const C = {
  skyTop: "#353a55",
  skyBottom: "#22253a",
  tree: "#1b1e2c",
  treeFar: "#262a3e",
  ground: "#29251f",
  wall: "#6e5540",
  plank: "#5a4433",
  roof: "#24252e",
  red: "#ff3b30",
  yellow: "#ffd23f",
  grey: "#a3a8b0",
  green: "#2f6b45",
  tape: "#e9e2cc",
};

// ——— Субтитры ————————————————————————————————————————————————
// Разметка: «/» — перенос строки, слово с «^» — красное, «$» — жёлтое, «~» — серое.
type Phrase = [text: string, start: number, end: number]; // секунды от начала сцены

const wordColor = (w: string): [string, string] => {
  if (w.startsWith("^")) return [w.slice(1), C.red];
  if (w.startsWith("$")) return [w.slice(1), C.yellow];
  if (w.startsWith("~")) return [w.slice(1), C.grey];
  return [w, "#fff"];
};

const Caption: React.FC<{ text: string; dur: number }> = ({ text, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines = text.split("/").map((l) => l.trim().split(/\s+/));
  const longest = Math.max(
    ...lines.map((ws) => ws.map((w) => wordColor(w)[0]).join(" ").length),
  );
  const size = Math.min(124, 960 / (longest * 0.74));
  const out = interpolate(f, [dur - 5, dur], [1, 0], clamp);
  let i = 0;
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 1130 }}>
      <div style={{ textAlign: "center", opacity: out, width: 1040 }}>
        {lines.map((ws, li) => (
          <div key={li} style={{ lineHeight: 1.08 }}>
            {ws.map((raw) => {
              const [w, color] = wordColor(raw);
              const s = spring({
                frame: f - i++ * 3,
                fps,
                config: { damping: 11, stiffness: 220 },
              });
              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    margin: `0 ${size * 0.13}px`,
                    transform: `scale(${0.55 + 0.45 * s}) translateY(${(1 - s) * 24}px)`,
                    opacity: Math.min(1, s * 2),
                    color,
                    fontFamily: head,
                    fontWeight: 900,
                    fontSize: size,
                    letterSpacing: -1,
                    textShadow:
                      "0 6px 0 rgba(0,0,0,.6), 0 0 18px rgba(0,0,0,.8), 0 0 50px rgba(0,0,0,.6)",
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

const Captions: React.FC<{ phrases: Phrase[] }> = ({ phrases }) => (
  <>
    {phrases.map(([t, a, b]) => (
      <Sequence
        key={t}
        from={Math.round(a * FPS)}
        durationInFrames={Math.round((b - a) * FPS)}
      >
        <Caption text={t} dur={Math.round((b - a) * FPS)} />
        <Audio src={staticFile("sfx/pop.wav")} volume={0.35} />
      </Sequence>
    ))}
  </>
);

// ——— Полоска-«скотч» сверху ————————————————————————————————————————
const Tape: React.FC<{ num: string; text: string }> = ({ num, text }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 16, stiffness: 120 } });
  return (
    <div
      style={{
        position: "absolute",
        top: 150,
        left: -40,
        width: 1180,
        height: 128,
        background: `linear-gradient(180deg, #f1ebd8, ${C.tape} 60%, #d8cfb5)`,
        transform: `translateX(${(1 - s) * -1250}px) rotate(-2.2deg)`,
        boxShadow: "0 10px 24px rgba(0,0,0,.5)",
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
          fontFamily: num === "!" ? head : "Caveat",
          fontWeight: num === "!" ? 900 : 700,
          fontSize: num === "!" ? 70 : 86,
          color: "#c62828",
        }}
      >
        {num}
      </span>
      <span
        style={{
          fontFamily: head,
          fontWeight: 900,
          fontSize: 64,
          color: "#16171b",
          letterSpacing: -0.5,
        }}
      >
        {text}
      </span>
    </div>
  );
};

// ——— Зелёная плашка ——————————————————————————————————————————————
const Plate: React.FC<{
  x: number;
  y: number;
  text: string;
  delay?: number;
  color?: string;
}> = ({ x, y, text, delay = 0, color = C.green }) => {
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
        fontSize: 38,
        padding: "12px 26px",
        borderRadius: 14,
        whiteSpace: "nowrap",
        boxShadow: "0 8px 20px rgba(0,0,0,.45)",
        letterSpacing: 1,
      }}
    >
      {text}
    </div>
  );
};

// ——— Рисованные объекты (SVG, координаты 1080×1920) ———————————————————
const Sky: React.FC<{ stars?: boolean; moon?: boolean }> = ({ stars = true, moon = true }) => (
  <>
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={C.skyTop} />
        <stop offset="1" stopColor={C.skyBottom} />
      </linearGradient>
    </defs>
    <rect width={1080} height={1920} fill="url(#sky)" />
    {stars &&
      new Array(40)
        .fill(0)
        .map((_, i) => (
          <circle
            key={i}
            cx={random(`sx${i}`) * 1080}
            cy={random(`sy${i}`) * 700}
            r={1 + random(`sr${i}`) * 2}
            fill="#fff"
            opacity={0.25 + random(`so${i}`) * 0.4}
          />
        ))}
    {moon && <circle cx={850} cy={420} r={55} fill="#e9e4cf" opacity={0.85} />}
  </>
);

const Forest: React.FC<{ y: number; shift?: number }> = ({ y, shift = 0 }) => (
  <>
    {new Array(30).fill(0).map((_, i) => {
      const x = -60 + i * 42 + random(`fx${i}`) * 20 - shift * 0.4;
      const h = 260 + random(`fh${i}`) * 260;
      return (
        <polygon
          key={`b${i}`}
          points={`${x - 34},${y} ${x},${y - h} ${x + 34},${y}`}
          fill={C.treeFar}
        />
      );
    })}
    {new Array(22).fill(0).map((_, i) => {
      const x = -40 + i * 56 + random(`tx${i}`) * 24 - shift;
      const h = 340 + random(`th${i}`) * 300;
      return (
        <polygon
          key={`f${i}`}
          points={`${x - 42},${y} ${x},${y - h} ${x + 42},${y}`}
          fill={C.tree}
        />
      );
    })}
    <rect x={0} y={y} width={1080} height={1920 - y} fill={C.ground} />
  </>
);

const House: React.FC<{
  x: number;
  y: number;
  s?: number;
  lit?: number;
  cheap?: boolean;
}> = ({ x, y, s = 1, lit = 0, cheap = false }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    {lit > 0 && (
      <>
        <defs>
          <radialGradient id="glow">
            <stop offset="0" stopColor="#ffcf6b" stopOpacity={0.35 * lit} />
            <stop offset="1" stopColor="#ffcf6b" stopOpacity={0} />
          </radialGradient>
        </defs>
        <ellipse cx={0} cy={-150} rx={420} ry={300} fill="url(#glow)" />
      </>
    )}
    <rect
      x={-190}
      y={-260}
      width={380}
      height={260}
      fill={cheap ? "#7b6a58" : C.wall}
    />
    {new Array(11).fill(0).map((_, i) => (
      <line
        key={i}
        x1={-190}
        x2={190}
        y1={-260 + i * 24}
        y2={-260 + i * 24}
        stroke={C.plank}
        strokeWidth={3}
      />
    ))}
    <polygon points="-235,-255 0,-430 235,-255" fill={C.roof} />
    <rect
      x={-140}
      y={-200}
      width={110}
      height={100}
      fill={lit ? "#ffd27a" : "#10131c"}
      opacity={1}
      stroke="#eee"
      strokeWidth={8}
    />
    <line x1={-85} x2={-85} y1={-200} y2={-100} stroke="#eee" strokeWidth={6} />
    <rect
      x={40}
      y={-170}
      width={90}
      height={170}
      fill={lit ? "#f6b94f" : "#3b2c22"}
      stroke="#2a1f17"
      strokeWidth={5}
    />
    {cheap && (
      <>
        <path
          d="M-60,-250 l20,40 l-15,25 l20,35"
          stroke="#2a221b"
          strokeWidth={5}
          fill="none"
        />
        <path
          d="M150,-60 l-25,25 l10,20"
          stroke="#2a221b"
          strokeWidth={5}
          fill="none"
        />
      </>
    )}
  </g>
);

const Man: React.FC<{
  x: number;
  y: number;
  s?: number;
  phone?: boolean;
  walk?: number;
  color?: string;
}> = ({ x, y, s = 1, phone = false, walk = 0, color = "#2a2f45" }) => {
  const leg = Math.sin(walk) * 14;
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <rect
        x={-34 + leg * 0.3}
        y={-200}
        width={30}
        height={200}
        fill="#14151b"
        transform={`rotate(${leg} -19 -200)`}
      />
      <rect
        x={4}
        y={-200}
        width={30}
        height={200}
        fill="#14151b"
        transform={`rotate(${-leg} 19 -200)`}
      />
      <rect x={-48} y={-420} width={96} height={230} rx={12} fill={color} />
      <rect x={-48} y={-220} width={96} height={16} fill="#111" />
      {phone ? (
        <>
          <path
            d="M40,-400 L70,-300 L20,-280"
            stroke={color}
            strokeWidth={26}
            fill="none"
            strokeLinejoin="round"
          />
          <rect x={4} y={-320} width={26} height={44} rx={4} fill="#9fd0ff" />
        </>
      ) : (
        <rect x={40} y={-400} width={24} height={180} rx={10} fill={color} />
      )}
      <circle cx={0} cy={-470} r={44} fill="#e0b394" />
      <path d="M-44,-475 a44,44 0 0 1 88,0 q-44,-18 -88,0" fill="#1a1a1f" />
    </g>
  );
};

const Car: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x},${y})`}>
    <path
      d="M-170,-40 L-150,-90 L-80,-90 L-40,-150 L90,-150 L140,-90 L190,-85 L195,-40 Z"
      fill="#b9c1cc"
    />
    <path d="M-30,-140 L20,-140 L20,-95 L-62,-95 Z" fill="#242838" />
    <path d="M35,-140 L85,-140 L125,-95 L35,-95 Z" fill="#242838" />
    <circle cx={-100} cy={-40} r={36} fill="#16171c" />
    <circle cx={120} cy={-40} r={36} fill="#16171c" />
    <circle cx={-100} cy={-40} r={14} fill="#888" />
    <circle cx={120} cy={-40} r={14} fill="#888" />
  </g>
);

const Truck: React.FC<{ x: number; y: number; shake?: number }> = ({
  x,
  y,
  shake = 0,
}) => (
  <g transform={`translate(${x},${y + shake})`}>
    {/* модуль дома на платформе */}
    <rect x={-420} y={-330} width={420} height={200} fill={C.wall} />
    {new Array(8).fill(0).map((_, i) => (
      <line
        key={i}
        x1={-420}
        x2={0}
        y1={-330 + i * 25}
        y2={-330 + i * 25}
        stroke={C.plank}
        strokeWidth={3}
      />
    ))}
    <rect
      x={-330}
      y={-290}
      width={90}
      height={80}
      fill="#10131c"
      stroke="#eee"
      strokeWidth={6}
    />
    <rect x={-440} y={-130} width={470} height={30} fill="#3a3d48" />
    {/* кабина */}
    <path
      d="M40,-100 L40,-250 L140,-250 L190,-170 L190,-100 Z"
      fill="#c9cfd8"
    />
    <path d="M60,-235 L130,-235 L165,-175 L60,-175 Z" fill="#242838" />
    <circle cx={150} cy={-155} r={10} fill="#ffe08a" />
    {[-370, -280, 130].map((cx) => (
      <g key={cx}>
        <circle cx={cx} cy={-95} r={40} fill="#16171c" />
        <circle cx={cx} cy={-95} r={15} fill="#888" />
      </g>
    ))}
  </g>
);

const Snow: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      {new Array(70).fill(0).map((_, i) => {
        const x =
          (random(`nx${i}`) * 1200 + f * (1.5 + random(`nv${i}`))) % 1100;
        const y =
          (random(`ny${i}`) * 1100 + f * (3 + random(`nw${i}`) * 3)) % 1100;
        return (
          <circle
            key={i}
            cx={x}
            cy={y + 200}
            r={3 + random(`nr${i}`) * 4}
            fill="#fff"
            opacity={0.75}
          />
        );
      })}
    </>
  );
};

// Медленный «наезд камеры», чтобы картинка жила
const Camera: React.FC<{
  dur: number;
  from?: number;
  to?: number;
  children: React.ReactNode;
}> = ({ dur, from = 1, to = 1.07, children }) => {
  const f = useCurrentFrame();
  const sc = interpolate(f, [0, dur], [from, to]);
  return (
    <AbsoluteFill
      style={{ transform: `scale(${sc})`, transformOrigin: "50% 45%" }}
    >
      {children}
    </AbsoluteFill>
  );
};

const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg
    viewBox="0 0 1080 1920"
    width={1080}
    height={1920}
    style={{ position: "absolute" }}
  >
    {children}
  </svg>
);

const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,.55) 100%)",
    }}
  />
);

const Whoosh: React.FC = () => (
  <Audio src={staticFile("sfx/whoosh.wav")} volume={0.5} />
);

// ——— Сцены ————————————————————————————————————————————————————————
const sec = (s: number) => Math.round(s * FPS);

// 0. Завязка: человек с телефоном выбирает дом
const INTRO = 6.5;
const Intro: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Camera dur={sec(INTRO)}>
        <Svg>
          <Sky />
          <Forest y={1080} shift={f * 0.6} />
          <House x={330} y={1080} />
          <Car x={760} y={1150} />
          <Man x={600} y={1110} phone />
        </Svg>
        <Plate x={330} y={560} text="МОДУЛЬНЫЙ ДОМ · 6×9" delay={sec(2.6)} />
      </Camera>
      <Vignette />
      <Tape num="!" text="3 ОШИБКИ ПОКУПАТЕЛЯ" />
      <Whoosh />
      <Captions
        phrases={[
          ["ВЫ РЕШИЛИ КУПИТЬ / $МОДУЛЬНЫЙ $ДОМ", 0.3, 3.0],
          ["ВОТ 3 ОШИБКИ, / КОТОРЫЕ СТОЯТ / ^ДОРОГО", 3.1, 6.5],
        ]}
      />
    </AbsoluteFill>
  );
};

// 1. Не смотри только на цену → разрез стены
const M1 = 10;
const Mistake1: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cut = sec(5.4); // со стены — на разрез
  const temp = Math.round(
    interpolate(f, [sec(2.4), sec(4.8)], [22, 12], clamp),
  );
  const wall = spring({ frame: f - cut, fps, config: { damping: 15 } });
  return (
    <AbsoluteFill>
      {f < cut ? (
        <Camera dur={cut} from={1.02} to={1.1}>
          <Svg>
            <Sky />
            <Forest y={1080} />
            <House x={290} y={1080} s={0.82} cheap />
            <House x={800} y={1080} s={0.82} lit={1} />
            <Snow />
            {/* сквозняк в дешёвом доме */}
            {[0, 1, 2].map((i) => {
              const p = ((f + i * 12) % 36) / 36;
              return (
                <path
                  key={i}
                  d={`M${60 + p * 160},${860 + i * 40} q30,-20 60,0 t60,0`}
                  stroke="#9fd0ff"
                  strokeWidth={6}
                  fill="none"
                  opacity={f > sec(2.2) ? 1 - p : 0}
                />
              );
            })}
          </Svg>
          <Plate x={290} y={620} text="ДЕШЕВЛЕ" color="#8a2f2a" delay={6} />
          <Plate x={800} y={620} text="ДОРОЖЕ" delay={14} />
          {f > sec(2.2) && (
            <Plate x={290} y={1035} text={`В ДОМЕ +${temp}°`} color="#2b5d8a" />
          )}
        </Camera>
      ) : (
        <AbsoluteFill style={{ background: "#1d2030" }}>
          <Svg>
            <g
              transform={`translate(540,700) scale(${0.6 + 0.4 * wall})`}
              opacity={wall}
            >
              {/* слои стены в разрезе: обшивка, ветрозащита, утеплитель + каркас, пароизоляция, отделка */}
              <rect x={-420} y={-330} width={110} height={660} fill={C.wall} />
              {new Array(14).fill(0).map((_, i) => (
                <line
                  key={i}
                  x1={-420}
                  x2={-310}
                  y1={-330 + i * 48}
                  y2={-330 + i * 48}
                  stroke={C.plank}
                  strokeWidth={4}
                />
              ))}
              <rect x={-310} y={-330} width={22} height={660} fill="#5b88b5" />
              <rect x={-288} y={-330} width={420} height={660} fill="#e9c35a" />
              {new Array(12).fill(0).map((_, i) => (
                <path
                  key={i}
                  d={`M-288,${-330 + i * 55} q105,28 210,0 t210,0`}
                  stroke="#c99e33"
                  strokeWidth={5}
                  fill="none"
                />
              ))}
              {[-288, -78, 92].map((x) => (
                <rect
                  key={x}
                  x={x}
                  y={-330}
                  width={40}
                  height={660}
                  fill="#d8b182"
                  stroke="#a87e4f"
                  strokeWidth={3}
                />
              ))}
              <rect x={132} y={-330} width={18} height={660} fill="#8a8f99" />
              <rect x={150} y={-330} width={60} height={660} fill="#efe3cf" />
            </g>
          </Svg>
          <Sequence from={cut}>
            <Plate x={250} y={330} text="ОБШИВКА" delay={10} />
            <Plate
              x={500}
              y={700}
              text="УТЕПЛИТЕЛЬ"
              delay={22}
              color="#9a7a1c"
            />
            <Plate x={760} y={330} text="КАРКАС" delay={34} />
          </Sequence>
        </AbsoluteFill>
      )}
      <Vignette />
      <Tape num="1." text="НЕ ВЫБИРАЙ ПО ЦЕНЕ" />
      <Whoosh />
      <Captions
        phrases={[
          ["^ДЕШЁВЫЙ ДОМ", 0.3, 2.3],
          ["ЗИМОЙ ОКАЖЕТСЯ / ^САМЫМ ^ДОРОГИМ", 2.4, 5.3],
          ["СПРОСИТЕ, / ЧТО $ВНУТРИ $СТЕНЫ", 5.5, 8.0],
          ["И ПОПРОСИТЕ / ~ПОКАЗАТЬ ~РАЗРЕЗ", 8.1, 10],
        ]}
      />
    </AbsoluteFill>
  );
};

// 2. Переписка: «можно приехать на производство?» → «только по фото»
const M2 = 10;
const Bubble: React.FC<{
  at: number;
  me?: boolean;
  children: React.ReactNode;
}> = ({ at, me, children }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - at, fps, config: { damping: 14 } });
  if (f < at) return null;
  return (
    <div
      style={{
        alignSelf: me ? "flex-end" : "flex-start",
        maxWidth: 520,
        background: me ? "#3d6bd6" : "#23262f",
        color: "#fff",
        fontFamily: body,
        fontWeight: 700,
        fontSize: 32,
        lineHeight: 1.2,
        padding: "14px 22px",
        borderRadius: 22,
        transform: `scale(${s})`,
        transformOrigin: me ? "100% 100%" : "0% 100%",
      }}
    >
      {children}
    </div>
  );
};

const Mistake2: React.FC = () => {
  const f = useCurrentFrame();
  const typing = f > sec(5.2) && f < sec(6.6);
  const red = spring({
    frame: f - sec(6.9),
    fps: FPS,
    config: { damping: 10 },
  });
  return (
    <AbsoluteFill style={{ background: "#07080b" }}>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 300 }}>
        <div
          style={{
            width: 760,
            height: 810,
            borderRadius: 60,
            border: "10px solid #2b2e36",
            background: "#0b0d12",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "26px 34px",
              borderBottom: "2px solid #22252d",
              fontFamily: body,
              fontWeight: 700,
              fontSize: 38,
              color: "#fff",
            }}
          >
            Продавец домов
            <div style={{ fontSize: 26, color: "#7d8390", fontWeight: 600 }}>
              {typing ? "печатает…" : "был(а) недавно"}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              padding: 24,
            }}
          >
            <Bubble at={sec(0.4)}>
              <svg
                viewBox="0 0 440 230"
                width={380}
                height={199}
                style={{ borderRadius: 14, display: "block" }}
              >
                <rect width={440} height={230} fill="#8fc6ef" />
                <rect y={170} width={440} height={60} fill="#7dc070" />
                <House x={220} y={185} s={0.45} />
              </svg>
              <div style={{ marginTop: 10 }}>Вот ваш будущий дом!</div>
            </Bubble>
            <Bubble at={sec(2.6)} me>
              Можно приехать на производство и посмотреть?
            </Bubble>
            <Bubble at={sec(6.6)}>Сейчас никак. Только по фото</Bubble>
          </div>
        </div>
      </AbsoluteFill>
      {f > sec(6.9) && (
        <div
          style={{
            position: "absolute",
            left: 540,
            top: 900,
            transform: `translate(-50%,-50%) rotate(-8deg) scale(${red})`,
            border: `8px solid ${C.red}`,
            color: C.red,
            fontFamily: head,
            fontWeight: 900,
            fontSize: 70,
            padding: "8px 30px",
            borderRadius: 16,
            background: "rgba(10,10,12,.7)",
          }}
        >
          ТРЕВОЖНЫЙ ЗНАК
        </div>
      )}
      <Tape num="2." text="ПОСМОТРИ ДОМ ВЖИВУЮ" />
      <Whoosh />
      <Captions
        phrases={[
          ["КАРТИНКА / В ТЕЛЕФОНЕ —", 0.3, 2.5],
          ["ЭТО ЕЩЁ / ~НЕ ~ДОМ", 2.6, 5.0],
          ["НЕ ЗОВУТ / НА ^ПРОИЗВОДСТВО?", 5.1, 7.6],
          ["ЗНАЧИТ, / ЕСТЬ ЧТО $СКРЫВАТЬ", 7.7, 10],
        ]}
      />
    </AbsoluteFill>
  );
};

// 3. Доставка: модуль привезли, а машина не проходит к участку
const M3 = 9;
const Mistake3: React.FC = () => {
  const f = useCurrentFrame();
  const stop = sec(2.6);
  const x = interpolate(f, [0, stop], [-250, 470], {
    ...clamp,
    easing: (t) => 1 - (1 - t) ** 3,
  });
  const shake = f > stop && f < stop + 10 ? Math.sin(f * 2.5) * 6 : 0;
  return (
    <AbsoluteFill>
      <Camera dur={sec(M3)} from={1} to={1.08}>
        <Svg>
          <Sky />
          <Forest y={1080} />
          {/* узкий проезд между столбами и канава с грязью */}
          <ellipse cx={720} cy={1130} rx={170} ry={34} fill="#1a1612" />
          <rect x={760} y={760} width={34} height={340} fill="#4a3a2c" />
          <rect x={980} y={760} width={34} height={340} fill="#4a3a2c" />
          <rect x={760} y={760} width={254} height={22} fill="#4a3a2c" />
          <Truck x={x} y={1140} shake={shake} />
        </Svg>
        {f > stop && (
          <Plate x={850} y={660} text="ПРОЕЗД 2,5 М" color="#8a2f2a" />
        )}
        {f > stop + 15 && (
          <Plate x={430} y={700} text="МОДУЛЬ · 3,2 М" delay={stop + 15} />
        )}
      </Camera>
      <Vignette />
      <Tape num="3." text="ПРОВЕРЬ ПОДЪЕЗД" />
      <Whoosh />
      <Captions
        phrases={[
          ["ДОМ ПРИВЕЗЛИ…", 0.3, 2.6],
          ["А МАШИНА / ^НЕ ^ПРОЕХАЛА", 2.7, 5.4],
          ["ПОДЪЕЗД И ФУНДАМЕНТ / $ОБСУДИТЕ $ДО / ДОГОВОРА", 5.5, 9],
        ]}
      />
    </AbsoluteFill>
  );
};

// 4. Финал: приглашение на День открытых дверей
const OUTRO = 10;
const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lit = interpolate(f, [sec(0.5), sec(1.5)], [0, 1], clamp);
  const logo = spring({ frame: f - sec(6.6), fps, config: { damping: 14 } });
  return (
    <AbsoluteFill>
      <Camera dur={sec(OUTRO)} from={1.08} to={1}>
        <Svg>
          <Sky moon={false} />
          <Forest y={1080} />
          <House x={540} y={1080} s={1.15} lit={lit} />
          {[0, 1, 2].map((i) => (
            <Man
              key={i}
              x={interpolate(
                f,
                [0, sec(OUTRO)],
                [-120 - i * 140, 330 - i * 140],
              )}
              y={1180 + i * 12}
              s={0.55}
              walk={f / 4 + i}
              color={["#2a2f45", "#4a2f3a", "#2f4a3a"][i]}
            />
          ))}
        </Svg>
      </Camera>
      <Vignette />
      <Tape num="!" text="ДЕНЬ ОТКРЫТЫХ ДВЕРЕЙ" />
      <Whoosh />
      {f > sec(6.6) && (
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 420 }}>
          <Img
            src={staticFile("logo.png")}
            style={{
              width: 560,
              opacity: logo,
              transform: `scale(${0.8 + 0.2 * logo})`,
            }}
          />
        </AbsoluteFill>
      )}
      <Captions
        phrases={[
          ["ВСЁ ЭТО / ПОКАЖЕМ $ВЖИВУЮ", 0.3, 3.0],
          ["$8 $НОЯБРЯ / В 12:00", 3.1, 6.4],
          ["ЗАПИСЬ — / $ССЫЛКА В ПРОФИЛЕ", 6.5, 10],
        ]}
      />
      <Sequence from={sec(6.6)}>
        <div
          style={{
            position: "absolute",
            top: 560,
            width: "100%",
            textAlign: "center",
            fontFamily: body,
            fontWeight: 700,
            fontSize: 36,
            color: "#e9e2cc",
            opacity: logo,
          }}
        >
          производство · Каменск-Уральский
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};

export const FACELESS_TOTAL = sec(INTRO + M1 + M2 + M3 + OUTRO);

export const Faceless: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Series>
      <Series.Sequence durationInFrames={sec(INTRO)}>
        <Intro />
      </Series.Sequence>
      <Series.Sequence durationInFrames={sec(M1)}>
        <Mistake1 />
      </Series.Sequence>
      <Series.Sequence durationInFrames={sec(M2)}>
        <Mistake2 />
      </Series.Sequence>
      <Series.Sequence durationInFrames={sec(M3)}>
        <Mistake3 />
      </Series.Sequence>
      <Series.Sequence durationInFrames={sec(OUTRO)}>
        <Outro />
      </Series.Sequence>
    </Series>
    <Audio src={staticFile("sfx/pad.wav")} volume={0.55} />
  </AbsoluteFill>
);
