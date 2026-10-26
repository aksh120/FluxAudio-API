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
import { getYouTubePlaylist } from "../lib/ytmusic.js";

export default async function handler(req, res) {
  if (handleCORS(req, res)) return;

  try {
    const { id, source } = req.query || {};

    if (!id) {
      return sendJSON(res, 400, {
        status: "error",
        message: "Missing required parameter: id (playlist ID)",
      });
    }

    const isYouTube =
      source === "youtube" ||
      (typeof id === "string" &&
        (id.startsWith("yt:") ||
          id.startsWith("VL") ||
          id.startsWith("PL") ||
          id.includes("youtube.com") ||
          id.includes("youtu.be")));

    if (isYouTube) {
      const playlist = await getYouTubePlaylist(id);
      if (!playlist) {
        return sendJSON(res, 404, {
          status: "error",
          message: "Playlist not found",
        });
      }
      return sendJSON(res, 200, {
        status: "ok",
        playlist,
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
