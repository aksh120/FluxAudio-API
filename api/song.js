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
import { getYouTubeSongDetails } from "../lib/ytmusic.js";

export default async function handler(req, res) {
  if (handleCORS(req, res)) return;

  try {
    let { id, url: permaUrl, source } = req.query || {};

    // 1. Check if this is a YouTube Music / YouTube request
    const isYouTube =
      source === "youtube" ||
      (typeof id === "string" && id.startsWith("yt:")) ||
      (typeof permaUrl === "string" && (permaUrl.includes("youtube.com") || permaUrl.includes("youtu.be")));

    if (isYouTube) {
      let ytVideoId = id || "";
      if (ytVideoId.startsWith("yt:")) {
        ytVideoId = ytVideoId.slice(3);
      } else if (!ytVideoId && permaUrl) {
        try {
          const parsed = new URL(permaUrl);
          ytVideoId = parsed.searchParams.get("v") || parsed.pathname.split("/").pop();
        } catch {
          ytVideoId = permaUrl.split("/").pop();
        }
      }

      if (!ytVideoId) {
        return sendJSON(res, 400, {
          status: "error",
          message: "Missing required YouTube video ID",
        });
      }

      const song = await getYouTubeSongDetails(ytVideoId);
      if (!song) {
        return sendJSON(res, 404, {
          status: "error",
          message: "YouTube Music track not found",
        });
      }

      return sendJSON(res, 200, {
        status: "ok",
        song,
      });
    }

    // 2. JioSaavn permalink resolution
    if (!id && permaUrl) {
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
