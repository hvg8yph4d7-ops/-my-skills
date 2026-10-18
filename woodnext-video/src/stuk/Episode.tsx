// Сборка серии «Третий стук»: фразы голоса идут одна за другой, сцены
// сменяются на заданных фразах, субтитры и полоска-«скотч» — поверх.
import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Caption, clamp, sec, Tape } from "./kit";

export type Scene = {
  until: number; // индекс последней фразы сцены (включительно)
  tape?: [num: string, text: string];
  // at(i) — кадр начала фразы i относительно начала сцены; dur — длина сцены в кадрах
  render: (at: (i: number) => number, dur: number) => React.ReactNode;
};

export type EpisodeDef = {
  id: string;
  captions: string[]; // по одной на фразу озвучки, разметка как в Caption
  timing: number[]; // длительности фраз, секунды (src/stuk/timing/<id>.json)
  scenes: Scene[];
};

const LEAD = 0.5; // тишина до первой фразы
const GAP = 0.15; // пауза между фразами
const SCENE_GAP = 0.35; // пауза на смене сцены
const TAIL = 2.4; // хвост после последней фразы

export const layout = (ep: EpisodeDef) => {
  const sceneOf = (i: number) => ep.scenes.findIndex((s) => i <= s.until);
  const starts: number[] = [];
  let t = LEAD;
  ep.timing.forEach((d, i) => {
    starts.push(sec(t));
    t += d + (sceneOf(i + 1) !== sceneOf(i) ? SCENE_GAP : GAP);
  });
  const total = sec(t - GAP + TAIL);
  const sceneStarts = ep.scenes.map((_, k) => {
    const first = k === 0 ? 0 : ep.scenes[k - 1].until + 1;
    return k === 0 ? 0 : starts[first] - sec(0.25);
  });
  return { starts, total, sceneStarts };
};

export const episodeFrames = (ep: EpisodeDef) => layout(ep).total;

// Фон: низкий гул + нагнетание (сердцебиение, тиканье, тревожный аккорд)
const Music: React.FC<{ total: number }> = ({ total }) => {
  const f = useCurrentFrame();
  const v = (peak: number) => interpolate(f, [0, 10, total - 40, total], [0, peak, peak, 0], clamp);
  return (
    <>
      <Audio src={staticFile("stuk/sfx/drone.mp3")} volume={v(0.35)} />
      <Audio src={staticFile("stuk/sfx/tension.mp3")} volume={v(0.75)} />
    </>
  );
};

export const Episode: React.FC<{ ep: EpisodeDef }> = ({ ep }) => {
  const { starts, total, sceneStarts } = layout(ep);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {ep.scenes.map((s, k) => {
        const from = sceneStarts[k];
        const to = k + 1 < ep.scenes.length ? sceneStarts[k + 1] : total;
        return (
          <Sequence key={k} from={from} durationInFrames={to - from}>
            {s.render((i) => starts[i] - from, to - from)}
            {s.tape && <Tape num={s.tape[0]} text={s.tape[1]} />}
            {k > 0 && <Audio src={staticFile("stuk/sfx/whoosh.mp3")} volume={0.7} />}
          </Sequence>
        );
      })}
      {ep.captions.map((c, i) => {
        const dur = sec(ep.timing[i] + GAP);
        return (
          <Sequence key={i} from={starts[i]} durationInFrames={dur}>
            <Caption text={c} dur={dur} />
            <Audio src={staticFile(`stuk/${ep.id}/${String(i + 1).padStart(2, "0")}.mp3`)} volume={1.6} />
          </Sequence>
        );
      })}
      <Music total={total} />
    </AbsoluteFill>
  );
};
