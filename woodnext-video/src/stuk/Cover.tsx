// Обложки серий для Instagram/VK (1080×1920). Весь текст — в средней полосе 240–1680,
// которую Instagram оставляет в сетке профиля (обрезка 3:4).
import React from "react";
import { AbsoluteFill } from "remotion";
import { C, Dacha, Fence, Forest, head, Outside, Sky, Svg } from "./kit";

const Scene1 = () => (
  <Svg>
    <Outside lit={1} eyes />
  </Svg>
);

const Scene2 = () => (
  <Svg>
    <rect width={1080} height={1920} fill="#121318" />
    <rect x={0} y={1180} width={1080} height={740} fill="#1a1512" />
    <rect x={300} y={360} width={480} height={820} fill="#4a3627" stroke="#2c2018" strokeWidth={18} />
    <rect x={340} y={410} width={400} height={330} fill="none" stroke="#3a2a1e" strokeWidth={8} />
    <rect x={340} y={790} width={400} height={330} fill="none" stroke="#3a2a1e" strokeWidth={8} />
    <rect x={690} y={760} width={70} height={18} rx={9} fill="#b9a879" />
    {[0, 1, 2].map((k) => (
      <circle key={k} cx={540} cy={760} r={90 + k * 80} fill="none" stroke="#e9e2cc" strokeWidth={4} opacity={0.6 - k * 0.18} />
    ))}
  </Svg>
);

const Scene3 = () => (
  <Svg>
    <Sky dusk moon={false} />
    <Forest y={820} />
    <rect x={0} y={820} width={1080} height={1100} fill="#4e5a70" />
    <Dacha x={540} y={820} s={0.9} />
    <Fence y={860} />
    {new Array(7).fill(0).map((_, i) => (
      <g key={i} transform={`translate(${500 + (i % 2) * 70},${1500 - i * 95}) rotate(6) scale(${i % 2 ? 1 : -1},1)`}>
        <ellipse cx={0} cy={0} rx={15} ry={30} fill="#1c212c" />
        <ellipse cx={-2} cy={-28} rx={13} ry={10} fill="#1c212c" />
        {[-12, -4, 4, 11].map((dx, j) => (
          <circle key={j} cx={dx} cy={-46} r={j === 0 ? 6 : 4.5} fill="#1c212c" />
        ))}
      </g>
    ))}
  </Svg>
);

export const Cover: React.FC<{ n: number; title: string[] }> = ({ n, title }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    {n === 1 && <Scene1 />}
    {n === 2 && <Scene2 />}
    {n === 3 && <Scene3 />}
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,.15) 30%, rgba(0,0,0,.75) 62%, rgba(0,0,0,.35) 90%)" }} />
    <div
      style={{
        position: "absolute",
        top: 300,
        left: -30,
        width: 1140,
        height: 112,
        background: C.tape,
        transform: "rotate(-2.2deg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: head,
        fontWeight: 900,
        fontSize: 58,
        color: "#16171b",
        boxShadow: "0 10px 24px rgba(0,0,0,.6)",
      }}
    >
      <span style={{ color: "#c62828", marginRight: 18 }}>!</span>СЕЗОН ЗАКРЫТ
    </div>
    <div style={{ position: "absolute", top: 1010, width: "100%", textAlign: "center" }}>
      <div style={{ fontFamily: head, fontWeight: 900, fontSize: 92, color: C.yellow, letterSpacing: 2, textShadow: "0 6px 0 rgba(0,0,0,.6)" }}>
        ЧАСТЬ {n}
      </div>
      {title.map((line, i) => (
        <div
          key={i}
          style={{
            fontFamily: head,
            fontWeight: 900,
            fontSize: 112,
            lineHeight: 1.02,
            color: i === title.length - 1 ? C.red : "#fff",
            textShadow: "0 7px 0 rgba(0,0,0,.6), 0 0 40px rgba(0,0,0,.8)",
          }}
        >
          {line}
        </div>
      ))}
    </div>
  </AbsoluteFill>
);
