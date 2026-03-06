import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { Theme } from '../theme';
import type { LayoutProps } from './TitleAndBody';

/**
 * FullIllustration layout — main fills the canvas, title overlays top with semi-transparent background.
 *
 * Slots:
 *   overlay-title — text overlay at the top with backdrop
 *   main          — fills the entire canvas
 *
 * Best for: single dominant image, hero shots, splash scenes.
 */
export const FullIllustration: React.FC<LayoutProps> = ({ theme, slots }) => {
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${theme.background} 0%, ${darken(theme.background, 0.03)} 100%)`,
        fontFamily: theme.primaryFont,
        color: theme.palette.text,
      }}
    >
      {/* Main — fills entire canvas */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        {slots.main}
      </AbsoluteFill>

      {/* Overlay title — pinned to the top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 40px',
          background: `linear-gradient(180deg, ${hexToRgba(theme.background, 0.92)} 0%, ${hexToRgba(theme.background, 0.6)} 80%, ${hexToRgba(theme.background, 0)} 100%)`,
          fontFamily: theme.headingFont,
          fontSize: 48,
          color: theme.palette.primary,
          textAlign: 'center',
        }}
      >
        {slots['overlay-title']}
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
