import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

type FloatingElementProps = {
  children: React.ReactNode;
  /** Vertical float amplitude in pixels */
  amplitude?: number;
  /** Float cycle duration in seconds */
  period?: number;
  /** Phase offset (0-1) to desync multiple floaters */
  phase?: number;
  /** Optional horizontal sway amplitude */
  swayAmplitude?: number;
  /** Fade-in start frame */
  startFrame?: number;
  style?: React.CSSProperties;
};

export const FloatingElement: React.FC<FloatingElementProps> = ({
  children,
  amplitude = 8,
  period = 3,
  phase = 0,
  swayAmplitude = 0,
  startFrame = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const t = (frame - startFrame) / fps;
  const fadeIn = interpolate(frame, [startFrame, startFrame + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const y = Math.sin((t / period + phase) * Math.PI * 2) * amplitude;
  const x = swayAmplitude ? Math.cos((t / period + phase) * Math.PI * 2) * swayAmplitude : 0;

  return (
    <div style={{
      opacity: fadeIn,
      transform: `translate(${x}px, ${y}px)`,
      ...style,
    }}>
      {children}
    </div>
  );
};
