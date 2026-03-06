import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { Theme } from '../theme';
import type { LayoutProps } from './TitleAndBody';

/**
 * TimelineHorizontal layout — horizontal timeline bar with milestone markers.
 *
 * Slots:
 *   header      — top 15%
 *   milestone-1 — first milestone
 *   milestone-2 — second milestone
 *   milestone-3 — third milestone
 *   milestone-4 — fourth milestone
 *   milestone-5 — fifth milestone
 *
 * Best for: chronological events, phases, historical timelines.
 */
export const TimelineHorizontal: React.FC<LayoutProps> = ({ theme, slots }) => {
  const milestoneSlots = [
    'milestone-1',
    'milestone-2',
    'milestone-3',
    'milestone-4',
    'milestone-5',
  ];
  const activeMilestones = milestoneSlots.filter((s) => slots[s] != null);

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

      {/* Timeline area — remaining space */}
      <div
        style={{
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: 0,
          position: 'relative',
          padding: '20px 10px',
        }}
      >
        {/* Timeline bar — horizontal line */}
        <div
          style={{
            position: 'absolute',
            top: '45%',
            left: 30,
            right: 30,
            height: 3,
            backgroundColor: theme.palette.primary,
            borderRadius: 2,
            opacity: 0.4,
          }}
        />

        {/* Milestones row */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            position: 'relative',
          }}
        >
          {activeMilestones.map((slotName, i) => {
            const color = getMilestoneColor(theme, i);
            // Alternate above/below the line for visual clarity
            const isAbove = i % 2 === 0;

            return (
              <div
                key={slotName}
                style={{
                  flex: '1 1 0',
                  display: 'flex',
                  flexDirection: isAbove ? 'column' : 'column-reverse',
                  alignItems: 'center',
                  gap: 8,
                  minWidth: 0,
                }}
              >
                {/* Milestone content */}
                <div
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    border: `2px solid ${color}`,
                    backgroundColor: hexToRgba(color, 0.06),
                    fontSize: 18,
                    lineHeight: 1.3,
                    textAlign: 'center',
                    width: '100%',
                    minHeight: 60,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {slots[slotName]}
                </div>

                {/* Connector dot */}
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: `2px solid ${theme.background}`,
                    boxShadow: `0 0 0 2px ${color}`,
                    flex: '0 0 auto',
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

function getMilestoneColor(theme: Theme, index: number): string {
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
