/**
 * GET /api/search
 * Search for songs on JioSaavn.
 *
 * Query params:
 *   q     - search query (required)
 *   page  - page number (default: 1)
 *   limit - results per page (default: 20)
 */

import {
  fetchFromSaavn,
  formatSong,
  sendJSON,
  handleCORS,
} from "../lib/saavn.js";

export default async function handler(req, res) {
  if (handleCORS(req, res)) return;

  try {
    const { q, page = "1", limit = "20" } = req.query || {};

    if (!q) {
      return sendJSON(res, 400, {
        status: "error",
        message: "Missing required parameter: q (search query)",
      });
    }

    const data = await fetchFromSaavn({
      __call: "search.getResults",
      _format: "json",
      q,
      p: page,
      n: limit,
    });

    const results = (data.results || data.songs?.data || []).map(formatSong);

    return sendJSON(res, 200, {
      status: "ok",
      query: q,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total_results: data.total || results.length,
      results,
    });
  } catch (err) {
    console.error("[/api/search]", err);
    return sendJSON(res, 500, {
      status: "error",
      message: "Failed to fetch search results",
      detail: err.message,
    });
  }
}
