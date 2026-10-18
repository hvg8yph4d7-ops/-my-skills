// «Сезон закрыт», серия 3 — «Сестра». Схема: удар → ставки → проверить / посмотреть / следы →
// «была лишь одна проблема» → следы начинаются у порога, изнутри.
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { EpisodeDef } from "./Episode";
import { body, C, Camera, clamp, EndCard, Fence, Forest, Mood, Pills, Sfx, Sky, Svg } from "./kit";
import timing from "./timing/s1e03.json";

type P = { at: (i: number) => number; dur: number };

// Дверь изнутри; rings — кадр, с которого от двери расходятся звуковые круги
const DoorInside: React.FC<{ rings?: number; chair?: boolean; bell?: boolean }> = ({ rings = -1, chair, bell }) => {
  const f = useCurrentFrame();
  const r = rings >= 0 && f >= rings ? (f - rings) % 30 : -1;
  return (
    <Svg>
      <rect width={1080} height={1920} fill="#121318" />
      <rect x={0} y={1180} width={1080} height={740} fill="#1a1512" />
      <rect x={300} y={360} width={480} height={820} fill="#4a3627" stroke="#2c2018" strokeWidth={18} />
      <rect x={340} y={410} width={400} height={330} fill="none" stroke="#3a2a1e" strokeWidth={8} />
      <rect x={340} y={790} width={400} height={330} fill="none" stroke="#3a2a1e" strokeWidth={8} />
      <rect x={690} y={760} width={70} height={18} rx={9} fill="#b9a879" />
      {bell && (
        <g>
          <line x1={735} y1={770} x2={735} y2={830} stroke="#8a7a5a" strokeWidth={4} />
          <path d="M710,880 q25,-70 50,0 z" fill="#c9a84a" />
          <circle cx={735} cy={886} r={8} fill="#8a6d2a" />
        </g>
      )}
      {chair && (
        <g transform="rotate(-24 640 1180)">
          <rect x={600} y={760} width={30} height={420} fill="#6b4f39" />
          <rect x={600} y={960} width={260} height={30} fill="#6b4f39" />
          <rect x={830} y={960} width={26} height={220} fill="#5a4230" />
        </g>
      )}
      {r >= 0 &&
        [0, 1, 2].map((k) => {
          const q = (r + k * 10) % 30;
          return <circle key={k} cx={540} cy={760} r={60 + q * 9} fill="none" stroke="#e9e2cc" strokeWidth={3} opacity={1 - q / 30} />;
        })}
    </Svg>
  );
};

// 1. Зовут голосом сестры
const Voice: React.FC<P> = ({ at, dur }) => (
  <AbsoluteFill>
    <Camera dur={dur} from={1.08} to={1}>
      <DoorInside rings={0} chair bell />
    </Camera>
    <Pills
      y={400}
      items={[
        ["АНЯ — В МОСКВЕ", at(1) + 10, "#2b3a5a"],
        ["ПРАВИЛО 1: НЕ ОТВЕЧАТЬ", at(2), "#7a2c26"],
        ["ЗОВУТ ЕЩЁ 2 РАЗА", at(3), "#2b3a5a"],
      ]}
    />
    <Mood />
  </AbsoluteFill>
);

// 2. Проверить: переписка с Аней
const Bubble: React.FC<{ at: number; me?: boolean; children: React.ReactNode }> = ({ at, me, children }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - at, fps, config: { damping: 14 } });
  if (f < at) return null;
  return (
    <div
      style={{
        alignSelf: me ? "flex-end" : "flex-start",
        maxWidth: 460,
        background: me ? "#3d6bd6" : "#262a33",
        color: "#fff",
        fontFamily: body,
        fontWeight: 700,
        fontSize: 36,
        padding: "16px 24px",
        borderRadius: 22,
        transform: `scale(${s})`,
        transformOrigin: me ? "100% 100%" : "0% 100%",
      }}
    >
      {children}
    </div>
  );
};

