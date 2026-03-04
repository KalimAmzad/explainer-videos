/**
 * Global asset store for the pipeline.
 * Tools write heavy data (SVG paths, PNG buffers) here to avoid
 * bloating LLM message history. The asset-sourcing node reads from
 * this store when extracting final assets.
 */
const assets = new Map();

export function storeAsset(sceneNumber, data) {
  assets.set(sceneNumber, { ...assets.get(sceneNumber), ...data });
}

export function getAsset(sceneNumber) {
  return assets.get(sceneNumber) || null;
}

export function getAllAssets() {
  return assets;
}

export function clearAssets() {
  assets.clear();
}
