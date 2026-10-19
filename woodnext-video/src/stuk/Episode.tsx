// Сборка серии «Третий стук»: фразы голоса идут одна за другой, сцены
// сменяются на заданных фразах, субтитры и полоска-«скотч» — поверх.
import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { clamp, KaraokeCaption, KWord, sec, splitWords, Stamp, Tape } from "./kit";

export type Scene = {
  until: number; // индекс последней фразы сцены (включительно)
  tape?: [num: string, text: string];
  stamp?: string; // отметка времени сверху, например «НОЧЬ 4 · 02:41»
  // at(i) — кадр начала фразы i относительно начала сцены; dur — длина сцены в кадрах
  render: (at: (i: number) => number, dur: number) => React.ReactNode;
};

export type EpisodeDef = {
  id: string;
  captions: string[]; // по одной на фразу озвучки, разметка как в Caption
  timing: number[]; // длительности фраз, секунды (src/stuk/timing/<id>.json)
  scenes: Scene[];
  music?: "horror" | "fin"; // фон: страшилки (по умолчанию) или финансовый ритм
};

const LEAD = 0.25; // тишина до первой фразы
const GAP = 0.06; // пауза между фразами
const SCENE_GAP = 0.18; // пауза на смене сцены
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

// Фон: мрачный эмбиент с нотами + нагнетание (страшилки) или спокойный ритм (финансы)
const Music: React.FC<{ total: number; kind: "horror" | "fin" }> = ({ total, kind }) => {
  const f = useCurrentFrame();
  const v = (peak: number) => interpolate(f, [0, 10, total - 40, total], [0, peak, peak, 0], clamp);
  if (kind === "fin") return <Audio src={staticFile("fin/beat.mp3")} volume={v(0.45)} />;
  return (
    <>
      <Audio src={staticFile("stuk/sfx/ambient.mp3")} volume={v(0.8)} />
      <Audio src={staticFile("stuk/sfx/tension.mp3")} volume={v(0.25)} />
    </>
  );
};

// Фраза режется на куски по 2–3 слова; время слова — пропорционально длине текста до него
const PhraseCaptions: React.FC<{ caption: string; seconds: number; dur: number }> = ({ caption, seconds, dur }) => {
  const words = splitWords(caption);
  const total = words.reduce((a, w) => a + w.text.length + 1, 0);
  let acc = 0;
  const timed = words.map((w) => {
    const at = sec((acc / total) * seconds);
    acc += w.text.length + 1;
    return { ...w, at };
  });
  const chunks: (typeof timed)[] = [];
  for (const w of timed) {
    const last = chunks[chunks.length - 1];
    const prevEnds = last && /[.,!?…—:]$/.test(last[last.length - 1].text);
    if (!last || last.length >= 3 || (prevEnds && last.length >= 2)) chunks.push([w]);
    else last.push(w);
  }
  return (
    <>
      {chunks.map((ch, k) => {
        const from = ch[0].at;
        const to = k + 1 < chunks.length ? chunks[k + 1][0].at : dur;
        const words: KWord[] = ch.map((w) => ({ text: w.text, color: w.color, at: w.at - from }));
        return (
          <Sequence key={k} from={from} durationInFrames={Math.max(1, to - from)}>
            <KaraokeCaption words={words} dur={Math.max(1, to - from)} />
          </Sequence>
        );
      })}
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
            {s.stamp && <Stamp text={s.stamp} />}
            {k > 0 && <Audio src={staticFile("stuk/sfx/whoosh.mp3")} volume={ep.music === "fin" ? 0.35 : 0.7} />}
          </Sequence>
        );
      })}
      {ep.captions.map((c, i) => {
        const dur = sec(ep.timing[i] + GAP);
        return (
          <Sequence key={i} from={starts[i]} durationInFrames={dur}>
            <PhraseCaptions caption={c} seconds={ep.timing[i]} dur={dur} />
            <Audio src={staticFile(`stuk/${ep.id}/${String(i + 1).padStart(2, "0")}.mp3`)} volume={1.6} />
          </Sequence>
        );
      })}
      <Music total={total} kind={ep.music ?? "horror"} />
    </AbsoluteFill>
  );
};
