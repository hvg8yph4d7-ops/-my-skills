// Демо: реалистичные кадры нейросети + наше оживление (наезд, туман, мерцание, глаза, субтитры).
import React from "react";
import { AbsoluteFill, Img, interpolate, random, Sequence, staticFile, useCurrentFrame } from "remotion";
import { C, clamp, KaraokeCaption, Mood, Sfx, Tape } from "./kit";

const Shot: React.FC<{ src: string; dur: number; from?: number; to?: number; ox?: string; oy?: string }> = ({
  src,
  dur,
  from = 1.05,
  to = 1.18,
  ox = "50%",
  oy = "50%",
}) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, dur], [from, to], clamp);
  const fadeIn = interpolate(f, [0, 8], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${s})`, transformOrigin: `${ox} ${oy}` }} />
    </AbsoluteFill>
  );
};

const Fog: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at ${30 + Math.sin(f / 40) * 20}% 70%, rgba(200,210,230,.18), transparent 60%)`,
        mixBlendMode: "screen",
      }}
    />
  );
};

const Flicker: React.FC = () => {
  const f = useCurrentFrame();
  const v = random(`fk${Math.floor(f / 3)}`) > 0.85 ? 0.35 : 0;
  return <AbsoluteFill style={{ background: "#000", opacity: v }} />;
};

const words = (t: string, step = 7) => t.split(" ").map((w, i) => ({ text: w, color: "#fff", at: i * step }));

export const AiDemo: React.FC = () => {
  const f = useCurrentFrame();
  const eyes = interpolate(f, [195, 201], [0, 1], clamp);
  const flash = interpolate(f, [195, 198, 206], [0, 0.6, 0], clamp);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Sequence durationInFrames={110}>
        <Shot src="ai/test01/01.jpg" dur={110} ox="30%" oy="60%" />
        <Fog />
        <Flicker />
        <Tape num="!" text="СЕЗОН ЗАКРЫТ" />
        <KaraokeCaption words={words("У КОВАЛЁВЫХ ГОРЕЛ СВЕТ")} dur={110} />
      </Sequence>
      <Sequence from={110} durationInFrames={70}>
        <Shot src="ai/test01/03.jpg" dur={70} from={1.15} to={1.0} oy="70%" />
        <Fog />
        <KaraokeCaption words={[{ text: "СЛЕДЫ", color: C.red, at: 0 }, { text: "К КРЫЛЬЦУ", color: "#fff", at: 10 }]} dur={70} />
      </Sequence>
      <Sequence from={180} durationInFrames={120}>
        <Shot src="ai/test01/04.jpg" dur={120} from={1.0} to={1.12} ox="40%" oy="35%" />
        <AbsoluteFill style={{ opacity: eyes }}>
          <svg width={1080} height={1920} viewBox="0 0 1080 1920">
            <defs>
              <radialGradient id="g">
                <stop offset="0" stopColor="#fff6d0" stopOpacity={0.95} />
                <stop offset="1" stopColor="#fff6d0" stopOpacity={0} />
              </radialGradient>
            </defs>
            {[-40, 40].map((dx) => (
              <g key={dx}>
                <circle cx={230 + dx} cy={620} r={40} fill="url(#g)" />
                <ellipse cx={230 + dx} cy={620} rx={15} ry={7} fill="#fffbe8" />
              </g>
            ))}
          </svg>
        </AbsoluteFill>
        <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
        <KaraokeCaption words={[{ text: "А", color: "#fff", at: 0 }, { text: "ЗА", color: "#fff", at: 6 }, { text: "ПЛЕЧОМ…", color: C.red, at: 12 }]} dur={120} />
        <Sfx src="hit.mp3" at={15} volume={1} />
      </Sequence>
      <Mood />
    </AbsoluteFill>
  );
};
