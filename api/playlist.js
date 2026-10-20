/**
 * GET /api/playlist
 * Get playlist details with all tracks.
 *
 * Query params:
 *   id - JioSaavn playlist ID
 */

import {
  fetchFromSaavn,
  formatPlaylist,
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
        message: "Missing required parameter: id (playlist ID)",
      });
    }

    const data = await fetchFromSaavn({
      __call: "playlist.getDetails",
      _format: "json",
      listid: id,
    });

    if (!data || (!data.listname && !data.title)) {
      return sendJSON(res, 404, {
        status: "error",
        message: "Playlist not found",
      });
    }

    const playlist = formatPlaylist(data);

    return sendJSON(res, 200, {
      status: "ok",
      playlist,
    });
  } catch (err) {
    console.error("[/api/playlist]", err);
    return sendJSON(res, 500, {
      status: "error",
      message: "Failed to fetch playlist details",
      detail: err.message,
    });
  }
}
