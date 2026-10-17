/**
 * Thunder House ENT - Main JavaScript Engine
 * Handles Dynamic DJ Calculator, Custom Audio Player, Mix Filtering,
 * FAQ Accordion, Booking Modal & Date Availability Checker
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initCalculator();
  initAudioPlayer();
  initFaqAccordion();
  initBookingForms();
  initStickyQuoteBar();
});

/* ==========================================================================
   1. NAVBAR & MOBILE NAVIGATION
   ========================================================================== */
function initNavbar() {
  const header = document.querySelector('.site-header');
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navMenu = document.querySelector('.nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  // Scroll glass effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // Mobile menu toggle
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      const icon = mobileToggle.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-xmark');
      }
    });

    // Close on link click
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        const icon = mobileToggle.querySelector('i');
        if (icon) {
          icon.classList.add('fa-bars');
          icon.classList.remove('fa-xmark');
        }
      });
    });
  }
}

/* ==========================================================================
   2. DYNAMIC DJ INSTANT QUOTE CALCULATOR
   ========================================================================== */
function initCalculator() {
  // Official Thunder House ENT Packages
  const PACKAGES_CONFIG = {
    basic: {
      name: 'Thunder Basic (Up to 3 Hours)',
      basePrice: 500,
      includedHours: 3,
      features: 'Professional DJ, DJ controller, Pro sound system, Music programming, Basic announcements, Setup & teardown'
    },
    party: {
      name: 'Thunder Party (Up to 4 Hours)',
      basePrice: 700,
      includedHours: 4,
      features: 'DJ + MC service, Pro sound system, Customized programming, Guest requests, Event announcements, Introductions, Host coordination'
    },
    premium: {
      name: 'Thunder Premium (Up to 6 Hours)',
      basePrice: 900,
      includedHours: 6,
      features: 'DJ + MC service, Customized programming, Guest requests, Event announcements, Special music cues, Timeline coordination, Extended coverage'
    },
    allnight: {
      name: 'Thunder All-Night (Up to 8 Hours)',
      basePrice: 1200,
      includedHours: 8,
      features: 'DJ + MC service, Pro sound system, Background/cocktail music, Reception music, Special announcements, Grand introductions, Timeline coordination'
    }
  };

  // Official Thunder House ENT Optional Services
  const ADDONS_CONFIG = {
    ceremony: { name: 'Ceremony Music', price: 150 },
    cocktail: { name: 'Cocktail-Hour Music', price: 100 },
    ceremony_cocktail: { name: 'Ceremony + Cocktail Hour Combo', price: 200 },
    custom_edit: { name: 'Custom Music Edit (First Dance / Mix)', price: 50 },
    special_prep: { name: 'Special Song Preparation', price: 0 } // Included
  };

  const packageRadios = document.querySelectorAll('input[name="calc-package"]');
  const extraHoursSlider = document.getElementById('calc-extra-hours');
  const extraHoursDisplay = document.getElementById('calc-extra-hours-display');
  const travelMilesInput = document.getElementById('calc-travel-miles');
  const addonCheckboxes = document.querySelectorAll('.calc-addon-checkbox');
  
  const estimateDisplay = document.getElementById('calc-total-amount');
  const breakdownList = document.getElementById('calc-breakdown-list');
  const lockQuoteBtn = document.getElementById('btn-lock-quote');

  function calculateQuote() {
    // 1. Get Selected Package
    let selectedPkgKey = 'party';
    packageRadios.forEach(radio => {
      if (radio.checked) selectedPkgKey = radio.value;
    });

    const pkg = PACKAGES_CONFIG[selectedPkgKey] || PACKAGES_CONFIG.party;
    const extraHours = parseInt(extraHoursSlider ? extraHoursSlider.value : 0, 10);
    const extraHoursCost = extraHours * 150; // $150 per additional hour

    // Travel outside OKC ($1/mile)
    let travelMiles = 0;
    if (travelMilesInput && travelMilesInput.value) {
      travelMiles = Math.max(0, parseInt(travelMilesInput.value, 10) || 0);
    }
    const travelCost = travelMiles * 1; // $1/mile

    // 2. Add-ons Calculation
    let addonsTotal = 0;
    const activeAddons = [];

    addonCheckboxes.forEach(cb => {
      const parentItem = cb.closest('.calc-addon-item');
      if (cb.checked) {
        if (parentItem) parentItem.classList.add('selected');
        const key = cb.value;
        if (ADDONS_CONFIG[key]) {
          addonsTotal += ADDONS_CONFIG[key].price;
          activeAddons.push(ADDONS_CONFIG[key]);
        }
      } else {
        if (parentItem) parentItem.classList.remove('selected');
      }
    });

    const grandTotal = pkg.basePrice + extraHoursCost + travelCost + addonsTotal;

    // 3. Update UI displays
    if (extraHoursDisplay) {
      extraHoursDisplay.textContent = extraHours > 0 ? `+${extraHours} Extra Hour(s) (+$${extraHoursCost})` : 'No Extra Hours';
    }
    if (estimateDisplay) {
      estimateDisplay.textContent = `$${grandTotal.toLocaleString()}`;
    }

    // 4. Build Itemized Breakdown
    if (breakdownList) {
      let html = `
        <div class="calc-breakdown-row">
          <span>${pkg.name}</span>
          <span>$${pkg.basePrice.toLocaleString()}</span>
        </div>
      `;

      if (extraHours > 0) {
        html += `
          <div class="calc-breakdown-row">
            <span>Additional Hours (${extraHours} hrs @ $150/hr)</span>
            <span>+$${extraHoursCost}</span>
          </div>
        `;
      }

      if (travelCost > 0) {
        html += `
          <div class="calc-breakdown-row">
            <span>Travel Outside OKC (${travelMiles} miles @ $1/mi)</span>
            <span>+$${travelCost}</span>
          </div>
        `;
      }

      activeAddons.forEach(addon => {
        html += `
          <div class="calc-breakdown-row">
            <span>${addon.name}</span>
            <span>${addon.price === 0 ? 'Included' : '+$' + addon.price}</span>
          </div>
        `;
      });

      html += `
        <div class="calc-breakdown-row total">
          <span>Estimated Total</span>
          <span style="color: var(--primary);">$${grandTotal.toLocaleString()}</span>
        </div>
      `;

      breakdownList.innerHTML = html;
    }

    // Store state in window for easy pre-filling modal
    window.currentQuote = {
      package: pkg.name,
      basePrice: pkg.basePrice,
      extraHours: extraHours,
      travelMiles: travelMiles,
      total: grandTotal,
      addons: activeAddons.map(a => a.name)
    };
  }

  // Event Listeners
  packageRadios.forEach(radio => radio.addEventListener('change', calculateQuote));
  if (extraHoursSlider) extraHoursSlider.addEventListener('input', calculateQuote);
  if (travelMilesInput) travelMilesInput.addEventListener('input', calculateQuote);
  addonCheckboxes.forEach(cb => cb.addEventListener('change', calculateQuote));

  // Initial Calculation
  calculateQuote();

  // Lock Quote Button - Opens Modal pre-filled
  if (lockQuoteBtn) {
    lockQuoteBtn.addEventListener('click', () => {
      openBookingModalWithQuote(window.currentQuote);
    });
  }
}

