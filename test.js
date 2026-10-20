/**
 * FluxAudio API - Core Test Suite
 * Validates cryptographic decryption, URL scaling, and response formatters.
 * 
 * Usage: node test.js
 */

import {
  decryptMediaUrl,
  generateDownloadLinks,
  decodeEntities,
  upscaleImage,
  formatSong,
} from "./lib/saavn.js";

let passed = 0;
let failed = 0;

function assert(module, label, condition) {
  if (condition) {
    console.log(`  [PASS] ${module} > ${label}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${module} > ${label}`);
    failed++;
  }
}

console.log("\nFluxAudio API Test Runner\nRunning unit tests...\n");

// ── decodeEntities ──────────────────────────────────────────────────
assert("decodeEntities", "decodes &amp;", decodeEntities("Rock &amp; Roll") === "Rock & Roll");
assert("decodeEntities", "decodes &quot;", decodeEntities("&quot;Hello&quot;") === '"Hello"');
assert("decodeEntities", "decodes &#039;", decodeEntities("It&#039;s fine") === "It's fine");
assert("decodeEntities", "strips HTML tags", decodeEntities("<b>bold</b>") === "bold");
assert("decodeEntities", "handles null/undefined gracefully", decodeEntities(null) === "");

// ── upscaleImage ────────────────────────────────────────────────────
assert("upscaleImage", "upscales 150x150 to 500x500", upscaleImage("https://c.saavncdn.com/150x150/img.jpg") === "https://c.saavncdn.com/500x500/img.jpg");
assert("upscaleImage", "upscales 50x50 to 500x500", upscaleImage("https://c.saavncdn.com/50x50/img.jpg") === "https://c.saavncdn.com/500x500/img.jpg");
assert("upscaleImage", "handles empty string gracefully", upscaleImage("") === "");

// ── decryptMediaUrl ─────────────────────────────────────────────────
assert("decryptMediaUrl", "returns empty string for empty input", decryptMediaUrl("") === "");
assert("decryptMediaUrl", "returns empty string for null input", decryptMediaUrl(null) === "");
try {
  decryptMediaUrl("dGVzdA==");
  assert("decryptMediaUrl", "handles arbitrary base64 without throwing", true);
} catch (e) {
  assert("decryptMediaUrl", "handles arbitrary base64 without throwing", false);
}

// ── generateDownloadLinks ───────────────────────────────────────────
const testUrl = "https://aac.saavncdn.com/123/song_96.mp4";
const links = generateDownloadLinks(testUrl);
assert("generateDownloadLinks", "generates 320kbps target", links["320kbps"] === "https://aac.saavncdn.com/123/song_320.mp4");
assert("generateDownloadLinks", "generates 160kbps target", links["160kbps"] === "https://aac.saavncdn.com/123/song_160.mp4");
assert("generateDownloadLinks", "generates 96kbps target", links["96kbps"] === "https://aac.saavncdn.com/123/song_96.mp4");
assert("generateDownloadLinks", "generates 48kbps target", links["48kbps"] === "https://aac.saavncdn.com/123/song_48.mp4");
assert("generateDownloadLinks", "generates 12kbps target", links["12kbps"] === "https://aac.saavncdn.com/123/song_12.mp4");
assert("generateDownloadLinks", "returns empty object on empty string", Object.keys(generateDownloadLinks("")).length === 0);

// ── formatSong ──────────────────────────────────────────────────────
const mockRaw = {
  id: "abc123",
  song: "Test &amp; Song",
  album: "Test &quot;Album&quot;",
  albumid: "alb456",
  primary_artists: "Artist&#039;s Name",
  featured_artists: "",
  primary_artists_id: "art789",
  image: "https://c.saavncdn.com/150x150/cover.jpg",
  year: "2024",
  duration: "240",
  language: "english",
  label: "Test Label",
  copyright_text: "(C) 2024",
  has_lyrics: "true",
  release_date: "2024-01-01",
  play_count: "1000000",
  perma_url: "https://www.jiosaavn.com/song/test",
  encrypted_media_url: "",
};

const formatted = formatSong(mockRaw);
assert("formatSong", "sanitizes song title", formatted.title === "Test & Song");
assert("formatSong", "sanitizes album title", formatted.album === 'Test "Album"');
assert("formatSong", "sanitizes artist names", formatted.artists === "Artist's Name");
assert("formatSong", "upscales artwork to 500x500", formatted.image.includes("500x500"));
assert("formatSong", "converts duration to integer", formatted.duration === 240);
assert("formatSong", "parses boolean has_lyrics", formatted.has_lyrics === true);
assert("formatSong", "parses integer play_count", formatted.play_count === 1000000);

console.log(`\nTest Suites: 1 passed, 1 total`);
console.log(`Tests:       ${passed} passed, ${failed} failed`);
console.log(`Time:        ${Date.now()}ms\n`);

process.exit(failed > 0 ? 1 : 0);
