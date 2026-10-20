/**
 * GET /api/lyrics
 * Get lyrics for a specific song.
 *
 * Query params:
 *   id - JioSaavn song / lyrics ID
 */

import {
  fetchFromSaavn,
  decodeEntities,
  sendJSON,
  handleCORS,
} from "../lib/saavn.js";

export default async function handler(req, res) {
  if (handleCORS(req, res)) return;

  try {
    const { id } = req.query || {};

    if (!id) {
      return sendJSON(res, 400, {
        status: "error",
        message: "Missing required parameter: id (song ID)",
      });
    }

    const data = await fetchFromSaavn({
      __call: "lyrics.getLyrics",
      _format: "json",
      lyrics_id: id,
    });

    if (!data || (!data.lyrics && !data.lyrics_id)) {
      return sendJSON(res, 404, {
        status: "error",
        message: "Lyrics not found for this song",
      });
    }

    // Clean HTML tags and entities from lyrics text
    const rawLyrics = data.lyrics || "";
    const cleanLyrics = decodeEntities(rawLyrics)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .trim();

    // Create a short snippet (first 2 lines)
    const lines = cleanLyrics.split("\n").filter(Boolean);
    const snippet = lines.slice(0, 2).join(" / ");

    return sendJSON(res, 200, {
      status: "ok",
      song_id: id,
      lyrics: cleanLyrics,
      snippet,
      script_tracking_url: data.script_tracking_url || null,
    });
  } catch (err) {
    console.error("[/api/lyrics]", err);
    return sendJSON(res, 500, {
      status: "error",
      message: "Failed to fetch lyrics",
      detail: err.message,
    });
  }
}
