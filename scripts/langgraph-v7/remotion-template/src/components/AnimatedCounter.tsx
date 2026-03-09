import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

type AnimatedCounterProps = {
  /** Target value to count to */
  value: number;
  /** Frame to start counting */
  startFrame?: number;
  /** Duration of count animation in frames */
  durationFrames?: number;
  /** Suffix to display (e.g. '%', 'K', '+') */
  suffix?: string;
  /** Prefix to display (e.g. '$', '#') */
  prefix?: string;
  /** Number of decimal places */
  decimals?: number;
  /** CSS styles for the number */
  style?: React.CSSProperties;
};

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  startFrame = 0,
  durationFrames = 45,
  suffix = '',
  prefix = '',
  decimals = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 30, stiffness: 120 },
    durationInFrames: durationFrames,
  });

  const currentValue = interpolate(progress, [0, 1], [0, value]);
  const display = currentValue.toFixed(decimals);

  const scale = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 8, stiffness: 200 },
  });

  return (
    <span style={{
      display: 'inline-block',
      transform: `scale(${0.5 + 0.5 * scale})`,
      ...style,
    }}>
      {prefix}{display}{suffix}
    </span>
  );
};