const Check: React.FC<P> = ({ at, dur }) => {
  const f = useCurrentFrame();
  const typing = f > at(6) + 25 && f < at(7);
  return (
    <AbsoluteFill style={{ background: "#0b0c11" }}>
      <Camera dur={dur} from={1} to={1.05}>
        <div
          style={{
            position: "absolute",
            left: 230,
            top: 380,
            width: 620,
            height: 660,
            borderRadius: 56,
            border: "14px solid #1c1d22",
            background: "#0b0d12",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "26px 30px 18px", borderBottom: "2px solid #22252d", color: "#fff", fontFamily: body, fontWeight: 700, fontSize: 36 }}>
            Аня
            <div style={{ fontSize: 24, color: typing ? "#6fa8ff" : "#7d8390" }}>{typing ? "печатает…" : "в сети"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 26 }}>
            <Bubble at={at(6)} me>
              Ты где?
            </Bubble>
            <Bubble at={at(7)}>Дома. Сплю. Ты чего?</Bubble>
          </div>
        </div>
      </Camera>
      <Pills y={1100} items={[["ПРОВЕРЯЙ ДРУГИМ КАНАЛОМ", at(8) + 10]]} />
      <Mood />
    </AbsoluteFill>
  );
};

// 3. Посмотреть: щель в одеяле, двор под луной
const Peek: React.FC<P> = ({ at, dur }) => {
  const f = useCurrentFrame();
  const lampOff = at(10) + 6;
  const gap = interpolate(f, [at(10) + 20, at(10) + 45], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: "#0a0b0f" }}>
      <Camera dur={dur} from={1} to={1.12} oy="40%">
        <Svg>
          <defs>
            <clipPath id="slit">
              <rect x={540 - 20 - gap * 120} y={340} width={40 + gap * 240} height={680} />
            </clipPath>
          </defs>
          <rect width={1080} height={1920} fill={f < lampOff ? "#2a2116" : "#0d0e13"} />
          <g clipPath="url(#slit)">
            <g transform="translate(160,340) scale(0.7) translate(0,-180)">
              <Sky />
              <Forest y={1040} />
              <rect x={0} y={1040} width={1080} height={300} fill="#c9d3e6" opacity={0.18} />
              {new Array(60).fill(0).map((_, i) => (
                <circle key={i} cx={(i * 97) % 1080} cy={1060 + ((i * 53) % 240)} r={3} fill="#e8eef9" opacity={0.6} />
              ))}
              <Fence y={1130} />
            </g>
          </g>
          <rect x={150} y={330} width={390 - gap * 120} height={700} fill="#4a3a4e" />
          <rect x={540 + gap * 120} y={330} width={390 - gap * 120} height={700} fill="#433548" />
          {new Array(6).fill(0).map((_, i) => (
            <line key={i} x1={170 + i * 60} x2={170 + i * 60} y1={330} y2={1030} stroke="#3a2d3e" strokeWidth={6} />
          ))}
          <rect x={130} y={1030} width={820} height={30} fill="#3a2f27" />
        </Svg>
      </Camera>
      <Pills
        y={400}
        items={[
          ["ЛАМПА ВЫКЛЮЧЕНА", lampOff],
          ["ЩЕЛЬ — НА ПАЛЕЦ", at(10) + 30],
          ["ТЁМНАЯ КОМНАТА = НЕВИДИМКА", at(11) + 10, "#2b3a5a"],
        ]}
      />
      <Mood />
      <Sfx src="click.wav" at={lampOff} volume={0.7} />
    </AbsoluteFill>
  );
};

// Босой след: подошва + пальцы
const Foot: React.FC<{ x: number; y: number; rot: number; left: boolean; o: number }> = ({ x, y, rot, left, o }) => (
  <g transform={`translate(${x},${y}) rotate(${rot}) scale(${left ? -1 : 1},1)`} opacity={o}>
    <ellipse cx={0} cy={0} rx={15} ry={30} fill="#1c212c" />
    <ellipse cx={-2} cy={-28} rx={13} ry={10} fill="#1c212c" />
    {[-12, -4, 4, 11].map((dx, i) => (
      <circle key={i} cx={dx} cy={-46 - (i === 0 ? 2 : 0)} r={i === 0 ? 6 : 4.5} fill="#1c212c" />
    ))}
  </g>
);

