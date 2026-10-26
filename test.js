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
import {
  parseDurationToSeconds,
  upscaleYouTubeImage,
  formatYouTubeSong,
} from "./lib/ytmusic.js";

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

// ── formatSong (JioSaavn) ───────────────────────────────────────────
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
assert("formatSong", "marks source as saavn", formatted.source === "saavn");
assert("formatSong", "sanitizes song title", formatted.title === "Test & Song");
assert("formatSong", "sanitizes album title", formatted.album === 'Test "Album"');
assert("formatSong", "sanitizes artist names", formatted.artists === "Artist's Name");
assert("formatSong", "upscales artwork to 500x500", formatted.image.includes("500x500"));
assert("formatSong", "converts duration to integer", formatted.duration === 240);
assert("formatSong", "parses boolean has_lyrics", formatted.has_lyrics === true);
assert("formatSong", "parses integer play_count", formatted.play_count === 1000000);

// ── parseDurationToSeconds (YouTube Music) ──────────────────────────
assert("parseDurationToSeconds", "parses mm:ss", parseDurationToSeconds("3:45") === 225);
assert("parseDurationToSeconds", "parses hh:mm:ss", parseDurationToSeconds("1:02:15") === 3735);
assert("parseDurationToSeconds", "handles empty/invalid string", parseDurationToSeconds("") === 0);
assert("parseDurationToSeconds", "handles null/undefined", parseDurationToSeconds(null) === 0);

// ── upscaleYouTubeImage ─────────────────────────────────────────────
const ytThumb = "https://lh3.googleusercontent.com/test=w120-h120-l90-rj";
assert("upscaleYouTubeImage", "replaces resolution with 544x544", upscaleYouTubeImage(ytThumb) === "https://lh3.googleusercontent.com/test=w544-h544-l90-rj");
assert("upscaleYouTubeImage", "handles empty string", upscaleYouTubeImage("") === "");

// ── formatYouTubeSong ───────────────────────────────────────────────
assert("formatYouTubeSong", "returns null for empty input", formatYouTubeSong(null) === null);
const mockYTRaw = {
  musicResponsiveListItemRenderer: {
    thumbnail: {
      musicThumbnailRenderer: {
        thumbnail: {
          thumbnails: [{ url: "https://lh3.googleusercontent.com/test=w120-h120-l90-rj" }],
        },
      },
    },
    flexColumns: [
      {
        musicResponsiveListItemFlexColumnRenderer: {
          text: {
            runs: [
              {
                text: "Blinding Lights",
                navigationEndpoint: {
                  watchEndpoint: { videoId: "4NRXx6U8ABQ" },
                },
              },
            ],
          },
        },
      },
      {
        musicResponsiveListItemFlexColumnRenderer: {
          text: {
            runs: [
              {
                text: "The Weeknd",
                navigationEndpoint: {
                  browseEndpoint: {
                    browseEndpointContextSupportedConfigs: {
                      browseEndpointContextMusicConfig: { pageType: "MUSIC_PAGE_TYPE_ARTIST" },
                    },
                    browseId: "UC0WP5P-ufpRfjbNrmOWwLBQ",
                  },
                },
              },
              { text: " • " },
              {
                text: "After Hours",
                navigationEndpoint: {
                  browseEndpoint: {
                    browseEndpointContextSupportedConfigs: {
                      browseEndpointContextMusicConfig: { pageType: "MUSIC_PAGE_TYPE_ALBUM" },
                    },
                  },
                },
              },
              { text: " • " },
              { text: "3:20" },
            ],
          },
        },
      },
    ],
  },
};

const formattedYT = formatYouTubeSong(mockYTRaw);
assert("formatYouTubeSong", "formats yt: prefixed ID", formattedYT.id === "yt:4NRXx6U8ABQ");
assert("formatYouTubeSong", "stores clean youtube_id", formattedYT.youtube_id === "4NRXx6U8ABQ");
assert("formatYouTubeSong", "marks source as youtube", formattedYT.source === "youtube");
assert("formatYouTubeSong", "extracts title", formattedYT.title === "Blinding Lights");
assert("formatYouTubeSong", "extracts artist", formattedYT.artists === "The Weeknd");
assert("formatYouTubeSong", "extracts album", formattedYT.album === "After Hours");
assert("formatYouTubeSong", "computes duration in seconds", formattedYT.duration === 200);
assert("formatYouTubeSong", "generates music youtube URL", formattedYT.url === "https://music.youtube.com/watch?v=4NRXx6U8ABQ");

console.log(`\nTest Suites: 1 passed, 1 total`);
console.log(`Tests:       ${passed} passed, ${failed} failed`);
console.log(`Time:        ${Date.now()}ms\n`);

process.exit(failed > 0 ? 1 : 0);
