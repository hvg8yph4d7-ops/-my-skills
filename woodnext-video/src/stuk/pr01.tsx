// «Правила» №1 — ночная смена в аптеке. Схема: вступление → окошко / рецепт / камера →
// «была лишь одна проблема» → на камере человек есть, а в окне — никого.
import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { EpisodeDef } from "./Episode";
import { C, Camera, clamp, EndCard, Mood, Pills, Sfx, Sky, Svg } from "./kit";
import timing from "./timing/pr01.json";

type P = { at: (i: number) => number; dur: number };

// Силуэт человека; hidden — лицо не видно (голова опущена/отвёрнута)
const Figure: React.FC<{ x: number; y: number; s?: number; hidden?: boolean; o?: number }> = ({ x, y, s = 1, hidden, o = 1 }) => (
  <g transform={`translate(${x},${y}) scale(${s})`} opacity={o}>
    <rect x={-70} y={-330} width={140} height={330} rx={30} fill="#0b0c10" />
    <ellipse cx={0} cy={-380} rx={56} ry={64} fill="#0b0c10" />
    {hidden ? <path d="M-60,-420 q60,-60 120,0 l0,40 q-60,-30 -120,0 z" fill="#06070a" /> : null}
  </g>
);

// Аптека снаружи: зелёный крест, ночное окошко
export const Store: React.FC<{ windowLit?: number }> = ({ windowLit = 1 }) => {
  const f = useCurrentFrame();
  const flick = 0.85 + random(`cr${Math.floor(f / 4)}`) * 0.15;
  return (
    <Svg>
      <Sky moon={false} />
      <rect x={0} y={1180} width={1080} height={740} fill="#16151a" />
      <rect x={150} y={520} width={780} height={660} fill="#2c2f3a" />
      <rect x={150} y={500} width={780} height={40} fill="#20222b" />
      <g transform="translate(540,640)" opacity={flick}>
        <circle r={110} fill="#2fd46a" opacity={0.18} />
        <rect x={-22} y={-70} width={44} height={140} fill="#35e477" />
        <rect x={-70} y={-22} width={140} height={44} fill="#35e477" />
      </g>
      <text x={540} y={810} textAnchor="middle" fontSize={56} fontWeight={900} fill="#d7e6dc" fontFamily="Montserrat" letterSpacing={6}>
        АПТЕКА 24
      </text>
      <rect x={250} y={880} width={180} height={300} fill="#1a1c24" stroke="#3b3f4d" strokeWidth={10} />
      <rect x={620} y={900} width={220} height={150} fill="#ffe7a8" opacity={windowLit} />
      <rect x={620} y={900} width={220} height={150} fill="none" stroke="#3b3f4d" strokeWidth={10} />
      <ellipse cx={730} cy={1180} rx={200} ry={30} fill="#ffe7a8" opacity={0.08 * windowLit} />
    </Svg>
  );
};

// Вид изнутри: прилавок и окошко; кто стоит снаружи
const Counter: React.FC<{ who?: "none" | "hidden" | "lean"; dark?: boolean }> = ({ who = "none", dark }) => (
  <Svg>
    <rect width={1080} height={1920} fill={dark ? "#0d0f14" : "#1b2026"} />
    <rect x={260} y={420} width={560} height={480} fill="#05060a" stroke="#4a5160" strokeWidth={18} />
    <g clipPath="url(#win)">
      <defs>
        <clipPath id="win">
          <rect x={269} y={429} width={542} height={462} />
        </clipPath>
      </defs>
      <rect x={260} y={420} width={560} height={480} fill="#10131c" />
      {who === "hidden" && <Figure x={540} y={1000} s={1.1} hidden />}
      {who === "lean" && <Figure x={540} y={1060} s={1.1} />}
    </g>
    <rect x={460} y={820} width={160} height={80} fill="#2a2f3a" stroke="#4a5160" strokeWidth={8} />
    <rect x={0} y={900} width={1080} height={110} fill="#5a606b" />
    <rect x={0} y={1010} width={1080} height={910} fill="#262a32" />
    {[120, 300, 780, 940].map((x) => (
      <rect key={x} x={x} y={940} width={60} height={60} rx={6} fill={x % 3 ? "#e15a4f" : "#4f8fe1"} />
    ))}
  </Svg>
);