/* ==========================================================================
   3. CUSTOM DJ AUDIO PLAYER & MIX SHOWCASE
   ========================================================================== */
function initAudioPlayer() {
  const tracks = [
    {
      id: 1,
      title: 'Thunder House Primetime Club & Festival Mix',
      artist: 'Thunder House Live DJ Set',
      genre: 'edm',
      genreName: 'EDM / Tech House / Festival',
      src: 'assets/songs/song1.mp3',
      duration: '3:45',
      cover: 'assets/images/branding/Clash of Blue and Crimson Storms.png'
    },
    {
      id: 2,
      title: 'Turn Up Wedding Reception Party Starters',
      artist: 'Thunder House Wedding Edit',
      genre: 'wedding',
      genreName: 'Top 40 / Funk / Singalongs',
      src: 'assets/songs/song2.mp3',
      duration: '4:12',
      cover: 'assets/images/branding/Thunder House Logo-Color.png'
    },
    {
      id: 3,
      title: 'Hypnotic Hip-Hop & R&B Club Heat',
      artist: 'Thunder House Throwback Set',
      genre: 'hiphop',
      genreName: 'Hip-Hop / 90s-2000s / Trap',
      src: 'assets/songs/song3.mp3',
      duration: '3:50',
      cover: 'assets/images/branding/Clash of Blue and Crimson Storms.png'
    },
    {
      id: 4,
      title: 'Fiesta Latina & Reggaeton Peak Hour',
      artist: 'Thunder House Latin Vibes',
      genre: 'latin',
      genreName: 'Reggaeton / Urbano / Salsa / House',
      src: 'assets/songs/song4.mp3',
      duration: '3:30',
      cover: 'assets/images/branding/Thunder House Logo-Color.png'
    },
    {
      id: 5,
      title: 'Sunset Cocktail & Deep Lounge Grooves',
      artist: 'Thunder House Chill Session',
      genre: 'lounge',
      genreName: 'Deep House / Neo-Soul / Chill',
      src: 'assets/songs/song5.mp3',
      duration: '4:05',
      cover: 'assets/images/branding/Clash of Blue and Crimson Storms.png'
    },
    {
      id: 6,
      title: 'Open-Format Master Multi-Genre Megamix',
      artist: 'Thunder House All-Night Live',
      genre: 'all',
      genreName: 'Open-Format / Corporate & Gala',
      src: 'assets/songs/song6.mp3',
      duration: '4:20',
      cover: 'assets/images/branding/Thunder House Logo-Color.png'
    }
  ];

  let currentTrackIndex = 0;
  let isPlaying = false;
  const audio = new Audio();
  audio.preload = 'metadata';

  // DOM Elements
  const trackTitleEl = document.getElementById('player-title');
  const trackArtistEl = document.getElementById('player-artist');
  const trackGenreEl = document.getElementById('player-genre-badge');
  const vinylEl = document.getElementById('player-vinyl-cover');
  const waveContainer = document.getElementById('player-waveform');
  const playPauseBtn = document.getElementById('btn-play-pause');
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');
  const progressBar = document.getElementById('player-progress');
  const currentTimeEl = document.getElementById('player-current-time');
  const totalTimeEl = document.getElementById('player-total-time');
  const volumeSlider = document.getElementById('player-volume');
  const playlistContainer = document.getElementById('player-playlist-items');
  const filterTabs = document.querySelectorAll('.tab-btn');

  // Generate Waveform Bars
  if (waveContainer) {
    waveContainer.innerHTML = '';
    for (let i = 0; i < 40; i++) {
      const bar = document.createElement('div');
      bar.classList.add('wave-bar');
      bar.style.height = `${Math.floor(Math.random() * 70) + 20}%`;
      waveContainer.appendChild(bar);
    }
  }

  function loadTrack(index) {
    currentTrackIndex = index;
    const track = tracks[index];
    audio.src = track.src;
    
    if (trackTitleEl) trackTitleEl.textContent = track.title;
    if (trackArtistEl) trackArtistEl.textContent = track.artist;
    if (trackGenreEl) trackGenreEl.textContent = track.genreName;
    if (totalTimeEl) totalTimeEl.textContent = track.duration;

    // Update Playlist Active Row
    const allRows = document.querySelectorAll('.track-item');
    allRows.forEach(row => {
      row.classList.toggle('active', parseInt(row.dataset.index, 10) === index);
      const icon = row.querySelector('.track-play-icon i');
      if (icon) {
        icon.className = parseInt(row.dataset.index, 10) === index && isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';
      }
    });
  }

  function togglePlay() {
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(err => console.log('Playback error:', err));
    }
  }

  audio.addEventListener('play', () => {
    isPlaying = true;
    if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    if (vinylEl) vinylEl.classList.add('playing');
    if (waveContainer) waveContainer.classList.add('playing');
    updatePlaylistIcons();
  });

  audio.addEventListener('pause', () => {
    isPlaying = false;
    if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    if (vinylEl) vinylEl.classList.remove('playing');
    if (waveContainer) waveContainer.classList.remove('playing');
    updatePlaylistIcons();
  });

  audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
      const progress = (audio.currentTime / audio.duration) * 100;
      if (progressBar) progressBar.value = progress;
      if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
    }
  });

  audio.addEventListener('ended', () => {
    nextTrack();
  });

  if (progressBar) {
    progressBar.addEventListener('input', () => {
      if (audio.duration) {
        audio.currentTime = (progressBar.value / 100) * audio.duration;
      }
    });
  }

  if (volumeSlider) {
    volumeSlider.addEventListener('input', () => {
      audio.volume = volumeSlider.value / 100;
    });
  }

  function nextTrack() {
    let nextIndex = (currentTrackIndex + 1) % tracks.length;
    loadTrack(nextIndex);
    if (isPlaying) audio.play();
  }

  function prevTrack() {
    let prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    loadTrack(prevIndex);
    if (isPlaying) audio.play();
  }

  if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlay);
  if (nextBtn) nextBtn.addEventListener('click', nextTrack);
  if (prevBtn) prevBtn.addEventListener('click', prevTrack);

  function renderPlaylist(filterGenre = 'all') {
    if (!playlistContainer) return;
    playlistContainer.innerHTML = '';

    tracks.forEach((track, idx) => {
      if (filterGenre !== 'all' && track.genre !== filterGenre) return;

      const trackRow = document.createElement('div');
      trackRow.className = `track-item ${idx === currentTrackIndex ? 'active' : ''}`;
      trackRow.dataset.index = idx;
      trackRow.innerHTML = `
        <span class="track-num">${idx + 1 < 10 ? '0' + (idx + 1) : idx + 1}</span>
        <div class="track-title-col">
          <div>${track.title}</div>
          <small style="color: var(--text-muted);">${track.artist}</small>
        </div>
        <span class="track-genre-col">${track.genreName}</span>
        <span class="track-duration-col">${track.duration}</span>
        <span class="track-play-icon"><i class="fa-solid ${idx === currentTrackIndex && isPlaying ? 'fa-pause' : 'fa-play'}"></i></span>
      `;

      trackRow.addEventListener('click', () => {
        if (currentTrackIndex === idx) {
          togglePlay();
        } else {
          loadTrack(idx);
          audio.play();
        }
      });

      playlistContainer.appendChild(trackRow);
    });
  }

  function updatePlaylistIcons() {
    const allRows = document.querySelectorAll('.track-item');
    allRows.forEach(row => {
      const rowIdx = parseInt(row.dataset.index, 10);
      const icon = row.querySelector('.track-play-icon i');
      if (icon) {
        if (rowIdx === currentTrackIndex && isPlaying) {
          icon.className = 'fa-solid fa-pause';
        } else {
          icon.className = 'fa-solid fa-play';
        }
      }
    });
  }

  // Filter tabs
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const genre = tab.dataset.genre || 'all';
      renderPlaylist(genre);
    });
  });

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  // Init
  loadTrack(0);
  renderPlaylist('all');
}

