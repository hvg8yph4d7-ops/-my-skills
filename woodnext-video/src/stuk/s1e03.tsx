// «Сезон закрыт», серия 3 — «Сестра» (версия 2, страшнее): зовут голосом сестры, три удара,
// босые следы к крыльцу, которые не возвращаются, — и глаза за плечом в отражении стекла.
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { EpisodeDef } from "./Episode";
import { C, Camera, clamp, EndCard, Fence, Forest, Mood, Pills, Sfx, Sky, Svg } from "./kit";
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

// 1. Голос сестры, потом три удара в дверь
const Voice: React.FC<P> = ({ at, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k0 = at(3) + 45;
  const silent = f >= at(4);
  return (
    <AbsoluteFill>
      <Camera dur={dur} from={1.08} to={1} shake={f > k0 && f < k0 + 45 ? 5 : 0}>
        <DoorInside rings={silent ? -1 : 0} chair bell />
        <Svg>
          {[0, 1, 2].map((i) => {
            const s = spring({ frame: f - (k0 + i * 18), fps, config: { damping: 9, stiffness: 260 } });
            return (
              <g key={i} transform={`translate(${470 + i * 50},${520 + i * 90}) scale(${s})`}>
                <circle r={40} fill={C.red} opacity={0.25} />
                <circle r={15} fill={C.red} />
              </g>
            );
          })}
        </Svg>
      </Camera>
      <Pills
        y={400}
        items={[
          ["АНЯ: «ДОМА, СПЛЮ»", at(1) + 20, "#2b3a5a"],
          ["ПРАВИЛО 1: НЕ ОТВЕЧАТЬ", at(2), "#7a2c26"],
        ]}
      />
      <Mood />
      <Sfx src="knock3.mp3" at={k0} volume={1} />
    </AbsoluteFill>
  );
};

// 2. Щель в одеяле: двор под луной
const Peek: React.FC<P> = ({ at, dur }) => {
  const f = useCurrentFrame();
  const lampOff = at(5) + 6;
  const gap = interpolate(f, [at(5) + 20, at(5) + 45], [0, 1], clamp);
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
      <Mood />
      <Sfx src="click.wav" at={lampOff} volume={0.7} />
    </AbsoluteFill>
  );
};

// 3. Двор ночью: босые следы от калитки к крыльцу, обратно — нет
const Steps: React.FC<P> = ({ at, dur }) => {
  const f = useCurrentFrame();
  const start = at(7) + 10;
  const n = 9;
  return (
    <AbsoluteFill>
      <Camera dur={dur} from={1} to={1.14} oy="70%">
        <Svg>
          <Sky moon />
          <Forest y={760} />
          <rect x={0} y={760} width={1080} height={1160} fill="#3c4760" />
          {new Array(150).fill(0).map((_, i) => (
            <circle key={i} cx={(i * 131) % 1080} cy={770 + ((i * 71) % 1100)} r={2.5} fill="#e8eef9" opacity={0.55} />
          ))}
          <rect x={430} y={700} width={20} height={130} fill="#2e251e" />
          <rect x={630} y={700} width={20} height={130} fill="#2e251e" />
          <rect x={450} y={720} width={180} height={90} fill="#3a2f27" />
          <rect x={180} y={1460} width={720} height={60} fill="#6b5442" />
          <rect x={220} y={1520} width={640} height={60} fill="#5a4636" />
          {new Array(n).fill(0).map((_, i) => {
            const o = interpolate(f, [start + i * 7, start + i * 7 + 6], [0, 1], clamp);
            const t = i / (n - 1);
            return <Foot key={i} x={540 + (i % 2 ? 34 : -34)} y={860 + t * 560} rot={180} left={i % 2 === 0} o={o} />;
          })}
        </Svg>
      </Camera>
      <Pills
        y={400}
        items={[
          ["БОСИКОМ · −6°", at(7) + 20, "#2b3a5a"],
          ["ОТ КАЛИТКИ — К КРЫЛЬЦУ", at(8) + 10],
          ["ОБРАТНО — НЕТ", at(9) + 10, "#7a2c26"],
          ["ОН ВСЁ ЕЩЁ ЗДЕСЬ", at(10) + 5, C.red],
        ]}
      />
      <Mood />
      <Sfx src="hit.mp3" at={at(10)} volume={0.6} />
    </AbsoluteFill>
  );
};

