import React from 'react';
import { Img } from 'remotion';

type ImageAssetProps = {
  /** Image source — URL or static import path. */
  src: string;
  /** Width — number (pixels) or CSS string. */
  width?: number | string;
  /** Height — number (pixels) or CSS string. */
  height?: number | string;
  /** CSS object-fit value. Defaults to 'contain'. */
  objectFit?: React.CSSProperties['objectFit'];
  /** Additional inline styles for the image element. */
  style?: React.CSSProperties;
};

/**
 * Image renderer using Remotion's `<Img>` component.
 *
 * Wraps Remotion's `<Img>` (which handles preloading and frame-accurate
 * display) with sensible defaults for whiteboard video layouts.
 *
 * Usage:
 * ```tsx
 * <ImageAsset src={staticFile('scene1/hero.png')} width={400} />
 * ```
 */
export const ImageAsset: React.FC<ImageAssetProps> = ({
  src,
  width = '100%',
  height = '100%',
  objectFit = 'contain',
  style,
}) => {
  return (
    <Img
      src={src}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        objectFit,
        display: 'block',
        ...style,
      }}
    />
  );
};