/* ==========================================================================
   4. FAQ ACCORDION
   ========================================================================== */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const btn = item.querySelector('.faq-btn');
    const content = item.querySelector('.faq-content');

    if (btn && content) {
      btn.addEventListener('click', () => {
        const isActive = item.classList.contains('active');

        // Close all other items
        faqItems.forEach(otherItem => {
          otherItem.classList.remove('active');
          const otherContent = otherItem.querySelector('.faq-content');
          if (otherContent) otherContent.style.maxHeight = null;
        });

        // Toggle current item
        if (!isActive) {
          item.classList.add('active');
          content.style.maxHeight = content.scrollHeight + 40 + 'px';
        } else {
          item.classList.remove('active');
          content.style.maxHeight = null;
        }
      });
    }
  });
}

/* ==========================================================================
   5. BOOKING & INQUIRY FORMS + MODAL
   ========================================================================== */
function initBookingForms() {
  const mainContactForm = document.getElementById('main-contact-form');
  const modal = document.getElementById('booking-modal');
  const modalClose = document.getElementById('modal-close-btn');
  const modalSummaryDetails = document.getElementById('modal-summary-details');
  const modalBookingForm = document.getElementById('modal-booking-form');

  // Close modal
  if (modalClose && modal) {
    modalClose.addEventListener('click', () => {
      modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }

  // Main Contact Form
  
  // =========================================================================
  // PUBLIC BOOKING CALENDAR SYSTEM
  // =========================================================================
  let pubCalDate = new Date();
  let pubAvailabilityList = [];
  let pubSelectedDate = null;
  let pubSelectedTime = null;

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function initBookingCalendar() {
    const daysGrid = document.getElementById('pub-cal-days-grid');
    if (!daysGrid) return;

    const prevBtn = document.getElementById('btn-pub-prev-month');
    const nextBtn = document.getElementById('btn-pub-next-month');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        pubCalDate.setMonth(pubCalDate.getMonth() - 1);
        renderPublicCalendar();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        pubCalDate.setMonth(pubCalDate.getMonth() + 1);
        renderPublicCalendar();
      });
    }

    await fetchPublicAvailability();
  }

  async function fetchPublicAvailability() {
    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient.rpc('public_availability');

        if (!error && data) {
          pubAvailabilityList = data;
        }
      } catch (err) {
        console.warn('Note on public availability:', err);
      }
    }

    renderPublicCalendar();
  }

  function renderPublicCalendar() {
    const grid = document.getElementById('pub-cal-days-grid');
    const title = document.getElementById('pub-cal-month-title');
    if (!grid || !title) return;

    const year = pubCalDate.getFullYear();
    const month = pubCalDate.getMonth();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    title.textContent = `${monthNames[month]} ${year}`;

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    grid.innerHTML = '';

    // Empty cells
    for (let i = 0; i < firstDayIndex; i++) {
      const empty = document.createElement('div');
      empty.className = 'pub-day-cell empty';
      grid.appendChild(empty);
    }

    // Days in Month
    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(year, month, day);
      const yyyy = year;
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const cell = document.createElement('div');
      cell.className = 'pub-day-cell';
      cell.textContent = day;

      const isPast = cellDate < today;
      if (isPast) {
        cell.classList.add('past');
      } else {
        const record = pubAvailabilityList.find(a => a.date === dateStr);
        if (record && record.status === 'available') {
          cell.classList.add('available');
          if (dateStr === pubSelectedDate) {
            cell.classList.add('selected');
          }
          cell.addEventListener('click', () => selectPublicBookingDate(dateStr, record));
        } else if (record && record.status === 'booked') {
          cell.classList.add('booked');
        } else if (record && record.status === 'held') {
          // another client's date hold: not bookable until it expires
          cell.classList.add('booked', 'held');
          cell.title = 'On hold for another client';
        }
      }

      grid.appendChild(cell);
    }
  }

  function selectPublicBookingDate(dateStr, record) {
    pubSelectedDate = dateStr;
    const modalDateInput = document.getElementById('modal-event-date');
    const contactDateInput = document.getElementById('contact-date');
    if (modalDateInput) modalDateInput.value = dateStr;
    if (contactDateInput) contactDateInput.value = dateStr;

    // Re-render calendar cells to update selection ring
    document.querySelectorAll('.pub-day-cell').forEach(c => c.classList.remove('selected'));
    renderPublicCalendar();

    // Format readable date
    const [year, month, day] = dateStr.split('-');
    const d = new Date(year, parseInt(month) - 1, day);
    const dayFormatted = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

    // Update Time Panel Header
    const dateLabel = document.getElementById('time-panel-date-label');
    const subLabel = document.getElementById('time-panel-sub-label');
    if (dateLabel) dateLabel.innerHTML = `<i class="fa-solid fa-calendar-check" style="color:var(--primary);"></i> ${dayFormatted}`;
    if (subLabel) subLabel.textContent = 'Click an available time slot below to secure your event hours.';

    // Populate Time Slots
    const container = document.getElementById('pub-time-slots-container');
    const slots = (record && record.time_slots && record.time_slots.length > 0)
      ? record.time_slots
      : ['12:00 PM - 4:00 PM', '5:00 PM - 10:00 PM', '6:00 PM - 11:00 PM', '7:00 PM - 12:00 AM'];

    if (container) {
      container.innerHTML = slots.map(slot => `
        <button type="button" class="time-slot-btn ${slot === pubSelectedTime ? 'active' : ''}" onclick="selectPublicTimeSlot('${escapeHtml(slot)}')">
          <span><i class="fa-regular fa-clock"></i> ${escapeHtml(slot)}</span>
          <i class="fa-solid fa-chevron-right" style="font-size:0.75rem;"></i>
        </button>
      `).join('');
    }

    // Default time if none selected yet
    if (!pubSelectedTime && slots.length > 0) {
      selectPublicTimeSlot(slots[0]);
    } else if (pubSelectedTime) {
      updateConfirmationPill(dayFormatted, pubSelectedTime);
    }
  }

  window.selectPublicTimeSlot = function(slot) {
    pubSelectedTime = slot;
    const modalTimeInput = document.getElementById('modal-event-time');
    const contactTimeInput = document.getElementById('contact-time');
    if (modalTimeInput) modalTimeInput.value = slot;
    if (contactTimeInput) contactTimeInput.value = slot;

    // Update active slot buttons
    document.querySelectorAll('.time-slot-btn').forEach(btn => {
      if (btn.textContent.includes(slot)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (pubSelectedDate) {
      const [year, month, day] = pubSelectedDate.split('-');
      const d = new Date(year, parseInt(month) - 1, day);
      const dayFormatted = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
      updateConfirmationPill(dayFormatted, slot);
    }
  };

  function updateConfirmationPill(dateFormatted, slot) {
    const pill = document.getElementById('booking-confirmation-pill');
    const dateEl = document.getElementById('pill-selected-date');
    const timeEl = document.getElementById('pill-selected-time');
    if (pill && dateEl && timeEl) {
      dateEl.textContent = dateFormatted;
      timeEl.textContent = `Time Slot: ${slot}`;
      pill.style.display = 'flex';
    }
  }

  initBookingCalendar();

  // =========================================================================
  // MODAL 2-STEP STEPPER & FLEXIBLE DATE LOGIC
  // =========================================================================
  const stepPanel1 = document.getElementById('modal-step-panel-1');
  const stepPanel2 = document.getElementById('modal-step-panel-2');
  const stepTab1 = document.getElementById('modal-tab-step-1');
  const stepTab2 = document.getElementById('modal-tab-step-2');
  const btnNextStep = document.getElementById('btn-modal-next-step');
  const btnPrevStep = document.getElementById('btn-modal-prev-step');
  const btnStep2ChangeDate = document.getElementById('btn-step2-change-date');
  const chkFlexibleDate = document.getElementById('chk-flexible-date');
  const flexibleDrawer = document.getElementById('flexible-options-drawer');
  const flexibleSeasonSelect = document.getElementById('flexible-season-select');
  const flexibleDayPref = document.getElementById('flexible-day-pref');
  const step2SummaryDate = document.getElementById('step2-summary-date');

  function goToModalStep(step) {
    if (step === 1) {
      if (stepPanel1) stepPanel1.classList.add('active');
      if (stepPanel2) stepPanel2.classList.remove('active');
      if (stepTab1) {
        stepTab1.classList.add('active');
        stepTab1.classList.remove('completed');
      }
      if (stepTab2) {
        stepTab2.classList.remove('active', 'completed');
      }
    } else if (step === 2) {
      const isFlexible = chkFlexibleDate && chkFlexibleDate.checked;
      const modalDateInput = document.getElementById('modal-event-date');
      const hasCalendarDate = pubSelectedDate || (modalDateInput && modalDateInput.value);

      if (!isFlexible && !hasCalendarDate) {
        showToast('⚠️ Please select an available date on the calendar, or check "My event dates are flexible"!');
        return false;
      }

      // Update Step 2 preview
      if (step2SummaryDate) {
        if (isFlexible) {
          const season = flexibleSeasonSelect ? flexibleSeasonSelect.value : 'Flexible 2026/2027';
          const dayPref = flexibleDayPref ? flexibleDayPref.value : 'Any Day';
          step2SummaryDate.textContent = `Flexible Date: ${season} • ${dayPref}`;
          if (modalDateInput) modalDateInput.value = `Flexible: ${season} (${dayPref})`;
        } else {
          const [year, month, day] = (pubSelectedDate || modalDateInput.value).split('-');
          const d = new Date(year, parseInt(month) - 1, day);
          const dayFormatted = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
          step2SummaryDate.textContent = `${dayFormatted} ${pubSelectedTime ? `(${pubSelectedTime})` : ''}`;
        }
      }

      if (stepPanel1) stepPanel1.classList.remove('active');
      if (stepPanel2) stepPanel2.classList.add('active');
      if (stepTab1) {
        stepTab1.classList.remove('active');
        stepTab1.classList.add('completed');
      }
      if (stepTab2) {
        stepTab2.classList.add('active');
      }
    }
    return true;
  }

  window.goToModalStep = goToModalStep;

  if (btnNextStep) {
    btnNextStep.addEventListener('click', () => goToModalStep(2));
  }
  if (btnPrevStep) {
    btnPrevStep.addEventListener('click', () => goToModalStep(1));
  }
  if (btnStep2ChangeDate) {
    btnStep2ChangeDate.addEventListener('click', () => goToModalStep(1));
  }
  if (stepTab1) {
    stepTab1.addEventListener('click', () => goToModalStep(1));
  }

  // Flexible Date Checkbox & Drawer
  if (chkFlexibleDate) {
    chkFlexibleDate.addEventListener('change', () => {
      const modalDateInput = document.getElementById('modal-event-date');
      if (chkFlexibleDate.checked) {
        if (flexibleDrawer) flexibleDrawer.style.display = 'block';
        const season = flexibleSeasonSelect ? flexibleSeasonSelect.value : 'Flexible Season';
        const dayPref = flexibleDayPref ? flexibleDayPref.value : 'Any Day';
        if (modalDateInput) modalDateInput.value = `Flexible: ${season} (${dayPref})`;
      } else {
        if (flexibleDrawer) flexibleDrawer.style.display = 'none';
        if (modalDateInput) modalDateInput.value = pubSelectedDate || '';
      }
    });
  }

  if (flexibleSeasonSelect && chkFlexibleDate) {
    flexibleSeasonSelect.addEventListener('change', () => {
      if (chkFlexibleDate.checked) {
        const modalDateInput = document.getElementById('modal-event-date');
        const season = flexibleSeasonSelect.value;
        const dayPref = flexibleDayPref ? flexibleDayPref.value : 'Any Day';
        if (modalDateInput) modalDateInput.value = `Flexible: ${season} (${dayPref})`;
      }
    });
  }

  if (flexibleDayPref && chkFlexibleDate) {
    flexibleDayPref.addEventListener('change', () => {
      if (chkFlexibleDate.checked) {
        const modalDateInput = document.getElementById('modal-event-date');
        const season = flexibleSeasonSelect ? flexibleSeasonSelect.value : 'Flexible Season';
        const dayPref = flexibleDayPref.value;
        if (modalDateInput) modalDateInput.value = `Flexible: ${season} (${dayPref})`;
      }
    });
  }

  // Direct Package Card Buttons -> Opens Date Hold Modal Directly
  document.querySelectorAll('.btn-select-package-direct').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const pkgName = btn.getAttribute('data-package') || 'Thunder Party';
      const price = parseInt(btn.getAttribute('data-price'), 10) || 700;
      const hours = parseInt(btn.getAttribute('data-hours'), 10) || 4;

      window.currentQuote = {
        package: `${pkgName} (${hours}h)`,
        basePrice: price,
        total: price,
        extraHours: 0,
        travelMiles: 0,
        addons: []
      };

      openBookingModalWithQuote(window.currentQuote);
    });
  });

  // 1. Direct Contact Form Submission (Lightweight Lane 2)
  if (mainContactForm) {
    mainContactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = mainContactForm.querySelector('button[type="submit"]');
      const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending Message...';
      }

      const name = document.getElementById('contact-name').value.trim();
      const contactInfo = document.getElementById('contact-phone').value.trim();
      const message = document.getElementById('contact-message') ? document.getElementById('contact-message').value.trim() : '';

      const isEmail = contactInfo.includes('@');
      const email = isEmail ? contactInfo : '';
      const phone = !isEmail ? contactInfo : '';

      // Save to Supabase database
      if (window.supabaseClient) {
        try {
          await window.supabaseClient.from('thunderhouse_inquiries').insert([{
            full_name: name,
            email: email || 'provided_via_phone',
            phone: phone || contactInfo,
            package_name: 'Direct Consultation Question',
            venue_location: 'OKC Metro',
            notes: message,
            status: 'new',
            source: 'website_quick_question'
          }]);
        } catch (err) {
          console.warn('Supabase inquiry save note:', err);
        }
      }

      // Dispatch notification email
      try {
        await fetch('https://kxoivmflghfgtvawhktt.supabase.co/functions/v1/send-booking-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_name: name,
            client_email: email,
            client_phone: phone || contactInfo,
            venue_city: 'Oklahoma City',
            package_name: 'Direct Question / Message',
            notes: message
          })
        });
      } catch (emailErr) {
        console.warn('Email dispatch note:', emailErr);
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }

      showToast(`Thank you ${name}! Your message has been sent. We'll get back to you today!`);
      mainContactForm.reset();
    });
  }

  // 2. Modal Final Booking & Quote Confirmation Submission (Lane 1)
  if (modalBookingForm) {
    modalBookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btn-modal-submit-booking') || modalBookingForm.querySelector('button[type="submit"]');
      const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';

      const clientName = document.getElementById('modal-client-name').value.trim();
      const clientEmail = document.getElementById('modal-client-email').value.trim();
      const clientPhone = document.getElementById('modal-client-phone').value.trim();
      const clientVenue = document.getElementById('modal-client-venue') ? document.getElementById('modal-client-venue').value.trim() : 'Oklahoma City';
      const clientNotes = document.getElementById('modal-client-notes') ? document.getElementById('modal-client-notes').value.trim() : '';
      
      const modalDateInput = document.getElementById('modal-event-date');
      const isFlexible = chkFlexibleDate && chkFlexibleDate.checked;
      let eventDate = modalDateInput ? modalDateInput.value : pubSelectedDate;
      if (isFlexible) {
        const season = flexibleSeasonSelect ? flexibleSeasonSelect.value : 'Flexible 2026/2027';
        const dayPref = flexibleDayPref ? flexibleDayPref.value : 'Any Day';
        eventDate = `Flexible: ${season} (${dayPref})`;
      }

      const eventTime = isFlexible 
        ? 'Flexible / Full Event' 
        : (document.getElementById('modal-event-time') ? document.getElementById('modal-event-time').value : (pubSelectedTime || 'Flexible / Full Event'));

      if (!eventDate) {
        showToast('⚠️ Please select an available event date on the calendar first!');
        goToModalStep(1);
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting Date Hold Request...';
      }

      const quote = window.currentQuote || {
        package: 'Thunder Party (4h)',
        total: 700,
        basePrice: 700,
        extraHours: 0,
        travelMiles: 0,
        addons: []
      };

      // Save to Supabase database (also places the date hold)
      let holdResult = null;
      if (window.supabaseClient) {
        try {
          const { data, error } = await window.supabaseClient.rpc('submit_quote_request', {
            p: {
              full_name: clientName,
              email: clientEmail,
              phone: clientPhone,
              event_date: eventDate,
              event_time: eventTime,
              venue_location: clientVenue,
              package_name: quote.package || 'Thunder House Package',
              addons: (quote.addons || []).map(a => typeof a === 'string' ? a : (a.name || a.label || JSON.stringify(a))),
              estimated_total: quote.total || 0,
              notes: clientNotes,
              source: 'quote_calculator_modal'
            }
          });
          if (error) throw error;
          holdResult = data;
        } catch (err) {
          console.warn('Supabase quote save note:', err);
        }
      }

      // Dispatch confirmation email via Supabase Edge Function
      try {
        const emailResponse = await fetch('https://kxoivmflghfgtvawhktt.supabase.co/functions/v1/send-booking-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_name: clientName,
            client_email: clientEmail,
            client_phone: clientPhone,
            event_date: eventDate,
            event_time: eventTime,
            venue_city: clientVenue,
            package_name: quote.package,
            estimated_total: quote.total,
            notes: clientNotes,
            held: holdResult ? holdResult.held === true : false,
            hold_hours: holdResult ? holdResult.hold_hours : null
          })
        });
        const emailResult = await emailResponse.json();
        console.log('Confirmation email result:', emailResult);
      } catch (emailErr) {
        console.warn('Confirmation email note:', emailErr);
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }

      // Show the full thank-you page. Details travel in sessionStorage, never in the URL.
      try {
        sessionStorage.setItem('th_quote_result', JSON.stringify({
          name: clientName, email: clientEmail, date: eventDate, time: eventTime,
          package: quote.package, total: quote.total,
          held: !!(holdResult && holdResult.held), hours: holdResult ? holdResult.hold_hours : null,
          reason: holdResult ? holdResult.reason : null, at: Date.now()
        }));
        window.location.href = '/thank-you';
        return;
      } catch (e) { /* storage blocked: fall back to the quick message below */ }

      if (modal) modal.classList.remove('active');
      if (holdResult && holdResult.held) {
        showToast(`📅 Your date is held for ${holdResult.hold_hours} hours, ${clientName}! Check ${clientEmail} for next steps.`);
      } else if (holdResult && holdResult.reason === 'date_unavailable') {
        showToast(`Thanks ${clientName}! That date was just taken, so we'll reach out with nearby options.`);
      } else {
        showToast(`Request received, ${clientName}! Check ${clientEmail} for confirmation.`);
      }
      fetchPublicAvailability();
      modalBookingForm.reset();
      goToModalStep(1);
    });
  }
}

