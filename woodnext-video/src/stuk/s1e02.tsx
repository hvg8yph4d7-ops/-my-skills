// «Сезон закрыт», серия 2 — «Записка деда». Схема как у surv_protocol:
// удар → ставки → «первое/второе/третье» с хитростями → «была лишь одна проблема» → поворот.
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { EpisodeDef } from "./Episode";
import { body, C, Camera, clamp, Dacha, Dog, EndCard, Fence, Forest, Mood, Outside, Pills, Sfx, Sky, Svg } from "./kit";
import timing from "./timing/s1e02.json";

type P = { at: (i: number) => number; dur: number };

// 1. Тёмный дом Ковалёвых: ставки
const Stakes: React.FC<P> = ({ at, dur }) => (
  <AbsoluteFill>
    <Camera dur={dur} from={1.12} to={1.02} oy="44%">
      <Svg>
        <Outside lit={0} />
      </Svg>
    </Camera>
    <Pills
      y={560}
      items={[
        ["ОН ЗНАЕТ, ЧТО Я ЗДЕСЬ", at(1) + 20, "#7a2c26"],
        ["ДО РАССВЕТА — 9 ЧАСОВ", at(2), "#2b3a5a"],
        ["ДО ТРАССЫ — 7 КМ", at(2) + 30, "#2b3a5a"],
      ]}
    />
    <Mood />
  </AbsoluteFill>
);

// 2. Записка деда на холодильнике
const Line: React.FC<{ y: number; text: string; at: number; blur?: boolean }> = ({ y, text, at, blur }) => {
  const f = useCurrentFrame();
  const shown = interpolate(f, [at, at + 18], [0, 1], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 250,
        top: y,
        width: 600,
        fontFamily: "Caveat",
        fontWeight: 700,
        fontSize: 46,
        lineHeight: 1.05,
        color: "#1f2a44",
        clipPath: `inset(0 ${(1 - shown) * 100}% 0 0)`,
        filter: blur ? "blur(7px)" : undefined,
        opacity: blur ? 0.7 : 1,
      }}
    >
      {text}
    </div>
  );
};

