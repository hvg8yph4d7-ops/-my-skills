// «Правила» №2 — последняя электричка (~45 с). Схема: двери / вагон / попутчик →
// «была лишь одна проблема» → попутчик в окне отражается, а я — нет.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { EpisodeDef } from "./Episode";
import { C, Camera, clamp, EndCard, Mood, Pills, Sfx, Sky, Svg } from "./kit";
import timing from "./timing/pr02.json";

type P = { at: (i: number) => number; dur: number };

// Сидящий человек (силуэт); faint — полупрозрачное отражение
const Sitter: React.FC<{ x: number; y: number; s?: number; o?: number; color?: string }> = ({ x, y, s = 1, o = 1, color = "#1d2130" }) => (
  <g transform={`translate(${x},${y}) scale(${s})`} opacity={o}>
    <rect x={-60} y={-250} width={120} height={180} rx={24} fill={color} />
    <circle cx={0} cy={-290} r={44} fill={color} />
    <rect x={-60} y={-80} width={150} height={40} rx={12} fill={color} />
  </g>
);

// Электричка снаружи у платформы
export const Train: React.FC = () => (
  <Svg>
    <Sky moon={false} />
    <rect x={0} y={1120} width={1080} height={800} fill="#17171c" />
    <rect x={0} y={1100} width={1080} height={30} fill="#4a4a52" />
    <rect x={-40} y={640} width={1160} height={440} rx={30} fill="#2f6a4f" />
    <rect x={-40} y={960} width={1160} height={40} fill="#c9502f" />
    {[40, 300, 560, 820].map((x) => (
      <rect key={x} x={x} y={700} width={200} height={170} rx={14} fill="#f1e4b0" opacity={0.85} />
    ))}
    <rect x={480} y={690} width={10} height={380} fill="#1f4636" />
    <circle cx={200} cy={1090} r={46} fill="#0e0e12" />
    <circle cx={880} cy={1090} r={46} fill="#0e0e12" />
    <rect x={460} y={420} width={8} height={220} fill="#55555e" />
    <rect x={380} y={400} width={170} height={60} rx={6} fill="#24406e" />
    <text x={465} y={440} textAnchor="middle" fontSize={30} fontWeight={800} fill="#fff" fontFamily="Montserrat">
      00:31
    </text>
  </Svg>
);

const Intro: React.FC<P> = ({ at, dur }) => (
  <AbsoluteFill>
    <Camera dur={dur} from={1.1} to={1}>
      <Train />
    </Camera>
    <Pills y={400} items={[["ПОСЛЕДНИЙ РЕЙС · ВЫ ОДИН", at(0) + 30, "#2b3a5a"]]} />
    <Mood />
  </AbsoluteFill>
);

// Двери: снаружи пустая платформа; потом створки закрываются
const Doors: React.FC<P> = ({ at, dur }) => {
  const f = useCurrentFrame();
  const close = interpolate(f, [at(3) + 6, at(3) + 20], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: "#14161c" }}>
      <Camera dur={dur} from={1} to={1.08}>
        <Svg>
          <rect width={1080} height={1920} fill="#2a2d36" />
          <rect x={240} y={330} width={600} height={900} fill="#0b0c10" />
          <g>
            <rect x={240} y={330} width={600} height={900} fill="#1a1c23" />
            <rect x={240} y={980} width={600} height={250} fill="#3a3a42" />
            <rect x={600} y={560} width={10} height={420} fill="#6a6a72" />
            <circle cx={605} cy={545} r={40} fill="#e8e3c8" opacity={0.6} />
          </g>
          <rect x={240 - 300 * (1 - close)} y={330} width={300} height={900} fill="#c9cdd4" />
          <rect x={540 + 300 * (1 - close)} y={330} width={300} height={900} fill="#bfc3ca" />
          <rect x={0} y={1230} width={1080} height={690} fill="#22242b" />
        </Svg>
      </Camera>
      <Pills
        y={400}
        items={[
          ["СНАРУЖИ НИКОГО → НЕ ВЫХОДИТЬ", at(2) + 10, "#7a2c26"],
          ["ДВЕРИ ЗАКРОЮТСЯ БЫСТРЕЕ", at(3) + 10, "#2b3a5a"],
        ]}
      />
      <Mood />
      <Sfx src="whoosh.mp3" at={at(3) + 6} volume={0.7} />
    </AbsoluteFill>
  );
};

