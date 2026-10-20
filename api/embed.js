/**
 * GET /api/embed
 * High-End, Minimalist HTML5 Audio Autoembed Player
 * Inspired by Apple Music, Spotify, and Teenage Engineering hardware UI.
 * 
 * Query params:
 *   id - JioSaavn song ID (preferred)
 *   q  - Search query (fallback - plays first result)
 */

import {
  fetchFromSaavn,
  formatSong,
  sendHTML,
  handleCORS,
} from "../lib/saavn.js";

export default async function handler(req, res) {
  if (handleCORS(req, res)) return;

  try {
    const { id, q } = req.query || {};

    if (!id && !q) {
      return sendHTML(res, 400, renderErrorWidget("Missing Parameter", "Pass ?id= or ?q= to stream audio."));
    }

    let song;

    if (id) {
      const data = await fetchFromSaavn({
        __call: "song.getDetails",
        cc: "in",
        _format: "json",
        pids: id,
      });
      const rawSongs = data.songs || Object.values(data);
      if (!rawSongs || rawSongs.length === 0) {
        return sendHTML(res, 404, renderErrorWidget("Track Not Found", `No match for ID: ${id}`));
      }
      song = formatSong(rawSongs[0]);
    } else {
      const data = await fetchFromSaavn({
        __call: "search.getResults",
        _format: "json",
        q,
        p: "1",
        n: "1",
      });
      const results = data.results || data.songs?.data || [];
      if (results.length === 0) {
        return sendHTML(res, 404, renderErrorWidget("No Results", `No tracks matched "${q}"`));
      }
      song = formatSong(results[0]);
    }

    const html = buildMinimalPlayerHTML(song);
    return sendHTML(res, 200, html);
  } catch (err) {
    console.error("[/api/embed]", err);
    return sendHTML(res, 500, renderErrorWidget("Service Error", "Failed to decrypt audio stream."));
  }
}

