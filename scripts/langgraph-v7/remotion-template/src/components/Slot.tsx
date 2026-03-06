import React from 'react';

type SlotProps = {
  /** Slot name — rendered as `data-slot` for debugging and targeting. */
  name: string;
  children: React.ReactNode;
  /** Additional inline styles for the slot wrapper. */
  style?: React.CSSProperties;
};

/**
 * Named slot container with flex positioning.
 *
 * Provides a simple wrapper `<div>` that identifies itself via
 * `data-slot={name}` for layout debugging and DOM inspection. Takes
 * up available flex space (`flex: 1`) by default and clips overflow.
 *
 * Used by layout templates to define named content regions that the
 * scene compositor populates with animation components.
 *
 * Usage:
 * ```tsx
 * <Slot name="header">
 *   <WipeReveal durationFrames={30}>
 *     <StyledText variant="heading">Title</StyledText>
 *   </WipeReveal>
 * </Slot>
 * ```
 */
export const Slot: React.FC<SlotProps> = ({ name, children, style }) => {
  return (
    <div
      data-slot={name}
      style={{
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {children}
    </div>
  );
};
