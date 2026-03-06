import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { Theme } from '../theme';
import type { LayoutProps } from './TitleAndBody';

/**
 * Grid4 layout — header + 2x2 grid.
 *
 * Slots:
 *   header — top 12%
 *   cell-1 — top-left
 *   cell-2 — top-right
 *   cell-3 — bottom-left
 *   cell-4 — bottom-right
 *
 * Best for: four related items, quadrant breakdowns, categorization.
 */
export const Grid4: React.FC<LayoutProps> = ({ theme, slots }) => {
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

      {/* 2x2 grid — remaining space */}
      <div
        style={{
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          minHeight: 0,
        }}
      >
        {/* Top row */}
        <div
          style={{
            flex: '1 1 50%',
            display: 'flex',
            flexDirection: 'row',
            gap: 20,
            minHeight: 0,
          }}
        >
          <GridCell theme={theme} colorIndex={0}>
            {slots['cell-1']}
          </GridCell>
          <GridCell theme={theme} colorIndex={1}>
            {slots['cell-2']}
          </GridCell>
        </div>

        {/* Bottom row */}
        <div
          style={{
            flex: '1 1 50%',
            display: 'flex',
            flexDirection: 'row',
            gap: 20,
            minHeight: 0,
          }}
        >
          <GridCell theme={theme} colorIndex={2}>
            {slots['cell-3']}
          </GridCell>
          <GridCell theme={theme} colorIndex={3}>
            {slots['cell-4']}
          </GridCell>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const GridCell: React.FC<{
  theme: Theme;
  colorIndex: number;
  children: React.ReactNode;
}> = ({ theme, colorIndex, children }) => {
  const colors = [
    theme.palette.accent1,
    theme.palette.accent2,
    theme.palette.secondary,
    theme.palette.primary,
  ];
  const color = colors[colorIndex % colors.length];

  return (
    <div
      style={{
        flex: '1 1 50%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: 16,
        borderRadius: 12,
        border: `2px solid ${color}`,
        backgroundColor: hexToRgba(color, 0.04),
        fontSize: 20,
        lineHeight: 1.5,
        minWidth: 0,
        minHeight: 0,
      }}
    >
      {children}
    </div>
  );
};

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
