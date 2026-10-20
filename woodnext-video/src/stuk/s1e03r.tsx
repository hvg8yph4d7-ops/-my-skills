// «Сезон закрыт», серия 3 — реалистичная версия: кадры нейросети без лиц, живые звуки
// (ветер, стук в дерево, скрип, шорох, сердце), тот же голос и субтитры, что у s1e03.
import React from "react";
import { AbsoluteFill, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { EpisodeDef } from "./Episode";
import { S1E03 } from "./s1e03";
import { clamp, EndCard, Mood, sec, Sfx } from "./kit";


// Кадр с медленным наездом; shakeAt — кадр, с которого камера вздрагивает
const Shot: React.FC<{
  src: string;
  dur: number;
  from?: number;
  to?: number;
  ox?: string;
  oy?: string;
  shakeAt?: number[];
  dim?: number;
}> = ({ src, dur, from = 1.04, to = 1.16, ox = "50%", oy = "50%", shakeAt = [], dim = 0 }) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, dur], [from, to], clamp);
  const jolt = shakeAt.reduce((a, k) => a + interpolate(f - k, [0, 2, 10], [0, 18, 0], clamp), 0);
  const dx = jolt ? (random(`sx${f}`) - 0.5) * jolt : 0;
  const dy = jolt ? (random(`sy${f}`) - 0.5) * jolt : 0;
  return (
    <AbsoluteFill style={{ opacity: interpolate(f, [0, 8], [0, 1], clamp) }}>
      <Img
        src={staticFile(src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `translate(${dx}px,${dy}px) scale(${s})`,
          transformOrigin: `${ox} ${oy}`,
          filter: `brightness(${1 - dim})`,
        }}
      />
    </AbsoluteFill>
  );
};

