import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

type ProgressRingProps = {
  /** Progress value 0-100 */
  value: number;
  /** Ring diameter in pixels */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Ring color */
  color?: string;
  /** Background ring color */
  bgColor?: string;
  /** Frame to start animating */
  startFrame?: number;
  /** Show value label in center */
  showLabel?: boolean;
  /** Label font size */
  labelSize?: number;
  /** Label color */
  labelColor?: string;
  style?: React.CSSProperties;
};

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  size = 120,
  strokeWidth = 8,
  color = '#818cf8',
  bgColor = 'rgba(255,255,255,0.1)',
  startFrame = 0,
  showLabel = true,
  labelSize = 28,
  labelColor = '#f1f5f9',
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 30, stiffness: 80 },
    durationInFrames: 60,
  });

  const animatedValue = interpolate(progress, [0, 1], [0, value]);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedValue / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, ...style }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={bgColor} strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      {showLabel && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: labelSize, fontWeight: 800, color: labelColor,
        }}>
          {Math.round(animatedValue)}%
        </div>
      )}
    </div>
  );
};
