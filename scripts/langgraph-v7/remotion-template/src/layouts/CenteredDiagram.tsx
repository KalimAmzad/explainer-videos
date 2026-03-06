import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { Theme } from '../theme';
import type { LayoutProps } from './TitleAndBody';

/**
 * CenteredDiagram layout — one large diagram/chart centered on the canvas.
 *
 * Slots:
 *   header — top 12%
 *   main   — center 70% (horizontally and vertically centered)
 *   footer — bottom 12%
 *
 * Best for: one dominant diagram, chart, or visual.
 */
export const CenteredDiagram: React.FC<LayoutProps> = ({ theme, slots }) => {
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
          fontSize: 44,
          color: theme.palette.primary,
          textAlign: 'center',
        }}
      >
        {slots.header}
      </div>

      {/* Main — 70% centered */}
      <div
        style={{
          flex: '1 1 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 0,
          padding: '10px 20px',
        }}
      >
        {slots.main}
      </div>

      {/* Footer — 12% */}
      <div
        style={{
          flex: '0 0 12%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          textAlign: 'center',
          color: theme.palette.text,
          opacity: 0.8,
        }}
      >
        {slots.footer}
      </div>
    </AbsoluteFill>
  );
};

function darken(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) - Math.round(255 * amount));
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * amount));
  const b = Math.max(0, (num & 0xff) - Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
