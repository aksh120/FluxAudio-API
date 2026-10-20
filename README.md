# FluxAudio API

High-performance, serverless music streaming API and autoembed player engine powered by JioSaavn CDN endpoints.

[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-090a0f?style=flat-square&logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-090a0f?style=flat-square)](LICENSE)
[![Deploy with Vercel](https://img.shields.io/badge/deploy-Vercel-090a0f?style=flat-square&logo=vercel)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Faksh120%2FFluxAudio-API)
[![CORS](https://img.shields.io/badge/CORS-enabled-090a0f?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
[![Audio Quality](https://img.shields.io/badge/bitrate-320kbps%20AAC-090a0f?style=flat-square)](https://github.com/aksh120/FluxAudio-API)

FluxAudio API is a production-grade, zero-cold-start media backend designed for developers building music players, discovery tools, and web applications. It directly queries upstream CDN endpoints, performs in-memory DES-ECB audio URL decryption, and serves both clean JSON metadata and drop-in HTML5 iframe embed widgets.

---

## One-Click Deployment

Deploy your own private, high-speed instance to Vercel in seconds:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Faksh120%2FFluxAudio-API)

---

## Key Features

- **OpenSSL 3 Immune Decryption**: Uses pure-JavaScript `crypto-js` DES-ECB deciphering, avoiding Node 18+ and OpenSSL 3 `ERR_OSSL_EVP_UNSUPPORTED` runtime crashes on serverless environments.
- **Bot-Filter Bypass**: Upstream requests automatically inject valid browser headers and User-Agent signatures to prevent rate-limiting or automated request blocks.
- **5-Tier Bitrate Scaling**: Derives `320kbps`, `160kbps`, `96kbps`, `48kbps`, and `12kbps` direct MP4/AAC stream URLs from decrypted CDN tokens.
- **Artwork Upscaling**: Automatically transforms low-resolution thumbnail URLs (`50x50`, `150x150`) into high-resolution `500x500` album art.
- **Universal Permissive CORS**: All API routes send `Access-Control-Allow-Origin: *` headers, allowing client-side single-page applications (React, Vue, Svelte, vanilla JS) to query without proxy errors.
- **Edge Cache Optimization**: Configured with `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` via Vercel Edge CDN for sub-100ms response times.
- **Studio Autoembed Widget**: Provides an iframe-ready HTML5 audio widget inspired by Apple Music and Teenage Engineering hardware design.

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
| `GET` | `/api/search` | `q` (required), `page`, `limit` | Searches tracks across Hollywood and Bollywood catalogs |
| `GET` | `/api/song` | `id` or `url` (required) | Returns song metadata, labels, and all 5 decrypted bitrates |
| `GET` | `/api/album` | `id` (required) | Returns album info and all decrypted album tracks |
| `GET` | `/api/playlist` | `id` (required) | Returns playlist metadata, fan count, and tracklist |
| `GET` | `/api/lyrics` | `id` (required) | Returns sanitized plain-text lyrics and preview snippet |
| `GET` | `/api/embed` | `id` or `q` (required) | Generates responsive HTML5 autoembed audio widget |

---

### Detailed Endpoint Specifications

#### 1. Search Songs
```http
GET /api/search?q={query}&page={page}&limit={limit}
```

**Parameters:**
- `q` (*string*, required): Search term (e.g. song name, artist, album).
- `page` (*integer*, optional, default: `1`): Pagination page number.
- `limit` (*integer*, optional, default: `20`): Number of results per page.

**Example Response:**
```json
{
  "status": "ok",
  "query": "Starboy",
  "page": 1,
  "limit": 20,
  "total_results": 1,
  "results": [
    {
      "id": "e_z0Z0l8",
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
- `id` (*string*): Upstream track identifier (e.g. `3IoDK8qI`).
- `url` (*string*): Alternatively, a full JioSaavn permalink URL.

---

#### 3. Get Album Details
```http
GET /api/album?id={album_id}
```

**Parameters:**
- `id` (*string*, required): Upstream album identifier (e.g. `25500145`).

---

#### 4. Get Playlist Details
```http
GET /api/playlist?id={playlist_id}
```

**Parameters:**
- `id` (*string*, required): Upstream playlist identifier (e.g. `110858205`).

---

#### 5. Get Lyrics
```http
GET /api/lyrics?id={song_id}
```

**Parameters:**
- `id` (*string*, required): Upstream song identifier.

**Example Response:**
```json
{
  "status": "ok",
  "song_id": "3IoDK8qI",
  "lyrics": "I'm in love with the shape of you\nWe push and pull like a magnet do...",
  "snippet": "I'm in love with the shape of you / We push and pull like a magnet do"
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
│   └── saavn.js           # Core fetch, DES-ECB decryption, formatters
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