// Вагон: проход, в конце — окно кабины машиниста
const Car: React.FC<P> = ({ at, dur }) => {
  const f = useCurrentFrame();
  const empty = f >= at(6);
  return (
    <AbsoluteFill style={{ background: "#14161c" }}>
      <Camera dur={dur} from={1} to={1.15} oy="42%">
        <Svg>
          <rect width={1080} height={1920} fill="#2b2f38" />
          <polygon points="0,300 1080,300 760,640 320,640" fill="#d8dbe0" opacity={0.85} />
          <polygon points="0,1500 1080,1500 760,1000 320,1000" fill="#3c4048" />
          <polygon points="0,300 320,640 320,1000 0,1500" fill="#23262e" />
          <polygon points="1080,300 760,640 760,1000 1080,1500" fill="#23262e" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={60 + i * 80} y={760 - i * 30} width={60} height={260 - i * 40} fill="#2e5d8f" />
              <rect x={960 - i * 80} y={760 - i * 30} width={60} height={260 - i * 40} fill="#2e5d8f" />
            </g>
          ))}
          <rect x={320} y={640} width={440} height={360} fill="#1a1c22" />
          <rect x={400} y={680} width={280} height={170} fill="#0d0f14" stroke="#555" strokeWidth={8} />
          {!empty && <circle cx={540} cy={760} r={36} fill="#3a3f4c" />}
          {!empty && <rect x={490} y={790} width={100} height={60} rx={14} fill="#3a3f4c" />}
        </Svg>
      </Camera>
      <Pills
        y={400}
        items={[
          ["ПЕРВЫЙ ВАГОН — У МАШИНИСТА", at(5)],
          ["КАБИНА ПУСТАЯ → В ПОСЛЕДНИЙ", at(6) + 10, "#7a2c26"],
        ]}
      />
      <Mood />
    </AbsoluteFill>
  );
};

// Окно вагона ночью: в стекле отражения; me / him — кто отражается
const Reflection: React.FC<{ me: boolean; him: boolean }> = ({ me, him }) => (
  <Svg>
    <rect width={1080} height={1920} fill="#23262e" />
    <rect x={140} y={360} width={800} height={640} rx={40} fill="#07080c" stroke="#555a66" strokeWidth={18} />
    <g clipPath="url(#glass)">
      <defs>
        <clipPath id="glass">
          <rect x={149} y={369} width={782} height={622} rx={34} />
        </clipPath>
      </defs>
      {me && <Sitter x={360} y={1060} s={1.1} o={0.35} color="#9aa3b8" />}
      {him && <Sitter x={720} y={1060} s={1.1} o={0.35} color="#9aa3b8" />}
      <line x1={140} y1={520} x2={940} y2={480} stroke="#fff" strokeWidth={3} opacity={0.08} />
    </g>
    <rect x={0} y={1000} width={1080} height={920} fill="#1b1e25" />
    <rect x={160} y={1040} width={340} height={200} rx={20} fill="#2e5d8f" />
    <rect x={580} y={1040} width={340} height={200} rx={20} fill="#2e5d8f" />
  </Svg>
);

const Companion: React.FC<P> = ({ at, dur }) => (
  <AbsoluteFill>
    <Camera dur={dur} from={1} to={1.05}>
      <Reflection me him={false} />
    </Camera>
    <Pills
      y={400}
      items={[
        ["СМОТРИ НА ОТРАЖЕНИЕ", at(8) + 10],
        ["НЕТ ОТРАЖЕНИЯ → НЕ ОТВЕЧАТЬ", at(9), "#7a2c26"],
      ]}
    />
    <Mood />
  </AbsoluteFill>
);