// 4. Следы на инее у крыльца, на рассвете
const Frost: React.FC<P> = ({ at, dur }) => {
  const f = useCurrentFrame();
  const start = at(16);
  return (
    <AbsoluteFill>
      <Camera dur={dur} from={1} to={1.1} oy="60%">
        <Svg>
          <Sky dusk moon={false} />
          <Forest y={820} />
          <rect x={0} y={820} width={1080} height={1100} fill="#4e5a70" />
          {new Array(140).fill(0).map((_, i) => (
            <circle key={i} cx={(i * 131) % 1080} cy={830 + ((i * 71) % 1000)} r={2.5} fill="#fff" opacity={0.7} />
          ))}
          <rect x={240} y={1500} width={600} height={60} fill="#5a4636" />
          <rect x={280} y={1560} width={520} height={60} fill="#4a3a2d" />
          <rect x={200} y={1440} width={680} height={60} fill="#6b5442" />
          {new Array(8).fill(0).map((_, i) => {
            const o = interpolate(f, [start + i * 5, start + i * 5 + 6], [0, 1], clamp);
            return <Foot key={i} x={500 + (i % 2) * 70 + i * 6} y={1380 - i * 85} rot={6} left={i % 2 === 0} o={o} />;
          })}
        </Svg>
      </Camera>
      <Pills
        y={400}
        items={[
          ["ИНЕЙ НЕ ВРЁТ", at(14) + 20, "#2b3a5a"],
          ["БОСИКОМ · −6°", start + 30, "#7a2c26"],
        ]}
      />
      <Mood />
    </AbsoluteFill>
  );
};

// 5. Вид сверху: следы начинаются у порога и уходят к Ковалёвым
const Map: React.FC<P> = ({ at, dur }) => {
  const f = useCurrentFrame();
  const draw = interpolate(f, [at(19), at(19) + 50], [0, 1], clamp);
  const steps = 16;
  return (
    <AbsoluteFill style={{ background: "#3f4a5e" }}>
      <Camera dur={dur} from={1} to={1.06}>
        <Svg>
          <rect width={1080} height={1920} fill="#3f4a5e" />
          {new Array(120).fill(0).map((_, i) => (
            <circle key={i} cx={(i * 151) % 1080} cy={(i * 89) % 1920} r={2.5} fill="#fff" opacity={0.7} />
          ))}
          <rect x={120} y={880} width={360} height={260} fill="#1d1d25" />
          <polygon points="120,880 300,800 480,880" fill="#16161d" />
          <text x={300} y={1030} textAnchor="middle" fontSize={34} fontWeight={800} fill="#e9e2cc" fontFamily="Montserrat">
            МОЙ ДОМ
          </text>
          <rect x={430} y={950} width={70} height={90} fill="#6b5442" />
          <rect x={650} y={470} width={320} height={200} fill="#1d1d25" />
          <text x={810} y={582} textAnchor="middle" fontSize={30} fontWeight={800} fill="#e9e2cc" fontFamily="Montserrat">
            КОВАЛЁВЫ
          </text>
          {new Array(steps).fill(0).map((_, i) => {
            const t = i / (steps - 1);
            const o = draw > t ? 1 : 0;
            const x = 520 + t * 260 + (i % 2 ? 18 : -18);
            const y = 1000 - t * 300;
            return <Foot key={i} x={x} y={y} rot={22} left={i % 2 === 0} o={o} />;
          })}
          <circle cx={520} cy={1000} r={60} fill="none" stroke={C.red} strokeWidth={6} opacity={f > at(19) + 10 ? 1 : 0} />
        </Svg>
      </Camera>
      <Pills y={400} items={[["СЛЕДЫ НАЧИНАЮТСЯ У ПОРОГА", at(19) + 20, "#7a2c26"]]} />
      <Mood />
      <Sfx src="hit.mp3" at={at(19) + 20} volume={0.8} />
    </AbsoluteFill>
  );
};

// 6. Стул на месте, колокольчик молчал
const Untouched: React.FC<P> = ({ at, dur }) => (
  <AbsoluteFill>
    <Camera dur={dur} from={1} to={1.15} shake={4}>
      <DoorInside chair bell />
    </Camera>
    <Pills
      y={400}
      items={[
        ["СТУЛ — НА МЕСТЕ", at(21) + 5],
        ["КОЛОКОЛЬЧИК МОЛЧАЛ", at(21) + 40, "#7a2c26"],
      ]}
    />
    <Mood />
  </AbsoluteFill>
);

