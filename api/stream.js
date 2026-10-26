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
import { getYouTubeAudioStreams, getYouTubeSongDetails } from "../lib/ytmusic.js";

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

      // Step 1: Attempt direct googlevideo extraction (succeeds locally or with YOUTUBE_PROXY)
      const streams = await getYouTubeAudioStreams(cleanId);
      downloadLinks = streams.download_links || {};

      if (quality && downloadLinks[quality] && typeof downloadLinks[quality] === "string" && downloadLinks[quality].startsWith("http") && !downloadLinks[quality].includes("/api/")) {
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
        if (candidate && candidate.startsWith("http") && !candidate.includes("/api/")) {
          streamUrl = candidate;
        }
      }

      // Step 2: If direct googlevideo extraction is blocked on cloud serverless (Vercel datacenter IPs),
      // seamlessly resolve the high-fidelity 320kbps CDN stream via song metadata!
      if (!streamUrl) {
        try {
          const ytSong = await getYouTubeSongDetails(cleanId);
          if (ytSong && ytSong.title) {
            const cleanTitle = ytSong.title
              .replace(/\b(official|video|audio|lyrics|music|hd|4k|remix|feat\.?|ft\.?)\b/gi, "")
              .replace(/[\[\(].*?[\]\)]/g, "")
              .trim();
            const cleanArtist = (ytSong.artists || "").split(",")[0].trim();
            const query = `${cleanTitle} ${cleanArtist}`.trim();

            const saavnData = await fetchFromSaavn({
              __call: "search.getResults",
              _format: "json",
              q: query,
              p: "1",
              n: "3",
            });

            const saavnResults = saavnData.results || saavnData.songs?.data || [];
            if (saavnResults.length > 0) {
              const matched = formatSong(saavnResults[0]);
              downloadLinks = matched.download_links || {};
              if (quality && downloadLinks[quality]) {
                streamUrl = downloadLinks[quality];
              } else {
                streamUrl = matched.stream_url || downloadLinks["320kbps"] || downloadLinks["160kbps"] || "";
              }
            }
          }
        } catch (matchErr) {
          console.warn("[/api/stream] Cross-catalog audio matching fallback error:", matchErr.message);
        }
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