function openBookingModalWithQuote(quote) {
  const modal = document.getElementById('booking-modal');
  const modalSummaryDetails = document.getElementById('modal-summary-details');
  if (!modal) return;

  if (typeof window.goToModalStep === 'function') {
    window.goToModalStep(1);
  }

  const currentQuoteData = quote || window.currentQuote || {
    package: 'Thunder Party (4h)',
    basePrice: 700,
    extraHours: 0,
    travelMiles: 0,
    total: 700,
    addons: []
  };

  if (modalSummaryDetails) {
    modalSummaryDetails.innerHTML = `
      <div style="background: rgba(0, 229, 255, 0.08); border: 1px solid rgba(0, 229, 255, 0.35); border-radius: 10px; padding: 1.15rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <strong style="color: #fff; font-size: 1.1rem;">${currentQuoteData.package}</strong>
            <span class="badge-pill" style="font-size: 0.72rem; padding: 0.2rem 0.5rem; background: rgba(0,229,255,0.15); color: var(--primary);">Estimated Quote</span>
          </div>
          <div style="font-size: 0.84rem; color: var(--text-light);">
            Base Rate: $${currentQuoteData.basePrice.toLocaleString()} 
            ${currentQuoteData.extraHours > 0 ? `| +${currentQuoteData.extraHours} Extra Hr(s)` : ''} 
            ${currentQuoteData.travelMiles > 0 ? `| Travel: ${currentQuoteData.travelMiles} mi` : ''}
          </div>
          ${currentQuoteData.addons && currentQuoteData.addons.length > 0 ? `<div style="font-size: 0.8rem; color: var(--accent-gold); margin-top: 0.35rem;">Add-ons: ${currentQuoteData.addons.join(', ')}</div>` : ''}
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Estimated Investment</div>
          <div style="color: var(--accent-gold); font-weight: 800; font-size: 1.6rem; font-family: var(--font-heading);">$${currentQuoteData.total.toLocaleString()}</div>
        </div>
      </div>
    `;
  }

  modal.classList.add('active');
  
  // Make sure calendar is rendered inside modal
  const grid = document.getElementById('pub-cal-days-grid');
  if (grid && (!grid.children || grid.children.length === 0)) {
    if (typeof fetchPublicAvailability === 'function') {
      fetchPublicAvailability();
    }
  }
}

