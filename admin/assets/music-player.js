/**
 * Thunder House ENT - Unified DJ Audio Player Engine
 * Handles internal staff streaming, live preview auditioning, and 1-click downloads.
 */

(function () {
  'use strict';

  class ThunderPlayerEngine {
    constructor() {
      this.audio = new Audio();
      this.currentTrack = null;
      this.currentVersion = 'clean'; // 'clean' or 'dirty'
      this.isPlaying = false;
      this.isInitialized = false;

      this.initEvents();
    }

    init() {
      if (this.isInitialized) return;
      this.renderDockDOM();
      this.bindDOMEvents();
      this.isInitialized = true;
    }

    renderDockDOM() {
      if (document.getElementById('thunder-player-dock')) return;

      const dock = document.createElement('div');
      dock.id = 'thunder-player-dock';
      dock.className = 'thunder-player-dock';
      dock.innerHTML = `
        <!-- Track Info -->
        <div class="tp-track-info">
          <div class="tp-art-box" id="tp-art-box">
            <div class="tp-eq-bars" id="tp-eq-bars">
              <span class="tp-eq-bar"></span>
              <span class="tp-eq-bar"></span>
              <span class="tp-eq-bar"></span>
              <span class="tp-eq-bar"></span>
            </div>
          </div>
          <div class="tp-meta">
            <div class="tp-title">
              <span id="tp-title-text">Select Track</span>
              <span class="pill" id="tp-version-pill" style="font-size:0.65rem; padding:0.15rem 0.45rem; background:rgba(0,229,255,0.15); color:var(--cyber-cyan, #00e5ff)">CLEAN</span>
            </div>
            <div class="tp-artist" id="tp-artist-text">Thunder House Music Vault</div>
          </div>
        </div>

        <!-- Center Controls -->
        <div class="tp-controls">
          <div class="tp-buttons-row">
            <button class="tp-btn" id="tp-btn-back10" title="Skip Back 10s">
              <i class="fa-solid fa-rotate-left"></i>
            </button>
            <button class="tp-btn tp-btn-play" id="tp-btn-play-toggle" title="Play / Pause">
              <i class="fa-solid fa-play" id="tp-play-icon"></i>
            </button>
            <button class="tp-btn" id="tp-btn-fwd10" title="Skip Forward 10s">
              <i class="fa-solid fa-rotate-right"></i>
            </button>
          </div>
          <div class="tp-progress-row">
            <span class="tp-time" id="tp-time-cur">0:00</span>
            <div class="tp-progress-bar" id="tp-progress-bar">
              <div class="tp-progress-fill" id="tp-progress-fill"></div>
            </div>
            <span class="tp-time" id="tp-time-dur">0:00</span>
          </div>
        </div>

        <!-- Right Actions -->
        <div class="tp-actions">
          <div class="tp-volume-wrap">
            <i class="fa-solid fa-volume-high small muted" id="tp-vol-icon"></i>
            <input type="range" class="tp-vol-slider" id="tp-vol-slider" min="0" max="1" step="0.05" value="0.85">
          </div>
          <a href="#" class="tp-download-btn" id="tp-download-current" download title="Download MP3 to DJ Drive">
            <i class="fa-solid fa-download"></i> <span>Download</span>
          </a>
          <button class="tp-close-btn" id="tp-btn-close" title="Hide Player">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      `;
      document.body.appendChild(dock);
    }

    bindDOMEvents() {
      const btnPlay = document.getElementById('tp-btn-play-toggle');
      const btnBack10 = document.getElementById('tp-btn-back10');
      const btnFwd10 = document.getElementById('tp-btn-fwd10');
      const progressBar = document.getElementById('tp-progress-bar');
      const volSlider = document.getElementById('tp-vol-slider');
      const btnClose = document.getElementById('tp-btn-close');

      if (btnPlay) btnPlay.onclick = () => this.togglePlayPause();
      if (btnBack10) btnBack10.onclick = () => this.skip(-10);
      if (btnFwd10) btnFwd10.onclick = () => this.skip(10);
      if (btnClose) btnClose.onclick = () => this.stopAndHide();

      if (volSlider) {
        volSlider.oninput = (e) => {
          this.audio.volume = parseFloat(e.target.value);
        };
      }

      if (progressBar) {
        progressBar.onclick = (e) => {
          const rect = progressBar.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const ratio = Math.max(0, Math.min(1, clickX / rect.width));
          if (this.audio.duration) {
            this.audio.currentTime = ratio * this.audio.duration;
          }
        };
      }
    }

    initEvents() {
      this.audio.addEventListener('play', () => {
        this.isPlaying = true;
        this.updatePlayStateUI(true);
      });

      this.audio.addEventListener('pause', () => {
        this.isPlaying = false;
        this.updatePlayStateUI(false);
      });

      this.audio.addEventListener('ended', () => {
        this.isPlaying = false;
        this.updatePlayStateUI(false);
        const fill = document.getElementById('tp-progress-fill');
        if (fill) fill.style.width = '0%';
      });

      this.audio.addEventListener('timeupdate', () => {
        if (!this.audio.duration) return;
        const cur = this.audio.currentTime;
        const dur = this.audio.duration;
        const pct = (cur / dur) * 100;

        const curEl = document.getElementById('tp-time-cur');
        const durEl = document.getElementById('tp-time-dur');
        const fillEl = document.getElementById('tp-progress-fill');

        if (curEl) curEl.textContent = this.formatTime(cur);
        if (durEl) durEl.textContent = this.formatTime(dur);
        if (fillEl) fillEl.style.width = `${pct}%`;
      });

      this.audio.addEventListener('error', (err) => {
        console.warn('Audio playback error:', err);
        if (window.showToast) {
          window.showToast('Audio stream connecting or falling back to preview…', 'info');
        }
      });
    }

    async resolveTrack(trackOrId) {
      if (typeof trackOrId === 'object' && trackOrId !== null) {
        return trackOrId;
      }
      if (window.musicTracks && Array.isArray(window.musicTracks)) {
        const found = window.musicTracks.find(t => t.id === trackOrId);
        if (found) return found;
      }
      if (window.supabaseClient) {
        const { data } = await window.supabaseClient
          .from('thunderhouse_music_scout')
          .select('*')
          .eq('id', trackOrId)
          .maybeSingle();
        if (data) return data;
      }
      return null;
    }

    async play(trackOrId, version = 'clean') {
      this.init();
      const track = await this.resolveTrack(trackOrId);
      if (!track) {
        alert('Could not find track data to play.');
        return;
      }

      this.currentTrack = track;
      this.currentVersion = version.toLowerCase();

      // Update Track info on Dock
      const dock = document.getElementById('thunder-player-dock');
      const titleEl = document.getElementById('tp-title-text');
      const artistEl = document.getElementById('tp-artist-text');
      const pillEl = document.getElementById('tp-version-pill');
      const dlBtn = document.getElementById('tp-download-current');

      if (dock) dock.classList.add('active');
      if (titleEl) titleEl.textContent = track.title || 'Untitled';
      if (artistEl) artistEl.textContent = `${track.artist || 'Unknown'} · ${track.genre || 'Hip-Hop'}`;

      if (pillEl) {
        if (this.currentVersion === 'dirty') {
          pillEl.textContent = 'DIRTY (EXPLICIT)';
          pillEl.style.background = 'rgba(255, 0, 85, 0.2)';
          pillEl.style.color = 'var(--secondary, #ff0055)';
        } else {
          pillEl.textContent = 'CLEAN (RADIO)';
          pillEl.style.background = 'rgba(16, 185, 129, 0.2)';
          pillEl.style.color = 'var(--success, #10b981)';
        }
      }

      // Resolve audio stream URL
      let streamUrl = null;
      const storagePath = this.currentVersion === 'dirty' ? track.dirty_storage_path : track.clean_storage_path;

      if (storagePath && window.supabaseClient) {
        try {
          const { data } = window.supabaseClient.storage
            .from('music-vault')
            .getPublicUrl(storagePath);
          if (data && data.publicUrl) {
            streamUrl = data.publicUrl;
          }
        } catch (e) {
          console.warn('Error resolving public audio stream:', e);
        }
      }

      // Fallback preview stream if not yet pushed to cloud storage
      if (!streamUrl) {
        streamUrl = track.preview_audio_url || track.stream_url;
      }

      // Set Download Link
      if (dlBtn) {
        if (streamUrl) {
          dlBtn.href = streamUrl;
          const cleanTitle = (track.title || 'Track').replace(/\[.*?\]/g, '').trim();
          dlBtn.setAttribute('download', `${track.artist} - ${cleanTitle} (${version.toUpperCase()}).mp3`);
          dlBtn.style.display = 'inline-flex';
        } else {
          dlBtn.style.display = 'none';
        }
      }

      if (!streamUrl) {
        if (window.showToast) {
          window.showToast(`Track "${track.title}" is located in your Studio PC folder: ${track.clean_file_path || 'E:\\Thunder House - Music'}`, 'info');
        } else {
          alert(`Track is saved locally in: ${track.clean_file_path || 'E:\\Thunder House - Music'}`);
        }
        return;
      }

      // Play stream
      try {
        this.audio.src = streamUrl;
        await this.audio.play();
      } catch (err) {
        console.warn('Playback error:', err);
      }
    }

    async download(trackOrId, version = 'clean') {
      const track = await this.resolveTrack(trackOrId);
      if (!track) return;

      const storagePath = version.toLowerCase() === 'dirty' ? track.dirty_storage_path : track.clean_storage_path;
      let downloadUrl = null;

      if (storagePath && window.supabaseClient) {
        try {
          const { data } = window.supabaseClient.storage
            .from('music-vault')
            .getPublicUrl(storagePath);
          if (data && data.publicUrl) {
            downloadUrl = data.publicUrl;
          }
        } catch (e) {}
      }

      if (!downloadUrl) {
        downloadUrl = track.preview_audio_url || track.stream_url;
      }

      if (downloadUrl) {
        const a = document.createElement('a');
        a.href = downloadUrl;
        const cleanTitle = (track.title || 'Track').replace(/\[.*?\]/g, '').trim();
        a.download = `${track.artist} - ${cleanTitle} (${version.toUpperCase()}).mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (window.showToast) window.showToast(`Downloading ${version.toUpperCase()} track…`, 'success');
      } else {
        alert(`This file is located on your Studio PC at:\n${track.clean_file_path || track.dirty_file_path || 'E:\\Thunder House - Music\\Music of the Week'}`);
      }
    }

    togglePlayPause() {
      if (!this.audio.src) return;
      if (this.isPlaying) {
        this.audio.pause();
      } else {
        this.audio.play();
      }
    }

    skip(seconds) {
      if (!this.audio.duration) return;
      this.audio.currentTime = Math.max(0, Math.min(this.audio.duration, this.audio.currentTime + seconds));
    }

    stopAndHide() {
      this.audio.pause();
      this.audio.currentTime = 0;
      const dock = document.getElementById('thunder-player-dock');
      if (dock) dock.classList.remove('active');
      this.updatePlayStateUI(false);
    }

    updatePlayStateUI(isPlaying) {
      const dock = document.getElementById('thunder-player-dock');
      const icon = document.getElementById('tp-play-icon');

      if (dock) {
        dock.classList.toggle('playing', isPlaying);
      }
      if (icon) {
        icon.className = isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';
      }

      // Dispatch custom event for UI buttons across the page
      window.dispatchEvent(new CustomEvent('thunderplayer:statechange', {
        detail: {
          isPlaying: isPlaying,
          track: this.currentTrack,
          version: this.currentVersion
        }
      }));
    }

    formatTime(seconds) {
      if (isNaN(seconds)) return '0:00';
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    }
  }

  // Global singleton instance
  window.ThunderPlayer = new ThunderPlayerEngine();

  // Auto-init on page load
  document.addEventListener('DOMContentLoaded', () => {
    window.ThunderPlayer.init();
  });
})();
