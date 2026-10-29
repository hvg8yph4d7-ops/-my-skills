// «200 ₽ в день» — финансовый эксперимент, выпуск «День 1» (19 октября 2026).
// Цифры рынка — из сводок ТАСС/БКС/«Ведомостей»/РИА на утро 19.10; портфель — скриншот владельца.
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { EpisodeDef } from "../stuk/Episode";
import { body, Camera, clamp, head, Pills, Sfx } from "../stuk/kit";
import timing from "../stuk/timing/fin001.json";

type P = { at: (i: number) => number; dur: number };

const F = {
  bg1: "#0c1a24",
  bg2: "#08121a",
  up: "#2fd47a",
  down: "#ff5a4f",
  gold: "#ffd23f",
  ink: "#eef3f6",
  muted: "#8aa0ad",
  card: "#132532",
};

const Bg: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 35%, ${F.bg1}, ${F.bg2} 70%)` }}>
      <svg width={1080} height={1920} style={{ position: "absolute", opacity: 0.12 }}>
        {new Array(14).fill(0).map((_, i) => (
          <line key={i} x1={0} x2={1080} y1={i * 140 + ((f * 0.6) % 140)} y2={i * 140 + ((f * 0.6) % 140)} stroke="#4c7a90" strokeWidth={1} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

const Big: React.FC<{ y: number; size: number; color?: string; children: React.ReactNode; delay?: number }> = ({
  y,
  size,
  color = F.ink,
  children,
  delay = 0,
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 14 } });
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        width: "100%",
        textAlign: "center",
        fontFamily: head,
        fontWeight: 900,
        fontSize: size,
        color,
        opacity: s,
        transform: `scale(${0.85 + 0.15 * s})`,
        fontVariantNumeric: "tabular-nums",
        textShadow: "0 6px 24px rgba(0,0,0,.5)",
      }}
    >
      {children}
    </div>
  );
};

const rub = (n: number) => Math.round(n).toLocaleString("ru-RU").replace(/,/g, " ");

// 1. День 1: портфель на старте
const Hook: React.FC<P> = ({ at }) => {
  const f = useCurrentFrame();
  const v = interpolate(f, [at(1), at(1) + 40], [0, 2738.06], clamp);
  return (
    <AbsoluteFill>
      <Bg />
      <Big y={380} size={150} color={F.gold}>
        ДЕНЬ 1
      </Big>
      <Big y={560} size={56} color={F.muted} delay={10}>
        200 ₽ КАЖДЫЙ ДЕНЬ В АКЦИИ
      </Big>
      {f >= at(1) && (
        <>
          <Big y={720} size={140} delay={at(1)}>
            {rub(v)} ₽
          </Big>
          <Big y={880} size={76} color={F.up} delay={at(1) + 30}>
            ▲ +3,24% · +86 ₽
          </Big>
        </>
      )}
      <Sfx src="whoosh.mp3" at={at(1)} volume={0.3} />
    </AbsoluteFill>
  );
};

// 2. Новости: санкции отложены, индекс на максимуме за 4 месяца
const News: React.FC<P> = ({ at, dur }) => {
  const f = useCurrentFrame();
  const grow = interpolate(f, [at(4), at(4) + 30], [0, 1], clamp);
  const bar = (x: number, h: number, label: string, val: string, color: string, show: number) => (
    <g opacity={show}>
      <rect x={x} y={1000 - h * show} width={200} height={h * show} rx={14} fill={color} />
      <text x={x + 100} y={1000 - h - 24} textAnchor="middle" fontSize={50} fontWeight={900} fill={F.ink} fontFamily={head}>
        {val}
      </text>
      <text x={x + 100} y={1060} textAnchor="middle" fontSize={36} fontWeight={700} fill={F.muted} fontFamily={body}>
        {label}
      </text>
    </g>
  );
  return (
    <AbsoluteFill>
      <Bg />
      <Camera dur={dur} from={1} to={1.04}>
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          <text x={540} y={640} textAnchor="middle" fontSize={44} fontWeight={800} fill={F.muted} fontFamily={body}>
            ИНДЕКС МОСБИРЖИ
          </text>
          {bar(250, 230, "пятница, закрытие", "2 426", "#3b6f8c", grow)}
          {bar(630, 260, "понедельник, утро", "≈2 455", F.up, interpolate(f, [at(4) + 25, at(4) + 50], [0, 1], clamp))}
        </svg>
      </Camera>
      <Pills
        y={400}
        items={[
          ["ТРАМП ОТЛОЖИЛ НОВЫЕ САНКЦИИ", at(3), "#2b4a6a"],
          ["МАКСИМУМ ЗА 4 МЕСЯЦА", at(4) + 20, "#1f6b45"],
          ["АТЭС: ПУТИН · ТРАМП · СИ?", at(5), "#5a4a1f"],
        ]}
      />
    </AbsoluteFill>
  );
};

// 3. Нефть и рубль
const Tile: React.FC<{ x: number; title: string; value: string; note: string; color: string; delay: number }> = ({
  x,
  title,
  value,
  note,
  color,
  delay,
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 14 } });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: 560,
        width: 420,
        height: 440,
        borderRadius: 34,
        background: F.card,
        border: `3px solid ${color}`,
        transform: `translateY(${(1 - s) * 80}px)`,
        opacity: s,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
      }}
    >
      <div style={{ fontFamily: body, fontWeight: 700, fontSize: 40, color: F.muted }}>{title}</div>
      <div style={{ fontFamily: head, fontWeight: 900, fontSize: 92, color }}>{value}</div>
      <div style={{ fontFamily: body, fontWeight: 700, fontSize: 32, color: F.ink, textAlign: "center", padding: "0 20px" }}>{note}</div>
    </div>
  );
};

const OilRub: React.FC<P> = ({ at }) => (
  <AbsoluteFill>
    <Bg />
    <Tile x={70} title="НЕФТЬ BRENT" value="▼ ~1,8%" note="меньше санкций — меньше премии" color={F.down} delay={at(6)} />
    <Tile x={590} title="ДОЛЛАР" value="≈83,8 ₽" note="рубль держится крепко" color={F.up} delay={at(7)} />
  </AbsoluteFill>
);

// 4. Ставка ЦБ
const Rate: React.FC<P> = ({ at }) => (
  <AbsoluteFill>
    <Bg />
    <Big y={420} size={60} color={F.muted}>
      КЛЮЧЕВАЯ СТАВКА
    </Big>
    <Big y={500} size={260} color={F.gold}>
      14%
    </Big>
    <Big y={800} size={64} delay={at(8) + 40}>
      РЕШЕНИЕ — 23 ОКТЯБРЯ
    </Big>
    <Pills
      y={960}
      items={[
        ["ПРОГНОЗ: ПАУЗА", at(9), "#2b4a6a"],
        ["ВКЛАДЫ — ПОКА ВЫГОДНЫ", at(9) + 30, "#1f6b45"],
        ["ИПОТЕКА — НЕ ДЕШЕВЕЕТ", at(9) + 55, "#7a2c26"],
      ]}
    />
  </AbsoluteFill>
);

// 5. Портфель: столбики доходности по позициям (скриншот 19.10)
const POS: [string, number][] = [
  ["Интер РАО", 12.85],
  ["Крупнейшие компании", 8.93],
  ["Сбербанк", 5.55],
  ["Денежный рынок", 0.45],
  ["Татнефть", -1.43],
];

const Portfolio: React.FC<P> = ({ at }) => {
  const f = useCurrentFrame();
  const show = interpolate(f, [at(10) + 5, at(10) + 35], [0, 1], clamp);
  const max = 13;
  return (
    <AbsoluteFill>
      <Bg />
      <Big y={330} size={58} color={F.muted}>
        МОЙ ПОРТФЕЛЬ · ЗА ВСЁ ВРЕМЯ
      </Big>
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {POS.map(([name, pct], i) => {
          const y = 470 + i * 120;
          const w = (Math.abs(pct) / max) * 380 * show;
          const color = pct >= 0 ? F.up : F.down;
          const hi = (i < 3 && f >= at(11)) || (i === 4 && f >= at(12));
          return (
            <g key={name} opacity={hi || f < at(11) ? 1 : 0.45}>
              <text x={60} y={y + 44} fontSize={36} fontWeight={700} fill={F.ink} fontFamily={body}>
                {name}
              </text>
              <rect x={500} y={y + 10} width={Math.max(6, w)} height={50} rx={10} fill={color} />
              <text x={510 + Math.max(6, w)} y={y + 48} fontSize={38} fontWeight={900} fill={color} fontFamily={head}>
                {pct > 0 ? "+" : ""}
                {pct.toFixed(2).replace(".", ",")}%
              </text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// 6. Финал: вопрос, оговорка, подписка
const End: React.FC<P> = ({ at }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cta = spring({ frame: f - at(14), fps, config: { damping: 12 } });
  return (
    <AbsoluteFill>
      <Bg />
      <Big y={420} size={110} color={F.gold}>
        200 ₽
      </Big>
      <Big y={560} size={64}>
        А ВЫ БЫ ЧТО КУПИЛИ?
      </Big>
      <div
        style={{
          position: "absolute",
          top: 1500,
          left: 540,
          transform: `translateX(-50%) scale(${cta * (1 + 0.04 * Math.sin(f / 5))})`,
          background: F.up,
          color: "#06210f",
          fontFamily: head,
          fontWeight: 900,
          fontSize: 48,
          padding: "22px 46px",
          borderRadius: 999,
          whiteSpace: "nowrap",
        }}
      >
        ПОДПИШИСЬ — ДЕНЬ 2 ЗАВТРА
      </div>
      <div style={{ position: "absolute", top: 1640, width: "100%", textAlign: "center", fontFamily: body, fontWeight: 600, fontSize: 28, color: F.muted }}>
        Не является индивидуальной инвестиционной рекомендацией
      </div>
    </AbsoluteFill>
  );
};

export const FIN001: EpisodeDef = {
  id: "fin001",
  timing,
  music: "fin",
  captions: [
    "$ДЕНЬ $ПЕРВЫЙ. КАЖДЫЙ ДЕНЬ ВКЛАДЫВАЮ $200 $РУБЛЕЙ В АКЦИИ И ПОКАЗЫВАЮ, ЧТО ВЫХОДИТ",
    "НА СТАРТЕ В ПОРТФЕЛЕ 2 738 РУБЛЕЙ. $ПЛЮС $3,24%",
    "ЧТО ПРОИЗОШЛО ЗА $ВЫХОДНЫЕ?",
    "ТРАМП $ОТЛОЖИЛ НОВЫЕ $САНКЦИИ. И РЫНОК ЭТО УСЛЫШАЛ",
    "МОСБИРЖА В ПЯТНИЦУ — $МАКСИМУМ $ЗА $4 $МЕСЯЦА. В ПОНЕДЕЛЬНИК УТРОМ — ЕЩЁ $+1%",
    "ГОВОРЯТ О ВОЗМОЖНОЙ ВСТРЕЧЕ ПУТИНА, ТРАМПА И СИ НА $АТЭС",
    "НЕФТЬ ^ДЕШЕВЕЕТ: БРЕНТ ТЕРЯЕТ ПОЧТИ ДВА ПРОЦЕНТА",
    "РУБЛЬ ДЕРЖИТСЯ $КРЕПКО: ДОЛЛАР — ОКОЛО $84",
    "ГЛАВНОЕ НА НЕДЕЛЕ — $23 $ОКТЯБРЯ. ЦБ РЕШАЕТ ПО СТАВКЕ. СЕЙЧАС — $14%",
    "АНАЛИТИКИ ЖДУТ ПАУЗЫ: ВКЛАДЫ ПОКА $ВЫГОДНЫ, ИПОТЕКА ^НЕ ^ДЕШЕВЕЕТ",
    "ЧТО У МЕНЯ В $ПОРТФЕЛЕ",
    "ЛУЧШЕ ВСЕХ — $ИНТЕР $РАО: +13%. ФОНД КРУПНЕЙШИХ — +9%. СБЕР — +5,5%",
    "В МИНУСЕ ТОЛЬКО ^ТАТНЕФТЬ — ^−1,4%",
    "ЧТО ВЗЯТЬ НА СЕГОДНЯШНИЕ $200 ₽ — ПОКАЖУ ЗАВТРА. А ВЫ БЫ ЧТО КУПИЛИ?",
    "ЭТО ~НЕ ~ИНВЕСТРЕКОМЕНДАЦИЯ. ПОДПИШИСЬ — ПОСМОТРИМ, ЧТО БУДЕТ ЧЕРЕЗ $100 $ДНЕЙ",
  ],
  scenes: [
    { until: 1, tape: ["1", "200 ₽ В ДЕНЬ"], stamp: "19 ОКТЯБРЯ 2026", render: (at, dur) => <Hook at={at} dur={dur} /> },
    { until: 5, tape: ["!", "ЧТО СЛУЧИЛОСЬ"], render: (at, dur) => <News at={at} dur={dur} /> },
    { until: 7, tape: ["!", "НЕФТЬ И РУБЛЬ"], render: (at, dur) => <OilRub at={at} dur={dur} /> },
    { until: 9, tape: ["!", "СТАВКА ЦБ"], render: (at, dur) => <Rate at={at} dur={dur} /> },
    { until: 12, tape: ["!", "МОЙ ПОРТФЕЛЬ"], render: (at, dur) => <Portfolio at={at} dur={dur} /> },
    { until: 14, render: (at, dur) => <End at={at} dur={dur} /> },
  ],
};