const Problem: React.FC<P> = ({ at, dur }) => {
  const f = useCurrentFrame();
  const meGone = f >= at(13);
  return (
    <AbsoluteFill>
      <Camera dur={dur} from={1} to={1.12} shake={f > at(13) && f < at(13) + 20 ? 6 : 0}>
        <Reflection me={!meGone} him={f >= at(12)} />
      </Camera>
      <Pills
        y={400}
        items={[
          ["ПОПУТЧИК — ОТРАЖАЕТСЯ", at(12), "#2b3a5a"],
          ["Я — НЕТ", at(13), C.red],
        ]}
      />
      <Mood />
      <Sfx src="hit.mp3" at={at(13)} volume={1} />
    </AbsoluteFill>
  );
};

export const PR02: EpisodeDef = {
  id: "pr02",
  timing,
  captions: [
    "ЕСЛИ ВЫ ЕДЕТЕ В $ПОСЛЕДНЕЙ $ЭЛЕКТРИЧКЕ ОДИН — ВОТ ПРАВИЛА МАШИНИСТОВ",
    "ПЕРВОЕ — $ДВЕРИ",
    "ДВЕРИ ОТКРЫЛИСЬ, А СНАРУЖИ ^НИКОГО — НЕ ВЫХОДИТЕ",
    "ДВЕРИ ЗАКРОЮТСЯ РАНЬШЕ, ЧЕМ ВЫ УСПЕЕТЕ $ОБЕРНУТЬСЯ",
    "ВТОРОЕ — $ВАГОН",
    "САДИТЕСЬ В $ПЕРВЫЙ ВАГОН. МАШИНИСТА ВИДНО ЧЕРЕЗ СТЕКЛО",
    "КАБИНА ^ПУСТАЯ, А ПОЕЗД ЕДЕТ — ПЕРЕХОДИТЕ В $ПОСЛЕДНИЙ",
    "ТРЕТЬЕ — $ПОПУТЧИК",
    "ПОДСЕЛ ЧЕЛОВЕК — ПОСМОТРИТЕ НА ЕГО $ОТРАЖЕНИЕ В ОКНЕ",
    "^НЕТ ^ОТРАЖЕНИЯ — НЕ ОТВЕЧАЙТЕ. ДАЖЕ ЕСЛИ ОН ЗНАЕТ ВАШЕ ИМЯ",
    "Я ЕХАЛ ДОМОЙ В $00:47. НА БУМАГЕ Я ЗНАЛ ВСЕ ПРАВИЛА",
    "БЫЛА ЛИШЬ ^ОДНА ^ПРОБЛЕМА",
    "ПОПУТЧИК В ОКНЕ $ОТРАЖАЛСЯ",
    "А Я — ^НЕТ",
    "ЧТО БЫ ВЫ СДЕЛАЛИ? $ПИШИТЕ В КОММЕНТАРИЯХ",
  ],
  scenes: [
    { until: 0, tape: ["!", "ПРАВИЛА ЭЛЕКТРИЧКИ"], stamp: "00:31", render: (at, dur) => <Intro at={at} dur={dur} /> },
    { until: 3, tape: ["1.", "ДВЕРИ"], render: (at, dur) => <Doors at={at} dur={dur} /> },
    { until: 6, tape: ["2.", "ВАГОН"], render: (at, dur) => <Car at={at} dur={dur} /> },
    { until: 9, tape: ["3.", "ПОПУТЧИК"], render: (at, dur) => <Companion at={at} dur={dur} /> },
    { until: 13, tape: ["!", "ОДНА ПРОБЛЕМА"], stamp: "00:47", render: (at, dur) => <Problem at={at} dur={dur} /> },
    { until: 14, render: () => <EndCard /> },
  ],
};
