import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { Theme } from '../theme';
import type { LayoutProps } from './TitleAndBody';

/**
 * AnnotatedDiagram layout — large central diagram with callout labels at the corners.
 *
 * Slots:
 *   header  — top 12%
 *   center  — large diagram, centered
 *   label-1 — top-left callout
 *   label-2 — top-right callout
 *   label-3 — bottom-left callout
 *   label-4 — bottom-right callout
 *
 * Best for: complex visuals with labeled parts, anatomy, architecture diagrams.
 */
export const AnnotatedDiagram: React.FC<LayoutProps> = ({ theme, slots }) => {
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${theme.background} 0%, ${darken(theme.background, 0.03)} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        padding: 40,
        fontFamily: theme.primaryFont,
        color: theme.palette.text,
      }}
    >
      {/* Header — 12% */}
      <div
        style={{
          flex: '0 0 12%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: theme.headingFont,
          fontSize: 42,
          color: theme.palette.primary,
          textAlign: 'center',
        }}
      >
        {slots.header}
      </div>

      {/* Content area — 88% with relative positioning for labels */}
      <div
        style={{
          flex: '1 1 auto',
          position: 'relative',
          minHeight: 0,
        }}
      >
        {/* Center diagram — absolutely centered, 55% of area */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '55%',
            height: '75%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {slots.center}
        </div>

        {/* Label 1 — top-left */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 0,
            width: '22%',
            ...labelStyle(theme, 0),
          }}
        >
          {slots['label-1']}
        </div>

        {/* Label 2 — top-right */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 0,
            width: '22%',
            ...labelStyle(theme, 1),
          }}
        >
          {slots['label-2']}
        </div>

        {/* Label 3 — bottom-left */}
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: 0,
            width: '22%',
            ...labelStyle(theme, 2),
          }}
        >
          {slots['label-3']}
        </div>

        {/* Label 4 — bottom-right */}
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            right: 0,
            width: '22%',
            ...labelStyle(theme, 3),
          }}
        >
          {slots['label-4']}
        </div>
      </div>
    </AbsoluteFill>
  );
};

function labelStyle(
  theme: Theme,
  index: number,
): React.CSSProperties {
  const colors = [
    theme.palette.accent1,
    theme.palette.accent2,
    theme.palette.secondary,
    theme.palette.primary,
  ];
  const color = colors[index % colors.length];

  return {
    padding: 12,
    borderRadius: 8,
    border: `2px solid ${color}`,
    backgroundColor: hexToRgba(color, 0.06),
    fontSize: 18,
    lineHeight: 1.4,
    textAlign: 'center',
  };
}

function darken(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) - Math.round(255 * amount));
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * amount));
  const b = Math.max(0, (num & 0xff) - Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
