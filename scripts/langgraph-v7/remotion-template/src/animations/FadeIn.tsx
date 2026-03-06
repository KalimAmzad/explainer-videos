import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

type FadeInProps = {
  /** Number of frames over which the fade completes. */
  durationFrames: number;
  children: React.ReactNode;
};

/**
 * Simple opacity fade-in animation.
 *
 * Linearly interpolates opacity from 0 to 1 over the given duration.
 *
 * Must be placed inside a `<Sequence>` so `useCurrentFrame()` returns
 * the local frame starting from 0.
 */
export const FadeIn: React.FC<FadeInProps> = ({ durationFrames, children }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
  });

  return (
    <div style={{ opacity, width: '100%' }}>
      {children}
    </div>
  );
};