const Note: React.FC<P> = ({ at, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const zoom = spring({ frame: f - at(4) + 10, fps, config: { damping: 18 } });
  return (
    <AbsoluteFill style={{ background: "#14151b" }}>
      <Camera dur={dur} from={1} to={1.06}>
        <AbsoluteFill style={{ transform: `scale(${0.9 + 0.1 * zoom})` }}>
          <div
            style={{
              position: "absolute",
              left: 150,
              top: 330,
              width: 780,
              height: 790,
              borderRadius: 30,
              background: "linear-gradient(90deg,#c9ccd2,#e3e5e9 40%,#c4c7cd)",
            }}
          />
          <div style={{ position: "absolute", left: 870, top: 560, width: 22, height: 220, borderRadius: 11, background: "#9a9da4" }} />
          <div
            style={{
              position: "absolute",
              left: 215,
              top: 390,
              width: 660,
              height: 660,
              background: "#efe6cf",
              transform: "rotate(-2deg)",
              boxShadow: "0 12px 30px rgba(0,0,0,.45)",
            }}
          />
          <div style={{ position: "absolute", left: 520, top: 380, width: 46, height: 46, borderRadius: 23, background: "#c0392b" }} />
          <div style={{ transform: "rotate(-2deg)", position: "absolute", inset: 0 }}>
            <Line y={440} text="Макс. Если остаёшься после 15-го — четыре правила:" at={at(4)} />
            <Line y={590} text="1. Не отвечай, если зовут по имени с улицы" at={at(5)} />
            <Line y={720} text="2. Не считай чужие окна ночью" at={at(5) + 30} blur />
            <Line y={800} text="3. Если Найда молчит —" at={at(5) + 40} blur />
            <Line y={880} text="4. Уезжая, не оглядывайся" at={at(5) + 50} blur />
          </div>
        </AbsoluteFill>
      </Camera>
      <Mood />
    </AbsoluteFill>
  );
};

// 3. Свет: окно гаснет снаружи, лампа уходит на пол
const Light: React.FC<P> = ({ at, dur }) => {
  const f = useCurrentFrame();
  const covered = interpolate(f, [at(9) + 10, at(9) + 30], [1, 0], clamp);
  return (
    <AbsoluteFill>
      <Camera dur={dur} from={1} to={1.08} oy="50%">
        <Svg>
          <Sky />
          <Forest y={1060} />
          <Dacha x={540} y={1060} s={1.25} lit={covered} />
          <Fence y={1130} />
        </Svg>
      </Camera>
      <Pills
        y={420}
        items={[
          ["СВЕТ = ПРИГЛАШЕНИЕ", at(8) + 25, "#7a2c26"],
          ["ОДЕЯЛА НА ОКНА", at(9) + 10],
          ["ЛАМПА — НА ПОЛ, ЗА ПЕЧКУ", at(9) + 40],
          ["СНАРУЖИ — ПУСТОЙ ДОМ", at(10), "#2b3a5a"],
        ]}
      />
      <Mood />
      <Sfx src="whoosh.mp3" at={at(9) + 10} volume={0.4} />
    </AbsoluteFill>
  );
};

// 4. Дверь: стул под ручку, колокольчик на ручку
const Door: React.FC<P> = ({ at, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chair = spring({ frame: f - at(13), fps, config: { damping: 14 } });
  const bellIn = f > at(13) + 30;
  const swing = Math.sin(f / 5) * 14 * Math.exp(-Math.max(0, f - at(13) - 30) / 40);
  return (
    <AbsoluteFill style={{ background: "#121318" }}>
      <Camera dur={dur} from={1} to={1.05}>
        <Svg>
          <rect x={0} y={0} width={1080} height={1920} fill="#17181f" />
          <rect x={0} y={1180} width={1080} height={740} fill="#1a1512" />
          <rect x={300} y={360} width={480} height={820} fill="#4a3627" stroke="#2c2018" strokeWidth={18} />
          <rect x={340} y={410} width={400} height={330} fill="none" stroke="#3a2a1e" strokeWidth={8} />
          <rect x={340} y={790} width={400} height={330} fill="none" stroke="#3a2a1e" strokeWidth={8} />
          <rect x={690} y={760} width={70} height={18} rx={9} fill="#b9a879" />
          <rect x={700} y={800} width={28} height={40} rx={4} fill="#8a7a5a" />
          {bellIn && (
            <g transform={`rotate(${swing} 735 770)`}>
              <line x1={735} y1={770} x2={735} y2={830} stroke="#8a7a5a" strokeWidth={4} />
              <path d="M710,880 q25,-70 50,0 z" fill="#c9a84a" />
              <circle cx={735} cy={886} r={8} fill="#8a6d2a" />
            </g>
          )}
          <g transform={`translate(${interpolate(chair, [0, 1], [1200, 0])},0)`}>
            <g transform="rotate(-24 640 1180)">
              <rect x={600} y={760} width={30} height={420} fill="#6b4f39" />
              <rect x={600} y={960} width={260} height={30} fill="#6b4f39" />
              <rect x={830} y={960} width={26} height={220} fill="#5a4230" />
            </g>
          </g>
        </Svg>
      </Camera>
      <Pills
        y={400}
        items={[
          ["ЗАМОК — ОДНОЙ ОТВЁРТКОЙ", at(12), "#7a2c26"],
          ["СТУЛ ПОД РУЧКУ", at(13) + 6],
          ["КОЛОКОЛЬЧИК НА РУЧКУ", at(13) + 34],
        ]}
      />
      <Mood />
      <Sfx src="knock1.wav" at={at(13) + 8} volume={0.5} />
    </AbsoluteFill>
  );
};

// 5. Чердак: одно деление связи, сообщение сестре
const Attic: React.FC<P> = ({ at, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const msg = spring({ frame: f - at(17), fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ background: "#0e0f14" }}>
      <Camera dur={dur} from={1.04} to={1}>
        <Svg>
          <polygon points="0,1300 540,250 1080,1300" fill="#18161a" />
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1={540} y1={250} x2={60 + i * 240} y2={1300} stroke="#2a221d" strokeWidth={10} />
          ))}
          <rect x={0} y={1300} width={1080} height={620} fill="#14110f" />
          <circle cx={540} cy={560} r={70} fill="#2b3150" stroke="#2a221d" strokeWidth={14} />
        </Svg>
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
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", padding: "22px 30px", color: "#fff", fontFamily: body, fontWeight: 700, fontSize: 28 }}>
            <span>01:12</span>
            <span style={{ display: "flex", gap: 5, alignItems: "flex-end" }}>
              {[14, 20, 26, 32].map((h, i) => (
                <span key={i} style={{ width: 8, height: h, background: i === 0 ? "#fff" : "#444", borderRadius: 2 }} />
              ))}
            </span>
          </div>
          <div style={{ padding: "6px 30px 18px", borderBottom: "2px solid #22252d", color: "#fff", fontFamily: body, fontWeight: 700, fontSize: 36 }}>
            Аня
            <div style={{ fontSize: 24, color: "#7d8390" }}>была в сети вчера</div>
          </div>
          {f >= at(17) && (
            <div
              style={{
                margin: "40px 26px 0 auto",
                width: 470,
                background: "#3d6bd6",
                color: "#fff",
                fontFamily: body,
                fontWeight: 700,
                fontSize: 32,
                lineHeight: 1.25,
                padding: "18px 22px",
                borderRadius: 22,
                transform: `scale(${msg})`,
                transformOrigin: "100% 100%",
              }}
            >
              Если не выйду на связь до 10 утра — звони в полицию. Я на даче деда.
              <div style={{ textAlign: "right", fontSize: 24, opacity: 0.8 }}>01:12 {f >= at(18) ? "✓" : "◷"}</div>
            </div>
          )}
        </div>
      </Camera>
      <Pills y={1100} items={[["ОДНО ДЕЛЕНИЕ СВЯЗИ", at(16) + 10, "#2b3a5a"]]} />
      <Mood />
    </AbsoluteFill>
  );
};

