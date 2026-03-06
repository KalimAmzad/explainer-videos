import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { Theme } from '../theme';
import type { LayoutProps } from './TitleAndBody';

/**
 * Grid3 layout — header + three equal cells in a row.
 *
 * Slots:
 *   header — top 15%
 *   cell-1 — first cell (left)
 *   cell-2 — second cell (center)
 *   cell-3 — third cell (right)
 *
 * Best for: three related categories, features, or items.
 */
export const Grid3: React.FC<LayoutProps> = ({ theme, slots }) => {
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

      {/* Grid row — remaining space */}
      <div
        style={{
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'row',
          gap: 24,
          minHeight: 0,
        }}
      >
        {['cell-1', 'cell-2', 'cell-3'].map((slotName, i) => (
          <div
            key={slotName}
            style={{
              flex: '1 1 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              padding: 20,
              borderRadius: 12,
              border: `2px solid ${getCellColor(theme, i)}`,
              backgroundColor: hexToRgba(getCellColor(theme, i), 0.04),
              fontSize: 22,
              lineHeight: 1.5,
              minWidth: 0,
            }}
          >
            {slots[slotName]}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

function getCellColor(theme: Theme, index: number): string {
  const colors = [theme.palette.accent1, theme.palette.accent2, theme.palette.secondary];
  return colors[index % colors.length];
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
