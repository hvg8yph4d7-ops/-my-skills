// Утренний выпуск новостей 22.10.2026 — нарисованная ведущая в студии, карточки новостей, бегущая строка.
import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { FPS } from "./Promo"; // там же подключаются шрифты Montserrat/Manrope

const head = "Montserrat";
const body = "Manrope";

const RED = "#E8322E";
const NAVY = "#0E1B33";
const SKY1 = "#FFB98A";
const SKY2 = "#7FB2E5";

type Story = { tag: string; title: string; text: string; src: string };

// Новости 22 октября 2026 (по данным СМИ; источники — в описании ролика)
const STORIES: Story[] = [
  {
    tag: "ПЕРЕГОВОРЫ",
    title: "Москва готова вернуться к переговорам",
    text: "Ушаков: трёхсторонние переговоры с США и Украиной могут возобновиться в ноябре",
    src: "Известия",
  },
  {
    tag: "КРЕМЛЬ",
    title: "Письменных планов не передавали",
    text: "Песков: Путин не передавал Уиткоффу письменных планов по урегулированию",
    src: "Mail.ru",
  },
  {
    tag: "США",
    title: "Трамп: новых санкций не будет",
    text: "По словам президента США, стороны приблизились к соглашению по Украине",
    src: "Mail.ru",
  },
  {
    tag: "ПОДМОСКОВЬЕ",
    title: "Ночная атака беспилотников",
    text: "Собянин: двое пострадавших, им оказывают помощь. ПВО сбивало дроны всю ночь",
    src: "Известия",
  },
  {
    tag: "ОБМЕН",
    title: "Обмен телами погибших",
    text: "Россия и Украина провели обмен в формате «252 на 25» — сообщил Шамсаил Саралиев",
    src: "Известия",
  },
  {
    tag: "ПРОИСШЕСТВИЯ",
    title: "ДТП под Тобольском",
    text: "На трассе Тюмень — Ханты-Мансийск в аварии погибли семь человек",
    src: "Mail.ru",
  },
];

const INTRO = Math.round(3.2 * FPS);
const STORY = Math.round(4.6 * FPS);
const OUTRO = Math.round(3.4 * FPS);
export const NEWS_TOTAL = INTRO + STORIES.length * STORY + OUTRO;

