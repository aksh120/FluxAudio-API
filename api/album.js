/**
 * GET /api/album
 * Get album details with all tracks.
 *
 * Query params:
 *   id - JioSaavn album ID
 */

import {
  fetchFromSaavn,
  formatAlbum,
  sendJSON,
  handleCORS,
} from "../lib/saavn.js";
import { getYouTubeAlbum } from "../lib/ytmusic.js";

export default async function handler(req, res) {
  if (handleCORS(req, res)) return;

  try {
    const { id, source } = req.query || {};

    if (!id) {
      return sendJSON(res, 400, {
        status: "error",
        message: "Missing required parameter: id (album ID)",
      });
    }

    const isYouTube =
      source === "youtube" ||
      (typeof id === "string" &&
        (id.startsWith("yt:") ||
          id.startsWith("MPREb_") ||
          id.startsWith("OLAK5uy_") ||
          id.includes("youtube.com") ||
          id.includes("youtu.be")));

    if (isYouTube) {
      const album = await getYouTubeAlbum(id);
      if (!album) {
        return sendJSON(res, 404, {
          status: "error",
          message: "Album not found",
        });
      }
      return sendJSON(res, 200, {
        status: "ok",
        album,
      });
    }

    const data = await fetchFromSaavn({
      __call: "content.getAlbumDetails",
      _format: "json",
      albumid: id,
    });

    if (!data || (!data.title && !data.name)) {
      return sendJSON(res, 404, {
        status: "error",
        message: "Album not found",
      });
    }

    const album = formatAlbum(data);

    return sendJSON(res, 200, {
      status: "ok",
      album,
    });
  } catch (err) {
    console.error("[/api/album]", err);
    return sendJSON(res, 500, {
      status: "error",
      message: "Failed to fetch album details",
      detail: err.message,
    });
  }
}
