import { Composition } from "remotion";
import { Promo, PromoFresh, TOTAL, FPS } from "./Promo";
import { PromoRef, REF_TOTAL } from "./PromoRef";
import { PromoStory, STORY_TOTAL } from "./PromoStory";
import { Faceless, FACELESS_TOTAL } from "./Faceless";
import { Episode, episodeFrames } from "./stuk/Episode";
import { S1E01 } from "./stuk/s1e01";
import { S1E02 } from "./stuk/s1e02";
import { S1E03 } from "./stuk/s1e03";
import { S1E03R } from "./stuk/s1e03r";
import { Avatar } from "./stuk/Avatar";
import { AiDemo } from "./stuk/AiDemo";
import { FIN001 } from "./fin/d001";
import { PR01, Store } from "./stuk/pr01";
import { PR02, Train } from "./stuk/pr02";
import { Slope, ZG01 } from "./stuk/zg01";
import { Cover, SceneReal3 } from "./stuk/Cover";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Вариант 1: тёмный, дерево */}
      <Composition id="Promo" component={Promo} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />
      {/* Вариант 2: светлый, кремовый с зелёным */}
      <Composition id="PromoFresh" component={PromoFresh} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />
      {/* Вариант 3: как в референсе (ролик «Баня за 970 000») */}
      <Composition id="PromoRef" component={PromoRef} durationInFrames={REF_TOTAL} fps={FPS} width={1080} height={1920} />
      {/* Вариант 4: сторителлинг — 3D-текст за спиной, рисованные вставки, флешбэк */}
      <Composition id="PromoStory" component={PromoStory} durationInFrames={STORY_TOTAL} fps={FPS} width={1080} height={1920} />
      {/* Серия faceless (как surv_protocol): «3 ошибки при выборе модульного дома» */}
      <Composition id="Faceless" component={Faceless} durationInFrames={FACELESS_TOTAL} fps={FPS} width={1080} height={1920} />
      {/* «Третий стук» — страшный сериал «Сезон закрыт» */}
      <Composition id="S1E01" component={() => <Episode ep={S1E01} />} durationInFrames={episodeFrames(S1E01)} fps={FPS} width={1080} height={1920} />
      <Composition id="S1E02" component={() => <Episode ep={S1E02} />} durationInFrames={episodeFrames(S1E02)} fps={FPS} width={1080} height={1920} />
      <Composition id="S1E03" component={() => <Episode ep={S1E03} />} durationInFrames={episodeFrames(S1E03)} fps={FPS} width={1080} height={1920} />
      <Composition id="PR01" component={() => <Episode ep={PR01} />} durationInFrames={episodeFrames(PR01)} fps={FPS} width={1080} height={1920} />
      <Composition id="PR02" component={() => <Episode ep={PR02} />} durationInFrames={episodeFrames(PR02)} fps={FPS} width={1080} height={1920} />
      <Composition id="ZG01" component={() => <Episode ep={ZG01} />} durationInFrames={episodeFrames(ZG01)} fps={FPS} width={1080} height={1920} />
      {/* «200 ₽ в день» — финансовый эксперимент */}
      <Composition id="FIN001" component={() => <Episode ep={FIN001} />} durationInFrames={episodeFrames(FIN001)} fps={FPS} width={1080} height={1920} />
      <Composition id="S1E03R" component={() => <Episode ep={S1E03R} />} durationInFrames={episodeFrames(S1E03R)} fps={FPS} width={1080} height={1920} />
      <Composition id="AiDemo" component={AiDemo} durationInFrames={300} fps={FPS} width={1080} height={1920} />
      {/* Аватарка «Третьего стука» */}
      <Composition id="Avatar" component={() => <Avatar />} durationInFrames={1} fps={FPS} width={1080} height={1080} />
      <Composition id="AvatarOpen" component={() => <Avatar variant="open" />} durationInFrames={1} fps={FPS} width={1080} height={1080} />
      {/* Обложки серий */}
      <Composition id="Cover1" component={() => <Cover n={1} title={["СВЕТ", "У КОВАЛЁВЫХ"]} />} durationInFrames={1} fps={FPS} width={1080} height={1920} />
      <Composition id="Cover2" component={() => <Cover n={2} title={["ЗОВУТ", "ГОЛОСОМ", "СЕСТРЫ"]} />} durationInFrames={1} fps={FPS} width={1080} height={1920} />
      <Composition id="CoverPR01" component={() => <Cover n={0} tape="ПРАВИЛА НОЧНОЙ СМЕНЫ" kicker="АПТЕКА 24" title={["НЕ ОТКРЫВАЙ", "ОКОШКО"]} scene={<Store />} />} durationInFrames={1} fps={FPS} width={1080} height={1920} />
      <Composition id="CoverZG01" component={() => <Cover n={0} tape="ЗАГАДКА" kicker="1959 · 9 ЧЕЛОВЕК" title={["ПЕРЕВАЛ", "ДЯТЛОВА"]} scene={<Slope cut trail={1} fire />} />} durationInFrames={1} fps={FPS} width={1080} height={1920} />
      <Composition id="CoverPR02" component={() => <Cover n={0} tape="ПРАВИЛА ЭЛЕКТРИЧКИ" kicker="00:47" title={["НЕ СМОТРИ", "В ОКНО"]} scene={<Train />} />} durationInFrames={1} fps={FPS} width={1080} height={1920} />
      <Composition id="Cover3R" component={() => <Cover n={3} title={["ГЛАЗА", "ЗА СПИНОЙ"]} scene={<SceneReal3 />} />} durationInFrames={1} fps={FPS} width={1080} height={1920} />
      <Composition id="Cover3" component={() => <Cover n={3} title={["СЛЕДЫ", "ИЗНУТРИ"]} />} durationInFrames={1} fps={FPS} width={1080} height={1920} />
    </>
  );
};