// 6. Два часа ночи: Найда смотрит на дверь, зовут голосом сестры
const Call: React.FC<P> = ({ at, dur }) => {
  const f = useCurrentFrame();
  const jump = interpolate(f, [at(20) + 4, at(20) + 14], [0, 1], clamp);
  const rings = f > at(21) ? (f - at(21)) % 30 : -1;
  const hitAt = at(22);
  return (
    <AbsoluteFill style={{ background: "#0d0e13" }}>
      <Camera dur={dur} from={1} to={1.12} shake={f > hitAt && f < hitAt + 25 ? 8 : 0}>
        <Svg>
          <rect x={0} y={1150} width={1080} height={770} fill="#16120f" />
          <polygon points="120,1150 520,1150 640,1500 0,1500" fill="#8fa3d6" opacity={0.12} />
          <rect x={150} y={420} width={300} height={360} fill="#2b3150" stroke="#2a221d" strokeWidth={14} />
          <rect x={620} y={380} width={380} height={770} fill="#3a2a1e" stroke="#241912" strokeWidth={16} />
          <rect x={940} y={760} width={40} height={16} rx={8} fill="#8a7a5a" />
          {rings >= 0 &&
            [0, 1, 2].map((k) => (
              <circle
                key={k}
                cx={810}
                cy={760}
                r={40 + ((rings + k * 10) % 30) * 7}
                fill="none"
                stroke="#e9e2cc"
                strokeWidth={3}
                opacity={1 - ((rings + k * 10) % 30) / 30}
              />
            ))}
          <Dog x={330} y={1190} s={0.9} alert={jump} />
        </Svg>
      </Camera>
      <Pills
        y={400}
        items={[
          ["НАЙДА СМОТРИТ НА ДВЕРЬ", at(20) + 10, "#2b3a5a"],
          ["ЗОВУТ ПО ИМЕНИ", at(21) + 10, "#7a2c26"],
          ["ГОЛОС СЕСТРЫ", hitAt + 4, C.red],
        ]}
      />
      <Mood />
      <Sfx src="growl.mp3" at={at(20) + 6} volume={0.7} />
      <Sfx src="hit.mp3" at={hitAt} volume={1} />
    </AbsoluteFill>
  );
};

