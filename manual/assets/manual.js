/**
 * Thunder House ENT - Staff Operations Manual JavaScript Engine
 * Manages mode switching (Standard vs. Cyber Portal), Image Lightbox,
 * Real-time Chapter Filtering, and Training Progress tracking.
 */

(function () {
  // 1. Initialize Mode (Default: Standard Knowledge Base; Optional: Cyber Portal)
  const savedMode = localStorage.getItem('th_manual_mode');
  if (savedMode === 'cyber') {
    document.body.classList.add('cyber-portal-mode');
  }

  // 2. Setup Header & Lightbox on DOM Ready
  document.addEventListener('DOMContentLoaded', () => {
    initModeToggle();
    initLightbox();
    initSidebarFilter();
    initTrainingProgress();
  });

  // Mode Toggle Handler
  function initModeToggle() {
    const toggleBtn = document.getElementById('manual-mode-toggle');
    if (!toggleBtn) return;

    if (document.body.classList.contains('cyber-portal-mode')) {
      toggleBtn.classList.add('active');
      toggleBtn.innerHTML = '<i class="fa-solid fa-bolt"></i> <span>Cyber HUD Mode</span>';
    }

    toggleBtn.addEventListener('click', () => {
      const isCyber = document.body.classList.toggle('cyber-portal-mode');
      if (isCyber) {
        localStorage.setItem('th_manual_mode', 'cyber');
        toggleBtn.classList.add('active');
        toggleBtn.innerHTML = '<i class="fa-solid fa-bolt"></i> <span>Cyber HUD Mode</span>';
      } else {
        localStorage.setItem('th_manual_mode', 'standard');
        toggleBtn.classList.remove('active');
        toggleBtn.innerHTML = '<i class="fa-solid fa-book-open"></i> <span>Standard Mode</span>';
      }
    });
  }

  // Lightbox Handler
  function initLightbox() {
    // Create lightbox element if not present
    let lightbox = document.getElementById('manual-lightbox');
    if (!lightbox) {
      lightbox = document.createElement('div');
      lightbox.id = 'manual-lightbox';
      lightbox.className = 'manual-lightbox';
      lightbox.innerHTML = `
        <div class="lightbox-content">
          <img id="lightbox-img" src="" alt="Enlarged screenshot">
          <div class="lightbox-caption" id="lightbox-cap"></div>
        </div>
      `;
      document.body.appendChild(lightbox);

      lightbox.addEventListener('click', () => {
        lightbox.classList.remove('active');
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') lightbox.classList.remove('active');
      });
    }

    // Bind all figure screenshot clicks
    document.querySelectorAll('.manual-figure-img-wrap').forEach((wrap) => {
      wrap.addEventListener('click', () => {
        const img = wrap.querySelector('img');
        const figure = wrap.closest('.manual-figure');
        const caption = figure ? figure.querySelector('.manual-caption') : null;

        if (img) {
          const lImg = document.getElementById('lightbox-img');
          const lCap = document.getElementById('lightbox-cap');
          if (lImg) lImg.src = img.src;
          if (lCap) lCap.innerHTML = caption ? caption.innerHTML : '';
          lightbox.classList.add('active');
        }
      });
    });
  }

  // Live Chapter Search
  function initSidebarFilter() {
    const input = document.getElementById('sidebar-search');
    if (!input) return;

    input.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('.chapter-link').forEach((link) => {
        const text = link.textContent.toLowerCase();
        link.style.display = text.includes(q) ? 'flex' : 'none';
      });
    });
  }

  // Training Progress Tracking
  function initTrainingProgress() {
    const pageId = document.body.dataset.chapterId;
    if (!pageId) return;

    let progress = JSON.parse(localStorage.getItem('th_manual_progress') || '{}');
    progress[pageId] = true;
    localStorage.setItem('th_manual_progress', JSON.stringify(progress));

    // Update checkmarks in sidebar
    document.querySelectorAll('.chapter-link').forEach((link) => {
      const cid = link.dataset.chapter;
      if (cid && progress[cid]) {
        let check = link.querySelector('.chap-check');
        if (!check) {
          check = document.createElement('i');
          check.className = 'fa-solid fa-circle-check chap-check';
          check.style.color = 'var(--success)';
          check.style.fontSize = '0.75rem';
          check.style.marginLeft = 'auto';
          link.appendChild(check);
        }
      }
    });
  }
})();
