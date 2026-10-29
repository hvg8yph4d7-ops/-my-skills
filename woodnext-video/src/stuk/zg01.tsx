// «Загадка» №1 — перевал Дятлова (реальный случай, 1959). Только проверенные факты, без жестоких деталей.
// Схема: удар → что нашли → три версии → «была лишь одна проблема» → вопрос зрителям.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { EpisodeDef } from "./Episode";
import { C, Camera, clamp, EndCard, Mood, Pills, Sfx, Sky, Svg } from "./kit";
import timing from "./timing/zg01.json";

type P = { at: (i: number) => number; dur: number };

const TENT = { x: 300, y: 760 };
const CEDAR = { x: 820, y: 1230 };

// Склон горы ночью: палатка вверху, кедр внизу; trail 0..1 — путь вниз, cut — разрез, slab 0..1 — сход снега
export const Slope: React.FC<{ trail?: number; cut?: boolean; fire?: boolean; slab?: number; wind?: boolean; angle?: boolean }> = ({
  trail = 0,
  cut,
  fire,
  slab = 0,
  wind,
  angle,
}) => {
  const f = useCurrentFrame();
  const dots = 18;
  const shake = wind ? Math.sin(f / 2) * 4 : 0;
  return (
    <Svg>
      <Sky moon={false} />
      <polygon points="0,560 1080,1080 1080,1920 0,1920" fill="#4c586f" />
      <polygon points="0,560 1080,1080 1080,1180 0,700" fill="#6a7690" opacity={0.6} />
      {slab > 0 && (
        <polygon
          points={`${-80 + slab * 300},${520 + slab * 150} ${260 + slab * 300},${680 + slab * 150} ${240 + slab * 300},${740 + slab * 150} ${-100 + slab * 300},${580 + slab * 150}`}
          fill="#8d9ab3"
          stroke="#c9d2e2"
          strokeWidth={4}
        />
      )}
      {new Array(dots).fill(0).map((_, i) => {
        const t = i / (dots - 1);
        if (t > trail) return null;
        const x = TENT.x + (CEDAR.x - TENT.x) * t + Math.sin(i * 1.7) * 18;
        const y = TENT.y + 40 + (CEDAR.y - TENT.y - 40) * t;
        return <circle key={i} cx={x} cy={y} r={7} fill="#1a1f2b" />;
      })}
      <g transform={`translate(${TENT.x + shake},${TENT.y})`}>
        <polygon points="-90,40 0,-60 90,40" fill="#6d6250" />
        <polygon points="0,-60 90,40 120,30 30,-66" fill="#5a5142" />
        {cut && <line x1={-10} y1={-40} x2={40} y2={30} stroke={C.red} strokeWidth={8} strokeLinecap="round" />}
      </g>
      <g transform={`translate(${CEDAR.x},${CEDAR.y})`}>
        <rect x={-14} y={-40} width={28} height={80} fill="#2a1f17" />
        <polygon points="-110,-30 0,-260 110,-30" fill="#14241c" />
        <polygon points="-90,-140 0,-330 90,-140" fill="#14241c" />
        {fire && (
          <g transform="translate(-130,40)">
            <circle r={60} fill="#ff9a3c" opacity={0.15 + Math.sin(f / 3) * 0.05} />
            <path d="M-14,10 q14,-50 28,0 z" fill="#ff9a3c" opacity={0.8} />
          </g>
        )}
      </g>
      {wind &&
        new Array(14).fill(0).map((_, i) => {
          const x = ((f * 28 + i * 160) % 1400) - 200;
          const y = 300 + i * 70;
          return <line key={i} x1={x} y1={y} x2={x + 160} y2={y + 30} stroke="#e9eef7" strokeWidth={4} opacity={0.5} />;
        })}
      {angle && (
        <g>
          <line x1={0} y1={560} x2={1080} y2={560} stroke="#e9e2cc" strokeWidth={4} strokeDasharray="14 12" />
          <path d="M260,560 A260,260 0 0 1 236,676" fill="none" stroke={C.yellow} strokeWidth={6} />
          <text x={300} y={640} fontSize={56} fontWeight={900} fill={C.yellow} fontFamily="Montserrat">
            {"< 30°"}
          </text>
        </g>
      )}
    </Svg>
  );
};

const Intro: React.FC<P> = ({ at, dur }) => (
  <AbsoluteFill>
    <Camera dur={dur} from={1.12} to={1} oy="40%">
      <Slope />
    </Camera>
    <Pills
      y={400}
      items={[
        ["9 ЧЕЛОВЕК", 6, C.red],
        ["ФЕВРАЛЬ 1959 · СЕВЕРНЫЙ УРАЛ", at(1) + 10, "#2b3a5a"],
        ["СКЛОН ГОРЫ ХОЛАТЧАХЛЬ", at(2) + 10],
      ]}
    />
    <Mood />
  </AbsoluteFill>
);

