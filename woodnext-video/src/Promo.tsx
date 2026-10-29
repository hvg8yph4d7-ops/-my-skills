import React from "react";
import {
  AbsoluteFill,
  Solid,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { TransitionSeries, linearTiming, TransitionPresentation } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { lightLeak } from "@remotion/effects/light-leak";
import { loadFont } from "@remotion/fonts";

// Шрифты лежат локально в public/fonts (Montserrat — заголовки, Manrope — текст)
const head = "Montserrat";
const body = "Manrope";
for (const [family, file, weight] of [
  [head, "montserrat", "700"],
  [head, "montserrat", "800"],
  [head, "montserrat", "900"],
  [body, "manrope", "600"],
  [body, "manrope", "700"],
] as const) {
  for (const subset of ["cyrillic", "latin"]) {
    loadFont({ family, url: staticFile(`fonts/${file}-${subset}-${weight}-normal.woff2`), weight });
  }
}

export const FPS = 30;

// Фирменные цвета (как на сайте)
const C = {
  bg: "#121418",
  wood: "#B8743A",
  woodLight: "#D9A066",
  green: "#5E8C3A",
  white: "#FFFFFF",
};

/* ---------------- Два стиля монтажа ---------------- */
type Theme = {
  name: "wood" | "fresh";
  clipFilter: string;
  shade: string; // затемнение сверху/снизу кадра
  pillBg: string;
  pillText: string;
  pillBorder: string;
  titleBoxed: boolean; // заголовок на плашках (светлый стиль)
  title: string;
  titleAccent: string;
  cardBg: string;
  cardText: string;
  cardSub: string;
  prize: string;
  endBg: string;
  endText: string;
  endSub: string;
  logoFilter: string;
  btnBg: string;
  btnText: string;
};

const CREAM = "#F4EDE3";
const INK = "#1B1E23";

export const THEMES: Record<"wood" | "fresh", Theme> = {
  // Тёмный «дерево»: графит, тёплое дерево, вспышки
  wood: {
    name: "wood",
    clipFilter: "saturate(1.08) contrast(1.05) sepia(0.06)",
    shade:
      "linear-gradient(180deg, rgba(18,20,24,.55) 0%, rgba(18,20,24,0) 28%, rgba(18,20,24,0) 62%, rgba(18,20,24,.55) 100%)",
    pillBg: "rgba(18,20,24,.78)",
    pillText: "#FFFFFF",
    pillBorder: "2px solid rgba(217,160,102,.55)",
    titleBoxed: false,
    title: "#FFFFFF",
    titleAccent: "#D9A066",
    cardBg: "rgba(18,20,24,.8)",
    cardText: "#FFFFFF",
    cardSub: "rgba(255,255,255,.85)",
    prize: "linear-gradient(135deg, #D9A066, #B8743A 55%, #8E5427)",
    endBg:
      "radial-gradient(70% 45% at 80% 10%, rgba(217,160,102,.35), transparent 70%), radial-gradient(70% 50% at 10% 100%, rgba(184,116,58,.3), transparent 70%), #121418",
    endText: "#FFFFFF",
    endSub: "rgba(255,255,255,.75)",
    logoFilter: "drop-shadow(0 6px 20px rgba(0,0,0,.5))",
    btnBg: "#FFFFFF",
    btnText: "#121418",
  },
  // Светлый «свежий»: кремовые плашки, зелёные акценты, сочная картинка, блики
  fresh: {
    name: "fresh",
    clipFilter: "saturate(1.22) contrast(1.08) brightness(1.04)",
    shade: "linear-gradient(180deg, rgba(0,0,0,.18) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 75%, rgba(0,0,0,.25) 100%)",
    pillBg: CREAM,
    pillText: INK,
    pillBorder: "none",
    titleBoxed: true,
    title: INK,
    titleAccent: "#FFFFFF",
    cardBg: CREAM,
    cardText: INK,
    cardSub: "rgba(27,30,35,.7)",
    prize: "linear-gradient(135deg, #7FB352, #5E8C3A 55%, #3F6526)",
    endBg: `radial-gradient(80% 50% at 85% 0%, rgba(94,140,58,.28), transparent 70%), radial-gradient(70% 50% at 0% 100%, rgba(217,160,102,.35), transparent 70%), ${CREAM}`,
    endText: INK,
    endSub: "rgba(27,30,35,.7)",
    logoFilter: "brightness(0) saturate(100%) drop-shadow(0 4px 10px rgba(0,0,0,.12))",
    btnBg: "#5E8C3A",
    btnText: "#FFFFFF",
  },
};

const ThemeCtx = React.createContext<Theme>(THEMES.wood);
const useTheme = () => React.useContext(ThemeCtx);

type Word = [text: string, start: number, end: number];

// Удачные дубли (секунды в исходном ролике) и слова для субтитров с их временем.
// Слова сгруппированы в «страницы» — по 1–4 слова на экране.
export const SCENES: { src: string; from: number; to: number; pages: Word[][]; capBottom?: number }[] = [
  {
    src: "d.mp4", // терраса готового дома — вступление
    from: 8.4,
    to: 15.35,
    pages: [
      [["WOODNEXT", 8.78, 9.3]],
      [["День", 9.3, 9.62], ["открытых", 9.62, 9.98], ["дверей", 9.98, 10.42]],
      [["В", 10.44, 10.48], ["честь", 10.48, 10.72], ["двух", 10.72, 10.98], ["лет", 10.98, 11.22]],
      [["филиала", 11.22, 11.84], ["в", 11.84, 11.95]],
      [["Каменске-Уральском", 11.95, 12.88]],
      [["Все,", 12.96, 13.12], ["кто", 13.12, 13.34], ["придёт,", 13.34, 13.64]],
      [["станут", 13.72, 14.1], ["участниками", 14.1, 14.7]],
      [["розыгрыша", 14.7, 15.15]],
    ],
  },
  {
    src: "a.mp4", // у бани — призы
    from: 1.95,
    to: 6.85,
    pages: [
      [["8", 2.22, 2.52], ["ноября", 2.52, 3.02]],
      [["мы", 3.02, 3.18], ["разыгрываем", 3.18, 3.64]],
      [["сертификат", 3.64, 4.22], ["на", 4.22, 4.5]],
      [["50 000", 4.5, 5.3], ["рублей", 5.3, 5.74]],
      [["и", 5.74, 6.0], ["другие", 6.0, 6.38], ["подарки", 6.38, 6.7]],
    ],
  },
  {
    src: "c.mp4", // цех — экскурсия
    from: 11.0,
    to: 17.5,
    pages: [
      [["Проведём", 11.26, 11.8], ["экскурсию", 11.8, 12.42]],
      [["по", 12.42, 12.76], ["производству", 12.76, 13.28]],
      [["и", 13.28, 13.56], ["покажем,", 13.56, 13.96], ["как", 14.08, 14.46]],
      [["строим", 14.46, 14.78], ["дома", 14.78, 14.98], ["и", 14.98, 15.1], ["бани", 15.1, 15.46]],
      [["И", 15.54, 15.76], ["ответим", 15.76, 16.1], ["на", 16.1, 16.38]],
      [["все", 16.38, 16.62], ["ваши", 16.62, 17.0], ["вопросы", 17.0, 17.35]],
    ],
  },
  {
    src: "e.mp4", // диван — кофе
    capBottom: 380, // ведущая сидит — субтитры ниже лица
    from: 13.5,
    to: 16.85,
    pages: [
      [["Угостим", 13.86, 14.48], ["вкусным", 14.48, 15.02], ["кофе", 15.02, 15.64]],
      [["и", 15.64, 15.78], ["нальём", 15.78, 16.14], ["игристого", 16.14, 16.7]],
    ],
  },
  {
    src: "b.mp4", // синяя дверь — призыв
    from: 8.45,
    to: 13.75,
    pages: [
      [["Мы", 8.8, 8.94], ["ждём", 8.94, 9.2], ["вас", 9.2, 9.5]],
      [["8", 9.5, 9.76], ["ноября", 9.76, 10.12], ["в 12:00", 10.12, 10.7]],
      [["Напиши", 10.7, 11.42], ["«ХОЧУ»", 11.42, 11.82]],
      [["в", 11.82, 11.9], ["комментариях", 11.9, 12.38]],
      [["отправим", 12.38, 12.82], ["форму", 12.82, 13.06]],
      [["для", 13.06, 13.34], ["записи", 13.34, 13.65]],
    ],
  },
];

export const T = 8; // длина перехода, кадров
export const END = 4 * FPS; // финальный кадр

const len = (s: { from: number; to: number }) => Math.round((s.to - s.from) * FPS);

// Начало каждой сцены на общей шкале (с учётом перекрытия переходов)
export const STARTS = SCENES.reduce<number[]>((acc, s, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + len(SCENES[i - 1]) - T);
  return acc;
}, []);
export const TOTAL = STARTS[STARTS.length - 1] + len(SCENES[SCENES.length - 1]) - T + END;