// Дымка у земли
const Fog: React.FC<{ o?: number }> = ({ o = 0.18 }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at ${30 + Math.sin(f / 40) * 20}% 72%, rgba(200,210,230,${o}), transparent 60%)`,
        mixBlendMode: "screen",
      }}
    />
  );
};

// Редкое «моргание» плёнки
const Flicker: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ background: "#000", opacity: random(`fk${Math.floor(f / 3)}`) > 0.88 ? 0.3 : 0 }} />;
};

const Look: React.FC<{ fog?: number }> = ({ fog }) => (
  <>
    {fog !== undefined && <Fog o={fog} />}
    <Flicker />
    <Mood />
  </>
);

// Переписка с сестрой поверх экрана телефона
const Chat: React.FC<{ at: (i: number) => number }> = ({ at }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bubble = (from: number, text: string, mine: boolean, k: number) => {
    const s = spring({ frame: f - from, fps, config: { damping: 14 } });
    return (
      <div
        key={k}
        style={{
          alignSelf: mine ? "flex-end" : "flex-start",
          background: mine ? "#2f6fd6" : "#2a2d36",
          color: "#fff",
          fontFamily: "Golos Text, sans-serif",
          fontSize: 46,
          padding: "18px 28px",
          borderRadius: 30,
          opacity: s,
          transform: `translateY(${(1 - s) * 30}px)`,
          boxShadow: "0 0 40px rgba(60,120,255,.35)",
        }}
      >
        {text}
      </div>
    );
  };
  return (
    <AbsoluteFill style={{ padding: "520px 120px 0", display: "flex", flexDirection: "column", gap: 24 }}>
      {bubble(at(1) + sec(0.9), "Ты где?", true, 0)}
      {bubble(at(1) + sec(2.2), "Дома, сплю 😴", false, 1)}
    </AbsoluteFill>
  );
};

// Два светящихся глаза в стекле за плечом
const Eyes: React.FC<{ start: number }> = ({ start }) => {
  const f = useCurrentFrame();
  const o = interpolate(f - start, [0, 6], [0, 1], clamp);
  const blink = random(`bl${Math.floor((f - start) / 40)}`) > 0.8 && (f - start) % 40 < 4 ? 0.1 : 1;
  return (
    <AbsoluteFill style={{ opacity: o * blink }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <defs>
          <radialGradient id="ge">
            <stop offset="0" stopColor="#fff2c4" stopOpacity={0.9} />
            <stop offset="1" stopColor="#fff2c4" stopOpacity={0} />
          </radialGradient>
        </defs>
        {[-46, 46].map((dx) => (
          <g key={dx}>
            <circle cx={700 + dx} cy={760} r={46} fill="url(#ge)" />
            <ellipse cx={700 + dx} cy={760} rx={16} ry={7} fill="#fffbe8" />
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
};

// Наш тёмный силуэт-отражение в стекле: только контур головы и плеч со спины, без лица
const Reflection: React.FC = () => (
  <AbsoluteFill style={{ opacity: 0.55, mixBlendMode: "multiply" }}>
    <svg width={1080} height={1920} viewBox="0 0 1080 1920">
      <defs>
        <filter id="bl">
          <feGaussianBlur stdDeviation={14} />
        </filter>
      </defs>
      <g filter="url(#bl)" fill="#05070c">
        <ellipse cx={430} cy={1010} rx={120} ry={150} />
        <path d="M150,1920 C170,1350 260,1200 430,1180 C600,1200 690,1350 710,1920 Z" />
      </g>
    </svg>
  </AbsoluteFill>
);

const Flash: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ background: "#fff", opacity: interpolate(f - at, [0, 2, 10], [0, 0.55, 0], clamp) }} />;
};

const K = (n: string) => `ai/s1e03r/${n}.jpg`;

export const S1E03R: EpisodeDef = {
  ...S1E03,
  music: "real",
  scenes: [
    {
      until: 0,
      tape: ["!", "СЕЗОН ЗАКРЫТ · ЧАСТЬ 3"],
      stamp: "НОЧЬ 4 · 02:00",
      render: (at, dur) => (
        <>
          <Shot src={K("01")} dur={dur} from={1.0} to={1.14} oy="40%" />
          <Look fog={0.1} />
          <Sfx src="heart.mp3" at={0} volume={0.6} />
        </>
      ),
    },
    {
      until: 1,
      stamp: "НОЧЬ 4 · 02:01",
      render: (at, dur) => (
        <>
          <Shot src={K("02")} dur={dur} from={1.08} to={1.0} />
          <Look />
          <Chat at={at} />
          <Sfx src="tap.mp3" at={at(1) + sec(0.7)} volume={0.8} />
          <Sfx src="click.wav" at={at(1) + sec(2.1)} volume={0.5} />
        </>
      ),
    },
    {
      until: 2,
      tape: ["1.", "НЕ ОТВЕЧАТЬ"],
      stamp: "НОЧЬ 4 · 02:02",
      render: (at, dur) => (
        <>
          <Shot src={K("03")} dur={dur} from={1.0} to={1.15} oy="45%" />
          <Look />
        </>
      ),
    },
    {
      until: 4,
      stamp: "НОЧЬ 4 · 02:04",
      render: (at, dur) => {
        // удары knock3real: 0 / 1,12 / 2,24 с; ставим так, чтобы третий пришёлся на «три раза»
        const k0 = at(3) + sec(1.6);
        const hits = [k0, k0 + sec(1.12), k0 + sec(2.24)];
        return (
          <>
            <Shot src={K("04")} dur={dur} from={1.0} to={1.2} ox="60%" oy="40%" shakeAt={hits} />
            <Look />
            <Sfx src="knock3real.mp3" at={k0} volume={1.4} />
            {hits.map((h) => (
              <Flash key={h} at={h} />
            ))}
          </>
        );
      },
    },
    {
      until: 5,
      stamp: "НОЧЬ 4 · 02:06",
      render: (at, dur) => (
        <>
          <Shot src="ai/test01/02.jpg" dur={dur} from={1.12} to={1.0} ox="40%" />
          <Look />
          <Sfx src="click.wav" at={at(5) + sec(0.5)} volume={0.6} />
          <Sfx src="rustle.mp3" at={at(5) + sec(1.3)} volume={0.9} />
        </>
      ),
    },
    {
      until: 6,
      stamp: "НОЧЬ 4 · 02:07",
      render: (at, dur) => (
        <>
          <Shot src="ai/test01/03.jpg" dur={dur} from={1.0} to={1.1} oy="70%" />
          <Look fog={0.2} />
        </>
      ),
    },
    {
      until: 7,
      tape: ["!", "СЛЕДЫ"],
      stamp: "−6 °C",
      render: (at, dur) => (
        <>
          <Shot src={K("07")} dur={dur} from={1.2} to={1.05} oy="60%" />
          <Look />
          <Sfx src="hit.mp3" at={at(7) + sec(0.5)} volume={0.5} />
        </>
      ),
    },
    {
      until: 9,
      stamp: "НОЧЬ 4 · 02:08",
      render: (at, dur) => (
        <>
          <Shot src={K("08")} dur={dur} from={1.0} to={1.22} oy="80%" />
          <Look fog={0.12} />
        </>
      ),
    },
    {
      until: 10,
      render: (at, dur) => (
        <>
          <Shot src={K("09")} dur={dur} from={1.0} to={1.18} oy="45%" dim={0.15} />
          <Look />
          <Sfx src="creak.mp3" at={at(10) + sec(0.4)} volume={1.0} />
        </>
      ),
    },
    {
      until: 13,
      tape: ["!", "ОТРАЖЕНИЕ"],
      stamp: "НОЧЬ 4 · 02:09",
      render: (at, dur) => {
        const eyes = at(13) + sec(0.9);
        return (
          <>
            <Shot src={K("10")} dur={dur} from={1.0} to={1.14} shakeAt={[eyes]} />
            <ReflectionFrom at={at(12)} />
            <Eyes start={eyes} />
            <Flash at={eyes} />
            <Look />
            <Sfx src="heart.mp3" at={at(11)} volume={0.8} />
            <Sfx src="riser.mp3" at={eyes - sec(2.2)} volume={0.8} />
            <Sfx src="boom.mp3" at={eyes} volume={1.2} />
          </>
        );
      },
    },
    {
      until: 14,
      stamp: "ЗА СПИНОЙ",
      render: (at, dur) => (
        <>
          <Shot src={K("11")} dur={dur} from={1.0} to={1.3} ox="62%" oy="45%" dim={0.1} />
          <Look />
          <Sfx src="creak.mp3" at={at(14) + sec(1)} volume={0.9} />
          <Sfx src="growl.mp3" at={at(14) + sec(1.8)} volume={0.6} />
        </>
      ),
    },
    { until: 15, render: () => <EndCard /> },
  ],
};

// Отражение проявляется с фразы «вижу в стекле своё отражение»
const ReflectionFrom: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: interpolate(f - at, [0, 20], [0, 1], clamp) }}>
      <Reflection />
    </AbsoluteFill>
  );
};

