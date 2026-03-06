import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { Theme } from '../theme';
import type { LayoutProps } from './TitleAndBody';

/**
 * StackedList layout — header + vertically stacked rows.
 *
 * Slots:
 *   header — top 12%
 *   row-1  — first row
 *   row-2  — second row
 *   row-3  — third row
 *   row-4  — fourth row
 *   row-5  — fifth row
 *
 * Best for: ordered lists, key-value pairs, bullet points.
 */
export const StackedList: React.FC<LayoutProps> = ({ theme, slots }) => {
  const rowSlots = ['row-1', 'row-2', 'row-3', 'row-4', 'row-5'];
  const activeRows = rowSlots.filter((s) => slots[s] != null);

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
          justifyContent: 'flex-start',
          fontFamily: theme.headingFont,
          fontSize: 42,
          color: theme.palette.primary,
        }}
      >
        {slots.header}
      </div>

      {/* Rows — remaining space */}
      <div
        style={{
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          minHeight: 0,
          padding: '10px 0',
        }}
      >
        {activeRows.map((slotName, i) => (
          <div
            key={slotName}
            style={{
              flex: '1 1 0',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
              padding: '12px 20px',
              borderRadius: 10,
              borderLeft: `4px solid ${getRowColor(theme, i)}`,
              backgroundColor: hexToRgba(getRowColor(theme, i), 0.04),
              fontSize: 22,
              lineHeight: 1.4,
              minHeight: 0,
            }}
          >
            {/* Row number */}
            <div
              style={{
                flex: '0 0 auto',
                fontFamily: theme.headingFont,
                fontSize: 24,
                fontWeight: 'bold',
                color: getRowColor(theme, i),
                minWidth: 28,
                textAlign: 'center',
              }}
            >
              {i + 1}.
            </div>

            {/* Row content */}
            <div style={{ flex: '1 1 auto', minWidth: 0 }}>
              {slots[slotName]}
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

function getRowColor(theme: Theme, index: number): string {
  const colors = [
    theme.palette.primary,
    theme.palette.accent1,
    theme.palette.secondary,
    theme.palette.accent2,
    theme.palette.primary,
  ];
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