export const S1E02: EpisodeDef = {
  id: "s1e02",
  timing,
  captions: [
    "СВЕТ У КОВАЛЁВЫХ ^ПОГАС, КОГДА Я ПОДНЯЛ $ТЕЛЕФОН",
    "ЗНАЧИТ, ТАМ ^КТО-ТО ЕСТЬ. И ОН ЗНАЕТ, ЧТО Я ЗДЕСЬ",
    "ДО РАССВЕТА $ДЕВЯТЬ $ЧАСОВ. ДО ТРАССЫ — СЕМЬ КИЛОМЕТРОВ",
    "НА ХОЛОДИЛЬНИКЕ — $ЗАПИСКА $ДЕДА. Я НИ РАЗУ ЕЁ НЕ ЧИТАЛ",
    "МАКС. ЕСЛИ ОСТАЁШЬСЯ ПОСЛЕ 15-ГО — $ЧЕТЫРЕ $ПРАВИЛА",
    "ПРАВИЛО ПЕРВОЕ: ^НЕ ^ОТВЕЧАЙ, ЕСЛИ ЗОВУТ ПО ИМЕНИ С УЛИЦЫ",
    "ДЕД НИЧЕГО НЕ ПИСАЛ ПРОСТО ТАК. НОЧЬ НУЖНО ПРОВЕСТИ С $УМОМ",
    "ПЕРВОЕ — $СВЕТ",
    "ОКНО С ЛАМПОЙ ВИДНО ИЗДАЛЕКА. СВЕТ — ЭТО ^ПРИГЛАШЕНИЕ",
    "Я ЗАВЕШИВАЮ ОКНА $ОДЕЯЛАМИ, А ЛАМПУ СТАВЛЮ $НА $ПОЛ, ЗА ПЕЧКУ",
    "СНАРУЖИ ДОМ СНОВА ~ПУСТОЙ. А Я ВИЖУ ВСЮ УЛИЦУ",
    "ВТОРОЕ — $ДВЕРЬ",
    "ДАЧНЫЙ ЗАМОК ОТКРЫВАЕТСЯ ^ОТВЁРТКОЙ",
    "ПОД РУЧКУ — $СТУЛ, А НА РУЧКУ — СТАРЫЙ $КОЛОКОЛЬЧИК",
    "КТО БЫ НИ ВОШЁЛ, Я УЗНАЮ $РАНЬШЕ, ЧЕМ ОН СДЕЛАЕТ ШАГ",
    "ТРЕТЬЕ — $СИГНАЛ",
    "СВЯЗЬ ЛОВИТ ТОЛЬКО НА ЧЕРДАКЕ. ~ОДНО ~ДЕЛЕНИЕ",
    "ПИШУ СЕСТРЕ: НЕ ВЫЙДУ НА СВЯЗЬ ДО ДЕСЯТИ — ЗВОНИ В $ПОЛИЦИЮ",
    "ОДНА СЕРАЯ ГАЛОЧКА. $УШЛО",
    "НА БУМАГЕ Я БЫЛ ГОТОВ КО ВСЕМУ. БЫЛА ЛИШЬ ^ОДНА ^ПРОБЛЕМА",
    "В ДВА ЧАСА НОЧИ НАЙДА ВСКОЧИЛА И УСТАВИЛАСЬ НА $ДВЕРЬ",
    "А С УЛИЦЫ, ТИХО И ЛАСКОВО, МЕНЯ ^ПОЗВАЛИ ^ПО ^ИМЕНИ",
    "^ГОЛОСОМ ^МОЕЙ ^СЕСТРЫ",
    "ЧАСТЬ ТРЕТЬЯ. $КТО СТОИТ ЗА ДВЕРЬЮ?",
  ],
  scenes: [
    { until: 2, tape: ["!", "СЕЗОН ЗАКРЫТ · ЧАСТЬ 2"], stamp: "НОЧЬ 4 · 23:59", render: (at, dur) => <Stakes at={at} dur={dur} /> },
    { until: 6, tape: ["!", "ЗАПИСКА ДЕДА"], render: (at, dur) => <Note at={at} dur={dur} /> },
    { until: 10, tape: ["1.", "СВЕТ"], stamp: "НОЧЬ 4 · 00:20", render: (at, dur) => <Light at={at} dur={dur} /> },
    { until: 14, tape: ["2.", "ДВЕРЬ"], stamp: "НОЧЬ 4 · 00:45", render: (at, dur) => <Door at={at} dur={dur} /> },
    { until: 18, tape: ["3.", "СИГНАЛ"], stamp: "НОЧЬ 4 · 01:12", render: (at, dur) => <Attic at={at} dur={dur} /> },
    { until: 22, tape: ["!", "ОДНА ПРОБЛЕМА"], stamp: "НОЧЬ 4 · 02:00", render: (at, dur) => <Call at={at} dur={dur} /> },
    { until: 23, render: () => <EndCard /> },
  ],
};
