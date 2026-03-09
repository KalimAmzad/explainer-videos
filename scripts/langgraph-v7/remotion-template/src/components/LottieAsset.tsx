import React, { useEffect, useState } from 'react';
import { Lottie, LottieAnimationData } from '@remotion/lottie';
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';

type LottieAssetProps = {
  /** Path relative to public/ (use staticFile) or a full URL */
  src: string;
  /** CSS styles for the container */
  style?: React.CSSProperties;
  /** Playback direction: 1 = forward, -1 = reverse */
  direction?: 1 | -1;
  /** Whether to loop the animation */
  loop?: boolean;
  /** Playback speed multiplier */
  speed?: number;
};

export const LottieAsset: React.FC<LottieAssetProps> = ({
  src,
  style,
  direction = 1,
  loop = true,
  speed = 1,
}) => {
  const [handle] = useState(() => delayRender('Loading Lottie animation'));
  const [animationData, setAnimationData] = useState<LottieAnimationData | null>(null);

  useEffect(() => {
    fetch(src)
      .then((res) => res.json())
      .then((json) => {
        setAnimationData(json);
        continueRender(handle);
      })
      .catch((err) => {
        console.error('LottieAsset failed to load:', src, err);
        continueRender(handle);
      });
  }, [handle, src]);

  if (!animationData) return null;

  return (
    <Lottie
      animationData={animationData}
      style={style}
      direction={direction}
      loop={loop}
      playbackRate={speed}
    />
  );
};
