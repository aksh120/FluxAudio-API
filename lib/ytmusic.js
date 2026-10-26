/**
 * FluxAudio API - YouTube Music Utility Module
 * 
 * Direct querying of YouTube Music InnerTube endpoint using native fetch.
 * Zero external dependencies, zero cold-start delay, Vercel-ready.
 */

const YTMUSIC_BASE = "https://music.youtube.com/youtubei/v1";
const INNERTUBE_API_KEY = "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Parses time string like "3:45" or "1:02:15" into total seconds.
 * @param {string} str
 * @returns {number}
 */
export function parseDurationToSeconds(str) {
  if (!str || typeof str !== "string") return 0;
  const parts = str.trim().split(":").map((p) => parseInt(p, 10));
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
}

/**
 * Upscales YouTube Music thumbnail URLs to 544x544 high resolution.
 * @param {string} url
 * @returns {string}
 */
export function upscaleYouTubeImage(url) {
  if (!url) return "";
  return url.replace(/=w\d+-h\d+[^"]*/, "=w544-h544-l90-rj");
}

/**
 * Queries YouTube Music InnerTube API.
 * @param {string} endpoint
 * @param {object} payload
 * @returns {Promise<any>}
 */
async function postInnerTube(endpoint, payload) {
  const url = `${YTMUSIC_BASE}/${endpoint}?alt=json&key=${INNERTUBE_API_KEY}`;
  const body = {
    context: {
      capabilities: {},
      client: {
        clientName: "WEB_REMIX",
        clientVersion: "1.20231201.01.00",
        hl: "en",
        gl: "US",
      },
    },
    ...payload,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      Origin: "https://music.youtube.com",
      Referer: "https://music.youtube.com/",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`YouTube Music upstream error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Formats a YouTube Music search item into the standard FluxAudio song object.
 * @param {object} item
 * @returns {object|null}
 */
export function formatYouTubeSong(item) {
  if (!item) return null;
  const r = item.musicResponsiveListItemRenderer;
  if (!r) return null;

  const flex0 = r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0];
  const flex1Runs = r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];

  const videoId = flex0?.navigationEndpoint?.watchEndpoint?.videoId;
  if (!videoId) return null;

  const title = flex0?.text || "Untitled";

  // Parse artists, album, and duration from flexColumns[1] runs
  const artistsList = [];
  let album = "";
  let albumId = "";
  let durationStr = "";
  let year = "";

  for (const run of flex1Runs) {
    const pageType = run.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType;
    const browseId = run.navigationEndpoint?.browseEndpoint?.browseId;

    if (pageType === "MUSIC_PAGE_TYPE_ARTIST") {
      artistsList.push({ name: run.text, id: browseId });
    } else if (pageType === "MUSIC_PAGE_TYPE_ALBUM") {
      album = run.text;
      albumId = browseId;
    } else if (run.text && run.text !== " • " && run.text !== " & ") {
      if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(run.text.trim())) {
        durationStr = run.text.trim();
      } else if (/^\d{4}$/.test(run.text.trim())) {
        year = run.text.trim();
      }
    }
  }

  // If no structured artist was found, take the first run text before bullet
  if (artistsList.length === 0 && flex1Runs.length > 0) {
    const firstText = flex1Runs[0]?.text;
    if (firstText && firstText !== " • ") {
      artistsList.push({ name: firstText, id: null });
    }
  }

  const artistsStr = artistsList.map((a) => a.name).join(", ") || "Unknown Artist";
  const artistId = artistsList[0]?.id || null;

  // Extract highest resolution thumbnail
  const thumbs = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
  const rawThumb = thumbs[thumbs.length - 1]?.url || "";
  const image = upscaleYouTubeImage(rawThumb);

  const durationSec = parseDurationToSeconds(durationStr);

  return {
    id: `yt:${videoId}`,
    youtube_id: videoId,
    source: "youtube",
    title,
    album,
    album_id: albumId,
    artists: artistsStr,
    featured_artists: "",
    artist_id: artistId,
    image,
    year,
    duration: durationSec,
    language: "unknown",
    label: "YouTube Music",
    copyright: "",
    has_lyrics: false,
    release_date: year,
    play_count: null,
    url: `https://music.youtube.com/watch?v=${videoId}`,
    youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
    stream_url: `https://www.youtube.com/watch?v=${videoId}`,
    download_links: {
      youtube: `https://www.youtube.com/watch?v=${videoId}`,
      music_youtube: `https://music.youtube.com/watch?v=${videoId}`,
    },
  };
}

/**
 * Searches songs on YouTube Music.
 * @param {string} query
 * @param {number} limit
 * @returns {Promise<Array<object>>}
 */
export async function searchYouTubeMusic(query, limit = 20) {
  if (!query) return [];

  const data = await postInnerTube("search", {
    // "EgWKAQIIAWoKEAoQCRADEAQQBQ%3D%3D" filters specifically for songs
    params: "EgWKAQIIAWoKEAoQCRADEAQQBQ%3D%3D",
    query,
  });

  const sections = data.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
  const lastSection = sections[sections.length - 1];
  const items = lastSection?.musicShelfRenderer?.contents || [];

  const results = [];
  for (const item of items) {
    const formatted = formatYouTubeSong(item);
    if (formatted) {
      results.push(formatted);
      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Fetches details for a specific YouTube Music track by videoId.
 * @param {string} videoId
 * @returns {Promise<object|null>}
 */
export async function getYouTubeSongDetails(videoId) {
  if (!videoId) return null;
  const cleanId = videoId.replace(/^yt:/, "");

  const data = await postInnerTube("next", {
    videoId: cleanId,
    enablePersistentPlaylistPanel: true,
    isAudioOnly: true,
  });

  const panel = data.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer;
  const videoRenderer = panel?.contents?.[0]?.playlistPanelVideoRenderer;

  if (!videoRenderer) {
    // Fallback: search by ID
    const searchRes = await searchYouTubeMusic(cleanId, 1);
    return searchRes[0] || null;
  }

  const title = videoRenderer.title?.runs?.[0]?.text || "Untitled";
  const bylineRuns = videoRenderer.longBylineText?.runs || [];

  const artistsList = [];
  let album = "";
  let year = "";

  for (const run of bylineRuns) {
    const pageType = run.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType;
    if (pageType === "MUSIC_PAGE_TYPE_ARTIST") {
      artistsList.push(run.text);
    } else if (pageType === "MUSIC_PAGE_TYPE_ALBUM") {
      album = run.text;
    } else if (run.text && /^\d{4}$/.test(run.text.trim())) {
      year = run.text.trim();
    }
  }

  if (artistsList.length === 0 && bylineRuns.length > 0) {
    artistsList.push(bylineRuns[0]?.text);
  }

  const durationStr = videoRenderer.lengthText?.runs?.[0]?.text || "";
  const duration = parseDurationToSeconds(durationStr);

  const thumbs = videoRenderer.thumbnail?.thumbnails || [];
  const rawThumb = thumbs[thumbs.length - 1]?.url || "";
  const image = upscaleYouTubeImage(rawThumb);

  return {
    id: `yt:${cleanId}`,
    youtube_id: cleanId,
    source: "youtube",
    title,
    album,
    album_id: "",
    artists: artistsList.join(", ") || "Unknown Artist",
    featured_artists: "",
    artist_id: null,
    image,
    year,
    duration,
    language: "unknown",
    label: "YouTube Music",
    copyright: "",
    has_lyrics: false,
    release_date: year,
    play_count: null,
    url: `https://music.youtube.com/watch?v=${cleanId}`,
    youtube_url: `https://www.youtube.com/watch?v=${cleanId}`,
    stream_url: `https://www.youtube.com/watch?v=${cleanId}`,
    download_links: {
      youtube: `https://www.youtube.com/watch?v=${cleanId}`,
      music_youtube: `https://music.youtube.com/watch?v=${cleanId}`,
    },
  };
}