export const S1E03: EpisodeDef = {
  id: "s1e03",
  timing,
  captions: [
    "В ДВА ЧАСА НОЧИ МЕНЯ ПОЗВАЛИ ^ПО ^ИМЕНИ. ^ГОЛОСОМ ^СЕСТРЫ",
    "АНЯ ЖИВЁТ В $МОСКВЕ. ОНА НЕ МОГЛА БЫТЬ ЗДЕСЬ",
    "ПРАВИЛО ПЕРВОЕ: ^НЕ ^ОТВЕЧАЙ. Я МОЛЧУ И СЧИТАЮ УДАРЫ СЕРДЦА",
    "ГОЛОС ЗОВЁТ ЕЩЁ $ДВАЖДЫ. ПОТОМ — ~ТИШИНА",
    "ОТКРЫТЬ ДВЕРЬ — ЗНАЧИТ ^ОТВЕТИТЬ. ПРОВЕРЯТЬ НУЖНО ПО-ДРУГОМУ",
    "ПЕРВОЕ — $ПРОВЕРИТЬ",
    "Я ПИШУ АНЕ: $ТЫ $ГДЕ?",
    "ЧЕРЕЗ МИНУТУ ОТВЕТ: $ДОМА. $СПЛЮ. ТЫ ЧЕГО?",
    "ЗНАЧИТ, У ДВЕРИ ^НЕ ^ОНА. ПРОВЕРЯЙ НЕ УШАМИ, А $ДРУГИМ $КАНАЛОМ",
    "ВТОРОЕ — $ПОСМОТРЕТЬ",
    "Я ВЫКЛЮЧАЮ ЛАМПУ И ОТОДВИГАЮ ОДЕЯЛО $НА $ПАЛЕЦ",
    "В ТЁМНОЙ КОМНАТЕ МЕНЯ ~НЕ ~ВИДНО, А ДВОР — КАК НА ЛАДОНИ",
    "ВО ДВОРЕ ~ПУСТО. ТОЛЬКО $ИНЕЙ НА ТРАВЕ",
    "ТРЕТЬЕ — $СЛЕДЫ",
    "НОЧЬЮ МОЖНО ОБМАНУТЬ ГЛАЗА. $ИНЕЙ НЕ ОБМАНЕШЬ",
    "В ШЕСТЬ УТРА, КАК ТОЛЬКО СВЕТАЕТ, Я ВЫХОЖУ НА КРЫЛЬЦО",
    "НА ИНЕЕ — ^СЛЕДЫ ^БОСЫХ ^НОГ. ПРИ МИНУС ШЕСТИ",
    "НА БУМАГЕ ВСЁ СХОДИЛОСЬ: КТО-ТО СТОЯЛ У ДВЕРИ И УШЁЛ",
    "БЫЛА ЛИШЬ ^ОДНА ^ПРОБЛЕМА",
    "СЛЕДЫ НЕ ПОДХОДИЛИ К ДОМУ. ОНИ ^НАЧИНАЛИСЬ ^У ^ПОРОГА",
    "КАК БУДТО КТО-ТО ВЫШЕЛ ^ИЗНУТРИ",
    "А СТУЛ СТОЯЛ ПОД РУЧКОЙ. И $КОЛОКОЛЬЧИК ^МОЛЧАЛ",
    "ЧАСТЬ ЧЕТВЁРТАЯ. $КТО НОЧЕВАЛ В МОЁМ ДОМЕ?",
  ],
  scenes: [
    { until: 4, tape: ["!", "СЕЗОН ЗАКРЫТ · ЧАСТЬ 3"], stamp: "НОЧЬ 4 · 02:00", render: (at, dur) => <Voice at={at} dur={dur} /> },
    { until: 8, tape: ["1.", "ПРОВЕРИТЬ"], stamp: "НОЧЬ 4 · 02:04", render: (at, dur) => <Check at={at} dur={dur} /> },
    { until: 12, tape: ["2.", "ПОСМОТРЕТЬ"], stamp: "НОЧЬ 4 · 02:09", render: (at, dur) => <Peek at={at} dur={dur} /> },
    { until: 16, tape: ["3.", "СЛЕДЫ"], stamp: "УТРО · 06:12", render: (at, dur) => <Frost at={at} dur={dur} /> },
    { until: 20, tape: ["!", "ОДНА ПРОБЛЕМА"], stamp: "УТРО · 06:14", render: (at, dur) => <Map at={at} dur={dur} /> },
    { until: 21, tape: ["!", "ДВЕРЬ ЗАПЕРТА ИЗНУТРИ"], render: (at, dur) => <Untouched at={at} dur={dur} /> },
    { until: 22, render: () => <EndCard /> },
  ],
};
