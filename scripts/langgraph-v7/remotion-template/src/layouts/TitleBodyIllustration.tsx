import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { Theme } from '../theme';
import type { LayoutProps } from './TitleAndBody';

/**
 * TitleBodyIllustration layout — header, body text on the left, main illustration on the right, caption below.
 *
 * Slots:
 *   header  — top 15% full width
 *   body    — below header, left 40%
 *   main    — below header, right 55%
 *   caption — under the main illustration
 *
 * Best for: concept + supporting visual.
 */
export const TitleBodyIllustration: React.FC<LayoutProps> = ({ theme, slots }) => {
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
          justifyContent: 'flex-start',
          fontFamily: theme.headingFont,
          fontSize: 44,
          color: theme.palette.primary,
        }}
      >
        {slots.header}
      </div>

      {/* Content area — 85% */}
      <div
        style={{
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'row',
          gap: 30,
          minHeight: 0,
        }}
      >
        {/* Body — left 40% */}
        <div
          style={{
            flex: '0 0 40%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            paddingTop: 10,
            fontSize: 24,
            lineHeight: 1.6,
          }}
        >
          {slots.body}
        </div>

        {/* Right column — 55% with main + caption */}
        <div
          style={{
            flex: '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minHeight: 0,
          }}
        >
          {/* Main illustration */}
          <div
            style={{
              flex: '1 1 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              minHeight: 0,
            }}
          >
            {slots.main}
          </div>

          {/* Caption */}
          <div
            style={{
              flex: '0 0 auto',
              paddingTop: 8,
              fontSize: 18,
              color: theme.palette.text,
              opacity: 0.7,
              textAlign: 'center',
              width: '100%',
            }}
          >
            {slots.caption}
          </div>
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