/* ---------------- Студия: утреннее окно с городом ---------------- */
const Studio: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, NEWS_TOTAL], [0, -60]);
  return (
    <AbsoluteFill style={{ background: NAVY }}>
      {/* окно */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 1120,
          background: `linear-gradient(180deg, ${SKY2} 0%, #C9D9EE 45%, ${SKY1} 100%)`,
          overflow: "hidden",
        }}
      >
        {/* солнце */}
        <div style={{ position: "absolute", left: 760, top: 610 + drift * 0.5, width: 190, height: 190, borderRadius: 95, background: "#FFE2A8", boxShadow: "0 0 120px 60px rgba(255,210,150,.6)" }} />
        {/* дальний город */}
        <svg width={1300} height={520} viewBox="0 0 1300 520" style={{ position: "absolute", left: drift, bottom: 0 }}>
          {Array.from({ length: 22 }, (_, i) => {
            const w = 50 + ((i * 37) % 50);
            const h = 160 + ((i * 71) % 220);
            const x = i * 60;
            return <rect key={i} x={x} y={520 - h} width={w} height={h} fill="#8FA3C2" opacity={0.75} />;
          })}
          {/* башня-шпиль */}
          <path d="M640 520 V170 L660 60 L680 170 V520 Z" fill="#7C91B3" />
          {Array.from({ length: 14 }, (_, i) => {
            const w = 80 + ((i * 29) % 60);
            const h = 90 + ((i * 53) % 150);
            return <rect key={`n${i}`} x={i * 95 - 20} y={520 - h} width={w} height={h} fill="#5E7396" />;
          })}
        </svg>
        {/* переплёт окна */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 49.6%, rgba(14,27,51,.85) 49.6% 50.4%, transparent 50.4%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 470, height: 16, background: "rgba(14,27,51,.85)" }} />
      </div>
      {/* стол */}
      <div style={{ position: "absolute", left: -40, right: -40, top: 1040, height: 140, background: "linear-gradient(180deg,#F2F5FA,#C9D2E0)", borderRadius: "30px 30px 0 0", boxShadow: "0 -10px 40px rgba(0,0,0,.25)" }} />
      <div style={{ position: "absolute", left: 360, top: 1068, width: 360, height: 60, borderRadius: 12, background: NAVY, color: "#fff", fontFamily: head, fontWeight: 900, fontSize: 34, display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: 3 }}>
        УТРО · 22.10
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- Нарисованная ведущая ---------------- */
const Anchor: React.FC<{ talking: boolean }> = ({ talking }) => {
  const frame = useCurrentFrame();
  // моргание раз в ~3,3 с
  const blinkPhase = frame % 100;
  const eyeH = blinkPhase > 95 ? 1.5 : 11;
  // речь: рот открывается неровно
  const mouth = talking ? 4 + Math.abs(Math.sin(frame * 0.9) * 9 + Math.sin(frame * 0.37) * 5) : 3;
  const bob = Math.sin(frame / 22) * 4;
  const tilt = Math.sin(frame / 40) * 1.6;
  const hand = talking ? Math.sin(frame / 9) * 6 : 0;
  return (
    <svg
      viewBox="0 0 600 800"
      width={720}
      height={960}
      style={{ position: "absolute", left: 180, top: 230, transform: `translateY(${bob}px) rotate(${tilt}deg)`, transformOrigin: "50% 90%" }}
    >
      <defs>
        <linearGradient id="hair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5B3A26" />
          <stop offset="1" stopColor="#3A2417" />
        </linearGradient>
        <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F6D3BE" />
          <stop offset="1" stopColor="#EBBFA6" />
        </linearGradient>
        <linearGradient id="blazer" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E8322E" />
          <stop offset="1" stopColor="#B8211E" />
        </linearGradient>
      </defs>
      {/* волосы сзади */}
      <path d="M170 210 Q150 420 190 560 L410 560 Q450 420 430 210 Q300 120 170 210 Z" fill="url(#hair)" />
      {/* шея */}
      <path d="M262 330 h76 v80 q-38 22 -76 0 z" fill="#E6B79C" />
      {/* блуза и жакет */}
      <path d="M120 800 Q130 470 230 420 L300 470 L370 420 Q470 470 480 800 Z" fill="url(#blazer)" />
      <path d="M262 405 L300 470 L338 405 L300 395 Z" fill="#F7F3EE" />
      <path d="M230 420 L300 560 L260 800 L200 800 Q215 600 230 420 Z" fill="#C42723" opacity={0.6} />
      <path d="M370 420 L300 560 L340 800 L400 800 Q385 600 370 420 Z" fill="#C42723" opacity={0.6} />
      {/* микрофон-петличка */}
      <circle cx={262} cy={500} r={7} fill="#222" />
      {/* голова */}
      <ellipse cx={300} cy={250} rx={92} ry={112} fill="url(#skin)" />
      {/* чёлка и пряди */}
      <path d="M205 240 Q210 140 300 132 Q395 135 398 245 Q370 175 300 172 Q250 175 205 240 Z" fill="url(#hair)" />
      <path d="M208 230 Q190 330 205 420 Q225 330 222 250 Z" fill="url(#hair)" />
      <path d="M392 230 Q412 330 396 430 Q378 330 380 250 Z" fill="url(#hair)" />
      {/* брови */}
      <path d="M245 220 q22 -12 44 -2" stroke="#4A2E1F" strokeWidth={6} fill="none" strokeLinecap="round" />
      <path d="M312 218 q22 -10 44 2" stroke="#4A2E1F" strokeWidth={6} fill="none" strokeLinecap="round" />
      {/* глаза */}
      <ellipse cx={267} cy={248} rx={13} ry={eyeH} fill="#2C1C14" />
      <ellipse cx={334} cy={248} rx={13} ry={eyeH} fill="#2C1C14" />
      {eyeH > 5 ? (
        <>
          <circle cx={271} cy={244} r={3.5} fill="#fff" />
          <circle cx={338} cy={244} r={3.5} fill="#fff" />
        </>
      ) : null}
      <path d="M250 236 q17 -10 34 0" stroke="#2C1C14" strokeWidth={3.5} fill="none" />
      <path d="M317 236 q17 -10 34 0" stroke="#2C1C14" strokeWidth={3.5} fill="none" />
      {/* нос и румянец */}
      <path d="M300 262 q-8 26 2 34" stroke="#D9A08A" strokeWidth={4} fill="none" strokeLinecap="round" />
      <ellipse cx={248} cy={292} rx={20} ry={11} fill="#F0A99A" opacity={0.45} />
      <ellipse cx={352} cy={292} rx={20} ry={11} fill="#F0A99A" opacity={0.45} />
      {/* рот */}
      <path d={`M276 318 Q300 ${318 + mouth} 324 318 Q300 ${322 + mouth * 0.25} 276 318 Z`} fill="#B5413F" />
      {talking ? <path d={`M282 320 Q300 ${319 + mouth * 0.8} 318 320`} fill="#7A2422" /> : null}
      {/* серьги */}
      <circle cx={208} cy={300} r={6} fill="#F2D27A" />
      <circle cx={392} cy={300} r={6} fill="#F2D27A" />
      {/* руки на столе с листами */}
      <g transform={`translate(0 ${hand})`}>
        <ellipse cx={210} cy={790} rx={46} ry={24} fill="#EBBFA6" />
        <rect x={250} y={760} width={170} height={60} rx={6} fill="#fff" transform="rotate(-6 335 790)" />
        <ellipse cx={420} cy={792} rx={46} ry={24} fill="#EBBFA6" />
      </g>
    </svg>
  );
};

