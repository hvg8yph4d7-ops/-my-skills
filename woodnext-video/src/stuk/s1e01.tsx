// «Сезон закрыт», серия 1 — «Последний автобус».
import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { EpisodeDef } from "./Episode";
import { Bus, C, Camera, clamp, Dacha, Dog, EndCard, Fence, Forest, Man, Mood, Plate, Sfx, Sky, Svg } from "./kit";
import timing from "./timing/s1e01.json";

// Свет в окне: мигает при включении, гаснет резко
const useLight = (on: number, off = Infinity) => {
  const f = useCurrentFrame();
  if (f < on || f >= off) return 0;
  if (f < on + 8) return random(`lt${f}`) > 0.5 ? 1 : 0.2;
  return 0.93 + random(`lf${Math.floor(f / 3)}`) * 0.07;
};

// 1. Улица дачного посёлка: у Ковалёвых загорается свет
const Street: React.FC<{ at: (i: number) => number; dur: number }> = ({ at, dur }) => {
  const lightOn = at(1) + 22;
  const lit = useLight(lightOn);
  return (
    <AbsoluteFill>
      <Camera dur={dur} from={1} to={1.08} ox="70%">
        <Svg>
          <Sky />
          <Forest y={1040} />
          <Dacha x={270} y={1040} s={0.85} wall="#4c3d31" />
          <Dacha x={790} y={1040} s={0.9} lit={lit} />
          <Fence y={1110} />
        </Svg>
        <Plate x={790} y={560} text="ДОМ КОВАЛЁВЫХ" delay={12} />
      </Camera>
      <Mood />
      <Sfx src="click.wav" at={lightOn} volume={0.8} />
    </AbsoluteFill>
  );
};

// 2. Остановка: уходит последний автобус
const BusStop: React.FC<{ at: (i: number) => number; dur: number }> = ({ at, dur }) => {
  const f = useCurrentFrame();
  const go = at(4) + 10;
  const bx = interpolate(f, [go, go + 75], [430, -420], { ...clamp, easing: (t) => t * t });
  return (
    <AbsoluteFill>
      <Camera dur={dur} from={1.04} to={1}>
        <Svg>
          <Sky dusk moon={false} />
          <Forest y={1060} />
          <rect x={0} y={1060} width={1080} height={120} fill="#25221e" />
          <rect x={960} y={760} width={10} height={300} fill="#555" />
          <rect x={900} y={740} width={130} height={60} rx={6} fill="#2f5f9f" />
          <text x={965} y={782} textAnchor="middle" fontSize={36} fontWeight={800} fill="#fff" fontFamily="Montserrat">
            A
          </text>
          <Bus x={bx} y={1120} />
          <Man x={830} y={1120} s={0.62} bag />
        </Svg>
        {f > go && <Plate x={540} y={600} text="15 ОКТЯБРЯ · ПОСЛЕДНИЙ РЕЙС" color="#7a2c26" />}
      </Camera>
      <Mood />
      <Sfx src="whoosh.mp3" at={go} volume={0.6} />
    </AbsoluteFill>
  );
};

// Вид из окна на дом Ковалёвых (используется в комнате и в телефоне)
const Outside: React.FC<{ lit: number; eyes?: boolean }> = ({ lit, eyes }) => (
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

// 3. Комната: тишина, потом собака рычит на окно
const Room: React.FC<{ at: (i: number) => number; dur: number }> = ({ at, dur }) => {
  const f = useCurrentFrame();
  const growl = at(7) + 18;
  const alert = interpolate(f, [growl - 6, growl + 6], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <Camera dur={dur} from={1} to={1.06} shake={f > growl && f < growl + 40 ? 5 : 0}>
        <Svg>
          <rect width={1080} height={1920} fill="#101118" />
          <defs>
            <clipPath id="win">
              <rect x={240} y={330} width={600} height={620} />
            </clipPath>
          </defs>
          <g clipPath="url(#win)">
            <g transform="translate(240,330) scale(0.5555) translate(0,-160)">
              <Outside lit={0} />
            </g>
          </g>
          <rect x={240} y={330} width={600} height={620} fill="none" stroke="#3a2f27" strokeWidth={26} />
          <line x1={540} x2={540} y1={330} y2={950} stroke="#3a2f27" strokeWidth={16} />
          <line x1={240} x2={840} y1={600} y2={600} stroke="#3a2f27" strokeWidth={16} />
          <rect x={210} y={950} width={660} height={26} fill="#3a2f27" />
          <path d="M150,290 q60,340 20,700 l-80,0 l0,-700 z" fill="#3b1f24" />
          <path d="M930,290 q-60,340 -20,700 l80,0 l0,-700 z" fill="#3b1f24" />
          <rect x={0} y={1080} width={1080} height={840} fill="#1a1512" />
          {new Array(9).fill(0).map((_, i) => (
            <line key={i} x1={0} x2={1080} y1={1080 + i * 50} y2={1080 + i * 50} stroke="#120e0c" strokeWidth={4} />
          ))}
          <Dog x={600} y={1110} s={0.9} alert={alert} />
        </Svg>
        {f > at(6) && f < growl && <Plate x={540} y={250} text="НОЧЬ 1 · НОЧЬ 2 · НОЧЬ 3" color="#2b3a5a" />}
        {f >= growl && <Plate x={540} y={250} text="НОЧЬ 4" color="#7a2c26" />}
      </Camera>
      <Mood />
      <Sfx src="growl.mp3" at={growl} volume={1} />
    </AbsoluteFill>
  );
};

// Телефон в руке: камера снимает окно напротив
const Phone: React.FC<{ lit: number; eyes: boolean; show: number }> = ({ lit, eyes, show }) => {
  const f = useCurrentFrame();
  const y = interpolate(show, [0, 1], [900, 0]);
  const secs = Math.floor(Math.max(0, f) / 30);
  return (
    <div
      style={{
        position: "absolute",
        left: 250,
        top: 300,
        width: 580,
        height: 800,
        transform: `translateY(${y}px) rotate(-3deg)`,
        borderRadius: 56,
        border: "14px solid #1c1d22",
        background: "#000",
        overflow: "hidden",
        boxShadow: "0 30px 60px rgba(0,0,0,.7)",
      }}
    >
      <svg viewBox="300 560 480 660" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <Outside lit={lit} eyes={eyes} />
      </svg>
      <div style={{ position: "absolute", top: 26, left: 26, display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            background: C.red,
            opacity: Math.floor(f / 15) % 2 ? 1 : 0.25,
          }}
        />
        <span style={{ color: "#fff", fontFamily: "Manrope", fontWeight: 700, fontSize: 30 }}>
          REC 00:{String(secs).padStart(2, "0")}
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          inset: 120,
          border: "3px solid rgba(255,255,255,.5)",
          borderRadius: 12,
        }}
      />
    </div>
  );
};

