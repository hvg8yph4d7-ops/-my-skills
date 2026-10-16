import React from "react";
import {
  AbsoluteFill,
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

// Ролики: файл, откуда и докуда берём (секунды) — обрезаны тишина в начале и в конце
export const SCENES = [
  { src: "a.mp4", from: 0.0, to: 6.7 }, // у бани, баннер WOODNEXT
  { src: "b.mp4", from: 0.2, to: 13.6 }, // синяя дверь производства
  { src: "c.mp4", from: 0.85, to: 17.4 }, // цех, каркасы
  { src: "d.mp4", from: 0.85, to: 15.15 }, // терраса готового дома
  { src: "e.mp4", from: 0.3, to: 16.7 }, // диван, кофе
] as const;

export const T = 12; // длина перехода, кадров
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
          filter: "saturate(1.08) contrast(1.05) sepia(0.06)",
        }}
      />
      {/* затемнение сверху и снизу — чтобы надписи читались */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(18,20,24,.55) 0%, rgba(18,20,24,0) 28%, rgba(18,20,24,0) 62%, rgba(18,20,24,.55) 100%)",
        }}
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
  color = "rgba(18,20,24,.78)",
  delay = 0,
  size = 40,
}) => {
  const p = usePop(delay);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 16,
        padding: `${size * 0.45}px ${size * 0.8}px`,
        borderRadius: 999,
        background: color,
        border: "2px solid rgba(217,160,102,.55)",
        color: C.white,
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
const Logo: React.FC<{ width?: number; delay?: number }> = ({ width = 560, delay = 0 }) => {
  const frame = useCurrentFrame();
  const p = usePop(delay, 18);
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
        filter: "drop-shadow(0 6px 20px rgba(0,0,0,.5))",
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
  return (
    <div style={{ fontFamily: head, fontWeight: 900, fontSize: size, lineHeight: 1.0, textTransform: "uppercase" }}>
      {lines.map((line, i) => {
        const p = spring({ frame: frame - delay - i * 5, fps, config: { damping: 13, mass: 0.6 } });
        return (
          <div
            key={i}
            style={{
              color: i === accent ? C.woodLight : C.white,
              transform: `translateY(${(1 - p) * 60}px)`,
              opacity: p,
              textShadow: "0 6px 30px rgba(0,0,0,.55)",
            }}
          >
            {line}
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
          : "rgba(18,20,24,.8)",
        border: accent ? "none" : "2px solid rgba(255,255,255,.12)",
        boxShadow: "0 16px 50px rgba(0,0,0,.4)",
        transform: `translateX(${(1 - p) * -80}px)`,
        opacity: p,
      }}
    >
      <div style={{ fontSize: 58 }}>{icon}</div>
      <div>
        <div style={{ fontFamily: head, fontWeight: 800, fontSize: 44, color: C.white, textTransform: "uppercase" }}>
          {title}
        </div>
        {text ? (
          <div style={{ fontFamily: body, fontWeight: 600, fontSize: 34, color: "rgba(255,255,255,.85)", marginTop: 4 }}>
            {text}
          </div>
        ) : null}
      </div>
    </div>
  );
};

/* ---------------- Наложения поверх каждой сцены ---------------- */
const Top: React.FC<{ children: React.ReactNode; dur: number }> = ({ children, dur }) => {
  const o = useOut(dur);
  return (
    <AbsoluteFill style={{ padding: "250px 70px 0", alignItems: "flex-start", opacity: o }}>{children}</AbsoluteFill>
  );
};

const OverlayA: React.FC<{ dur: number }> = ({ dur }) => {
  const o = useOut(dur);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <AbsoluteFill style={{ padding: "250px 70px 0", alignItems: "flex-start" }}>
        <Logo width={460} />
        <div style={{ marginTop: 28 }}>
          <Pill delay={14} size={28}>
            <span style={{ width: 14, height: 14, borderRadius: 7, background: C.woodLight }} />2 года Каменскому филиалу
          </Pill>
        </div>
      </AbsoluteFill>
      {/* заголовок внизу, чтобы не закрывать лицо */}
      <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 70px 430px" }}>
        <BigTitle lines={["День открытых", "дверей"]} accent={1} delay={22} size={96} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const OverlayB: React.FC<{ dur: number }> = ({ dur }) => (
  <Top dur={dur}>
    <Pill delay={6} color={C.green} size={46}>
      📅 8 ноября · 12:00
    </Pill>
    <div style={{ marginTop: 22 }}>
      <Pill delay={16} size={30}>
        📍 Каменск-Уральский, Суворова 47В
      </Pill>
    </div>
  </Top>
);

const OverlayC: React.FC<{ dur: number }> = ({ dur }) => (
  <Top dur={dur}>
    <BigTitle lines={["Экскурсия", "по производству"]} accent={1} size={84} delay={4} />
    <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 36 }}>
      <Card icon="🪵" title="Каркас и утеплитель" delay={40} />
      <Card icon="🧩" title="Как собираются модули" delay={70} />
      <Card icon="📐" title="Точность до миллиметра" delay={100} />
    </div>
  </Top>
);

const OverlayD: React.FC<{ dur: number }> = ({ dur }) => (
  <Top dur={dur}>
    <BigTitle lines={["Готовые дома", "вживую"]} accent={1} size={84} delay={4} />
    <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 36 }}>
      <Card icon="🏡" title="4000+ проектов" text="своё производство" delay={36} />
      <Card icon="💳" title="Рассрочка" text="расчёт стоимости на месте" delay={66} />
    </div>
  </Top>
);

