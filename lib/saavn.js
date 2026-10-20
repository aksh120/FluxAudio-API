/**
 * FluxAudio API - JioSaavn Core Utility Module
 * 
 * Handles upstream requests, DES-ECB decryption, HTML sanitization,
 * image upscaling, and bitrate URL generation.
 * 
 * Uses crypto-js for DES decryption to avoid Node 18+ OpenSSL 3
 * legacy cipher restrictions (ERR_OSSL_EVP_UNSUPPORTED).
 */

import CryptoJS from "crypto-js";

// ─── Constants ───────────────────────────────────────────────────────
const DES_KEY = CryptoJS.enc.Utf8.parse("38346591");

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const JIOSAAVN_BASE = "https://www.jiosaavn.com/api.php";

const QUALITY_MAP = {
  "320kbps": "_320.mp4",
  "160kbps": "_160.mp4",
  "96kbps": "_96.mp4",
  "48kbps": "_48.mp4",
  "12kbps": "_12.mp4",
};

// ─── Upstream Fetch ──────────────────────────────────────────────────
/**
 * Makes a GET request to JioSaavn's internal API with browser-like headers.
 * @param {Record<string,string>} params - query parameter key/value pairs
 * @returns {Promise<any>} parsed JSON body
 */
export async function fetchFromSaavn(params) {
  const url = new URL(JIOSAAVN_BASE);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!res.ok) {
    throw new Error(`Upstream error: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();

  // JioSaavn sometimes returns non-standard JSON - handle gracefully
  try {
    return JSON.parse(text);
  } catch {
    // Some endpoints wrap JSON in a callback - strip it
    const match = text.match(/\((\{[\s\S]+\})\)/);
    if (match) return JSON.parse(match[1]);
    throw new Error("Failed to parse upstream response");
  }
}

// ─── DES-ECB Decryption (crypto-js - Node-OpenSSL safe) ─────────────
/**
 * Decrypts JioSaavn's encrypted_media_url using DES-ECB with PKCS7 padding.
 * @param {string} encryptedUrl - base64-encoded encrypted URL
 * @returns {string} decrypted plain-text stream URL
 */
export function decryptMediaUrl(encryptedUrl) {
  if (!encryptedUrl) return "";

  const decrypted = CryptoJS.DES.decrypt(
    { ciphertext: CryptoJS.enc.Base64.parse(encryptedUrl) },
    DES_KEY,
    {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    }
  );

  return decrypted.toString(CryptoJS.enc.Utf8);
}

// ─── Bitrate URL Generator ──────────────────────────────────────────
/**
 * Generates stream URLs for all quality tiers from a base decrypted URL.
 * @param {string} baseUrl - decrypted URL (usually _96.mp4)
 * @returns {Record<string,string>} quality label → URL map
 */
export function generateDownloadLinks(baseUrl) {
  if (!baseUrl) return {};
  const links = {};
  for (const [label, suffix] of Object.entries(QUALITY_MAP)) {
    links[label] = baseUrl.replace(/_\d+\.mp4/, suffix);
  }
  return links;
}

// ─── HTML Entity Decoder ─────────────────────────────────────────────
const ENTITY_MAP = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#039;": "'",
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

/**
 * Strips HTML entities from a string.
 * @param {string} str
 * @returns {string}
 */
export function decodeEntities(str) {
  if (!str) return "";
  return str
    .replace(/&[\w#]+;/g, (match) => ENTITY_MAP[match] || match)
    .replace(/<[^>]+>/g, ""); // strip any residual HTML tags
}

// ─── Image Upscaler ─────────────────────────────────────────────────
/**
 * Replaces 50x50 or 150x150 image dimensions with 500x500.
 * @param {string} url
 * @returns {string}
 */
export function upscaleImage(url) {
  if (!url) return "";
  return url
    .replace(/150x150/g, "500x500")
    .replace(/50x50/g, "500x500");
}

// ─── Song Formatter ──────────────────────────────────────────────────
/**
 * Normalises a raw JioSaavn song object into a clean API response.
 * @param {object} raw - raw song object from upstream
 * @returns {object} formatted song
 */
export function formatSong(raw) {
  const decryptedUrl = decryptMediaUrl(raw.encrypted_media_url);
  const downloadLinks = generateDownloadLinks(decryptedUrl);

  return {
    id: raw.id,
    title: decodeEntities(raw.song || raw.title),
    album: decodeEntities(raw.album),
    album_id: raw.albumid,
    artists: decodeEntities(raw.primary_artists || raw.singers),
    featured_artists: decodeEntities(raw.featured_artists),
    artist_id: raw.primary_artists_id,
    image: upscaleImage(raw.image),
    year: raw.year,
    duration: raw.duration ? parseInt(raw.duration, 10) : null,
    language: raw.language,
    label: decodeEntities(raw.label),
    copyright: decodeEntities(raw.copyright_text),
    has_lyrics: raw.has_lyrics === "true" || raw.has_lyrics === true,
    release_date: raw.release_date,
    play_count: raw.play_count ? parseInt(raw.play_count, 10) : null,
    url: raw.perma_url,
    download_links: downloadLinks,
    stream_url: downloadLinks["320kbps"] || downloadLinks["160kbps"] || decryptedUrl,
  };
}

// ─── Album Formatter ─────────────────────────────────────────────────
export function formatAlbum(raw) {
  return {
    id: raw.albumid || raw.id,
    title: decodeEntities(raw.title || raw.name),
    artists: decodeEntities(raw.primary_artists),
    image: upscaleImage(raw.image),
    year: raw.year,
    release_date: raw.release_date,
    language: raw.language,
    url: raw.perma_url,
    song_count: raw.list ? raw.list.length : 0,
    songs: raw.list ? raw.list.map(formatSong) : [],
  };
}

// ─── Playlist Formatter ──────────────────────────────────────────────
export function formatPlaylist(raw) {
  return {
    id: raw.listid || raw.id,
    title: decodeEntities(raw.listname || raw.title),
    description: decodeEntities(raw.description),
    image: upscaleImage(raw.image),
    fan_count: raw.fan_count ? parseInt(raw.fan_count, 10) : null,
    follower_count: raw.follower_count ? parseInt(raw.follower_count, 10) : null,
    language: raw.language,
    url: raw.perma_url,
    song_count: raw.list ? raw.list.length : 0,
    songs: raw.list ? raw.list.map(formatSong) : [],
  };
}

// ─── CORS Helper ─────────────────────────────────────────────────────
/**
 * Sends a JSON response with universal CORS headers.
 * @param {import("http").ServerResponse} res
 * @param {number} status
 * @param {any} data
 */
export function sendJSON(res, status, data) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.statusCode = status;
  res.end(JSON.stringify(data));
}

/**
 * Sends an HTML response with CORS headers.
 */
export function sendHTML(res, status, html) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.statusCode = status;
  res.end(html);
}

/**
 * Handles OPTIONS preflight requests.
 */
export function handleCORS(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.statusCode = 204;
    res.end();
    return true;
  }
  return false;
}
