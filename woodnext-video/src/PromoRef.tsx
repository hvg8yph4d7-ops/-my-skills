// Вариант 3 — «как в референсе» (ролик woodnext_96 «Баня за 970 000»):
// простые склейки, естественный цвет, крупный белый заголовок сверху,
// тонкие субтитры фразами по центру, в конце — карточка профиля и «нажатие» курсором.
import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  Series,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FPS, SCENES } from "./Promo"; // там же подключаются шрифты

const head = "Montserrat";
const body = "Manrope";

type Phrase = [text: string, start: number, end: number];

// Сцены (удачные дубли из SCENES), заголовок и фразы субтитров
const REF = [
  {
    title: ["ДЕНЬ ОТКРЫТЫХ", "ДВЕРЕЙ"],
    phrases: [
      ["WOODNEXT — день открытых дверей", 8.78, 10.42],
      ["в честь двух лет филиала\nв Каменске-Уральском", 10.44, 12.88],
      ["все, кто придёт, станут\nучастниками розыгрыша 🎁", 12.96, 15.35],
    ] as Phrase[],
  },
  {
    title: ["РАЗЫГРЫВАЕМ", "50.000 ₽"],
    phrases: [
      ["8 ноября мы разыгрываем", 2.22, 3.64],
      ["сертификат на 50 000 рублей", 3.64, 5.74],
      ["и другие подарки 🎁", 5.74, 6.85],
    ] as Phrase[],
  },
  {
    title: ["ЭКСКУРСИЯ", "ПО ПРОИЗВОДСТВУ"],
    phrases: [
      ["проведём экскурсию по производству", 11.26, 13.28],
      ["и покажем, как строим\nдома и бани", 13.28, 15.46],
      ["и ответим на все ваши вопросы", 15.54, 17.5],
    ] as Phrase[],
  },
  {
    title: ["КОФЕ", "И ИГРИСТОЕ"],
    phrases: [
      ["угостим вкусным кофе ☕", 13.86, 15.64],
      ["и нальём игристого 🥂", 15.64, 16.85],
    ] as Phrase[],
  },
  {
    title: ["8 НОЯБРЯ", "В 12:00"],
    phrases: [
      ["мы ждём вас 8 ноября в 12:00", 8.8, 10.7],
      ["напиши «хочу» в комментариях", 10.7, 12.38],
      ["отправим форму для записи ❤️", 12.38, 14.3],
    ] as Phrase[],
  },
];

// В последней сцене оставляем хвост после фразы — там всплывает карточка профиля
const cut = (i: number) => ({ ...SCENES[i], to: i === SCENES.length - 1 ? 14.3 : SCENES[i].to });
const len = (i: number) => Math.round((cut(i).to - cut(i).from) * FPS);
// Когда всплывает карточка профиля (секунда в исходном ролике последней сцены)
const CARD_AT = 13.3;
export const REF_TOTAL = SCENES.reduce((a, _, i) => a + len(i), 0);

const shadow = "0 2px 12px rgba(0,0,0,.55), 0 1px 3px rgba(0,0,0,.6)";

const Title: React.FC<{ lines: string[] }> = ({ lines }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 5], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 300, opacity: o }}>
      <div
        style={{
          fontFamily: head,
          fontWeight: 900,
          fontSize: 92,
          lineHeight: 1.05,
          color: "#fff",
          textAlign: "center",
          textShadow: shadow,
          letterSpacing: 1,
        }}
      >
        {lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Subs: React.FC<{ from: number; phrases: Phrase[]; hideAfter?: number }> = ({ from, phrases, hideAfter }) => {
  const frame = useCurrentFrame();
  const t = from + frame / FPS;
  if (hideAfter !== undefined && t >= hideAfter) return null;
  const i = phrases.findIndex(([, st], k) => t >= st - 0.05 && (k === phrases.length - 1 || t < phrases[k + 1][1] - 0.05));
  if (i < 0) return null;
  const [text, st, en] = phrases[i];
  if (t > en + 0.4) return null;
  const o = interpolate(t, [st - 0.05, st + 0.12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 640 }}>
      <div
        style={{
          fontFamily: body,
          fontWeight: 600,
          fontSize: 50,
          lineHeight: 1.25,
          color: "#fff",
          textAlign: "center",
          whiteSpace: "pre-line",
          textShadow: shadow,
          maxWidth: 900,
          opacity: o,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

/* Карточка профиля + курсор, который на неё нажимает */
const ProfileCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 14, mass: 0.6 } });
  // курсор подлетает снизу справа и «нажимает»
  const c = spring({ frame: frame - 14, fps, config: { damping: 16 } });
  const press = interpolate(frame, [34, 38, 44], [1, 0.8, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glow = interpolate(frame, [36, 44, 60], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 470 }}>
      <div
        style={{
          position: "relative",
          width: 760,
          padding: "30px 34px",
          borderRadius: 30,
          background: "rgba(38,38,38,.96)",
          boxShadow: `0 20px 60px rgba(0,0,0,.5), 0 0 0 ${glow * 6}px rgba(255,255,255,${glow * 0.35})`,
          transform: `scale(${(0.7 + p * 0.3) * (frame > 34 && frame < 46 ? 0.98 : 1)})`,
          opacity: p,
          color: "#fff",
          fontFamily: body,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              background: "#121418",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "4px solid #D9A066",
              flex: "none",
            }}
          >
            <Img src={staticFile("logo.png")} style={{ width: 96 }} />
          </div>
          <div>
            <div style={{ fontFamily: head, fontWeight: 800, fontSize: 36 }}>woodnext_96</div>
            <div style={{ fontWeight: 700, fontSize: 28, marginTop: 6, opacity: 0.9 }}>
              МОДУЛЬНЫЕ ДОМА И БАНИ | г. Екатеринбург
            </div>
          </div>
        </div>
        <div style={{ fontWeight: 600, fontSize: 28, marginTop: 20, lineHeight: 1.4, opacity: 0.85 }}>
          Производство — г. Каменск-Уральский
          <br />
          4000+ реализованных проектов
        </div>
        <div
          style={{
            marginTop: 22,
            padding: "16px 0",
            borderRadius: 14,
            background: "#0095F6",
            textAlign: "center",
            fontWeight: 700,
            fontSize: 32,
          }}
        >
          Подписаться
        </div>
        {/* курсор */}
        <svg
          viewBox="0 0 24 24"
          width={90}
          height={90}
          style={{
            position: "absolute",
            right: 120 - (1 - c) * -260,
            bottom: -30 - (1 - c) * 300,
            transform: `scale(${press})`,
            transformOrigin: "top left",
            filter: "drop-shadow(0 4px 8px rgba(0,0,0,.5))",
            opacity: c,
          }}
        >
          <path d="M4 2l15 9-6.5 1.6L16 20l-3 1.4-3.4-7.3L4 18z" fill="#B9A2FF" stroke="#fff" strokeWidth="1.2" />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

export const PromoRef: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Series>
        {SCENES.map((_, i) => {
          const s = cut(i);
          const dur = len(i);
          const last = i === SCENES.length - 1;
          return (
            <Series.Sequence key={i} durationInFrames={dur}>
              <AbsoluteFill>
                <OffthreadVideo
                  src={staticFile(s.src)}
                  trimBefore={Math.round(s.from * FPS)}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </AbsoluteFill>
              <Title lines={REF[i].title} />
              <Subs from={s.from} phrases={REF[i].phrases} hideAfter={last ? CARD_AT : undefined} />
              {last ? (
                <Sequence from={Math.round((CARD_AT - s.from) * FPS)}>
                  <ProfileCard />
                </Sequence>
              ) : null}
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};
