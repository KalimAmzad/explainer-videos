import React from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';

type FadeScaleProps = {
  /** Number of frames over which the animation plays. */
  durationFrames: number;
  children: React.ReactNode;
};

/**
 * Fade in with scale spring animation.
 *
 * Element scales from 0.8 to 1.0 and fades from 0 to 1 using Remotion's
 * `spring()` for a smooth, organic feel with no overshoot.
 *
 * Must be placed inside a `<Sequence>` so `useCurrentFrame()` returns
 * the local frame starting from 0.
 */
export const FadeScale: React.FC<FadeScaleProps> = ({
  durationFrames,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    config: {
      damping: 200,
      mass: 1,
      stiffness: 100,
    },
    durationInFrames: durationFrames,
  });

  const scale = 0.8 + 0.2 * progress;
  const opacity = progress;

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        width: '100%',
      }}
    >
      {children}
    </div>
  );
};
