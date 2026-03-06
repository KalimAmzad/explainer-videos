import React, { useMemo, useId } from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';

type DrawOnSVGProps = {
  /** Number of frames over which the draw-on completes. */
  durationFrames: number;
  /** Raw SVG markup string. */
  svgContent: string;
  /**
   * Optional element ID (`<g id="...">`) within the SVG.
   * When provided, only paths inside that group are animated;
   * all other groups start hidden.
   */
  elementId?: string;
  /** Additional wrapper styles. */
  style?: React.CSSProperties;
};

/**
 * SVG stroke draw-on animation.
 *
 * Progressively draws all `<path>`, `<line>`, `<circle>`, `<ellipse>`,
 * `<polyline>`, and `<polygon>` elements by animating `stroke-dashoffset`.
 *
 * Fill opacity fades in at 80% of the draw duration so shapes appear
 * solid only after they are mostly drawn.
 *
 * Implementation approach:
 * - Inject a `<style>` block with CSS custom properties driven by
 *   Remotion's `useCurrentFrame()`.  This avoids imperatively querying
 *   the DOM while still controlling every frame deterministically.
 * - Path lengths are estimated with a generous default (2000) because
 *   we cannot call `getTotalLength()` during SSR. The dasharray is set
 *   large enough that the offset animation always looks correct.
 */
export const DrawOnSVG: React.FC<DrawOnSVGProps> = ({
  durationFrames,
  svgContent,
  elementId,
  style,
}) => {
  const frame = useCurrentFrame();
  const scopeId = useId().replace(/:/g, '_');

  // Progress 0 → 1 for stroke draw
  const strokeProgress = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
    easing: Easing.inOut(Easing.quad),
  });

  // Fill fades in during the last 20% of the draw duration
  const fillStart = Math.floor(durationFrames * 0.8);
  const fillOpacity = interpolate(frame, [fillStart, durationFrames], [0, 1], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
  });

  // We use a generous max path length estimate. `stroke-dasharray` set to
  // this value ensures the full path is covered; `stroke-dashoffset`
  // animates from this value down to 0.
  const MAX_PATH_LENGTH = 3000;
  const dashOffset = MAX_PATH_LENGTH * (1 - strokeProgress);

  // Build a scoped CSS injection that targets all stroke-able elements.
  const targetSelector = elementId
    ? `.draw-scope-${scopeId} #${CSS.escape(elementId)} path,` +
      `.draw-scope-${scopeId} #${CSS.escape(elementId)} line,` +
      `.draw-scope-${scopeId} #${CSS.escape(elementId)} circle,` +
      `.draw-scope-${scopeId} #${CSS.escape(elementId)} ellipse,` +
      `.draw-scope-${scopeId} #${CSS.escape(elementId)} polyline,` +
      `.draw-scope-${scopeId} #${CSS.escape(elementId)} polygon`
    : `.draw-scope-${scopeId} path,` +
      `.draw-scope-${scopeId} line,` +
      `.draw-scope-${scopeId} circle,` +
      `.draw-scope-${scopeId} ellipse,` +
      `.draw-scope-${scopeId} polyline,` +
      `.draw-scope-${scopeId} polygon`;

  // Visibility rule: if elementId is set, hide sibling groups
  const hideOthersCSS = elementId
    ? `.draw-scope-${scopeId} svg > g:not(#${CSS.escape(elementId)}) { opacity: 0; }`
    : '';

  const injectedCSS = `
    ${targetSelector} {
      stroke-dasharray: ${MAX_PATH_LENGTH};
      stroke-dashoffset: ${dashOffset};
      fill-opacity: ${fillOpacity};
    }
    ${hideOthersCSS}
  `;

  // Memoize the processed SVG to avoid re-parsing every frame.
  // We add the scope class to the wrapper, not the SVG string itself.
  const sanitizedSVG = useMemo(() => {
    // Ensure the SVG tag has width/height of 100% for responsive sizing
    return svgContent
      .replace(/<svg([^>]*)width="[^"]*"/, '<svg$1width="100%"')
      .replace(/<svg([^>]*)height="[^"]*"/, '<svg$1height="100%"');
  }, [svgContent]);

  return (
    <div
      className={`draw-scope-${scopeId}`}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <style>{injectedCSS}</style>
      <div
        dangerouslySetInnerHTML={{ __html: sanitizedSVG }}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};
