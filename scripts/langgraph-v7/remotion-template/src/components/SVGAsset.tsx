import React, { useMemo } from 'react';

type SVGAssetProps = {
  /** Raw SVG markup string. */
  content: string;
  /** Width — number (pixels) or CSS string (e.g. '100%'). */
  width?: number | string;
  /** Height — number (pixels) or CSS string (e.g. '100%'). */
  height?: number | string;
  /** Additional inline styles for the wrapper div. */
  style?: React.CSSProperties;
  /** CSS class name for targeting with animations. */
  className?: string;
};

/**
 * Inline SVG renderer.
 *
 * Renders a raw SVG string via `dangerouslySetInnerHTML`. The original
 * `viewBox` is preserved so the SVG scales responsively within its
 * container. Explicit `width`/`height` attributes on the `<svg>` tag
 * are replaced with 100% so the wrapper div controls sizing.
 *
 * Usage:
 * ```tsx
 * <SVGAsset content={mySvgString} width={200} height={200} />
 * ```
 */
export const SVGAsset: React.FC<SVGAssetProps> = ({
  content,
  width = '100%',
  height = '100%',
  style,
  className,
}) => {
  // Normalize the SVG to fill its container while preserving viewBox
  const normalizedSVG = useMemo(() => {
    let svg = content;
    // Replace fixed width/height with 100% to be container-responsive
    svg = svg.replace(
      /(<svg[^>]*)\bwidth\s*=\s*"[^"]*"/,
      '$1width="100%"',
    );
    svg = svg.replace(
      /(<svg[^>]*)\bheight\s*=\s*"[^"]*"/,
      '$1height="100%"',
    );
    return svg;
  }, [content]);

  return (
    <div
      className={className}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: normalizedSVG }}
    />
  );
};