/* ---------------- Плашки ---------------- */
const LiveBadge: React.FC = () => {
  const frame = useCurrentFrame();
  const on = Math.floor(frame / 18) % 2 === 0;
  return (
    <div style={{ position: "absolute", top: 120, left: 60, display: "flex", gap: 14, alignItems: "center" }}>
      <div style={{ background: RED, color: "#fff", fontFamily: head, fontWeight: 900, fontSize: 34, padding: "10px 22px", borderRadius: 10, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 16, height: 16, borderRadius: 8, background: on ? "#fff" : "rgba(255,255,255,.3)" }} />
        УТРЕННИЙ ВЫПУСК
      </div>
      <div style={{ background: "rgba(14,27,51,.85)", color: "#fff", fontFamily: head, fontWeight: 800, fontSize: 30, padding: "12px 20px", borderRadius: 10 }}>22 ОКТЯБРЯ 2026</div>
    </div>
  );
};

const StoryCard: React.FC<{ s: Story; n: number }> = ({ s, n }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 14, mass: 0.6 } });
  const textP = interpolate(frame, [8, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const out = interpolate(frame, [STORY - 8, STORY], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 1210, transform: `translateX(${(1 - p) * -900}px)`, opacity: out }}>
      <div style={{ display: "flex", gap: 0 }}>
        <div style={{ background: RED, color: "#fff", fontFamily: head, fontWeight: 900, fontSize: 30, padding: "10px 22px", borderRadius: "14px 0 0 0" }}>{n}/{STORIES.length}</div>
        <div style={{ background: "#fff", color: RED, fontFamily: head, fontWeight: 900, fontSize: 30, padding: "10px 22px", borderRadius: "0 14px 0 0", letterSpacing: 2 }}>{s.tag}</div>
      </div>
      <div style={{ background: "rgba(255,255,255,.97)", borderRadius: "0 22px 22px 22px", padding: "28px 34px 26px", boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
        <div style={{ fontFamily: head, fontWeight: 900, fontSize: 58, lineHeight: 1.08, color: NAVY }}>{s.title}</div>
        <div style={{ marginTop: 16, fontFamily: body, fontWeight: 600, fontSize: 38, lineHeight: 1.3, color: "#3A4458", opacity: textP }}>{s.text}</div>
        <div style={{ marginTop: 14, fontFamily: body, fontWeight: 600, fontSize: 26, color: "#8A93A6", opacity: textP }}>Источник: {s.src}</div>
      </div>
    </div>
  );
};

const Ticker: React.FC = () => {
  const frame = useCurrentFrame();
  const line = STORIES.map((s) => `${s.tag}: ${s.title}`).join("   •   ");
  const x = -((frame * 5) % 4200);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 150, height: 70, background: NAVY, overflow: "hidden", display: "flex", alignItems: "center" }}>
      <div style={{ position: "absolute", left: 0, zIndex: 2, height: 70, padding: "0 22px", background: RED, color: "#fff", fontFamily: head, fontWeight: 900, fontSize: 30, display: "flex", alignItems: "center" }}>
        НОВОСТИ
      </div>
      <div style={{ whiteSpace: "nowrap", transform: `translateX(${x + 230}px)`, color: "#fff", fontFamily: body, fontWeight: 700, fontSize: 30 }}>
        {line}   •   {line}   •   {line}
      </div>
    </div>
  );
};

const IntroTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - 4, fps, config: { damping: 12 } });
  const out = interpolate(frame, [INTRO - 8, INTRO], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 1230, opacity: out, transform: `scale(${0.7 + p * 0.3})` }}>
      <div style={{ background: RED, color: "#fff", fontFamily: head, fontWeight: 900, fontSize: 92, lineHeight: 1, padding: "26px 34px", borderRadius: 22, textAlign: "center" }}>
        ДОБРОЕ УТРО!
      </div>
      <div style={{ marginTop: 18, background: "#fff", color: NAVY, fontFamily: head, fontWeight: 800, fontSize: 44, padding: "18px 30px", borderRadius: 18, textAlign: "center" }}>
        Главное в России за 22 октября
      </div>
    </div>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 12 } });
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 1230, transform: `scale(${0.7 + p * 0.3})`, opacity: p }}>
      <div style={{ background: "#fff", color: NAVY, fontFamily: head, fontWeight: 900, fontSize: 64, padding: "26px 30px", borderRadius: 22, textAlign: "center", lineHeight: 1.1 }}>
        Хорошего дня!
        <div style={{ fontFamily: body, fontWeight: 600, fontSize: 34, color: "#5A6478", marginTop: 12 }}>Подписывайтесь — новости каждое утро</div>
      </div>
    </div>
  );
};

/* ---------------- Сборка ---------------- */
export const NewsMorning: React.FC = () => {
  const frame = useCurrentFrame();
  const talking = frame > 10 && frame < NEWS_TOTAL - 20 && Math.floor(frame / 45) % 4 !== 3;
  // лёгкий наезд камеры на каждой новости
  const local = (frame - INTRO) % STORY;
  const z = frame < INTRO ? 1 : interpolate(local, [0, STORY], [1.0, 1.05]);
  return (
    <AbsoluteFill style={{ background: NAVY }}>
      <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: "50% 30%" }}>
        <Studio />
        <Anchor talking={talking} />
      </AbsoluteFill>
      <LiveBadge />
      <Sequence durationInFrames={INTRO}>
        <IntroTitle />
      </Sequence>
      {STORIES.map((s, i) => (
        <Sequence key={i} from={INTRO + i * STORY} durationInFrames={STORY}>
          <StoryCard s={s} n={i + 1} />
        </Sequence>
      ))}
      <Sequence from={INTRO + STORIES.length * STORY}>
        <Outro />
      </Sequence>
      <Ticker />
    </AbsoluteFill>
  );
};