/* ---------------- Сцена с видео: лёгкий наезд камеры и тёплая цветокоррекция ---------------- */
const Clip: React.FC<{ src: string; from: number; dur: number; zoomIn?: boolean }> = ({
  src,
  from,
  dur,
  zoomIn = true,
}) => {
  const frame = useCurrentFrame();
  const th = useTheme();
  const z = interpolate(frame, [0, dur], zoomIn ? [1, 1.07] : [1.07, 1], {
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, overflow: "hidden" }}>
      <OffthreadVideo
        src={staticFile(src)}
        trimBefore={Math.round(from * FPS)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${z})`,
          filter: th.clipFilter,
        }}
      />
      {/* затемнение сверху и снизу — чтобы надписи читались */}
      <AbsoluteFill
        style={{ background: th.shade }}
      />
    </AbsoluteFill>
  );
};

/* ---------------- Анимации появления ---------------- */
const usePop = (delay = 0, damping = 14) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass: 0.7 } });
};

// Плавное исчезновение в конце отрезка
const useOut = (dur: number, outLen = 10) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [dur - outLen, dur], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

const Pill: React.FC<{ children: React.ReactNode; color?: string; delay?: number; size?: number }> = ({
  children,
  color,
  delay = 0,
  size = 40,
}) => {
  const p = usePop(delay);
  const th = useTheme();
  const bg = color ?? th.pillBg;
  const fg = color ? C.white : th.pillText;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 16,
        padding: `${size * 0.45}px ${size * 0.8}px`,
        borderRadius: 999,
        background: bg,
        border: color ? "none" : th.pillBorder,
        color: fg,
        fontFamily: head,
        fontWeight: 800,
        fontSize: size,
        letterSpacing: 1,
        textTransform: "uppercase",
        boxShadow: "0 12px 40px rgba(0,0,0,.35)",
        transform: `translateY(${(1 - p) * 40}px) scale(${0.8 + p * 0.2})`,
        opacity: p,
      }}
    >
      {children}
    </div>
  );
};

/* ---------------- Логотип: белый WOODNEXT, въезжает со стрелкой ---------------- */
const Logo: React.FC<{ width?: number; delay?: number; onLight?: boolean }> = ({ width = 560, delay = 0, onLight }) => {
  const frame = useCurrentFrame();
  const p = usePop(delay, 18);
  const th = useTheme();
  const reveal = interpolate(frame - delay, [0, 18], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <Img
      src={staticFile("logo.png")}
      style={{
        width,
        clipPath: `inset(0 ${100 - reveal}% 0 0)`,
        transform: `translateX(${(1 - p) * -30}px)`,
        filter: onLight ? th.logoFilter : "drop-shadow(0 6px 20px rgba(0,0,0,.5))",
      }}
    />
  );
};

/* ---------------- Крупный заголовок, слова выпрыгивают по очереди ---------------- */
const BigTitle: React.FC<{ lines: string[]; accent?: number; delay?: number; size?: number }> = ({
  lines,
  accent,
  delay = 0,
  size = 112,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const th = useTheme();
  return (
    <div style={{ fontFamily: head, fontWeight: 900, fontSize: size, lineHeight: 1.0, textTransform: "uppercase" }}>
      {lines.map((line, i) => {
        const p = spring({ frame: frame - delay - i * 5, fps, config: { damping: 13, mass: 0.6 } });
        return (
          <div
            key={i}
            style={{
              color: i === accent ? th.titleAccent : th.title,
              transform: th.titleBoxed ? `translateX(${(1 - p) * -60}px)` : `translateY(${(1 - p) * 60}px)`,
              opacity: p,
              textShadow: th.titleBoxed ? "none" : "0 6px 30px rgba(0,0,0,.55)",
            }}
          >
            {th.titleBoxed ? (
              <span
                style={{
                  display: "inline-block",
                  background: i === accent ? C.green : CREAM,
                  padding: "6px 22px",
                  margin: "4px 0",
                  borderRadius: 14,
                  boxShadow: "0 10px 30px rgba(0,0,0,.18)",
                }}
              >
                {line}
              </span>
            ) : (
              line
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- Плашка-карточка с иконкой ---------------- */
const Card: React.FC<{ icon: string; title: string; text?: string; delay?: number; accent?: boolean }> = ({
  icon,
  title,
  text,
  delay = 0,
  accent,
}) => {
  const p = usePop(delay);
  const th = useTheme();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "26px 34px",
        borderRadius: 28,
        background: accent
          ? `linear-gradient(135deg, ${C.woodLight}, ${C.wood} 60%, #8E5427)`
          : th.cardBg,
        border: accent || th.name === "fresh" ? "none" : "2px solid rgba(255,255,255,.12)",
        boxShadow: "0 16px 50px rgba(0,0,0,.4)",
        transform: `translateX(${(1 - p) * -80}px)`,
        opacity: p,
      }}
    >
      <div style={{ fontSize: 58 }}>{icon}</div>
      <div>
        <div style={{ fontFamily: head, fontWeight: 800, fontSize: 44, color: th.cardText, textTransform: "uppercase" }}>
          {title}
        </div>
        {text ? (
          <div style={{ fontFamily: body, fontWeight: 600, fontSize: 34, color: th.cardSub, marginTop: 4 }}>
            {text}
          </div>
        ) : null}
      </div>
    </div>
  );
};

