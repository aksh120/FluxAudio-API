/**
 * GET /api/song
 * Get full details for a specific song.
 *
 * Query params:
 *   id  - JioSaavn song ID (e.g., "3IoDK8qI")
 *   url - JioSaavn permalink (alternative to id)
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
    let { id, url: permaUrl } = req.query || {};

    // If a permalink is provided, extract the song page to resolve the ID
    if (!id && permaUrl) {
      // Fetch the song page to get the pids token
      const linkData = await fetchFromSaavn({
        __call: "webapi.get",
        token: permaUrl.split("/").pop(),
        type: "song",
        _format: "json",
      });
      if (linkData?.songs?.[0]?.id) {
        id = linkData.songs[0].id;
      } else {
        return sendJSON(res, 404, {
          status: "error",
          message: "Could not resolve song from URL",
        });
      }
    }

    if (!id) {
      return sendJSON(res, 400, {
        status: "error",
        message: "Missing required parameter: id or url",
      });
    }

    const data = await fetchFromSaavn({
      __call: "song.getDetails",
      cc: "in",
      _format: "json",
      pids: id,
    });

    // song.getDetails returns { songs: [...] } or keyed object
    const rawSongs = data.songs || Object.values(data);
    if (!rawSongs || rawSongs.length === 0) {
      return sendJSON(res, 404, {
        status: "error",
        message: "Song not found",
      });
    }

    const song = formatSong(rawSongs[0]);

    return sendJSON(res, 200, {
      status: "ok",
      song,
    });
  } catch (err) {
    console.error("[/api/song]", err);
    return sendJSON(res, 500, {
      status: "error",
      message: "Failed to fetch song details",
      detail: err.message,
    });
  }
}