function openBookingModalWithData(data) {
  const modal = document.getElementById('booking-modal');
  const modalSummaryDetails = document.getElementById('modal-summary-details');
  if (!modal) return;

  if (typeof window.goToModalStep === 'function') {
    window.goToModalStep(1);
  }

  if (modalSummaryDetails) {
    modalSummaryDetails.innerHTML = `
      <div style="background: rgba(0, 229, 255, 0.08); border: 1px solid rgba(0, 229, 255, 0.35); border-radius: 10px; padding: 1.15rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <strong style="color: #fff; font-size: 1.05rem; display: block; margin-bottom: 0.25rem;">${data.eventType || 'Event Entertainment'}</strong>
          <div style="font-size: 0.84rem; color: var(--text-light);">Location: ${data.location || 'Oklahoma City'} | Date: ${data.date || 'Flexible Date'}</div>
        </div>
        <span class="badge-pill" style="font-size: 0.78rem;">Available</span>
      </div>
    `;
  }

  // Pre-fill fields if provided
  const venueInput = document.getElementById('modal-client-venue');
  if (venueInput && data.location && data.location !== 'TBD Venue / City') {
    venueInput.value = data.location;
  }

  modal.classList.add('active');
}

/* ==========================================================================
   6. STICKY QUICK QUOTE BAR
   ========================================================================== */
function initStickyQuoteBar() {
  const bar = document.getElementById('sticky-quote-bar');
  if (!bar) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 600) {
      bar.classList.add('visible');
    } else {
      bar.classList.remove('visible');
    }
  });
}

/* ==========================================================================
   7. TOAST NOTIFICATIONS
   ========================================================================== */
function showToast(message) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <i class="fa-solid fa-circle-check" style="color: var(--primary); font-size: 1.2rem;"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.4s ease';
    setTimeout(() => toast.remove(), 400);
  }, 4500);
}

// Show the current date-hold length (superuser setting) wherever the page mentions it
document.addEventListener('DOMContentLoaded', async () => {
  if (!window.supabaseClient || !document.querySelector('.th-hold-hours')) return;
  try {
    const { data } = await window.supabaseClient
      .from('thunderhouse_site_settings')
      .select('value')
      .eq('key', 'booking_settings')
      .maybeSingle();
    const hours = data && data.value && parseInt(data.value.hold_hours, 10);
    if (hours > 0) document.querySelectorAll('.th-hold-hours').forEach(el => { el.textContent = hours; });
  } catch (err) {
    console.warn('Hold length notice:', err);
  }
});
