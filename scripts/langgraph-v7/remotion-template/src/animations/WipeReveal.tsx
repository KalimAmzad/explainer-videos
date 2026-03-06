import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';

type WipeRevealProps = {
  /** Number of frames over which the wipe completes. */
  durationFrames: number;
  children: React.ReactNode;
};

/**
 * Left-to-right clip-path text reveal animation.
 *
 * Uses `clipPath: inset(...)` to progressively reveal content from left to
 * right. Intended for text elements to replicate the "writing-on" whiteboard
 * effect without actual handwriting simulation.
 *
 * Must be placed inside a `<Sequence>` so `useCurrentFrame()` returns
 * the local frame starting from 0.
 */
export const WipeReveal: React.FC<WipeRevealProps> = ({
  durationFrames,
  children,
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [0, durationFrames], [0, 100], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
    easing: Easing.inOut(Easing.quad),
  });

  return (
    <div
      style={{
        clipPath: `inset(0 ${100 - progress}% 0 0)`,
        width: '100%',
      }}
    >
      {children}
    </div>
  );
};
