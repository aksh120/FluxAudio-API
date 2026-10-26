# FluxAudio API

High-performance, serverless music streaming API and autoembed player engine powered by JioSaavn and YouTube Music endpoints.

[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-090a0f?style=flat-square&logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-090a0f?style=flat-square)](LICENSE)
[![Deploy with Vercel](https://img.shields.io/badge/deploy-Vercel-090a0f?style=flat-square&logo=vercel)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Faksh120%2FFluxAudio-API)
[![CORS](https://img.shields.io/badge/CORS-enabled-090a0f?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
[![Audio Quality](https://img.shields.io/badge/bitrate-320kbps%20AAC-090a0f?style=flat-square)](https://github.com/aksh120/FluxAudio-API)

FluxAudio API is a production-grade, zero-cold-start media backend designed for developers building music players, discovery tools, and web applications. It directly queries upstream CDN and InnerTube endpoints, performs in-memory DES-ECB audio URL decryption, searches across both JioSaavn and YouTube Music, and serves both clean JSON metadata and drop-in HTML5 autoembed widgets.

---

## One-Click Deployment

Deploy your own private, high-speed instance to Vercel in seconds:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Faksh120%2FFluxAudio-API)

---

## Key Features

- **Dual-Engine Search**: Query both JioSaavn and YouTube Music catalogs concurrently with automatic interleaving or target specific sources via `source=all`, `source=saavn`, or `source=youtube`.
- **OpenSSL 3 Immune Decryption**: Uses pure-JavaScript `crypto-js` DES-ECB deciphering, avoiding Node 18+ and OpenSSL 3 `ERR_OSSL_EVP_UNSUPPORTED` runtime crashes on serverless environments.
- **Bot-Filter Bypass**: Upstream requests automatically inject valid browser headers and User-Agent signatures to prevent rate-limiting or automated request blocks.
- **5-Tier Bitrate Scaling**: Derives `320kbps`, `160kbps`, `96kbps`, `48kbps`, and `12kbps` direct MP4/AAC stream URLs from decrypted CDN tokens.
- **Artwork Upscaling**: Automatically transforms low-resolution thumbnail URLs into high-resolution `500x500` and `544x544` album art.
- **Universal Permissive CORS**: All API routes send `Access-Control-Allow-Origin: *` headers, allowing client-side single-page applications (React, Vue, Svelte, vanilla JS) to query without proxy errors.
- **Edge Cache Optimization**: Configured with `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` via Vercel Edge CDN for sub-100ms response times.
- **Unified Autoembed Studio**: Provides an iframe-ready HTML5 audio widget supporting both JioSaavn AAC streams and YouTube Music playback with identical hardware-inspired UI controls.

---

## Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher

### Local Installation

```bash
git clone https://github.com/aksh120/FluxAudio-API.git
cd FluxAudio-API
npm install
```

### Start Local Development Server

Run the standalone local server (does not require Vercel login or CLI credentials):

```bash
npm run dev
```

The development server and interactive explorer will be accessible at:
- Web Dashboard: `http://localhost:3000`
- Search API: `http://localhost:3000/api/search?q=Starboy`
- Autoembed Player: `http://localhost:3000/api/embed?q=Starboy`

### Run Test Suite

Verify cryptographic decryption and URL formatting:

```bash
npm test
```

---

## API Reference

### Endpoints Overview

| Method | Endpoint | Parameters | Description |
|---|---|---|---|
| `GET` | `/api/search` | `q` (required), `source`, `page`, `limit` | Searches tracks across JioSaavn and YouTube Music catalogs |
| `GET` | `/api/song` | `id` or `url` (required), `source` | Returns song metadata, labels, and stream URLs (supports JioSaavn & YouTube IDs) |
| `GET` | `/api/album` | `id` (required), `source` | Returns album info and tracklist (supports JioSaavn & YouTube album/track IDs) |
| `GET` | `/api/playlist` | `id` (required), `source` | Returns playlist metadata and tracklist (supports JioSaavn & YouTube VL/PL playlists) |
| `GET` | `/api/lyrics` | `id` (required), `source` | Returns sanitized plain-text lyrics and preview snippets (JioSaavn & YouTube Music) |
| `GET` | `/api/embed` | `id` or `q` (required) | Generates responsive HTML5 autoembed audio widget (supports JioSaavn & YouTube) |

---

### Detailed Endpoint Specifications

#### 1. Search Songs
```http
GET /api/search?q={query}&source={source}&page={page}&limit={limit}
```

**Parameters:**
- `q` (*string*, required): Search term (e.g. song name, artist, album).
- `source` (*string*, optional, default: `all`): Catalog source filter: `all`, `saavn`, or `youtube`.
- `page` (*integer*, optional, default: `1`): Pagination page number (applies to JioSaavn).
- `limit` (*integer*, optional, default: `20`): Number of results per page (max `50`).

**Example Response:**
```json
{
  "status": "ok",
  "query": "Starboy",
  "source": "all",
  "page": 1,
  "limit": 20,
  "total_results": 2,
  "counts": {
    "saavn": 1,
    "youtube": 1
  },
  "results": [
    {
      "id": "e_z0Z0l8",
      "source": "saavn",
      "title": "Starboy",
      "album": "Starboy",
      "album_id": "1827492",
      "artists": "The Weeknd, Daft Punk",
      "featured_artists": "Daft Punk",
      "artist_id": "456208",
      "image": "https://c.saavncdn.com/500x500/Starboy-English-2016-500x500.jpg",
      "year": "2016",
      "duration": 230,
      "language": "english",
      "label": "Universal Music Group",
      "has_lyrics": true,
      "download_links": {
        "320kbps": "https://aac.saavncdn.com/123/e_z0Z0l8_320.mp4",
        "160kbps": "https://aac.saavncdn.com/123/e_z0Z0l8_160.mp4",
        "96kbps": "https://aac.saavncdn.com/123/e_z0Z0l8_96.mp4",
        "48kbps": "https://aac.saavncdn.com/123/e_z0Z0l8_48.mp4",
        "12kbps": "https://aac.saavncdn.com/123/e_z0Z0l8_12.mp4"
      },
      "stream_url": "https://aac.saavncdn.com/123/e_z0Z0l8_320.mp4"
    },
    {
      "id": "yt:3_g2un5M350",
      "youtube_id": "3_g2un5M350",
      "source": "youtube",
      "title": "Starboy (feat. Daft Punk)",
      "album": "Starboy",
      "album_id": "MPREb_FWIMEPTHFsY",
      "artists": "The Weeknd, Daft Punk",
      "featured_artists": "",
      "artist_id": null,
      "image": "https://lh3.googleusercontent.com/...=w544-h544-l90-rj",
      "year": "2016",
      "duration": 230,
      "language": "unknown",
      "label": "YouTube Music",
      "url": "https://music.youtube.com/watch?v=3_g2un5M350",
      "youtube_url": "https://www.youtube.com/watch?v=3_g2un5M350",
      "stream_url": "https://www.youtube.com/watch?v=3_g2un5M350"
    }
  ]
}
```

---

#### 2. Get Song Details
```http
GET /api/song?id={song_id}
GET /api/song?url={perma_url}
```

**Parameters:**
- `id` (*string*): Upstream track identifier (e.g. JioSaavn ID `3IoDK8qI` or YouTube ID `yt:3_g2un5M350`).
- `url` (*string*): Alternatively, a full JioSaavn or YouTube permalink URL.

---

#### 3. Get Album Details
```http
GET /api/album?id={album_id}
```

**Parameters:**
- `id` (*string*, required): Upstream album identifier (e.g. JioSaavn album ID `25500145` or YouTube Music album ID `yt:MPREb_FWIMEPTHFsY`). Also supports auto-resolving album metadata directly from YouTube track IDs (e.g. `yt:Yegn0dZ-BfY`).

---

#### 4. Get Playlist Details
```http
GET /api/playlist?id={playlist_id}
```

**Parameters:**
- `id` (*string*, required): Upstream playlist identifier (e.g. JioSaavn playlist ID `110858205` or YouTube Music playlist ID `yt:VLPLplXQ2cg9B_qrCVd1J_iId5SvP8Kf_BfS`).

---

#### 5. Get Lyrics
```http
GET /api/lyrics?id={song_id}
```

**Parameters:**
- `id` (*string*, required): Upstream track identifier (e.g. JioSaavn ID `aRZbUYD7` or YouTube track ID `yt:3_g2un5M350` / `yt:Yegn0dZ-BfY`).

**Example Response:**
```json
{
  "status": "ok",
  "song_id": "yt:3_g2un5M350",
  "source": "youtube",
  "lyrics": "I'm tryna put you in the worst mood, ah\nP1 cleaner than your church shoes, ah...",
  "snippet": "I'm tryna put you in the worst mood, ah / P1 cleaner than your church shoes, ah",
  "source_attribution": "YouTube Music"
}
```

---

#### 6. Autoembed Player Widget
```http
GET /api/embed?id={song_id}
GET /api/embed?q={search_query}
```

Returns self-contained HTML with audio controls, scrubber, volume slider, and live equalizer. Drop directly into an iframe on any web page:

```html
<iframe
  src="https://your-domain.vercel.app/api/embed?id=3IoDK8qI"
  width="100%"
  height="110"
  frameborder="0"
  allow="autoplay"
></iframe>
```

---

## Client Integration Examples

### JavaScript / TypeScript

```javascript
// Search tracks
const response = await fetch('https://your-domain.vercel.app/api/search?q=Coldplay&limit=5');
const { results } = await response.json();

console.log(results[0].title);
console.log(results[0].stream_url); // 320kbps decrypted stream
```

### cURL

```bash
curl -X GET "https://your-domain.vercel.app/api/search?q=Dua+Lipa&limit=1" \
  -H "Accept: application/json"
```

### Python

```python
import requests

url = "https://your-domain.vercel.app/api/song"
params = {"id": "3IoDK8qI"}

res = requests.get(url, params=params).json()
stream_url = res["song"]["download_links"]["320kbps"]
print(f"Streaming from: {stream_url}")
```

---

## Project Structure

```text
FluxAudio-API/
├── api/
│   ├── search.js          # Track search endpoint
│   ├── song.js            # Song details & bitrate deciphering
│   ├── album.js           # Album & tracklist details
│   ├── playlist.js        # Playlist details & tracks
│   ├── lyrics.js          # Sanitized lyrics endpoint
│   └── embed.js           # Minimalist HTML5 autoembed player
├── lib/
│   ├── saavn.js           # Core fetch, DES-ECB decryption, formatters
│   └── ytmusic.js         # YouTube Music InnerTube search & metadata
├── public/
│   └── index.html         # Developer dashboard & embed studio
├── test.js                # Core cryptographic test runner
├── dev.js                 # Standalone local development server
├── vercel.json            # Edge headers, CORS, and rewrites
├── package.json           # Package configuration & dependencies
├── LICENSE                # MIT License
└── README.md              # Technical documentation
```

---

## Cryptographic Implementation Notes

JioSaavn encodes media stream URLs using DES encryption in Electronic Codebook (ECB) mode with PKCS7 padding, keyed with `38346591` (UTF-8).

In Node.js 18+ and OpenSSL 3, legacy ciphers including DES are disabled by default within `node:crypto`, triggering `ERR_OSSL_EVP_UNSUPPORTED` during serverless execution unless runtime flags are passed. FluxAudio API utilizes pure-JavaScript `crypto-js` to perform the deciphering, ensuring deterministic execution across all serverless runtimes without dependency on host OpenSSL configurations.

---

## Production Deployment to Vercel

### Via Vercel CLI

```bash
npm install -g vercel
vercel --prod
```

### Via GitHub Integration

1. Push your repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and select the repository.
3. Keep default settings (`Other` framework preset, root directory `./`).
4. Click **Deploy**. Vercel will automatically configure the `/api` serverless routes based on `vercel.json`.

---

## License

This project is licensed under the [MIT License](LICENSE).
