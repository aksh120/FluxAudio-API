/**
 * GET /api/search
 * Search for songs on JioSaavn and/or YouTube Music.
 *
 * Query params:
 *   q      - search query (required)
 *   source - source catalog: "all" (default), "saavn", or "youtube"
 *   page   - page number (default: 1, applies to saavn)
 *   limit  - results per page (default: 20)
 */

import {
  fetchFromSaavn,
  formatSong,
  sendJSON,
  handleCORS,
} from "../lib/saavn.js";
import { searchYouTubeMusic } from "../lib/ytmusic.js";

export default async function handler(req, res) {
  if (handleCORS(req, res)) return;

  try {
    const { q, source = "all", page = "1", limit = "20" } = req.query || {};

    if (!q) {
      return sendJSON(res, 400, {
        status: "error",
        message: "Missing required parameter: q (search query)",
      });
    }

    const maxLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const normalizedSource = String(source).toLowerCase().trim();

    // ── 1. YouTube Music Only ──
    if (normalizedSource === "youtube" || normalizedSource === "yt") {
      const ytResults = await searchYouTubeMusic(q, maxLimit);
      return sendJSON(res, 200, {
        status: "ok",
        query: q,
        source: "youtube",
        page: 1,
        limit: maxLimit,
        total_results: ytResults.length,
        counts: {
          saavn: 0,
          youtube: ytResults.length,
        },
        results: ytResults,
      });
    }

    // ── 2. JioSaavn Only ──
    if (normalizedSource === "saavn" || normalizedSource === "jiosaavn") {
      const data = await fetchFromSaavn({
        __call: "search.getResults",
        _format: "json",
        q,
        p: page,
        n: String(maxLimit),
      });

      const saavnResults = (data.results || data.songs?.data || []).map(formatSong);

      return sendJSON(res, 200, {
        status: "ok",
        query: q,
        source: "saavn",
        page: parseInt(page, 10),
        limit: maxLimit,
        total_results: data.total || saavnResults.length,
        counts: {
          saavn: saavnResults.length,
          youtube: 0,
        },
        results: saavnResults,
      });
    }

    // ── 3. Combined / All (JioSaavn + YouTube Music) ──
    const [saavnOutcome, ytOutcome] = await Promise.allSettled([
      fetchFromSaavn({
        __call: "search.getResults",
        _format: "json",
        q,
        p: page,
        n: String(maxLimit),
      }),
      searchYouTubeMusic(q, maxLimit),
    ]);

    let saavnResults = [];
    if (saavnOutcome.status === "fulfilled" && saavnOutcome.value) {
      const d = saavnOutcome.value;
      saavnResults = (d.results || d.songs?.data || []).map(formatSong);
    } else if (saavnOutcome.status === "rejected") {
      console.error("[/api/search] JioSaavn query error:", saavnOutcome.reason?.message);
    }

    let ytResults = [];
    if (ytOutcome.status === "fulfilled" && Array.isArray(ytOutcome.value)) {
      ytResults = ytOutcome.value;
    } else if (ytOutcome.status === "rejected") {
      console.error("[/api/search] YouTube Music query error:", ytOutcome.reason?.message);
    }

    // Combine results: interleaved for balanced discovery
    const combined = [];
    const maxLen = Math.max(saavnResults.length, ytResults.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < saavnResults.length) combined.push(saavnResults[i]);
      if (i < ytResults.length) combined.push(ytResults[i]);
    }

    return sendJSON(res, 200, {
      status: "ok",
      query: q,
      source: "all",
      page: parseInt(page, 10),
      limit: maxLimit,
      total_results: combined.length,
      counts: {
        saavn: saavnResults.length,
        youtube: ytResults.length,
      },
      results: combined,
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
