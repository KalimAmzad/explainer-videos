import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { Theme } from '../theme';
import type { LayoutProps } from './TitleAndBody';

/**
 * Comparison layout — A vs B with verdict.
 *
 * Slots:
 *   header      — top 12%
 *   left-panel  — left side, 45% width
 *   right-panel — right side, 45% width
 *   verdict     — bottom banner, 15%
 *
 * Best for: pros/cons, comparisons, A vs B evaluations.
 */
export const Comparison: React.FC<LayoutProps> = ({ theme, slots }) => {
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

      {/* Panels area — middle */}
      <div
        style={{
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'row',
          gap: 24,
          minHeight: 0,
          padding: '10px 0',
        }}
      >
        {/* Left panel — 45% */}
        <div
          style={{
            flex: '1 1 45%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            padding: 20,
            borderRadius: 12,
            border: `2px solid ${theme.palette.accent1}`,
            backgroundColor: hexToRgba(theme.palette.accent1, 0.05),
            fontSize: 22,
            lineHeight: 1.5,
            minWidth: 0,
          }}
        >
          {slots['left-panel']}
        </div>

        {/* VS divider */}
        <div
          style={{
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: theme.headingFont,
            fontSize: 28,
            color: theme.palette.secondary,
            fontWeight: 'bold',
          }}
        >
          vs
        </div>

        {/* Right panel — 45% */}
        <div
          style={{
            flex: '1 1 45%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            padding: 20,
            borderRadius: 12,
            border: `2px solid ${theme.palette.accent2}`,
            backgroundColor: hexToRgba(theme.palette.accent2, 0.05),
            fontSize: 22,
            lineHeight: 1.5,
            minWidth: 0,
          }}
        >
          {slots['right-panel']}
        </div>
      </div>

      {/* Verdict — 15% */}
      <div
        style={{
          flex: '0 0 15%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: theme.headingFont,
          fontSize: 28,
          color: theme.palette.primary,
          textAlign: 'center',
          borderTop: `2px dashed ${theme.palette.primary}`,
          marginTop: 8,
          paddingTop: 8,
        }}
      >
        {slots.verdict}
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

function hexToRgba(hex: string, alpha: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
