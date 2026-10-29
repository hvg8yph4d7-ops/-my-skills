// Аватарка «Третьего стука» (1080×1080, всё важное — внутри круга):
// дверь в ночи и три светящиеся отметины от ударов. variant "open" — дверь приоткрыта, из щели свет.
import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "./kit";

export const Avatar: React.FC<{ variant?: "closed" | "open" }> = ({ variant = "closed" }) => {
  const open = variant === "open";
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 45%, #2a2f4d 0%, #141626 55%, #07080d 100%)" }}>
      <svg viewBox="0 0 1080 1080" width={1080} height={1080}>
        <defs>
          <radialGradient id="knock">
            <stop offset="0" stopColor={C.red} stopOpacity={0.9} />
            <stop offset="1" stopColor={C.red} stopOpacity={0} />
          </radialGradient>
          <linearGradient id="leak" x1="0" x2="1">
            <stop offset="0" stopColor="#ffcf6b" stopOpacity={0.55} />
            <stop offset="1" stopColor="#ffcf6b" stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* дверной проём */}
        <rect x={330} y={210} width={420} height={700} fill="#0c0b0a" />
        {open && <polygon points="742,214 742,906 1000,1080 1000,40" fill="url(#leak)" />}
        {open && <rect x={722} y={214} width={24} height={692} fill="#ffcf6b" />}
        {/* полотно двери */}
        <rect x={345} y={225} width={open ? 380 : 390} height={670} fill="#4a3627" />
        <rect x={385} y={270} width={open ? 300 : 310} height={260} fill="none" stroke="#33251b" strokeWidth={10} />
        <rect x={385} y={580} width={open ? 300 : 310} height={260} fill="none" stroke="#33251b" strokeWidth={10} />
        <circle cx={open ? 680 : 690} cy={560} r={15} fill="#b9a879" />
        {/* три удара */}
        {[
          [470, 350],
          [520, 445],
          [570, 540],
        ].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={58} fill="url(#knock)" />
            <circle cx={x} cy={y} r={17} fill={C.red} />
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <line
                key={a}
                x1={x + Math.cos((a * Math.PI) / 180) * 22}
                y1={y + Math.sin((a * Math.PI) / 180) * 22}
                x2={x + Math.cos((a * Math.PI) / 180) * 34}
                y2={y + Math.sin((a * Math.PI) / 180) * 34}
                stroke={C.red}
                strokeWidth={4}
                strokeLinecap="round"
              />
            ))}
          </g>
        ))}
        {/* пол */}
        <rect x={0} y={905} width={1080} height={175} fill="#0a0a0e" />
      </svg>
    </AbsoluteFill>
  );
};