// 4. Свет у Ковалёвых: пломба, телефон, свет гаснет
const Window: React.FC<{ at: (i: number) => number; dur: number }> = ({ at, dur }) => {
  const f = useCurrentFrame();
  const off = at(11) + 12;
  const lit = useLight(-20, off);
  const show = interpolate(f, [at(10), at(10) + 12], [0, 1], clamp);
  const eyes = f > at(12) + 26 && f < at(12) + 36; // заметно только при пересмотре
  return (
    <AbsoluteFill>
      <Camera dur={dur} from={1} to={1.18} oy="44%">
        <Svg>
          <Outside lit={lit} />
        </Svg>
        {f > at(9) && f < at(10) && <Plate x={540} y={1060} text="СЧЁТЧИК ОПЛОМБИРОВАН" color="#7a2c26" />}
      </Camera>
      {show > 0 && <Phone lit={lit} eyes={eyes} show={show} />}
      <Mood />
      <Sfx src="click.wav" at={off} volume={0.9} />
      <Sfx src="hit.mp3" at={off} volume={0.9} />
    </AbsoluteFill>
  );
};

export const S1E01: EpisodeDef = {
  id: "s1e01",
  timing,
  captions: [
    "КОВАЛЁВЫ УЕХАЛИ / ЕЩЁ В $СЕНТЯБРЕ",
    "А ВЧЕРА НОЧЬЮ / У НИХ ^ЗАГОРЕЛСЯ ^СВЕТ",
    "МЕНЯ ЗОВУТ $МАКС",
    "Я РЕШИЛ ОСТАТЬСЯ / НА ДАЧЕ $НА $ВСЮ $ЗИМУ",
    "15 ОКТЯБРЯ УШЁЛ / ~ПОСЛЕДНИЙ ~АВТОБУС",
    "НИКОГО. ТОЛЬКО Я / И СОБАКА $НАЙДА",
    "ПЕРВЫЕ ТРИ НОЧИ / БЫЛО ~ТИХО",
    "А НА ЧЕТВЁРТУЮ / НАЙДА ^ЗАРЫЧАЛА / НА ОКНО",
    "У КОВАЛЁВЫХ / ^ГОРЕЛ ^СВЕТ",
    "НО ЭЛЕКТРИЧЕСТВО / У НИХ ^ОТКЛЮЧЕНО",
    "Я ДОСТАЛ ТЕЛЕФОН, / ЧТОБЫ $СНЯТЬ",
    "И СВЕТ / ^СРАЗУ ^ПОГАС",
    "КАК БУДТО ТАМ / УВИДЕЛИ ^МЕНЯ ^ПЕРВЫМ",
    "ЧАСТЬ 2 — / $ЗАВТРА $УТРОМ",
  ],
  scenes: [
    { until: 1, tape: ["!", "СЕЗОН ЗАКРЫТ"], stamp: "ДЕНЬ 4 · 23:52", render: (at, dur) => <Street at={at} dur={dur} /> },
    { until: 4, tape: ["1.", "ПОСЛЕДНИЙ АВТОБУС"], stamp: "15 ОКТЯБРЯ · 18:40", render: (at, dur) => <BusStop at={at} dur={dur} /> },
    { until: 7, tape: ["1.", "ПОСЛЕДНИЙ АВТОБУС"], render: (at, dur) => <Room at={at} dur={dur} /> },
    { until: 12, tape: ["!", "СВЕТ У КОВАЛЁВЫХ"], stamp: "НОЧЬ 4 · 02:41", render: (at, dur) => <Window at={at} dur={dur} /> },
    { until: 13, render: () => <EndCard /> },
  ],
};
