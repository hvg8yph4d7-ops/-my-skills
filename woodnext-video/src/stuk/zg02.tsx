// Загадка: «Мария Целеста» (1872), реалистичный стиль. Факты: Britannica; American Heritage;
// опыт с парами спирта — Андреа Селла, University College London, 2006.
import { EpisodeDef } from "./Episode";
import { Flash, Look, Shot } from "./s1e03r";
import { C, EndCard, Pills, sec, Sfx } from "./kit";
import timing from "./timing/zg02.json";

const K = (n: string) => `ai/zg02/${n}.jpg`;
const PILLS_Y = 1460;

export const ZG02: EpisodeDef = {
  id: "zg02",
  timing,
  music: "sea",
  captions: [
    "В $1872 ГОДУ В ОКЕАНЕ НАШЛИ КОРАБЛЬ. НА БОРТУ — ^НИ ^ОДНОГО ^ЧЕЛОВЕКА",
    "ЭТО «МАРИЯ ЦЕЛЕСТА». НА НЕЙ ПЛЫЛИ $ДЕСЯТЬ $ЧЕЛОВЕК. СРЕДИ НИХ ЖЕНА КАПИТАНА И ЕГО ^ДВУХЛЕТНЯЯ ^ДОЧЬ",
    "КОРАБЛЬ ШЁЛ ИЗ НЬЮ-ЙОРКА В ГЕНУЮ. ЧЕРЕЗ МЕСЯЦ ЕГО НАШЛИ У БЕРЕГОВ ПОРТУГАЛИИ. ^ПУСТЫМ",
    "СТРАННОСТЬ ПЕРВАЯ — $ЕДА. ВОДЫ И ЕДЫ НА БОРТУ — НА $ШЕСТЬ $МЕСЯЦЕВ",
    "ВЕЩИ ЭКИПАЖА НА МЕСТЕ. СЛЕДОВ ДРАКИ ~НЕТ",
    "СТРАННОСТЬ ВТОРАЯ — $ШЛЮПКА. ЕДИНСТВЕННОЙ ШЛЮПКИ ^НЕТ. ЛЮДИ УШЛИ ^САМИ",
    "СТРАННОСТЬ ТРЕТЬЯ — $ГРУЗ. $1700 БОЧЕК СПИРТА. ДЕВЯТЬ ИЗ НИХ ^ПУСТЫЕ",
    "ПОСЛЕДНЯЯ ЗАПИСЬ В ЖУРНАЛЕ — $25 $НОЯБРЯ. НИЧЕГО ~ТРЕВОЖНОГО",
    "ЗАЧЕМ БРОСАТЬ ЦЕЛЫЙ КОРАБЛЬ И УПЛЫВАТЬ В ОКЕАН ^НА ^ЛОДКЕ?",
    "ОДНА ИЗ ВЕРСИЙ — $ПАРЫ $СПИРТА. КАПИТАН ИСПУГАЛСЯ ВЗРЫВА И УВЁЛ ВСЕХ В ШЛЮПКУ",
    "В $2006 ГОДУ УЧЁНЫЕ ПРОВЕРИЛИ: ТАКАЯ ВСПЫШКА ^ПУГАЕТ, НО НЕ ОСТАВЛЯЕТ ОЖОГОВ",
    "НО КОРАБЛЬ УШЁЛ БЕЗ НИХ. ШЛЮПКУ И ДЕСЯТЬ ЧЕЛОВЕК ^ТАК ^И ^НЕ ^НАШЛИ",
    "А «МАРИЯ ЦЕЛЕСТА» ЕЩЁ $ДЕВЯТЬ $ДНЕЙ ПЛЫЛА САМА ПО СЕБЕ",
    "А ВАША ВЕРСИЯ? $ЧТО ЗАСТАВИЛО ИХ УЙТИ?",
  ],
  scenes: [
    {
      until: 2,
      tape: ["?", "ЗАГАДКА · МАРИЯ ЦЕЛЕСТА"],
      stamp: "4 ДЕКАБРЯ 1872",
      render: (at, dur) => (
        <>
          <Shot src={K("01")} dur={dur} from={1.0} to={1.18} />
          <Look fog={0.15} />
          <Sfx src="creak.mp3" at={sec(1)} volume={0.6} />
        </>
      ),
    },
    {
      until: 4,
      tape: ["1.", "ЕДА"],
      render: (at, dur) => (
        <>
          <Shot src={K("03")} dur={dur} from={1.12} to={1.0} />
          <Look />
          <Pills y={PILLS_Y} items={[["ЕДА НА 6 МЕСЯЦЕВ", at(3) + sec(2.5)]]} />
        </>
      ),
    },
    {
      until: 5,
      tape: ["2.", "ШЛЮПКА"],
      render: (at, dur) => (
        <>
          <Shot src={K("05")} dur={dur} from={1.0} to={1.15} />
          <Look fog={0.12} />
          <Sfx src="creak.mp3" at={at(5) + sec(1.5)} volume={0.6} />
          <Pills y={PILLS_Y} items={[["ЕДА НА 6 МЕСЯЦЕВ", 0], ["ШЛЮПКИ НЕТ", at(5) + sec(2.2), C.red]]} />
        </>
      ),
    },
    {
      until: 6,
      tape: ["3.", "ГРУЗ"],
      render: (at, dur) => (
        <>
          <Shot src={K("04")} dur={dur} from={1.15} to={1.0} />
          <Look />
          <Pills
            y={PILLS_Y}
            items={[["ЕДА НА 6 МЕСЯЦЕВ", 0], ["ШЛЮПКИ НЕТ", 0, C.red], ["9 ПУСТЫХ БОЧЕК", at(6) + sec(3.2)]]}
          />
        </>
      ),
    },
    {
      until: 8,
      stamp: "25 НОЯБРЯ 1872",
      render: (at, dur) => (
        <>
          <Shot src={K("08")} dur={dur} from={1.0} to={1.2} />
          <Look />
          <Sfx src="hit.mp3" at={at(8)} volume={0.5} />
        </>
      ),
    },
    {
      until: 10,
      tape: ["!", "ВЕРСИЯ"],
      render: (at, dur) => {
        const boom = at(9) + sec(1.0);
        return (
          <>
            <Shot src={K("07")} dur={dur} from={1.0} to={1.15} shakeAt={[boom]} />
            <Look />
            <Sfx src="boom.mp3" at={boom} volume={0.9} />
            <Flash at={boom} />
          </>
        );
      },
    },
    {
      until: 11,
      render: (at, dur) => (
        <>
          <Shot src={K("06")} dur={dur} from={1.0} to={1.25} />
          <Look fog={0.2} />
        </>
      ),
    },
    {
      until: 12,
      stamp: "9 ДНЕЙ БЕЗ ЛЮДЕЙ",
      render: (at, dur) => (
        <>
          <Shot src={K("02")} dur={dur} from={1.15} to={1.0} />
          <Look fog={0.15} />
          <Sfx src="creak.mp3" at={sec(0.8)} volume={0.7} />
        </>
      ),
    },
    { until: 13, render: () => <EndCard /> },
  ],
};