const Found: React.FC<P> = ({ at, dur }) => {
  const f = useCurrentFrame();
  const trail = interpolate(f, [at(4), at(4) + 60], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <Camera dur={dur} from={1} to={1.06}>
        <Slope cut={f >= at(3) + 20} trail={trail} fire={f >= at(5)} />
      </Camera>
      <Pills
        y={400}
        items={[
          ["ПАЛАТКА РАЗРЕЗАНА ИЗНУТРИ", at(3) + 20, C.red],
          ["БОЛЬШЕ 1 КМ ВНИЗ · БЕЗ ОБУВИ", at(4) + 20, "#2b3a5a"],
          ["КЕДР · ОСТАТКИ КОСТРА", at(5) + 10],
          ["1959: «СТИХИЙНАЯ СИЛА»", at(6) + 10, "#7a2c26"],
        ]}
      />
      <Mood />
      <Sfx src="hit.mp3" at={at(3) + 20} volume={0.6} />
    </AbsoluteFill>
  );
};

const Avalanche: React.FC<P> = ({ at, dur }) => {
  const f = useCurrentFrame();
  const slab = interpolate(f, [at(10), at(10) + 70], [0.01, 0.75], clamp);
  return (
    <AbsoluteFill>
      <Camera dur={dur} from={1} to={1.08} oy="40%">
        <Slope slab={slab} />
      </Camera>
      <Pills
        y={400}
        items={[
          ["ПРОКУРАТУРА, 2020: СХОД СНЕГА", at(9) + 10, "#2b3a5a"],
          ["УЧЁНЫЕ, 2021: СНЕЖНАЯ ДОСКА", at(10) + 10],
          ["СКЛОН ПОДРЕЗАЛИ ПОД ПАЛАТКУ", at(10) + 60, "#7a2c26"],
        ]}
      />
      <Mood />
    </AbsoluteFill>
  );
};

const Storm: React.FC<P> = ({ at, dur }) => (
  <AbsoluteFill>
    <Camera dur={dur} from={1} to={1.05}>
      <Slope wind trail={1} />
    </Camera>
    <Pills
      y={400}
      items={[
        ["ВЕТЕР + МОРОЗ", at(12), "#2b3a5a"],
        ["УКРЫТИЕ — НИЖЕ, У ЛЕСА", at(12) + 30],
      ]}
    />
    <Mood />
    <Sfx src="whoosh.mp3" at={at(11)} volume={0.6} />
  </AbsoluteFill>
);

const Tests: React.FC<P> = ({ at, dur }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Camera dur={dur} from={1} to={1.06}>
        <Slope />
        <Svg>
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={300 + i * 230} cy={300 + ((i * 37) % 60)} r={10 + Math.sin(f / 6 + i) * 3} fill="#fff6c8" opacity={0.6} />
          ))}
        </Svg>
      </Camera>
      <Pills
        y={400}
        items={[
          ["СЛЕДЫ РАДИАЦИИ НА ЧАСТИ ОДЕЖДЫ", at(14), "#2b3a5a"],
          ["ПРЯМЫХ ДОКАЗАТЕЛЬСТВ НЕТ", at(14) + 45, "#7a2c26"],
        ]}
      />
      <Mood />
    </AbsoluteFill>
  );
};

const Problem: React.FC<P> = ({ at, dur }) => (
  <AbsoluteFill>
    <Camera dur={dur} from={1} to={1.15} ox="28%" oy="40%">
      <Slope angle cut trail={1} />
    </Camera>
    <Pills
      y={400}
      items={[
        ["СКЛОН — МЕНЬШЕ 30°", at(16) + 5, "#2b3a5a"],
        ["СЛЕДОВ ЛАВИНЫ НЕ ЗАМЕТИЛИ", at(16) + 50, C.red],
      ]}
    />
    <Mood />
    <Sfx src="hit.mp3" at={at(17)} volume={0.8} />
  </AbsoluteFill>
);