function renderErrorWidget(title, subtitle) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escHTML(title)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    background: #090a0f;
    color: #71717a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    padding: 12px;
  }
  .box {
    border: 1px solid rgba(255,255,255,0.08);
    background: #111218;
    border-radius: 10px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    max-width: 380px;
  }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #ef4444; flex-shrink: 0; }
  .title { font-size: 13px; font-weight: 600; color: #e4e4e7; }
  .sub { font-size: 11px; color: #71717a; margin-top: 2px; }
</style>
</head>
<body>
  <div class="box">
    <div class="dot"></div>
    <div>
      <div class="title">${escHTML(title)}</div>
      <div class="sub">${escHTML(subtitle)}</div>
    </div>
  </div>
</body>
</html>`;
}

function buildMinimalPlayerHTML(song) {
  const streamUrl = song.stream_url || "";
  const title = escHTML(song.title || "Untitled Track");
  const artists = escHTML(song.artists || "Unknown Artist");
  const album = escHTML(song.album || "");
  const image = escHTML(song.image || "");
  const duration = song.duration || 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} - ${artists}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
  }

  html, body {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #08090d;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  body {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    user-select: none;
  }

  /* ── Studio Frame Card ── */
  .player-card {
    width: 100%;
    max-width: 620px;
    height: 100%;
    max-height: 98px;
    background: #0d0f17;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 14px;
    position: relative;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
    transition: border-color 0.15s ease;
  }

  .player-card:hover {
    border-color: rgba(255, 255, 255, 0.15);
  }

  /* ── Artwork ── */
  .artwork-wrap {
    position: relative;
    width: 74px;
    height: 74px;
    border-radius: 8px;
    overflow: hidden;
    flex-shrink: 0;
    background: #141722;
    border: 1px solid rgba(255, 255, 255, 0.06);
    box-shadow: 0 4px 14px rgba(0,0,0,0.5);
  }

  .artwork-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  /* Dynamic Jumping Equalizer Badge on Artwork */
  .eq-overlay {
    position: absolute;
    bottom: 4px;
    right: 4px;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
    border-radius: 4px;
    padding: 3px 4px;
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 14px;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .player-card.is-playing .eq-overlay {
    opacity: 1;
  }

  .eq-bar {
    width: 2px;
    height: 4px;
    background: #ffffff;
    border-radius: 1px;
  }

  .player-card.is-playing .eq-bar:nth-child(1) { animation: eqJump 0.8s ease-in-out infinite alternate; }
  .player-card.is-playing .eq-bar:nth-child(2) { animation: eqJump 0.6s ease-in-out infinite alternate 0.2s; }
  .player-card.is-playing .eq-bar:nth-child(3) { animation: eqJump 0.9s ease-in-out infinite alternate 0.4s; }

  @keyframes eqJump {
    0% { height: 2px; }
    100% { height: 10px; }
  }

  /* ── Main Track Section ── */
  .main-section {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
    padding: 2px 0;
  }

  /* Row 1: Title, Artist & Quality Badge */
  .track-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .meta-text {
    min-width: 0;
    flex: 1;
  }

  .title-line {
    font-size: 14px;
    font-weight: 600;
    color: #f4f4f6;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .artist-line {
    font-size: 11.5px;
    font-weight: 400;
    color: #8b8f9e;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 1px;
  }

  .quality-tag {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    font-weight: 600;
    color: #d4d4d8;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 2px 6px;
    border-radius: 4px;
    letter-spacing: 0.04em;
    flex-shrink: 0;
  }

  /* Row 2: Precision Scrubber Track */
  .scrubber-section {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 2px 0;
  }

  .time-num {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10.5px;
    color: #63687b;
    font-variant-numeric: tabular-nums;
    min-width: 26px;
  }

  .time-num.end {
    text-align: right;
  }

  .scrub-track {
    flex: 1;
    height: 4px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    position: relative;
    cursor: pointer;
    transition: height 0.15s ease;
  }

  .scrub-track:hover {
    height: 6px;
  }

  .scrub-progress {
    height: 100%;
    width: 0%;
    background: #ffffff;
    border-radius: 999px;
    position: relative;
    pointer-events: none;
    transition: width 0.08s linear;
  }

  .scrub-handle {
    position: absolute;
    right: -4px;
    top: 50%;
    transform: translateY(-50%) scale(0);
    width: 10px;
    height: 10px;
    background: #ffffff;
    border-radius: 50%;
    box-shadow: 0 0 8px rgba(0,0,0,0.8);
    transition: transform 0.15s ease;
  }

  .scrub-track:hover .scrub-handle {
    transform: translateY(-50%) scale(1);
  }

  /* Row 3: Action Controls Bar (Balanced & Unified) */
  .actions-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  /* Left: Transport Buttons */
  .transport-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .play-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: none;
    background: #ffffff;
    color: #000000;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.15s ease, background-color 0.15s ease;
    flex-shrink: 0;
  }

  .play-btn:hover {
    transform: scale(1.08);
    background: #e4e4e7;
  }

  .play-btn:active {
    transform: scale(0.95);
  }

  .play-btn svg {
    width: 12px;
    height: 12px;
    fill: currentColor;
    margin-left: 1px;
  }

  .play-btn.playing svg {
    margin-left: 0;
  }

  .skip-btn {
    background: none;
    border: none;
    color: #71717a;
    cursor: pointer;
    padding: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s ease;
    border-radius: 4px;
  }

  .skip-btn:hover {
    color: #f4f4f6;
  }

  .skip-btn svg {
    width: 14px;
    height: 14px;
    fill: currentColor;
  }

  /* Right: Volume & Brand */
  .utility-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .vol-control {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .vol-btn {
    background: none;
    border: none;
    color: #71717a;
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s ease;
  }

  .vol-btn:hover {
    color: #f4f4f6;
  }

  .vol-btn svg {
    width: 14px;
    height: 14px;
    fill: currentColor;
  }

  .vol-slider-track {
    width: 48px;
    height: 3px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    cursor: pointer;
    position: relative;
  }

  .vol-slider-fill {
    height: 100%;
    width: 80%;
    background: #a1a1aa;
    border-radius: 999px;
    pointer-events: none;
  }

  .vol-slider-track:hover .vol-slider-fill {
    background: #ffffff;
  }

  .brand-chip {
    font-size: 9.5px;
    font-weight: 700;
    color: #52566b;
    text-decoration: none;
    letter-spacing: 0.06em;
    padding-left: 10px;
    border-left: 1px solid rgba(255, 255, 255, 0.08);
    transition: color 0.15s ease;
  }

  .brand-chip:hover {
    color: #d4d4d8;
  }

  /* Compact Mode (under 420px) */
  @media (max-width: 420px) {
    .player-card {
      padding: 8px 10px;
      gap: 10px;
    }
    .artwork-wrap {
      width: 60px;
      height: 60px;
    }
    .skip-btn {
      display: none;
    }
    .vol-slider-track {
      width: 32px;
    }
    .title-line {
      font-size: 13px;
    }
    .brand-chip {
      display: none;
    }
  }
</style>
</head>
<body>

<div class="player-card" id="playerCard">
  <!-- Artwork -->
  <div class="artwork-wrap">
    <img 
      class="artwork-img" 
      src="${image}" 
      alt="${title}"
      onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2352566b%22 stroke-width=%221.5%22><path d=%22M9 18V5l12-2v13%22/><circle cx=%226%22 cy=%2218%22 r=%223%22 fill=%22%2352566b%22/><circle cx=%2218%22 cy=%2216%22 r=%223%22 fill=%22%2352566b%22/></svg>'"
    >
    <div class="eq-overlay">
      <div class="eq-bar"></div>
      <div class="eq-bar"></div>
      <div class="eq-bar"></div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="main-section">
    <!-- Meta Row -->
    <div class="track-meta">
      <div class="meta-text">
        <div class="title-line" title="${title}">${title}</div>
        <div class="artist-line" title="${artists}${album ? ' • ' + album : ''}">${artists}${album ? ' • ' + album : ''}</div>
      </div>
      <span class="quality-tag">320K</span>
    </div>

    <!-- Scrubber Row -->
    <div class="scrubber-section">
      <span class="time-num" id="timeCurrent">0:00</span>
      <div class="scrub-track" id="scrubTrack">
        <div class="scrub-progress" id="scrubProgress">
          <div class="scrub-handle"></div>
        </div>
      </div>
      <span class="time-num end" id="timeTotal">${formatClock(duration)}</span>
    </div>

    <!-- Transport & Controls Row -->
    <div class="actions-row">
      <div class="transport-group">
        <button class="play-btn" id="btnPlay" aria-label="Play/Pause">
          <svg id="svgPlay" viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4"/></svg>
          <svg id="svgPause" viewBox="0 0 24 24" style="display:none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        </button>

        <button class="skip-btn" id="btnBack10" aria-label="Back 10 seconds" title="Rewind 10s">
          <svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/><text x="12" y="14" font-size="7" font-weight="700" fill="currentColor" text-anchor="middle">10</text></svg>
        </button>

        <button class="skip-btn" id="btnFwd10" aria-label="Forward 10 seconds" title="Forward 10s">
          <svg viewBox="0 0 24 24"><path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/><text x="12" y="14" font-size="7" font-weight="700" fill="currentColor" text-anchor="middle">10</text></svg>
        </button>
      </div>

      <div class="utility-group">
        <!-- Volume -->
        <div class="vol-control">
          <button class="vol-btn" id="btnMute" aria-label="Mute" title="Mute/Unmute">
            <svg id="svgVol" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          </button>
          <div class="vol-slider-track" id="volTrack">
            <div class="vol-slider-fill" id="volFill"></div>
          </div>
        </div>

        <!-- Brand Mark (No Open Stream Button) -->
        <a class="brand-chip" href="/" target="_blank" rel="noopener" title="FluxAudio API">FLUX</a>
      </div>
    </div>
  </div>
</div>

<audio id="playerAudio" preload="metadata" crossorigin="anonymous" src="${escHTML(streamUrl)}"></audio>

<script>
(function() {
  const audio = document.getElementById('playerAudio');
  const card = document.getElementById('playerCard');
  const btnPlay = document.getElementById('btnPlay');
  const svgPlay = document.getElementById('svgPlay');
  const svgPause = document.getElementById('svgPause');
  const scrubTrack = document.getElementById('scrubTrack');
  const scrubProgress = document.getElementById('scrubProgress');
  const timeCurrent = document.getElementById('timeCurrent');
  const timeTotal = document.getElementById('timeTotal');
  const btnBack10 = document.getElementById('btnBack10');
  const btnFwd10 = document.getElementById('btnFwd10');
  const btnMute = document.getElementById('btnMute');
  const volTrack = document.getElementById('volTrack');
  const volFill = document.getElementById('volFill');

  let isSeeking = false;
  audio.volume = 0.85;

  function fmt(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function setPlaying(play) {
    if (play) {
      svgPlay.style.display = 'none';
      svgPause.style.display = 'block';
      btnPlay.classList.add('playing');
      card.classList.add('is-playing');
    } else {
      svgPlay.style.display = 'block';
      svgPause.style.display = 'none';
      btnPlay.classList.remove('playing');
      card.classList.remove('is-playing');
    }
  }

  btnPlay.addEventListener('click', () => {
    if (audio.paused) {
      audio.play().then(() => setPlaying(true)).catch(console.error);
    } else {
      audio.pause();
      setPlaying(false);
    }
  });

  // Skip 10s
  btnBack10.addEventListener('click', () => {
    audio.currentTime = Math.max(0, audio.currentTime - 10);
  });
  btnFwd10.addEventListener('click', () => {
    if (audio.duration) audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
  });

  // Spacebar toggle & arrow keys seek
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body) {
      e.preventDefault();
      btnPlay.click();
    } else if (e.code === 'ArrowLeft') {
      btnBack10.click();
    } else if (e.code === 'ArrowRight') {
      btnFwd10.click();
    }
  });

  audio.addEventListener('timeupdate', () => {
    if (isSeeking || !audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    scrubProgress.style.width = pct + '%';
    timeCurrent.textContent = fmt(audio.currentTime);
  });

  audio.addEventListener('loadedmetadata', () => {
    timeTotal.textContent = fmt(audio.duration);
  });

  audio.addEventListener('ended', () => {
    setPlaying(false);
    scrubProgress.style.width = '0%';
    timeCurrent.textContent = '0:00';
  });

  // Seeking scrub logic
  function seekTo(e) {
    if (!audio.duration) return;
    const r = scrubTrack.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    audio.currentTime = ratio * audio.duration;
    scrubProgress.style.width = (ratio * 100) + '%';
    timeCurrent.textContent = fmt(audio.currentTime);
  }

  scrubTrack.addEventListener('mousedown', (e) => {
    isSeeking = true;
    seekTo(e);
    const onMove = (me) => seekTo(me);
    const onUp = () => {
      isSeeking = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });

  // Volume
  let lastVol = 0.85;
  btnMute.addEventListener('click', () => {
    if (audio.muted || audio.volume === 0) {
      audio.muted = false;
      audio.volume = lastVol || 0.85;
      volFill.style.width = (audio.volume * 100) + '%';
    } else {
      lastVol = audio.volume;
      audio.muted = true;
      volFill.style.width = '0%';
    }
  });

  volTrack.addEventListener('click', (e) => {
    const r = volTrack.getBoundingClientRect();
    const v = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    audio.muted = false;
    audio.volume = v;
    volFill.style.width = (v * 100) + '%';
  });
})();
</script>
</body>
</html>`;
}

function formatClock(sec) {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ":" + (s < 10 ? "0" : "") + s;
}

function escHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
