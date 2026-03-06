import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { Theme } from '../theme';
import type { LayoutProps } from './TitleAndBody';

/**
 * TwoColumn layout — header + two equal columns.
 *
 * Slots:
 *   header — top 15%
 *   left   — left column, 48% width
 *   right  — right column, 48% width
 *
 * Best for: side-by-side content, before/after, dual concepts.
 */
export const TwoColumn: React.FC<LayoutProps> = ({ theme, slots }) => {
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
      {/* Header — 15% */}
      <div
        style={{
          flex: '0 0 15%',
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

      {/* Columns — remaining space */}
      <div
        style={{
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'row',
          gap: 30,
          minHeight: 0,
        }}
      >
        {/* Left column — 48% */}
        <div
          style={{
            flex: '1 1 48%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            padding: 20,
            fontSize: 24,
            lineHeight: 1.5,
            minWidth: 0,
          }}
        >
          {slots.left}
        </div>

        {/* Right column — 48% */}
        <div
          style={{
            flex: '1 1 48%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            padding: 20,
            fontSize: 24,
            lineHeight: 1.5,
            minWidth: 0,
          }}
        >
          {slots.right}
        </div>
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
