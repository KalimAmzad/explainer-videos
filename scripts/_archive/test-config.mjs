import { vectorize, ColorMode, Hierarchical, PathSimplifyMode } from '@neplex/vectorizer';
import fs from 'fs';

const buf = fs.readFileSync('output/v3-edges-bow.png');

async function tryConfig(name, config) {
  try {
    const svg = await vectorize(buf, config);
    console.log(name + ': OK, paths=' + (svg.match(/<path/g) || []).length);
    return svg;
  } catch(e) {
    console.log(name + ': FAILED - ' + e.message.slice(0, 80));
    return null;
  }
}

await tryConfig('colorMode only', { colorMode: ColorMode.Color });
await tryConfig('+ hierarchical', { colorMode: ColorMode.Color, hierarchical: Hierarchical.Cutout });
await tryConfig('+ filterSpeckle', { colorMode: ColorMode.Color, hierarchical: Hierarchical.Cutout, filterSpeckle: 2 });
await tryConfig('+ mode', { colorMode: ColorMode.Color, hierarchical: Hierarchical.Cutout, filterSpeckle: 2, mode: PathSimplifyMode.Spline });
await tryConfig('+ colorPrecision', { colorMode: ColorMode.Color, hierarchical: Hierarchical.Cutout, filterSpeckle: 2, mode: PathSimplifyMode.Spline, colorPrecision: 4 });
await tryConfig('+ layerDifference', { colorMode: ColorMode.Color, hierarchical: Hierarchical.Cutout, filterSpeckle: 2, mode: PathSimplifyMode.Spline, colorPrecision: 4, layerDifference: 10 });
await tryConfig('ALL', { colorMode: ColorMode.Color, hierarchical: Hierarchical.Cutout, filterSpeckle: 2, mode: PathSimplifyMode.Spline, colorPrecision: 4, layerDifference: 10, cornerThreshold: 60, lengthThreshold: 3.5, maxIterations: 10, pathPrecision: 3, spliceThreshold: 45 });

// Also try what worked before (from vectorize-image.mjs)
await tryConfig('known-good-config', { colorMode: ColorMode.Color, colorPrecision: 6, filterSpeckle: 4, spliceThreshold: 45, cornerThreshold: 60, hierarchical: Hierarchical.Stacked, mode: PathSimplifyMode.Spline, layerDifference: 5, lengthThreshold: 4.0, maxIterations: 2, pathPrecision: 3 });
