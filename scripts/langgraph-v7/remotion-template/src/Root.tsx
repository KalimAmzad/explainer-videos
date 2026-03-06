import React from 'react';
import { Composition } from 'remotion';

/**
 * Remotion entry point.
 *
 * This file is overwritten by the video-compiler node during pipeline
 * execution. It serves as a placeholder so `remotion studio` can boot
 * for development and previewing.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="WhiteboardVideo"
      component={() => (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f3ef',
            fontFamily: 'Caveat, cursive',
            fontSize: 32,
            color: '#333',
          }}
        >
          Run the pipeline to generate scenes
        </div>
      )}
      durationInFrames={30 * 60}
      fps={30}
      width={1280}
      height={720}
    />
  );
};