// 4. Тёмное стекло: моё отражение, а за плечом — глаза
const Glass: React.FC<P> = ({ at, dur }) => {
  const f = useCurrentFrame();
  const eyesAt = at(13) + 12;
  const eyes = interpolate(f, [eyesAt, eyesAt + 6], [0, 1], clamp);
  const closer = interpolate(f, [at(14), at(14) + 60], [1, 1.35], clamp);
  const flash = interpolate(f, [eyesAt, eyesAt + 3, eyesAt + 10], [0, 0.6, 0], clamp);
  const blink = Math.floor((f - eyesAt) / 4) === 9 ? 0.1 : 1;
  return (
    <AbsoluteFill style={{ background: "#07080b" }}>
      <Camera dur={dur} from={1} to={1.18} oy="40%" shake={f > eyesAt && f < eyesAt + 25 ? 9 : 0}>
        <Svg>
          <rect width={1080} height={1920} fill="#0b0d12" />
          <rect x={120} y={300} width={840} height={880} fill="#05060a" stroke="#3a2f27" strokeWidth={26} />
          <line x1={540} x2={540} y1={300} y2={1180} stroke="#3a2f27" strokeWidth={16} />
          {/* моё отражение — тёмный силуэт с бледным контуром от луны */}
          <g>
            <circle cx={420} cy={760} r={112} fill="#8d98b2" opacity={0.18} />
            <circle cx={420} cy={760} r={104} fill="#05060a" />
            <path d="M250,1180 q170,-280 340,0 z" fill="#8d98b2" opacity={0.18} />
            <path d="M262,1180 q158,-262 316,0 z" fill="#05060a" />
          </g>
          {/* за плечом */}
          <g transform={`translate(720,660) scale(${closer})`} opacity={eyes}>
            <defs>
              <radialGradient id="eyeglow">
                <stop offset="0" stopColor="#fff6d0" stopOpacity={0.9} />
                <stop offset="1" stopColor="#fff6d0" stopOpacity={0} />
              </radialGradient>
            </defs>
            <ellipse cx={0} cy={30} rx={100} ry={135} fill="#cfd6e6" opacity={0.05} />
            <circle cx={-36} cy={0} r={34} fill="url(#eyeglow)" opacity={blink} />
            <circle cx={36} cy={0} r={34} fill="url(#eyeglow)" opacity={blink} />
            <ellipse cx={-36} cy={0} rx={13} ry={6} fill="#fffbe8" opacity={blink} />
            <ellipse cx={36} cy={0} rx={13} ry={6} fill="#fffbe8" opacity={blink} />
          </g>
          <rect x={0} y={1180} width={1080} height={740} fill="#14110f" />
        </Svg>
        <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
      </Camera>
      <Pills y={400} items={[["ЗА ПЛЕЧОМ", eyesAt + 8, C.red]]} />
      <Mood />
      <Sfx src="hit.mp3" at={eyesAt} volume={1} />
    </AbsoluteFill>
  );
};

export const S1E03: EpisodeDef = {
  id: "s1e03",
  timing,
  captions: [
    "В ДВА ЧАСА НОЧИ МЕНЯ ПОЗВАЛИ ^ПО ^ИМЕНИ. ^ГОЛОСОМ ^СЕСТРЫ",
    "АНЯ В $МОСКВЕ. Я ПИШУ: ТЫ ГДЕ? ОТВЕТ: $ДОМА, $СПЛЮ",
    "ЗНАЧИТ, ЗА ДВЕРЬЮ ^НЕ ^ОНА. ПРАВИЛО ПЕРВОЕ: НЕ ОТВЕЧАЙ",
    "ГОЛОС ЗОВЁТ ЕЩЁ ДВАЖДЫ. А ПОТОМ В ДВЕРЬ СТУЧАТ. ^ТРИ ^РАЗА",
    "И ~ТИШИНА",
    "Я ВЫКЛЮЧАЮ ЛАМПУ И ОТОДВИГАЮ КРАЙ $ОДЕЯЛА",
    "ДВОР ПОД ЛУНОЙ ~ПУСТОЙ. ТОЛЬКО ИНЕЙ",
    "А НА ИНЕЕ — ^СЛЕДЫ. ^БОСЫЕ. ПРИ МИНУС ШЕСТИ",
    "ОНИ ИДУТ ОТ КАЛИТКИ ПРЯМО К МОЕМУ $КРЫЛЬЦУ",
    "И ОБРАТНО ^НЕ ^ВОЗВРАЩАЮТСЯ",
    "ЗНАЧИТ, ОН ^ВСЁ ^ЕЩЁ ^ЗДЕСЬ",
    "Я ПРИЖИМАЮСЬ К СТЕКЛУ, ЧТОБЫ РАЗГЛЯДЕТЬ КРЫЛЬЦО",
    "И ВИЖУ В СТЕКЛЕ СВОЁ $ОТРАЖЕНИЕ",
    "А ЗА МОИМ ПЛЕЧОМ — ^ЕЩЁ ^ДВА ^ГЛАЗА",
    "КТО-ТО СТОИТ В КОМНАТЕ. ^ПРЯМО ^ЗА ^МНОЙ",
    "ЧАСТЬ ЧЕТВЁРТАЯ. $ОБЕРНУТЬСЯ ИЛИ НЕТ?",
  ],
  scenes: [
    { until: 4, tape: ["!", "СЕЗОН ЗАКРЫТ · ЧАСТЬ 3"], stamp: "НОЧЬ 4 · 02:00", render: (at, dur) => <Voice at={at} dur={dur} /> },
    { until: 6, tape: ["!", "НЕ ОТВЕЧАТЬ"], stamp: "НОЧЬ 4 · 02:06", render: (at, dur) => <Peek at={at} dur={dur} /> },
    { until: 10, tape: ["!", "СЛЕДЫ"], stamp: "НОЧЬ 4 · 02:07", render: (at, dur) => <Steps at={at} dur={dur} /> },
    { until: 14, tape: ["!", "ОТРАЖЕНИЕ"], stamp: "НОЧЬ 4 · 02:09", render: (at, dur) => <Glass at={at} dur={dur} /> },
    { until: 15, render: () => <EndCard /> },
  ],
};
