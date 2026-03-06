import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

type TypewriterProps = {
  /** Number of frames over which all characters are revealed. */
  durationFrames: number;
  /** The full text to reveal character by character. */
  text: string;
  /** Optional inline styles applied to the text span. */
  style?: React.CSSProperties;
};

/**
 * Character-by-character text reveal with blinking cursor.
 *
 * Progressively reveals characters of the provided text over the given
 * duration. A blinking `|` cursor is shown at the end of the revealed
 * portion and disappears once all characters are visible.
 *
 * The cursor blinks at ~2 Hz using frame-based modular arithmetic
 * (no CSS animations).
 *
 * Must be placed inside a `<Sequence>` so `useCurrentFrame()` returns
 * the local frame starting from 0.
 */
export const Typewriter: React.FC<TypewriterProps> = ({
  durationFrames,
  text,
  style,
}) => {
  const frame = useCurrentFrame();

  const charsToShow = Math.floor(
    interpolate(frame, [0, durationFrames], [0, text.length], {
      extrapolateRight: 'clamp',
      extrapolateLeft: 'clamp',
    }),
  );

  const isComplete = charsToShow >= text.length;

  // Blink cursor at ~2 Hz (toggle every 15 frames at 30fps).
  // Once typing is complete, hide the cursor.
  const cursorVisible = !isComplete && frame % 15 < 10;

  return (
    <span style={{ whiteSpace: 'pre-wrap', ...style }}>
      {text.slice(0, charsToShow)}
      <span
        style={{
          opacity: cursorVisible ? 1 : 0,
          fontWeight: 'normal',
        }}
      >
        |
      </span>
    </span>
  );
};