const OverlayE: React.FC<{ dur: number }> = ({ dur }) => (
  <Top dur={dur}>
    <Pill delay={6} size={34}>
      ☕ Кофе, чай и ответы на вопросы
    </Pill>
    <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 18 }}>
      <Sequence from={Math.round(dur * 0.35)} layout="none">
        <Prize />
      </Sequence>
    </div>
  </Top>
);

const Prize: React.FC = () => {
  const p = usePop(0, 11);
  const frame = useCurrentFrame();
  const shine = interpolate(frame, [10, 40], [-120, 220], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        width: 820,
        padding: "34px 40px",
        borderRadius: 34,
        background: `linear-gradient(135deg, ${C.woodLight}, ${C.wood} 55%, #8E5427)`,
        boxShadow: "0 24px 70px rgba(184,116,58,.55)",
        transform: `scale(${0.6 + p * 0.4}) rotate(${(1 - p) * -6}deg)`,
        transformOrigin: "left center",
        opacity: Math.min(1, p * 1.4),
      }}
    >
      <div style={{ fontFamily: head, fontWeight: 800, fontSize: 30, letterSpacing: 3, color: "#fff", opacity: 0.9 }}>
        🎁 РОЗЫГРЫШ ПРИЗОВ
      </div>
      <div style={{ fontFamily: head, fontWeight: 900, fontSize: 124, color: "#fff", lineHeight: 1.05 }}>50 000 ₽</div>
      <div style={{ fontFamily: head, fontWeight: 800, fontSize: 38, color: "#fff", textTransform: "uppercase" }}>
        сертификат
      </div>
      <div style={{ fontFamily: body, fontWeight: 700, fontSize: 30, color: "rgba(255,255,255,.9)", marginTop: 10 }}>
        + дачный туалет, банный и соляной абажуры
      </div>
      {/* блик */}
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
  const pulse = 1 + Math.max(0, Math.sin((frame - 50) / 6)) * 0.04 * (frame > 50 ? 1 : 0);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(70% 45% at 80% 10%, rgba(217,160,102,.35), transparent 70%), radial-gradient(70% 50% at 10% 100%, rgba(184,116,58,.3), transparent 70%), ${C.bg}`,
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 80,
      }}
    >
      <Logo width={620} />
      <div style={{ marginTop: 70 }}>
        <BigTitle lines={["День", "открытых", "дверей"]} delay={8} size={120} />
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
          background: C.white,
          color: C.bg,
          fontFamily: head,
          fontWeight: 900,
          fontSize: 50,
          textTransform: "uppercase",
          transform: `scale(${btn * pulse})`,
          boxShadow: "0 20px 60px rgba(0,0,0,.45)",
        }}
      >
        Записаться — ссылка в описании
      </div>
      <div style={{ marginTop: 40, fontFamily: body, fontWeight: 600, fontSize: 34, color: "rgba(255,255,255,.75)", opacity: btn }}>
        📍 Каменск-Уральский, ул. Суворова, 47В, корп. 7
      </div>
    </AbsoluteFill>
  );
};

const OVERLAYS = [OverlayA, OverlayB, OverlayC, OverlayD, OverlayE];

// Разные переходы между роликами
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

export const Promo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <TransitionSeries>
        {SCENES.flatMap((s, i) => {
          const dur = len(s);
          const items = [
            <TransitionSeries.Sequence key={`s${i}`} durationInFrames={dur}>
              <Clip src={s.src} from={s.from} dur={dur} zoomIn={i % 2 === 0} />
            </TransitionSeries.Sequence>,
          ];
          items.push(
            <TransitionSeries.Transition
              key={`t${i}`}
              presentation={TRANSITIONS[i]}
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
        <Flash key={`f${i}`} at={st + T / 2} />
      ))}
    </AbsoluteFill>
  );
};