// 1. Вступление
const Intro: React.FC<P> = ({ at, dur }) => (
  <AbsoluteFill>
    <Camera dur={dur} from={1} to={1.08} oy="55%">
      <Store />
    </Camera>
    <Pills
      y={400}
      items={[
        ["ПРАВИЛА — НА ОБОРОТЕ ГРАФИКА", at(1) + 10, "#2b3a5a"],
        ["СМЕНА 21:00 — 9:00", at(2)],
        ["ВЫ ОДИН", at(2) + 30, "#7a2c26"],
      ]}
    />
    <Mood />
  </AbsoluteFill>
);

// 2. Окошко
const WindowRule: React.FC<P> = ({ at, dur }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Camera dur={dur} from={1} to={1.1} oy="35%">
        <Counter who={f >= at(5) ? "hidden" : "none"} />
      </Camera>
      <Pills
        y={400}
        items={[
          ["ПОСЛЕ 00:00 — ТОЛЬКО ОКОШКО", at(4)],
          ["ЛИЦА НЕ ВИДНО → «ЗАКРЫТО»", at(5) + 20, "#7a2c26"],
        ]}
      />
      <Mood />
    </AbsoluteFill>
  );
};

// 3. Рецепт
const Recipe: React.FC<P> = ({ at, dur }) => {
  const f = useCurrentFrame();
  const cross = interpolate(f, [at(10), at(10) + 12], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: "#14161c" }}>
      <Camera dur={dur} from={1.04} to={1}>
        <div
          style={{
            position: "absolute",
            left: 210,
            top: 430,
            width: 660,
            height: 620,
            background: "#f3efe4",
            transform: "rotate(3deg)",
            boxShadow: "0 16px 40px rgba(0,0,0,.6)",
            padding: "40px 46px",
            fontFamily: "Manrope",
            color: "#2a2a2a",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 40, letterSpacing: 4 }}>РЕЦЕПТ</div>
          <div style={{ marginTop: 30, fontSize: 28, color: "#666" }}>Ф. И. О. пациента</div>
          <div style={{ fontFamily: "Caveat", fontWeight: 700, fontSize: 64, color: "#1f2a6a" }}>Тамара Ильинична</div>
          <div style={{ marginTop: 26, fontSize: 28, color: "#666" }}>Rp.:</div>
          <div style={{ fontFamily: "Caveat", fontWeight: 700, fontSize: 52, color: "#1f2a6a", filter: "blur(3px)" }}>Sol. ~~~~~~ 0,5% — 10 ml</div>
          <div style={{ position: "absolute", right: 50, bottom: 40, width: 150, height: 150, borderRadius: 75, border: "6px solid rgba(60,80,170,.6)" }} />
          <svg width={660} height={620} viewBox="0 0 660 620" style={{ position: "absolute", left: 0, top: 0 }}>
            <line x1={40} y1={40} x2={40 + 580 * cross} y2={40 + 540 * cross} stroke={C.red} strokeWidth={18} strokeLinecap="round" />
            <line x1={620} y1={40} x2={620 - 580 * cross} y2={40 + 540 * cross} stroke={C.red} strokeWidth={18} strokeLinecap="round" />
          </svg>
        </div>
      </Camera>
      <Pills
        y={400}
        items={[
          ["ОКОЛО 3:00", at(8) + 5, "#2b3a5a"],
          ["ЗАВЕДУЮЩЕЙ НЕТ С ПРОШЛОГО ГОДА", at(9) + 10, "#7a2c26"],
          ["НЕ БРАТЬ · НЕ ЧИТАТЬ", at(10) + 10],
        ]}
      />
      <Mood />
    </AbsoluteFill>
  );
};

