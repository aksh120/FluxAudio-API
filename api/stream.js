/**
 * GET /api/stream
 * Direct audio streaming endpoint for JioSaavn and YouTube Music.
 *
 * Query params:
 *   id       - Song ID (e.g. "3IoDK8qI" or "yt:xTvyyoF_LZY")
 *   quality  - Optional bitrate quality ("320kbps", "160kbps", "128kbps", "96kbps", "48kbps")
 *   json     - If "true", returns JSON containing the stream URL instead of 302 redirect
 */

import { fetchFromSaavn, formatSong, sendJSON, handleCORS } from "../lib/saavn.js";
import { getYouTubeAudioStreams } from "../lib/ytmusic.js";

export default async function handler(req, res) {
  if (handleCORS(req, res)) return;

  try {
    const { id, quality, json, source } = req.query || {};

    if (!id) {
      return sendJSON(res, 400, {
        status: "error",
        message: "Missing required parameter: id",
      });
    }

    const isYouTube =
      source === "youtube" ||
      (typeof id === "string" && (id.startsWith("yt:") || id.includes("youtube.com") || id.includes("youtu.be")));

    let streamUrl = "";
    let downloadLinks = {};

    if (isYouTube) {
      let cleanId = typeof id === "string" ? id.trim() : "";
      if (cleanId.startsWith("yt:")) cleanId = cleanId.slice(3);

      if (cleanId.includes("youtube.com") || cleanId.includes("youtu.be")) {
        try {
          const parsed = new URL(cleanId);
          cleanId = parsed.searchParams.get("v") || cleanId.split("/").pop();
        } catch {
          cleanId = cleanId.split("/").pop();
        }
      }

      const streams = await getYouTubeAudioStreams(cleanId);
      downloadLinks = streams.download_links || {};

      if (quality && downloadLinks[quality] && typeof downloadLinks[quality] === "string" && downloadLinks[quality].startsWith("http")) {
        streamUrl = downloadLinks[quality];
      } else {
        const candidate =
          downloadLinks["160kbps"] ||
          downloadLinks["128kbps"] ||
          streams.stream_url ||
          downloadLinks["96kbps"] ||
          downloadLinks["48kbps"] ||
          "";

        // Only treat candidate as direct raw stream if it is an actual external http URL
        if (candidate && candidate.startsWith("http") && !candidate.includes("/api/stream")) {
          streamUrl = candidate;
        }
      }

      // If raw googlevideo stream is blocked on cloud serverless datacenter IPs:
      if (!streamUrl) {
        const isJsonMode =
          json === "true" ||
          json === "1" ||
          (req.headers.accept &&
            req.headers.accept.includes("application/json") &&
            !req.headers.accept.includes("text/html"));

        if (isJsonMode) {
          return sendJSON(res, 200, {
            status: "ok",
            id: `yt:${cleanId}`,
            source: "youtube",
            playback_type: "embed_player",
            stream_url: `/api/embed?id=yt:${cleanId}`,
            embed_url: `/api/embed?id=yt:${cleanId}`,
            youtube_url: `https://music.youtube.com/watch?v=${cleanId}`,
            download_links: {
              stream: `/api/embed?id=yt:${cleanId}`,
              embed: `/api/embed?id=yt:${cleanId}`,
              music_youtube: `https://music.youtube.com/watch?v=${cleanId}`,
              youtube: `https://www.youtube.com/watch?v=${cleanId}`,
            },
            note: "Serverless cloud IP restriction prevented direct googlevideo extraction. Playable via HTML5 embed player widget.",
          });
        }

        // Web browsers and media clients: redirect directly to auto-playing HTML5 embed player
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.setHeader("Cache-Control", "public, max-age=1800, s-maxage=3600");
        res.writeHead(302, { Location: `/api/embed?id=yt:${cleanId}&autoplay=true` });
        return res.end();
      }
    } else {
      // JioSaavn stream resolution
      const data = await fetchFromSaavn({
        __call: "song.getDetails",
        cc: "in",
        _format: "json",
        pids: id,
      });

      const rawSongs = data.songs || Object.values(data);
      if (rawSongs && rawSongs.length > 0) {
        const song = formatSong(rawSongs[0]);
        downloadLinks = song.download_links || {};
        if (quality && downloadLinks[quality]) {
          streamUrl = downloadLinks[quality];
        } else {
          streamUrl = song.stream_url || downloadLinks["320kbps"] || downloadLinks["160kbps"] || "";
        }
      }
    }

    if (!streamUrl) {
      return sendJSON(res, 404, {
        status: "error",
        message: "Playable audio stream could not be resolved for this track",
      });
    }

    // If json mode is requested, return JSON response
    if (json === "true" || json === "1") {
      return sendJSON(res, 200, {
        status: "ok",
        id,
        stream_url: streamUrl,
        download_links: downloadLinks,
      });
    }

    // Universal 302 redirect to high-speed audio stream
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Cache-Control", "public, max-age=1800, s-maxage=3600");
    res.writeHead(302, { Location: streamUrl });
    return res.end();
  } catch (err) {
    console.error("[/api/stream]", err);
    return sendJSON(res, 500, {
      status: "error",
      message: "Failed to resolve audio stream",
      detail: err.message,
    });
  }
}
