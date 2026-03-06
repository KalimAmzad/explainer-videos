import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { Theme } from '../theme';

export type LayoutProps = {
  theme: Theme;
  slots: Record<string, React.ReactNode>;
};

/**
 * TitleAndBody layout — full-width stacked.
 *
 * Slots:
 *   header — top ~20% of the canvas
 *   body   — remaining ~70%, padded
 *
 * Best for: introductions, conclusions, text-heavy scenes.
 */
export const TitleAndBody: React.FC<LayoutProps> = ({ theme, slots }) => {
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
      {/* Header — ~20% */}
      <div
        style={{
          flex: '0 0 20%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: theme.headingFont,
          fontSize: 48,
          color: theme.palette.primary,
        }}
      >
        {slots.header}
      </div>

      {/* Body — ~70% */}
      <div
        style={{
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          padding: '20px 40px',
          fontSize: 28,
          lineHeight: 1.6,
        }}
      >
        {slots.body}
      </div>

      {/* Bottom spacer — ~10% */}
      <div style={{ flex: '0 0 10%' }} />
    </AbsoluteFill>
  );
};

/** Darken a hex color by a fraction (0-1). */
function darken(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) - Math.round(255 * amount));
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * amount));
  const b = Math.max(0, (num & 0xff) - Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
