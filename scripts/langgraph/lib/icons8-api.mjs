/**
 * Icons8 API — plain functions extracted from tools/icons8.mjs.
 * No LangChain tool wrappers, used directly by the asset-sourcing node.
 */

/**
 * Search Icons8 for icons matching a query.
 * @param {string} query - Search term
 * @param {string} [platform='color'] - Icon style platform
 * @param {number} [amount=10] - Max results
 * @returns {Promise<Array<{id: string, name: string, platform: string}>>}
 */
export async function searchIcons8(query, platform = 'color', amount = 10) {
  const searchUrl = `https://search.icons8.com/api/iconsets/v6/search?term=${encodeURIComponent(query)}&amount=${amount}&platform=${platform}`;

  const response = await fetch(searchUrl, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    console.warn(`  [Icons8] Search failed: HTTP ${response.status}`);
    return [];
  }

  const data = await response.json();
  return (data.icons || []).map(icon => ({
    id: String(icon.id),
    name: icon.name,
    commonName: icon.commonName || icon.name,
    platform: icon.platform || platform,
  }));
}

/**
 * Download an Icons8 icon as PNG buffer.
 * @param {string} iconId - Icon ID
 * @param {number} [size=128] - Icon size in pixels
 * @param {string} [platform='color'] - Icon style
 * @returns {Promise<Buffer|null>} PNG buffer or null on failure
 */
export async function downloadIconPng(iconId, size = 128, platform = 'color') {
  const pngUrl = `https://img.icons8.com/?id=${iconId}&format=png&size=${size}`;

  const response = await fetch(pngUrl);
  if (!response.ok) {
    console.warn(`  [Icons8] Download failed for ${iconId}: HTTP ${response.status}`);
    return null;
  }

  return Buffer.from(await response.arrayBuffer());
}