// Монитор камеры наблюдения: серый кадр у окошка снаружи
const Monitor: React.FC<{ person: boolean; x: number; y: number; w: number }> = ({ person, x, y, w }) => {
  const f = useCurrentFrame();
  const h = w * 0.75;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, border: "14px solid #22252c", borderRadius: 12, background: "#0a0a0a", overflow: "hidden" }}>
      <svg viewBox="0 0 400 300" width="100%" height="100%" style={{ filter: "grayscale(1) contrast(1.2)" }}>
        <rect width={400} height={300} fill="#2a2d33" />
        <rect y={210} width={400} height={90} fill="#1d1f24" />
        <rect x={230} y={110} width={110} height={80} fill="#9a9c92" />
        {person && (
          <g transform="translate(240,250) scale(0.3)">
            <rect x={-70} y={-330} width={140} height={330} rx={30} fill="#050505" />
            <ellipse cx={0} cy={-380} rx={56} ry={64} fill="#050505" />
          </g>
        )}
        {new Array(30).fill(0).map((_, i) => (
          <rect key={i} x={0} y={i * 10 + (f % 10)} width={400} height={2} fill="#fff" opacity={0.05} />
        ))}
        <text x={14} y={26} fontSize={18} fill="#e8e8e8" fontFamily="monospace">
          CAM 01 · ОКОШКО
        </text>
        <text x={14} y={286} fontSize={18} fill="#e8e8e8" fontFamily="monospace">
          03:0{f > 60 ? 7 : 2}
        </text>
        <circle cx={380} cy={20} r={7} fill={Math.floor(f / 15) % 2 ? "#ff3b30" : "#5a1410"} />
      </svg>
    </div>
  );
};

// 4. Камера
const CameraRule: React.FC<P> = ({ at, dur }) => (
  <AbsoluteFill style={{ background: "#0d0f14" }}>
    <Camera dur={dur} from={1} to={1.05}>
      <Monitor person={false} x={190} y={480} w={700} />
    </Camera>
    <Pills
      y={400}
      items={[
        ["СМОТРИ В МОНИТОР", at(12)],
        ["В ОКНЕ ЕСТЬ, НА КАМЕРЕ НЕТ → НЕ ОТКРЫВАТЬ", at(13) + 10, "#7a2c26"],
      ]}
    />
    <Mood />
  </AbsoluteFill>
);

// 5. 3:07 — на камере человек, в окне никого
const Problem: React.FC<P> = ({ at, dur }) => {
  const f = useCurrentFrame();
  const show = f >= at(16) + 30;
  return (
    <AbsoluteFill style={{ background: "#0d0f14" }}>
      <Camera dur={dur} from={1} to={1.1} shake={f > at(17) && f < at(17) + 20 ? 6 : 0}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transform: "scale(0.62)", transformOrigin: "50% 0%" }}>
          <Counter who="none" dark />
        </div>
        {show && <Monitor person x={300} y={600} w={480} />}
      </Camera>
      <Pills
        y={400}
        items={[
          ["03:07 · СТУК В ОКОШКО", at(16), "#2b3a5a"],
          ["НА КАМЕРЕ — ЧЕЛОВЕК", at(17), "#7a2c26"],
          ["В ОКНЕ — НИКОГО", at(17) + 30, C.red],
        ]}
      />
      <Mood />
      <Sfx src="knock3.mp3" at={at(16) + 2} volume={0.9} />
      <Sfx src="hit.mp3" at={at(17) + 30} volume={0.9} />
    </AbsoluteFill>
  );
};

