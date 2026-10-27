/**
 * Thunder House ENT - Superuser Live Visual Site Editor & Settings Loader
 * 
 * 1. For all visitors: Loads customized titles, texts, and color themes saved by the superuser.
 * 2. For superusers: Provides floating Live Editor bar, live contenteditable text editing,
 *    and real-time color palette customization with 1-click cloud sync to Supabase.
 */

(function() {
  'use strict';

  // Global editor state
  let isSuperuser = false;
  let isEditModeActive = false;
  let currentSiteSettings = {
    texts: {},
    colors: {}
  };

  const DEFAULT_COLORS = {
    '--primary': '#00e5ff',
    '--secondary': '#ff0055',
    '--accent-gold': '#ffb703',
    '--bg-main': '#07090e',
    '--bg-surface': '#0e121b'
  };

  const COLOR_PRESETS = [
    {
      name: 'Thunder Neon (Default)',
      primary: '#00e5ff',
      secondary: '#ff0055',
      gold: '#ffb703',
      bgMain: '#07090e',
      bgSurface: '#0e121b'
    },
    {
      name: 'Electric Purple & Cyan',
      primary: '#8b5cf6',
      secondary: '#00f0ff',
      gold: '#f59e0b',
      bgMain: '#090812',
      bgSurface: '#120f24'
    },
    {
      name: 'Gold Luxury & Midnight',
      primary: '#ffb703',
      secondary: '#f43f5e',
      gold: '#fbbf24',
      bgMain: '#0c0d10',
      bgSurface: '#161920'
    },
    {
      name: 'Cyber Emerald',
      primary: '#10b981',
      secondary: '#06b6d4',
      gold: '#f59e0b',
      bgMain: '#06100d',
      bgSurface: '#0e1e19'
    },
    {
      name: 'Crimson Sunset',
      primary: '#ff3366',
      secondary: '#ff9900',
      gold: '#ffcc00',
      bgMain: '#10070a',
      bgSurface: '#1f0d14'
    }
  ];

  document.addEventListener('DOMContentLoaded', async () => {
    // 1. Auto-tag key editable elements if not already tagged
    autoTagEditableElements();

    // 2. Load public settings from Supabase
    await loadPublicSiteSettings();

    // 3. Verify if current user is superuser
    await verifySuperuserAccess();
  });

  /* =========================================================================
     1. AUTO-TAGGING EDITABLE ELEMENTS
     ========================================================================= */
  function autoTagEditableElements() {
    // Tag all major headings, tags, and section descriptions
    const selectors = [
      '.top-bar-left span',
      '.hero-title',
      '.hero-subtitle',
      '.hero-content .badge-pill',
      '.trust-text strong',
      '.trust-text span',
      '.section-tag',
      '.section-title',
      '.section-desc',
      '#about h2',
      '#about p',
      '.service-title',
      '.service-text',
      '.package-name',
      '.package-price .amount',
      '.package-tagline',
      '.package-features li',
      '.calc-header h2',
      '.calc-header p',
      '.audio-player-card h3',
      '.footer-brand p'
    ];

    let counter = 1;
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (!el.hasAttribute('data-edit-key')) {
          // Create a deterministic key from selector + counter
          const cleanSel = sel.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').toLowerCase();
          el.setAttribute('data-edit-key', `${cleanSel}_${counter++}`);
        }
      });
    });
  }

  /* =========================================================================
     2. PUBLIC SITE SETTINGS LOADER
     ========================================================================= */
  async function loadPublicSiteSettings() {
    if (!window.supabaseClient) return;

    try {
      const { data, error } = await window.supabaseClient
        .from('thunderhouse_site_settings')
        .select('value')
        .eq('key', 'site_overrides')
        .maybeSingle();

      if (error) {
        console.warn('Could not load site overrides from Supabase:', error);
        return;
      }

      if (data && data.value) {
        currentSiteSettings = {
          texts: data.value.texts || {},
          colors: data.value.colors || {}
        };

        // Apply colors
        applyColors(currentSiteSettings.colors);

        // Apply texts
        applyTexts(currentSiteSettings.texts);

        // Check Coming Soon / Under Construction Mode
        if (data.value.coming_soon && data.value.coming_soon.enabled) {
          await checkComingSoonMode(data.value.coming_soon);
        }
      }
    } catch (err) {
      console.warn('Site settings loader exception:', err);
    }
  }

  async function checkComingSoonMode(csConfig) {
    if (!csConfig || !csConfig.enabled) return;
    if (window.location.pathname.endsWith('coming-soon.html')) return;

    const urlParams = new URLSearchParams(window.location.search);
    const hasBypass = urlParams.get('bypass') === '1' || urlParams.get('preview') === '1' || urlParams.get('edit') === '1';

    let isSuper = false;
    if (window.supabaseClient) {
      try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session) {
          const email = (session.user?.email || '').toLowerCase();
          if (email === 'blackrader@gmail.com' || email === 'olifedigital@gmail.com') {
            isSuper = true;
          } else {
            const { data: roleData } = await window.supabaseClient.rpc('admin_get_current_role');
            if (roleData && roleData.is_superuser) isSuper = true;
          }
        }
      } catch (e) {}
    }

    if (hasBypass || isSuper) {
      mountComingSoonBypassBanner(csConfig);
      return;
    }

    // Public visitor -> redirect to stylized coming-soon.html
    window.location.replace('coming-soon.html');
  }

  function mountComingSoonBypassBanner(csConfig) {
    if (document.getElementById('th-cs-bypass-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'th-cs-bypass-bar';
    bar.innerHTML = `
      <div style="position:fixed; top:0; left:0; right:0; z-index:999999; background:linear-gradient(90deg, #ff0055, #ffb703); color:#000; font-family:'Outfit', sans-serif; font-size:0.82rem; font-weight:700; padding:0.45rem 1.25rem; display:flex; justify-content:space-between; align-items:center; box-shadow:0 6px 20px rgba(0,0,0,0.5)">
        <div style="display:flex; align-items:center; gap:0.6rem">
          <i class="fa-solid fa-person-digging" style="font-size:1.1rem"></i>
          <span><strong>UNDER CONSTRUCTION MODE ACTIVE</strong> — Public visitors see the Coming Soon splash screen. You are browsing in Superuser Bypass.</span>
        </div>
        <div style="display:flex; gap:0.5rem; align-items:center">
          <a href="coming-soon.html" target="_blank" style="background:#000; color:#00e5ff; padding:0.2rem 0.6rem; border-radius:4px; text-decoration:none; font-size:0.75rem"><i class="fa-solid fa-eye"></i> View Public Splash</a>
          <a href="admin/settings.html#website" style="background:#fff; color:#000; padding:0.2rem 0.6rem; border-radius:4px; text-decoration:none; font-size:0.75rem"><i class="fa-solid fa-sliders"></i> Settings</a>
        </div>
      </div>
    `;
    document.body.prepend(bar);
    document.body.style.paddingTop = (parseInt(document.body.style.paddingTop || '0') + 38) + 'px';
  }

  function applyColors(colors) {
    if (!colors) return;
    for (const [prop, val] of Object.entries(colors)) {
      if (val) {
        document.documentElement.style.setProperty(prop, val);
        // If updating primary or secondary, update glows as well
        if (prop === '--primary') {
          document.documentElement.style.setProperty('--primary-glow', hexToRgba(val, 0.45));
          document.documentElement.style.setProperty('--border-glow', hexToRgba(val, 0.35));
        } else if (prop === '--secondary') {
          document.documentElement.style.setProperty('--secondary-glow', hexToRgba(val, 0.4));
        } else if (prop === '--accent-gold') {
          document.documentElement.style.setProperty('--border-gold', hexToRgba(val, 0.35));
        }
      }
    }
  }

  function applyTexts(texts) {
    if (!texts) return;
    for (const [key, htmlContent] of Object.entries(texts)) {
      const el = document.querySelector(`[data-edit-key="${key}"]`);
      if (el && htmlContent !== undefined && htmlContent !== null) {
        el.innerHTML = htmlContent;
      }
    }
  }

  /* =========================================================================
     3. SUPERUSER AUTH & ROLE VERIFICATION
     ========================================================================= */
  async function verifySuperuserAccess() {
    if (!window.supabaseClient) return;

    try {
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      if (!session) return;

      // Verify superuser role via RPC
      const { data: roleData, error } = await window.supabaseClient.rpc('admin_get_current_role');
      
      let isSuper = false;
      if (!error && roleData && roleData.authenticated) {
        isSuper = roleData.is_superuser === true;
      } else {
        const email = (session.user.email || '').toLowerCase();
        isSuper = (email === 'blackrader@gmail.com' || email === 'olifedigital@gmail.com');
      }

      if (isSuper) {
        isSuperuser = true;
        mountSuperuserEditor();
      }
    } catch (err) {
      console.warn('Superuser auth check failed:', err);
    }
  }

  /* =========================================================================
     4. MOUNT SUPERUSER VISUAL EDITOR
     ========================================================================= */
  function mountSuperuserEditor() {
    // Check if Edit Mode was enabled in localStorage or URL query
    const urlParams = new URLSearchParams(window.location.search);
    const urlEdit = urlParams.get('edit_mode');
    const localEdit = localStorage.getItem('th_edit_mode');
    
    if (urlEdit === 'true' || urlEdit === '1' || localEdit === 'true') {
      isEditModeActive = true;
    }

    // Inject Editor Styles
    injectEditorStyles();

    // Inject Floating Editor Bar
    injectEditorBar();

    // Inject Color Palette Modal
    injectColorPaletteModal();

    // Apply initial edit state
    updateEditModeState(isEditModeActive);
  }

  function injectEditorStyles() {
    const style = document.createElement('style');
    style.id = 'th-editor-styles';
    style.innerHTML = `
      /* Superuser Visual Editor Bar */
      .th-editor-bar {
        position: fixed;
        bottom: 1.5rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 999999;
        background: rgba(14, 18, 28, 0.95);
        border: 1px solid var(--primary);
        border-radius: 999px;
        padding: 0.65rem 1.25rem;
        box-shadow: 0 15px 45px rgba(0, 0, 0, 0.9), 0 0 25px var(--primary-glow);
        display: flex;
        align-items: center;
        gap: 1.25rem;
        backdrop-filter: blur(25px);
        font-family: var(--font-body);
        color: #fff;
        max-width: 95vw;
        animation: thSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes thSlideUp {
        from { transform: translate(-50%, 80px); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }
      @media (max-width: 768px) {
        .th-editor-bar {
          bottom: 0.75rem;
          padding: 0.5rem 0.85rem;
          gap: 0.75rem;
          flex-wrap: wrap;
          justify-content: center;
        }
      }
      .th-editor-brand {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-family: var(--font-heading);
        font-weight: 800;
        font-size: 0.88rem;
        color: #fff;
        white-space: nowrap;
      }
      .th-toggle-wrapper {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--border-subtle);
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        font-size: 0.82rem;
        font-weight: 700;
        cursor: pointer;
        user-select: none;
      }
      .th-toggle-switch {
        position: relative;
        width: 38px;
        height: 20px;
        display: inline-block;
      }
      .th-toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .th-toggle-slider {
        position: absolute;
        cursor: pointer;
        inset: 0;
        background-color: rgba(255, 255, 255, 0.2);
        transition: .3s;
        border-radius: 20px;
      }
      .th-toggle-slider:before {
        position: absolute;
        content: "";
        height: 14px;
        width: 14px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: .3s;
        border-radius: 50%;
      }
      .th-toggle-switch input:checked + .th-toggle-slider {
        background-color: var(--primary);
        box-shadow: 0 0 10px var(--primary-glow);
      }
      .th-toggle-switch input:checked + .th-toggle-slider:before {
        transform: translateX(18px);
        background-color: #07090e;
      }
      .th-editor-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      /* Live Edit Highlights */
      body.th-edit-mode [data-edit-key] {
        position: relative;
        outline: 2px dashed rgba(0, 229, 255, 0.45);
        outline-offset: 4px;
        border-radius: 4px;
        cursor: text !important;
        transition: outline 0.2s ease, background 0.2s ease;
      }
      body.th-edit-mode [data-edit-key]:hover {
        outline: 2px solid var(--primary) !important;
        background: rgba(0, 229, 255, 0.08) !important;
      }
      body.th-edit-mode [data-edit-key]:focus {
        outline: 2px solid var(--primary) !important;
        background: rgba(0, 229, 255, 0.12) !important;
        box-shadow: 0 0 20px var(--primary-glow);
      }

      /* Color Palette Modal */
      .th-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(12px);
        z-index: 1000000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }
      .th-modal-overlay.active {
        opacity: 1;
        pointer-events: auto;
      }
      .th-modal-dialog {
        background: var(--bg-surface);
        border: 1px solid var(--primary);
        border-radius: var(--radius-lg);
        max-width: 580px;
        width: 100%;
        padding: 2rem;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95), 0 0 35px var(--primary-glow);
        position: relative;
        max-height: 90vh;
        overflow-y: auto;
      }
      .th-color-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        margin-bottom: 0.75rem;
      }
      .th-color-input-wrap {
        display: flex;
        align-items: center;
        gap: 0.65rem;
      }
      .th-color-picker {
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        background: none;
      }
      .th-color-picker::-webkit-color-swatch-wrapper {
        padding: 0;
      }
      .th-color-picker::-webkit-color-swatch {
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
      }
      .th-preset-chip {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--border-subtle);
        color: #fff;
        padding: 0.4rem 0.85rem;
        border-radius: 999px;
        font-size: 0.78rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
      }
      .th-preset-chip:hover {
        border-color: var(--primary);
        background: rgba(0, 229, 255, 0.15);
      }
      .th-preset-dots {
        display: flex;
        gap: 3px;
      }
      .th-preset-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }
    `;
    document.head.appendChild(style);
  }

  function injectEditorBar() {
    const bar = document.createElement('div');
    bar.id = 'th-superuser-editor-bar';
    bar.className = 'th-editor-bar';

    bar.innerHTML = `
      <div class="th-editor-brand">
        <i class="fa-solid fa-crown" style="color: var(--accent-gold);"></i>
        <span>Live Site Editor</span>
      </div>

      <label class="th-toggle-wrapper" title="Toggle Live Inline Editing">
        <span class="th-toggle-switch">
          <input type="checkbox" id="th-edit-mode-checkbox" ${isEditModeActive ? 'checked' : ''}>
          <span class="th-toggle-slider"></span>
        </span>
        <span id="th-edit-mode-status" style="color: ${isEditModeActive ? 'var(--primary)' : 'var(--text-muted)'};">
          ${isEditModeActive ? 'Editing ON' : 'Editing OFF'}
        </span>
      </label>

      <div class="th-editor-actions">
        <button type="button" class="btn btn-outline btn-sm" id="btn-open-palette" title="Customize Brand Colors">
          <i class="fa-solid fa-palette" style="color: var(--primary);"></i> Colors
        </button>

        <button type="button" class="btn btn-primary btn-sm" id="btn-save-site-edits" title="Save All Changes Live to Supabase">
          <i class="fa-solid fa-floppy-disk"></i> Save Live
        </button>

        <button type="button" class="btn btn-outline btn-sm" id="btn-reset-edits" style="color: #ff99bb; border-color: rgba(255, 0, 85, 0.3);" title="Reset to Defaults">
          <i class="fa-solid fa-rotate-left"></i>
        </button>

        <a href="admin.html" class="btn btn-outline btn-sm" title="Back to Admin Dashboard">
          <i class="fa-solid fa-gauge"></i> Admin
        </a>
      </div>
    `;

    document.body.appendChild(bar);

    // Event listeners
    const checkbox = document.getElementById('th-edit-mode-checkbox');
    checkbox.addEventListener('change', (e) => {
      updateEditModeState(e.target.checked);
    });

    document.getElementById('btn-open-palette').addEventListener('click', () => {
      openColorPaletteModal();
    });

    document.getElementById('btn-save-site-edits').addEventListener('click', () => {
      saveAllSiteEdits();
    });

    document.getElementById('btn-reset-edits').addEventListener('click', () => {
      resetSiteOverrides();
    });
  }

  function updateEditModeState(active) {
    isEditModeActive = active;
    localStorage.setItem('th_edit_mode', active ? 'true' : 'false');

    const statusEl = document.getElementById('th-edit-mode-status');
    const checkbox = document.getElementById('th-edit-mode-checkbox');
    if (checkbox) checkbox.checked = active;

    if (active) {
      document.body.classList.add('th-edit-mode');
      if (statusEl) {
        statusEl.textContent = 'Editing ON';
        statusEl.style.color = 'var(--primary)';
      }
      // Enable contenteditable on all elements with data-edit-key
      document.querySelectorAll('[data-edit-key]').forEach(el => {
        el.setAttribute('contenteditable', 'true');
      });
      showEditorToast('⚡ Edit Mode Active: Click any title or text to edit directly.');
    } else {
      document.body.classList.remove('th-edit-mode');
      if (statusEl) {
        statusEl.textContent = 'Editing OFF';
        statusEl.style.color = 'var(--text-muted)';
      }
      // Disable contenteditable
      document.querySelectorAll('[data-edit-key]').forEach(el => {
        el.removeAttribute('contenteditable');
      });
    }
  }

  /* =========================================================================
     5. COLOR PALETTE MODAL & LIVE CSS VARIABLE UPDATES
     ========================================================================= */
  function injectColorPaletteModal() {
    const modal = document.createElement('div');
    modal.id = 'th-color-palette-modal';
    modal.className = 'th-modal-overlay';

    modal.innerHTML = `
      <div class="th-modal-dialog">
        <button type="button" class="modal-close-btn" id="th-palette-close">&times;</button>
        
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem;">
          <div class="kpi-icon" style="background: rgba(0, 229, 255, 0.15); color: var(--primary); width: 42px; height: 42px; font-size: 1.15rem;">
            <i class="fa-solid fa-palette"></i>
          </div>
          <div>
            <h3 style="font-size: 1.35rem; color: #fff; margin: 0;">Live Theme & Colors</h3>
            <span style="font-size: 0.82rem; color: var(--text-muted);">Adjust site colors with real-time preview</span>
          </div>
        </div>

        <!-- Presets -->
        <div style="margin-bottom: 1.5rem;">
          <label class="form-label" style="margin-bottom: 0.65rem;">Quick Color Themes</label>
          <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;" id="th-presets-container">
            <!-- Rendered dynamically -->
          </div>
        </div>

        <!-- Color Sliders/Pickers -->
        <div style="margin-bottom: 1.75rem;">
          <label class="form-label" style="margin-bottom: 0.65rem;">Custom Color Controls</label>
          
          <div class="th-color-row">
            <div>
              <strong style="color: #fff; display: block; font-size: 0.88rem;">Primary Neon Glow</strong>
              <small style="color: var(--text-muted); font-size: 0.75rem;">Main buttons, accents, icons</small>
            </div>
            <div class="th-color-input-wrap">
              <input type="color" id="picker-primary" class="th-color-picker" value="${getColorVal('--primary', '#00e5ff')}">
              <span id="label-primary" style="font-size: 0.82rem; font-family: monospace;">#00e5ff</span>
            </div>
          </div>

          <div class="th-color-row">
            <div>
              <strong style="color: #fff; display: block; font-size: 0.88rem;">Secondary Accent</strong>
              <small style="color: var(--text-muted); font-size: 0.75rem;">Gradients, secondary highlights</small>
            </div>
            <div class="th-color-input-wrap">
              <input type="color" id="picker-secondary" class="th-color-picker" value="${getColorVal('--secondary', '#ff0055')}">
              <span id="label-secondary" style="font-size: 0.82rem; font-family: monospace;">#ff0055</span>
            </div>
          </div>

          <div class="th-color-row">
            <div>
              <strong style="color: #fff; display: block; font-size: 0.88rem;">Gold Highlight</strong>
              <small style="color: var(--text-muted); font-size: 0.75rem;">Stars, rating pills, gold buttons</small>
            </div>
            <div class="th-color-input-wrap">
              <input type="color" id="picker-accent-gold" class="th-color-picker" value="${getColorVal('--accent-gold', '#ffb703')}">
              <span id="label-accent-gold" style="font-size: 0.82rem; font-family: monospace;">#ffb703</span>
            </div>
          </div>

          <div class="th-color-row">
            <div>
              <strong style="color: #fff; display: block; font-size: 0.88rem;">Background Canvas</strong>
              <small style="color: var(--text-muted); font-size: 0.75rem;">Main page background</small>
            </div>
            <div class="th-color-input-wrap">
              <input type="color" id="picker-bg-main" class="th-color-picker" value="${getColorVal('--bg-main', '#07090e')}">
              <span id="label-bg-main" style="font-size: 0.82rem; font-family: monospace;">#07090e</span>
            </div>
          </div>

          <div class="th-color-row">
            <div>
              <strong style="color: #fff; display: block; font-size: 0.88rem;">Card / Surface Dark</strong>
              <small style="color: var(--text-muted); font-size: 0.75rem;">Cards, panels, modal dialogs</small>
            </div>
            <div class="th-color-input-wrap">
              <input type="color" id="picker-bg-surface" class="th-color-picker" value="${getColorVal('--bg-surface', '#0e121b')}">
              <span id="label-bg-surface" style="font-size: 0.82rem; font-family: monospace;">#0e121b</span>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.75rem;">
          <button type="button" class="btn btn-outline btn-sm" id="btn-palette-reset-colors" style="color: #ff99bb;">
            Reset Colors to Default
          </button>
          <div style="display: flex; gap: 0.75rem;">
            <button type="button" class="btn btn-outline btn-sm" id="btn-palette-close-action">Done</button>
            <button type="button" class="btn btn-primary btn-sm" id="btn-palette-save-action">
              <i class="fa-solid fa-floppy-disk"></i> Save Live
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Populate Presets
    const presetsContainer = document.getElementById('th-presets-container');
    COLOR_PRESETS.forEach(preset => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'th-preset-chip';
      chip.innerHTML = `
        <div class="th-preset-dots">
          <span class="th-preset-dot" style="background: ${preset.primary};"></span>
          <span class="th-preset-dot" style="background: ${preset.secondary};"></span>
          <span class="th-preset-dot" style="background: ${preset.gold};"></span>
        </div>
        <span>${preset.name}</span>
      `;
      chip.addEventListener('click', () => {
        applyPresetTheme(preset);
      });
      presetsContainer.appendChild(chip);
    });

    // Color pickers listeners
    setupPickerListener('picker-primary', '--primary', 'label-primary');
    setupPickerListener('picker-secondary', '--secondary', 'label-secondary');
    setupPickerListener('picker-accent-gold', '--accent-gold', 'label-accent-gold');
    setupPickerListener('picker-bg-main', '--bg-main', 'label-bg-main');
    setupPickerListener('picker-bg-surface', '--bg-surface', 'label-bg-surface');

    // Close actions
    document.getElementById('th-palette-close').addEventListener('click', closeColorPaletteModal);
    document.getElementById('btn-palette-close-action').addEventListener('click', closeColorPaletteModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeColorPaletteModal();
    });

    document.getElementById('btn-palette-save-action').addEventListener('click', async () => {
      closeColorPaletteModal();
      await saveAllSiteEdits();
    });

    document.getElementById('btn-palette-reset-colors').addEventListener('click', () => {
      applyPresetTheme(COLOR_PRESETS[0]);
    });
  }

  function getColorVal(prop, fallback) {
    const computed = getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
    if (computed && computed.startsWith('#')) return computed;
    return fallback;
  }

  function setupPickerListener(pickerId, cssVar, labelId) {
    const input = document.getElementById(pickerId);
    const label = document.getElementById(labelId);
    if (!input) return;

    input.addEventListener('input', (e) => {
      const val = e.target.value;
      if (label) label.textContent = val;
      const patch = {};
      patch[cssVar] = val;
      applyColors(patch);
      currentSiteSettings.colors[cssVar] = val;
    });
  }

  function applyPresetTheme(preset) {
    const patch = {
      '--primary': preset.primary,
      '--secondary': preset.secondary,
      '--accent-gold': preset.gold,
      '--bg-main': preset.bgMain,
      '--bg-surface': preset.bgSurface
    };

    applyColors(patch);
    Object.assign(currentSiteSettings.colors, patch);

    // Update UI pickers
    const p1 = document.getElementById('picker-primary'); if (p1) p1.value = preset.primary;
    const l1 = document.getElementById('label-primary'); if (l1) l1.textContent = preset.primary;

    const p2 = document.getElementById('picker-secondary'); if (p2) p2.value = preset.secondary;
    const l2 = document.getElementById('label-secondary'); if (l2) l2.textContent = preset.secondary;

    const p3 = document.getElementById('picker-accent-gold'); if (p3) p3.value = preset.gold;
    const l3 = document.getElementById('label-accent-gold'); if (l3) l3.textContent = preset.gold;

    const p4 = document.getElementById('picker-bg-main'); if (p4) p4.value = preset.bgMain;
    const l4 = document.getElementById('label-bg-main'); if (l4) l4.textContent = preset.bgMain;

    const p5 = document.getElementById('picker-bg-surface'); if (p5) p5.value = preset.bgSurface;
    const l5 = document.getElementById('label-bg-surface'); if (l5) l5.textContent = preset.bgSurface;

    showEditorToast(`Theme updated to "${preset.name}". Click "Save Live" to persist.`);
  }

  function openColorPaletteModal() {
    const modal = document.getElementById('th-color-palette-modal');
    if (modal) modal.classList.add('active');
  }

  function closeColorPaletteModal() {
    const modal = document.getElementById('th-color-palette-modal');
    if (modal) modal.classList.remove('active');
  }

  /* =========================================================================
     6. SAVE ALL EDITS LIVE TO SUPABASE
     ========================================================================= */
  async function saveAllSiteEdits() {
    if (!window.supabaseClient || !isSuperuser) {
      alert('Unauthorized: Only superusers can save site customizations.');
      return;
    }

    const saveBtn = document.getElementById('btn-save-site-edits');
    const originalText = saveBtn ? saveBtn.innerHTML : '';
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    }

    try {
      // 1. Gather all edited texts
      const texts = {};
      document.querySelectorAll('[data-edit-key]').forEach(el => {
        const key = el.getAttribute('data-edit-key');
        if (key) {
          texts[key] = el.innerHTML.trim();
        }
      });

      // 2. Gather active colors
      const colors = { ...currentSiteSettings.colors };

      // 3. Save via Superuser RPC
      const payload = { texts, colors };
      const { data, error } = await window.supabaseClient.rpc('admin_save_site_settings', {
        p_settings: payload
      });

      if (error) throw error;

      currentSiteSettings = payload;
      showEditorToast('✨ All website titles, texts & colors saved live to Supabase!');
    } catch (err) {
      alert('Failed to save website changes: ' + err.message);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
      }
    }
  }

  /* =========================================================================
     7. RESET SITE OVERRIDES
     ========================================================================= */
  async function resetSiteOverrides() {
    if (!confirm('Are you sure you want to reset all customized titles and colors back to site defaults?')) return;

    try {
      const { error } = await window.supabaseClient.rpc('admin_save_site_settings', {
        p_settings: { texts: {}, colors: {} }
      });

      if (error) throw error;

      localStorage.removeItem('th_edit_mode');
      alert('Site customizations cleared. Reloading page...');
      window.location.href = window.location.pathname;
    } catch (err) {
      alert('Failed to reset: ' + err.message);
    }
  }

  /* =========================================================================
     8. UTILITIES
     ========================================================================= */
  function hexToRgba(hex, alpha) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
  }

  function showEditorToast(msg) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg);
      return;
    }
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 1.5rem;
      right: 1.5rem;
      background: rgba(14, 18, 28, 0.95);
      border: 1px solid var(--primary);
      border-radius: 8px;
      padding: 0.75rem 1.25rem;
      color: #fff;
      font-size: 0.88rem;
      box-shadow: 0 10px 30px rgba(0,0,0,0.8), 0 0 20px var(--primary-glow);
      z-index: 10000000;
      animation: thSlideIn 0.3s ease;
    `;
    toast.innerHTML = `<i class="fa-solid fa-sparkles" style="color:var(--primary); margin-right:8px;"></i> ${msg}`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s ease';
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

})();
