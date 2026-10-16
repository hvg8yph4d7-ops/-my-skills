import { Composition } from "remotion";
import { Promo, TOTAL, FPS } from "./Promo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition id="Promo" component={Promo} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />
  );
};