export const PR01: EpisodeDef = {
  id: "pr01",
  timing,
  captions: [
    "ЕСЛИ ВЫ УСТРОИЛИСЬ В $КРУГЛОСУТОЧНУЮ $АПТЕКУ — ВОТ ПРАВИЛА, КОТОРЫХ ВАМ ^НЕ ^СКАЖУТ",
    "МНЕ ИХ ОСТАВИЛА СМЕНЩИЦА. НА ОБОРОТЕ $ГРАФИКА",
    "СМЕНА С ДЕВЯТИ ДО ДЕВЯТИ. ВЫ $ОДИН. ОКОШКО — ЕДИНСТВЕННАЯ СВЯЗЬ С УЛИЦЕЙ",
    "ПЕРВОЕ — $ОКОШКО",
    "ПОСЛЕ ПОЛУНОЧИ ДВЕРИ ^НЕ ^ОТКРЫВАТЬ. ТОЛЬКО ОКОШКО",
    "ЕСЛИ НЕ ВИДНО ЕГО $ЛИЦА — НЕ ПОДХОДИТЕ. СКАЖИТЕ: ЗАКРЫТО НА ПРИЁМКУ",
    "ЛЮДИ ТАК ^НЕ ^СТОЯТ. ОНИ ВСЕГДА НАКЛОНЯЮТСЯ К ОКОШКУ",
    "ВТОРОЕ — $РЕЦЕПТ",
    "ОКОЛО ТРЁХ НОЧИ ПРИДЁТ ЖЕНЩИНА С РЕЦЕПТОМ НА ИМЯ $ТАМАРЫ $ИЛЬИНИЧНЫ",
    "ТАМАРА ИЛЬИНИЧНА — НАША ЗАВЕДУЮЩАЯ. ЕЁ ^НЕ ^СТАЛО В ПРОШЛОМ ГОДУ",
    "РЕЦЕПТ ^НЕ ^БРАТЬ. НЕ ЧИТАТЬ. СКАЗАТЬ, ЧТО ЛЕКАРСТВА НЕТ",
    "ТРЕТЬЕ — $КАМЕРА",
    "СМОТРИТЕ В $МОНИТОР, А НЕ В ОКНО",
    "ЕСЛИ В ОКНЕ ЧЕЛОВЕК ЕСТЬ, А НА КАМЕРЕ ЕГО НЕТ — ^НЕ ^ОТКРЫВАТЬ",
    "Я ВЫУЧИЛ ВСЕ ТРИ ПРАВИЛА. НА БУМАГЕ СМЕНА БЫЛА ~СПОКОЙНОЙ",
    "БЫЛА ЛИШЬ ^ОДНА ^ПРОБЛЕМА",
    "В $ТРИ $НОЛЬ $СЕМЬ В ОКОШКО ПОСТУЧАЛИ. Я ПОСМОТРЕЛ В МОНИТОР",
    "НА КАМЕРЕ У ОКОШКА СТОЯЛ ЧЕЛОВЕК. А В ОКНЕ — ^НИКОГО",
    "ПРО ТАКОЙ СЛУЧАЙ В ПРАВИЛАХ ^НИ ^СЛОВА",
    "А ВЫ БЫ ОТКРЫЛИ? $ПИШИТЕ В КОММЕНТАРИЯХ",
  ],
  scenes: [
    { until: 2, tape: ["!", "ПРАВИЛА НОЧНОЙ СМЕНЫ"], stamp: "АПТЕКА 24 · 21:00", render: (at, dur) => <Intro at={at} dur={dur} /> },
    { until: 6, tape: ["1.", "ОКОШКО"], stamp: "00:40", render: (at, dur) => <WindowRule at={at} dur={dur} /> },
    { until: 10, tape: ["2.", "РЕЦЕПТ"], stamp: "02:58", render: (at, dur) => <Recipe at={at} dur={dur} /> },
    { until: 13, tape: ["3.", "КАМЕРА"], stamp: "03:02", render: (at, dur) => <CameraRule at={at} dur={dur} /> },
    { until: 18, tape: ["!", "ОДНА ПРОБЛЕМА"], stamp: "03:07", render: (at, dur) => <Problem at={at} dur={dur} /> },
    { until: 19, render: () => <EndCard /> },
  ],
};