export const ZG01: EpisodeDef = {
  id: "zg01",
  timing,
  captions: [
    "$ДЕВЯТЬ $ЧЕЛОВЕК. ПАЛАТКА, ^РАЗРЕЗАННАЯ ^ИЗНУТРИ. И НИКТО НЕ ВЕРНУЛСЯ",
    "ФЕВРАЛЬ $1959-ГО. СЕВЕРНЫЙ УРАЛ. ГРУППА ИГОРЯ ДЯТЛОВА ИДЁТ В СЛОЖНЫЙ ЗИМНИЙ ПОХОД",
    "НОЧЬ НА ВТОРОЕ ФЕВРАЛЯ ОНИ ВСТРЕЧАЮТ НА СКЛОНЕ ГОРЫ $ХОЛАТЧАХЛЬ",
    "ЧЕРЕЗ МЕСЯЦ НАХОДЯТ ПАЛАТКУ. ЕЁ ^РАЗРЕЗАЛИ ^ИЗНУТРИ. ОДЕЖДА И ОБУВЬ — ВНУТРИ",
    "ТУРИСТЫ УШЛИ ВНИЗ $БОЛЬШЕ $ЧЕМ $НА $КИЛОМЕТР. В МОРОЗ. МНОГИЕ — ^БЕЗ ^ОБУВИ",
    "У СТАРОГО $КЕДРА — ОСТАТКИ КОСТРА. ПОСЛЕДНИХ НАЙДУТ ТОЛЬКО В МАЕ",
    "СЛЕДСТВИЕ 1959-ГО: ^СТИХИЙНАЯ ^СИЛА, ПРЕОДОЛЕТЬ КОТОРУЮ ЛЮДИ НЕ МОГЛИ",
    "ЗА ШЕСТЬДЕСЯТ ЛЕТ ВЕРСИЙ — ДЕСЯТКИ. ВОТ $ТРИ $ГЛАВНЫЕ",
    "ПЕРВАЯ — $ЛАВИНА",
    "В 2020-М ПРОКУРАТУРА: ПРИЧИНА — $СХОД $СНЕГА И ПЛОХАЯ ВИДИМОСТЬ",
    "В 2021-М ШВЕЙЦАРСКИЕ УЧЁНЫЕ: $СНЕЖНАЯ $ДОСКА МОГЛА СОЙТИ ЧЕРЕЗ НЕСКОЛЬКО ЧАСОВ ПОСЛЕ ТОГО, КАК СКЛОН ПОДРЕЗАЛИ ПОД ПАЛАТКУ",
    "ВТОРАЯ — $УРАГАН",
    "ВЕТЕР И МОРОЗ МОГЛИ ВЫГНАТЬ ЛЮДЕЙ ИСКАТЬ УКРЫТИЕ $НИЖЕ, $У $ЛЕСА",
    "ТРЕТЬЯ — $ИСПЫТАНИЯ ВОЕННОЙ ТЕХНИКИ",
    "ИЗ-ЗА СЛЕДОВ $РАДИАЦИИ НА ОДЕЖДЕ. НО ^ДОКАЗАТЕЛЬСТВ ТАК И НЕ НАШЛИ",
    "НА БУМАГЕ ДЕЛО ЗАКРЫТО. БЫЛА ЛИШЬ ^ОДНА ^ПРОБЛЕМА",
    "СКЛОН ТАМ $СЛИШКОМ $ПОЛОГИЙ ДЛЯ ЛАВИНЫ. А ПОИСКОВИКИ ^СЛЕДОВ ^ЛАВИНЫ НЕ ЗАМЕТИЛИ",
    "ТАК ЧТО ЗАСТАВИЛО ДЕВЯТЕРЫХ ОПЫТНЫХ ТУРИСТОВ $УЙТИ $В $ТЕМНОТУ?",
    "ПИШИТЕ $СВОЮ $ВЕРСИЮ В КОММЕНТАРИЯХ",
  ],
  scenes: [
    { until: 2, tape: ["?", "ПЕРЕВАЛ ДЯТЛОВА"], stamp: "1–2 ФЕВРАЛЯ 1959", render: (at, dur) => <Intro at={at} dur={dur} /> },
    { until: 6, tape: ["!", "ЧТО НАШЛИ"], stamp: "26 ФЕВРАЛЯ 1959", render: (at, dur) => <Found at={at} dur={dur} /> },
    { until: 10, tape: ["1.", "ЛАВИНА"], render: (at, dur) => <Avalanche at={at} dur={dur} /> },
    { until: 12, tape: ["2.", "УРАГАН"], render: (at, dur) => <Storm at={at} dur={dur} /> },
    { until: 14, tape: ["3.", "ИСПЫТАНИЯ"], render: (at, dur) => <Tests at={at} dur={dur} /> },
    { until: 17, tape: ["!", "ОДНА ПРОБЛЕМА"], render: (at, dur) => <Problem at={at} dur={dur} /> },
    { until: 18, render: () => <EndCard /> },
  ],
};
