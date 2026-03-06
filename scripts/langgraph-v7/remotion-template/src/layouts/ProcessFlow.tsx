import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { Theme } from '../theme';
import type { LayoutProps } from './TitleAndBody';

/**
 * ProcessFlow layout — horizontal steps with arrow separators.
 *
 * Slots:
 *   header — top 15%
 *   step-1 — first step
 *   step-2 — second step
 *   step-3 — third step
 *   step-4 — fourth step
 *
 * Best for: sequential processes, workflows, step-by-step instructions.
 */
export const ProcessFlow: React.FC<LayoutProps> = ({ theme, slots }) => {
  const stepSlots = ['step-1', 'step-2', 'step-3', 'step-4'];
  const activeSteps = stepSlots.filter((s) => slots[s] != null);

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

      {/* Steps row — remaining space */}
      <div
        style={{
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
          minHeight: 0,
          padding: '10px 0',
        }}
      >
        {activeSteps.map((slotName, i) => (
          <React.Fragment key={slotName}>
            {/* Step card */}
            <div
              style={{
                flex: '1 1 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                borderRadius: 12,
                border: `2px solid ${getStepColor(theme, i)}`,
                backgroundColor: hexToRgba(getStepColor(theme, i), 0.06),
                minWidth: 0,
                minHeight: 0,
                maxWidth: 260,
                fontSize: 20,
                lineHeight: 1.4,
                textAlign: 'center',
              }}
            >
              {/* Step number badge */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: getStepColor(theme, i),
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: theme.headingFont,
                  fontSize: 18,
                  fontWeight: 'bold',
                  marginBottom: 8,
                }}
              >
                {i + 1}
              </div>
              {slots[slotName]}
            </div>

            {/* Arrow separator */}
            {i < activeSteps.length - 1 && (
              <div
                style={{
                  flex: '0 0 auto',
                  padding: '0 8px',
                  fontSize: 28,
                  color: theme.palette.primary,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
                  <path
                    d="M2 12 L24 12 M18 4 L26 12 L18 20"
                    stroke={theme.palette.primary}
                    strokeWidth={theme.strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </AbsoluteFill>
  );
};

function getStepColor(theme: Theme, index: number): string {
  const colors = [
    theme.palette.primary,
    theme.palette.accent1,
    theme.palette.accent2,
    theme.palette.secondary,
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
