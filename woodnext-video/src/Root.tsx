import { Composition } from "remotion";
import { Promo, PromoFresh, TOTAL, FPS } from "./Promo";
import { PromoRef, REF_TOTAL } from "./PromoRef";
import { PromoStory, STORY_TOTAL } from "./PromoStory";

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
    </>
  );
};