/* ---------------- Субтитры: слова по очереди, текущее слово подсвечено ---------------- */
const Captions: React.FC<{ scene: (typeof SCENES)[number] }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const th = useTheme();
  const t = scene.from + frame / fps;
  const pages = scene.pages;
  let idx = -1;
  for (let i = 0; i < pages.length; i++) if (t >= pages[i][0][1] - 0.05) idx = i;
  if (idx < 0) return null;
  const page = pages[idx];
  const last = page[page.length - 1];
  const nextStart = idx < pages.length - 1 ? pages[idx + 1][0][1] : last[2] + 0.5;
  if (t > nextStart) return null;
  const pageFrame = (t - page[0][1]) * fps;
  const pop = spring({ frame: pageFrame, fps, config: { damping: 12, mass: 0.5 } });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: scene.capBottom ?? 560 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "6px 18px",
          maxWidth: 940,
          ...(th.name === "fresh"
            ? { background: "#FFFFFF", padding: "14px 22px", borderRadius: 26, boxShadow: "0 14px 40px rgba(0,0,0,.25)" }
            : {}),
          transform: `scale(${0.85 + pop * 0.15}) translateY(${(1 - pop) * 20}px)`,
          opacity: Math.min(1, pop * 1.5),
        }}
      >
        {page.map(([w, st, en], i) => {
          const active = t >= st && (t < en || i === page.length - 1);
          const said = t >= st;
          return (
            <span
              key={i}
              style={th.name === "fresh" ? {
                fontFamily: head,
                fontWeight: 800,
                fontSize: 68,
                lineHeight: 1.15,
                padding: "0 4px",
                color: active ? C.green : INK,
                opacity: said ? 1 : 0.45,
                transform: active ? "scale(1.06)" : "none",
                display: "inline-block",
              } : {
                fontFamily: head,
                fontWeight: 900,
                fontSize: 76,
                lineHeight: 1.15,
                textTransform: "uppercase",
                padding: "2px 16px",
                borderRadius: 16,
                color: C.white,
                background: active ? C.wood : "transparent",
                opacity: said ? 1 : 0.7,
                transform: active ? "scale(1.06)" : "none",
                textShadow: active ? "none" : "0 0 18px rgba(0,0,0,.7), 0 4px 10px rgba(0,0,0,.6)",
                WebkitTextStroke: active ? "0" : "2px rgba(0,0,0,.35)",
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- Наложения поверх каждой сцены ---------------- */
const Top: React.FC<{ children: React.ReactNode; dur: number }> = ({ children, dur }) => {
  const o = useOut(dur, 6);
  return (
    <AbsoluteFill style={{ padding: "240px 70px 0", alignItems: "flex-start", opacity: o }}>{children}</AbsoluteFill>
  );
};

// 1. Терраса: логотип и повод
const OverlayIntro: React.FC<{ dur: number }> = ({ dur }) => (
  <Top dur={dur}>
    <Logo width={480} />
    <div style={{ marginTop: 28 }}>
      <Pill delay={10} size={28}>
        <span style={{ width: 14, height: 14, borderRadius: 7, background: C.woodLight }} />2 года Каменскому филиалу
      </Pill>
    </div>
    <div style={{ marginTop: 18 }}>
      <Pill delay={18} color={C.green} size={36}>
        📅 8 ноября · 12:00
      </Pill>
    </div>
  </Top>
);

// 2. У бани: призы
const OverlayPrize: React.FC<{ dur: number }> = ({ dur }) => (
  <Top dur={dur}>
    <Sequence from={Math.round(1.5 * FPS)} layout="none">
      <Prize />
    </Sequence>
  </Top>
);

// 3. Цех: экскурсия
const OverlayTour: React.FC<{ dur: number }> = ({ dur }) => (
  <Top dur={dur}>
    <BigTitle lines={["Экскурсия", "по производству"]} accent={1} size={80} delay={2} />
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 30 }}>
      <Card icon="🪵" title="Каркас и утеплитель" delay={60} />
      <Card icon="🙋" title="Ответы на вопросы" delay={135} />
    </div>
  </Top>
);

// 4. Кофе
const OverlayCoffee: React.FC<{ dur: number }> = ({ dur }) => (
  <Top dur={dur}>
    <Pill delay={4} size={40}>
      ☕ Кофе
    </Pill>
    <div style={{ marginTop: 18 }}>
      <Pill delay={52} size={40}>
        🥂 Игристое
      </Pill>
    </div>
  </Top>
);

// 5. Дверь: призыв
const OverlayCTA: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const wiggle = Math.sin(frame / 3) * 3 * (frame > 75 ? 1 : 0);
  return (
    <Top dur={dur}>
      <Pill delay={20} color={C.green} size={44}>
        📅 8 ноября · 12:00
      </Pill>
      <div style={{ marginTop: 18 }}>
        <Pill delay={30} size={28}>
          📍 Каменск-Уральский, Суворова 47В
        </Pill>
      </div>
      <div style={{ marginTop: 30, transform: `rotate(${-4 + wiggle}deg)` }}>
        <Pill delay={80} color={C.white} size={52}>
          <span style={{ color: C.bg }}>💬 «ХОЧУ»</span>
        </Pill>
      </div>
    </Top>
  );
};

const Prize: React.FC = () => {
  const p = usePop(0, 11);
  const th = useTheme();
  const frame = useCurrentFrame();
  const shine = interpolate(frame, [10, 40], [-120, 220], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        width: 760,
        padding: "30px 40px",
        borderRadius: 34,
        background: th.prize,
        boxShadow: "0 24px 70px rgba(184,116,58,.55)",
        transform: `scale(${0.6 + p * 0.4}) rotate(${(1 - p) * -6}deg)`,
        transformOrigin: "left center",
        opacity: Math.min(1, p * 1.4),
      }}
    >
      <div style={{ fontFamily: head, fontWeight: 800, fontSize: 30, letterSpacing: 3, color: "#fff", opacity: 0.9 }}>
        🎁 РОЗЫГРЫШ ПРИЗОВ
      </div>
      <div style={{ fontFamily: head, fontWeight: 900, fontSize: 120, color: "#fff", lineHeight: 1.05 }}>50 000 ₽</div>
      <div style={{ fontFamily: head, fontWeight: 800, fontSize: 36, color: "#fff", textTransform: "uppercase" }}>
        сертификат
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${shine}%`,
          width: 120,
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent)",
          transform: "skewX(-20deg)",
        }}
      />
    </div>
  );
};

/* ---------------- Финальный кадр ---------------- */
const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const btn = spring({ frame: frame - 34, fps, config: { damping: 10 } });
  const th = useTheme();
  const pulse = 1 + Math.max(0, Math.sin((frame - 50) / 6)) * 0.04 * (frame > 50 ? 1 : 0);
  return (
    <AbsoluteFill
      style={{
        background: th.endBg,
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 80,
      }}
    >
      <Logo width={620} onLight />
      <div style={{ marginTop: 70 }}>
        <BigTitle lines={["День", "открытых", "дверей"]} accent={th.name === "fresh" ? 1 : undefined} delay={8} size={120} />
      </div>
      <div style={{ marginTop: 50 }}>
        <Pill delay={22} color={C.green} size={50}>
          8 ноября · 12:00
        </Pill>
      </div>
      <div
        style={{
          marginTop: 60,
          padding: "34px 70px",
          borderRadius: 28,
          background: th.btnBg,
          color: th.btnText,
          fontFamily: head,
          fontWeight: 900,
          fontSize: 50,
          textTransform: "uppercase",
          transform: `scale(${btn * pulse})`,
          boxShadow: "0 20px 60px rgba(0,0,0,.45)",
        }}
      >
        Напиши «ХОЧУ»
        <div style={{ fontSize: 34, fontWeight: 800, marginTop: 8 }}>в комментариях — пришлём форму записи</div>
      </div>
      <div style={{ marginTop: 40, fontFamily: body, fontWeight: 600, fontSize: 34, color: th.endSub, opacity: btn }}>
        📍 Каменск-Уральский, ул. Суворова, 47В, корп. 7
      </div>
    </AbsoluteFill>
  );
};

const OVERLAYS = [OverlayIntro, OverlayPrize, OverlayTour, OverlayCoffee, OverlayCTA];

// Разные переходы между роликами
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TRANSITIONS_FRESH: TransitionPresentation<any>[] = [
  flip({ direction: "from-right" }),
  clockWipe({ width: 1080, height: 1920 }),
  slide({ direction: "from-left" }),
  flip({ direction: "from-bottom" }),
  fade(),
];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TRANSITIONS: TransitionPresentation<any>[] = [
  slide({ direction: "from-right" }),
  wipe({ direction: "from-left" }),
  slide({ direction: "from-bottom" }),
  wipe({ direction: "from-top-left" }),
  fade(),
];

/* ---------------- Вспышка на склейке ---------------- */
const Flash: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at - 4, at, at + 8], [0, 0.35, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ background: C.woodLight, opacity: o, mixBlendMode: "screen" }} />;
};

/* ---------------- Световой блик на склейке (светлый стиль) ---------------- */
const Leak: React.FC<{ seed: number }> = ({ seed }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  return (
    <Solid
      width={width}
      height={height}
      style={{ mixBlendMode: "screen" }}
      effects={[
        lightLeak({
          seed,
          hueShift: 20,
          progress: interpolate(frame, [0, durationInFrames - 1], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }),
      ]}
    />
  );
};

export const PromoFresh: React.FC = () => <Promo variant="fresh" />;

export const Promo: React.FC<{ variant?: "wood" | "fresh" }> = ({ variant = "wood" }) => {
  const th = THEMES[variant];
  const transitions = variant === "fresh" ? TRANSITIONS_FRESH : TRANSITIONS;
  return (
    <ThemeCtx.Provider value={th}>
    <AbsoluteFill style={{ backgroundColor: variant === "fresh" ? CREAM : C.bg }}>
      <TransitionSeries>
        {SCENES.flatMap((s, i) => {
          const dur = len(s);
          const items = [
            <TransitionSeries.Sequence key={`s${i}`} durationInFrames={dur}>
              <Clip src={s.src} from={s.from} dur={dur} zoomIn={i % 2 === 0} />
              <Captions scene={s} />
            </TransitionSeries.Sequence>,
          ];
          items.push(
            <TransitionSeries.Transition
              key={`t${i}`}
              presentation={transitions[i]}
              timing={linearTiming({ durationInFrames: T, easing: Easing.inOut(Easing.cubic) })}
            />,
          );
          return items;
        })}
        <TransitionSeries.Sequence durationInFrames={END + T}>
          <EndCard />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* Надписи поверх роликов */}
      {SCENES.map((s, i) => {
        const Ov = OVERLAYS[i];
        const start = STARTS[i] + (i === 0 ? 0 : T);
        const end = i < SCENES.length - 1 ? STARTS[i + 1] : STARTS[i] + len(s) - T;
        return (
          <Sequence key={`o${i}`} from={start} durationInFrames={end - start}>
            <Ov dur={end - start} />
          </Sequence>
        );
      })}

      {/* Вспышки на склейках */}
      {STARTS.slice(1).map((st, i) => (
        variant === "fresh" ? (
          <Sequence key={`l${i}`} from={st - 10} durationInFrames={28}>
            <Leak seed={i * 3 + 1} />
          </Sequence>
        ) : (
          <Flash key={`f${i}`} at={st + T / 2} />
        )
      ))}
    </AbsoluteFill>
    </ThemeCtx.Provider>
  );
};
