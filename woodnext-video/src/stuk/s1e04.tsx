// «Сезон закрыт», серия 4 — «Палыч» (реалистичный стиль): Макс обернулся — никого, дверь приоткрыта.
// Ложки на ручках, Найда у порога, Палыч обещает прийти. Стучат голосом Палыча, Найда молчит,
// а сам Палыч пишет: «Я ещё у себя. Не открывай».
import { EpisodeDef } from "./Episode";
import { Chat, Flash, Look, Shot } from "./s1e03r";
import { EndCard, Pills, sec, Sfx } from "./kit";
import timing from "./timing/s1e04.json";

const K = (n: string) => `ai/s1e04/${n}.jpg`;
const PILLS_Y = 1460;

export const S1E04: EpisodeDef = {
  id: "s1e04",
  timing,
  music: "real",
  captions: [
    "В ПРОШЛОЙ СЕРИИ ЗА МОЕЙ СПИНОЙ ГОРЕЛИ ^ДВА ^ГЛАЗА. Я ОБЕРНУЛСЯ",
    "В КОМНАТЕ ~НИКОГО. ТОЛЬКО ДВЕРЬ В КОРИДОР $ПРИОТКРЫТА",
    "А Я ТОЧНО ПОМНЮ: Я ЕЁ ^ЗАКРЫЛ",
    "ДО РАССВЕТА $ПЯТЬ $ЧАСОВ. ДО СТОРОЖКИ ПАЛЫЧА — $ТРИСТА $МЕТРОВ",
    "ЗНАЧИТ, НОЧЬ НУЖНО ПРОВЕСТИ ^С ^УМОМ",
    "ПЕРВОЕ — $ДВЕРИ. ЗАКРЫВАЮ КАЖДУЮ И ВЕШАЮ НА РУЧКУ ЛОЖКУ. УПАДЁТ — УСЛЫШУ",
    "ВТОРОЕ — $НАЙДА. КЛАДУ ЕЁ У ПОРОГА. СОБАКА ЧУЕТ РАНЬШЕ МЕНЯ",
    "ТРЕТЬЕ — $ПАЛЫЧ. ПИШУ ЕМУ: У МЕНЯ В ДОМЕ КТО-ТО ЕСТЬ",
    "ОН ОТВЕЧАЕТ ЧЕРЕЗ МИНУТУ: ^НЕ ^ВЫХОДИ. ИДУ",
    "НА БУМАГЕ Я БЫЛ ГОТОВ КО ВСЕМУ. БЫЛА ЛИШЬ ^ОДНА ^ПРОБЛЕМА",
    "ЧЕРЕЗ ДЕСЯТЬ МИНУТ В ДВЕРЬ СТУЧАТ. И ГОЛОС ПАЛЫЧА: $ОТКРЫВАЙ, $ЭТО $Я",
    "НАЙДА ^МОЛЧИТ. НЕ РЫЧИТ, НЕ ЛАЕТ. ПРОСТО СМОТРИТ НА ДВЕРЬ",
    "И Я ВСПОМИНАЮ ТРЕТЬЕ ПРАВИЛО ДЕДА. ОН ЕГО $НЕ $ДОПИСАЛ",
    "ЕСЛИ НАЙДА МОЛЧИТ — ^НЕ ^ВЫХОДИ",
    "А ТЕЛЕФОН ВИБРИРУЕТ. ПАЛЫЧ: ^Я ^ЕЩЁ ^У ^СЕБЯ. ^НЕ ^ОТКРЫВАЙ",
    "ЧАСТЬ ПЯТАЯ. $КТО СТОИТ ЗА ДВЕРЬЮ?",
  ],
  scenes: [
    {
      until: 2,
      tape: ["!", "СЕЗОН ЗАКРЫТ · ЧАСТЬ 4"],
      stamp: "НОЧЬ 4 · 02:10",
      render: (at, dur) => (
        <>
          <Shot src={K("01")} dur={dur} from={1.0} to={1.16} ox="55%" oy="45%" />
          <Look />
          <Sfx src="heart.mp3" at={0} volume={0.5} />
          <Sfx src="creak.mp3" at={at(1) + sec(1)} volume={0.9} />
        </>
      ),
    },
    {
      until: 4,
      stamp: "ДО РАССВЕТА 5 ЧАСОВ",
      render: (at, dur) => (
        <>
          <Shot src={K("05")} dur={dur} from={1.15} to={1.0} oy="55%" />
          <Look fog={0.22} />
        </>
      ),
    },
    {
      until: 5,
      tape: ["1.", "ДВЕРИ"],
      stamp: "НОЧЬ 4 · 02:14",
      render: (at, dur) => (
        <>
          <Shot src={K("02")} dur={dur} from={1.0} to={1.14} />
          <Look />
          <Sfx src="click.wav" at={at(5) + sec(2.4)} volume={0.6} />
          <Pills y={PILLS_Y} items={[["ЛОЖКИ НА РУЧКАХ", at(5) + sec(2.4)]]} />
        </>
      ),
    },
    {
      until: 6,
      tape: ["2.", "НАЙДА"],
      render: (at, dur) => (
        <>
          <Shot src={K("03")} dur={dur} from={1.12} to={1.0} oy="60%" />
          <Look />
          <Pills y={PILLS_Y} items={[["ЛОЖКИ НА РУЧКАХ", 0], ["НАЙДА У ПОРОГА", at(6) + sec(1.4)]]} />
        </>
      ),
    },
    {
      until: 8,
      tape: ["3.", "ПАЛЫЧ"],
      stamp: "НОЧЬ 4 · 02:19",
      render: (at, dur) => (
        <>
          <Shot src={K("04")} dur={dur} from={1.08} to={1.0} />
          <Look />
          <Chat
            msgs={[
              ["У меня в доме кто-то есть", true, at(7) + sec(1.3)],
              ["Не выходи. Иду", false, at(8) + sec(0.8)],
            ]}
          />
          <Sfx src="tap.mp3" at={at(7) + sec(1.2)} volume={0.8} />
          <Sfx src="buzz.mp3" at={at(8) + sec(0.7)} volume={0.6} />
          <Pills y={PILLS_Y} items={[["ЛОЖКИ НА РУЧКАХ", 0], ["НАЙДА У ПОРОГА", 0], ["ПАЛЫЧ ИДЁТ", at(8) + sec(1.5)]]} />
        </>
      ),
    },
    {
      until: 10,
      stamp: "НОЧЬ 4 · 02:29",
      render: (at, dur) => {
        const k0 = at(10) + sec(1.2);
        const hits = [k0, k0 + sec(1.12), k0 + sec(2.24)];
        return (
          <>
            <Shot src={K("06")} dur={dur} from={1.0} to={1.18} oy="70%" shakeAt={hits} />
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
      until: 11,
      render: (at, dur) => (
        <>
          <Shot src={K("07")} dur={dur} from={1.0} to={1.15} oy="40%" />
          <Look />
          <Sfx src="heart.mp3" at={0} volume={0.9} />
        </>
      ),
    },
    {
      until: 13,
      tape: ["!", "ПРАВИЛО 3"],
      render: (at, dur) => (
        <>
          <Shot src={K("08")} dur={dur} from={1.0} to={1.2} />
          <Look />
          <Sfx src="hit.mp3" at={at(13)} volume={0.6} />
        </>
      ),
    },
    {
      until: 14,
      stamp: "НОЧЬ 4 · 02:31",
      render: (at, dur) => {
        const msg = at(14) + sec(1.6);
        return (
          <>
            <Shot src={K("09")} dur={dur} from={1.0} to={1.12} shakeAt={[msg]} />
            <Look />
            <Chat msgs={[["Я ещё у себя. Не открывай", false, msg]]} />
            <Sfx src="buzz.mp3" at={at(14)} volume={0.8} />
            <Sfx src="riser.mp3" at={msg - sec(2.2)} volume={0.6} />
            <Sfx src="boom.mp3" at={msg} volume={1.1} />
            <Flash at={msg} />
          </>
        );
      },
    },
    { until: 15, render: () => <EndCard /> },
  ],
};
