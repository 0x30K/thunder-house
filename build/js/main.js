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
  const quickStripForm = document.getElementById('quick-booking-form');
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

  // Quick Hero Strip Form
  if (quickStripForm) {
    quickStripForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const eventType = document.getElementById('strip-event-type').value;
      const date = document.getElementById('strip-event-date').value;
      const location = document.getElementById('strip-location').value;

      openBookingModalWithData({
        eventType: eventType || 'DJ Entertainment Event',
        date: date || 'Flexible Date',
        location: location || 'TBD Venue / City',
        note: 'Quick Availability Check'
      });
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
        const { data, error } = await window.supabaseClient
          .from('thunderhouse_availability')
          .select('date, status, time_slots')
          .order('date', { ascending: true });

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
        }
      }

      grid.appendChild(cell);
    }
  }

  function selectPublicBookingDate(dateStr, record) {
    pubSelectedDate = dateStr;
    const hiddenDateInput = document.getElementById('contact-date');
    if (hiddenDateInput) hiddenDateInput.value = dateStr;

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

    container.innerHTML = slots.map(slot => `
      <button type="button" class="time-slot-btn ${slot === pubSelectedTime ? 'active' : ''}" onclick="selectPublicTimeSlot('${escapeHtml(slot)}')">
        <span><i class="fa-regular fa-clock"></i> ${escapeHtml(slot)}</span>
        <i class="fa-solid fa-chevron-right" style="font-size:0.75rem;"></i>
      </button>
    `).join('');

    // If already has a selected time, update pill
    if (pubSelectedTime) {
      updateConfirmationPill(dayFormatted, pubSelectedTime);
    }
  }

  window.selectPublicTimeSlot = function(slot) {
    pubSelectedTime = slot;
    const hiddenTimeInput = document.getElementById('contact-time');
    if (hiddenTimeInput) hiddenTimeInput.value = slot;

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

  if (mainContactForm) {
    mainContactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('contact-name').value;
      const email = document.getElementById('contact-email').value;
      const phone = document.getElementById('contact-phone').value;
      const selectedPkg = document.getElementById('contact-event-type').value;
      const date = document.getElementById('contact-date').value;
      const venue = document.getElementById('contact-venue').value;
      const message = document.getElementById('contact-message').value;

      // Save to Supabase database
      if (window.supabaseClient) {
        try {
          const chosenTime = document.getElementById('contact-time') ? document.getElementById('contact-time').value : '';
          await window.supabaseClient.from('thunderhouse_inquiries').insert([{
            full_name: name,
            email: email,
            phone: phone,
            package_name: selectedPkg,
            event_date: date || null,
            event_time: chosenTime,
            venue_location: venue,
            notes: message,
            status: 'new',
            source: 'website_calendar'
          }]);
        } catch (err) {
          console.warn('Supabase inquiry save note:', err);
        }
      }

      showToast(`Thank you ${name}! Your booking inquiry has been received. Our team will contact you within 2 hours.`);
      mainContactForm.reset();
    });
  }

  // Modal final confirmation submission
  if (modalBookingForm) {
    modalBookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const clientName = document.getElementById('modal-client-name').value;
      const clientPhone = document.getElementById('modal-client-phone').value;
      const clientEmail = document.getElementById('modal-client-email').value;
      const quote = window.currentQuote || {};

      // Save to Supabase database
      if (window.supabaseClient) {
        try {
          await window.supabaseClient.from('thunderhouse_inquiries').insert([{
            client_name: clientName,
            client_email: clientEmail,
            client_phone: clientPhone,
            package_name: quote.package || 'Thunder House Package',
            extra_hours: quote.extraHours || 0,
            travel_miles: quote.travelMiles || 0,
            addons: quote.addons || [],
            estimated_total: quote.total || 0,
            status: 'New'
          }]);
        } catch (err) {
          console.warn('Supabase quote save note:', err);
        }
      }

      if (modal) modal.classList.remove('active');
      showToast(`Booking inquiry locked in for ${clientName}! Check your email (${clientEmail}) for your custom proposal.`);
      modalBookingForm.reset();
    });
  }
}

function openBookingModalWithQuote(quote) {
  const modal = document.getElementById('booking-modal');
  const modalSummaryDetails = document.getElementById('modal-summary-details');
  if (!modal) return;

  if (modalSummaryDetails && quote) {
    modalSummaryDetails.innerHTML = `
      <div style="background: rgba(0, 229, 255, 0.08); border: 1px solid rgba(0, 229, 255, 0.3); border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
          <strong style="color: #fff;">${quote.package}</strong>
          <span style="color: var(--primary); font-weight: 700;">$${quote.total.toLocaleString()}</span>
        </div>
        <div style="font-size: 0.82rem; color: var(--text-light);">
          Base Price: $${quote.basePrice.toLocaleString()} ${quote.extraHours > 0 ? `| +${quote.extraHours} Extra Hrs` : ''} ${quote.travelMiles > 0 ? `| Travel: ${quote.travelMiles} mi ($${quote.travelMiles})` : ''}
        </div>
        ${quote.addons && quote.addons.length > 0 ? `<div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.3rem;">Selected Options: ${quote.addons.join(', ')}</div>` : ''}
      </div>
    `;
  }

  modal.classList.add('active');
}

function openBookingModalWithData(data) {
  const modal = document.getElementById('booking-modal');
  const modalSummaryDetails = document.getElementById('modal-summary-details');
  if (!modal) return;

  if (modalSummaryDetails) {
    modalSummaryDetails.innerHTML = `
      <div style="background: rgba(0, 229, 255, 0.08); border: 1px solid rgba(0, 229, 255, 0.3); border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
          <strong style="color: #fff;">${data.eventType}</strong>
          <span class="badge-pill" style="padding: 0.2rem 0.6rem; font-size: 0.72rem;">Available</span>
        </div>
        <div style="font-size: 0.82rem; color: var(--text-light);">
          Date: ${data.date} | Location: ${data.location}
        </div>
      </div>
    `;
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
