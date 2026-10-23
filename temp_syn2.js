
    // =========================================================================
    // 1. DEPARTMENT VIEW SWITCHER (SPA TAB ROUTER)
    // =========================================================================
    function showDepartment(deptId) {
      document.querySelectorAll('.dept-view').forEach(v => v.classList.remove('active'));
      document.querySelectorAll('.univ-nav-btn').forEach(b => b.classList.remove('active'));

      const targetView = document.getElementById(`view-${deptId}`);
      const targetNav = document.getElementById(`nav-${deptId}`);

      if (targetView) targetView.classList.add('active');
      if (targetNav) targetNav.classList.add('active');

      window.location.hash = deptId;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // =========================================================================
    // 2. DATA INGESTION & RENDERING
    // =========================================================================
    const ALL_ARTISTS = window.THUNDER_UNIV_ARTISTS || [];

    const WATERSHED_CINEMA = [
      {
        title: "The 1984 Pepsi Commercial Fire Incident",
        badge: "Industry Watershed • 1984",
        youtube_id: "277e90qU2sU",
        desc: "During the 6th take of a concert commercial at the Shrine Auditorium in LA, magnesium fireworks exploded prematurely, catching Michael Jackson's hair and scalp on fire. The second- and third-degree burns permanently altered his physical health, leading to surgeries, scalp reconstruction, and his subsequent dependence on prescription painkillers."
      },
      {
        title: "The 2009 VMAs Interruption ('Imma Let You Finish')",
        badge: "Pop Culture Canon • 2009",
        youtube_id: "1z8gCZ7zpsQ",
        desc: "Kanye walked on stage during 19-year-old Taylor Swift's acceptance speech for Best Female Video, grabbed the microphone, and declared that Beyoncé had 'one of the best videos of all time.' The global backlash pushed Kanye into self-imposed exile in Hawaii, where he channeled the villain narrative into his magnum opus album, 'My Beautiful Dark Twisted Fantasy'."
      },
      {
        title: "The 1995 Source Awards (East vs. West Ignition)",
        badge: "Hip Hop Civil War • 1995",
        youtube_id: "S8g6X4_J-jM",
        desc: "Standing in the heart of New York City at Madison Square Garden, Death Row Records CEO Suge Knight took the stage: 'Any artist out there that wanna be an artist and wanna stay a star... come to Death Row!' This public challenge ignited the East Coast vs. West Coast rivalry that would tragically engulf 2Pac and The Notorious B.I.G."
      },
      {
        title: "The Tim Westwood 1-Hour Non-Stop Freestyle",
        badge: "Freestyle Mastery • 2018",
        youtube_id: "3V1pS3e1_1Q",
        desc: "Juice WRLD walked into Tim Westwood's London studio and rapped off the top of his dome over classic Eminem beats for over 60 minutes straight without taking a breath, looking at a phone, or stumbling on a single rhyme scheme. Widely considered one of the greatest displays of pure improvisation in music history."
      },
      {
        title: "Super Bowl XLVIII Solo Drum Mastery",
        badge: "Live Musicianship • 2014",
        youtube_id: "F2i0Bc3f7jk",
        desc: "When critics questioned whether Bruno had enough hits to headline the Super Bowl Halftime Show, he opened the show completely alone on an illuminated drum kit, performing an explosive, polyrhythmic drum solo in front of 115 million viewers before singing a single note."
      }
    ];

    const ALUMNI_DATA = [
      { name: "Michael Joseph Jackson", degree: "Doctor of Pop Choreography & Vocal Dynamics", classYear: "Class of '82", icon: "👑" },
      { name: "Peter Gene Hernandez (Bruno Mars)", degree: "B.A. in Funk Revivalism & Cabaret Showmanship", classYear: "Class of '10", icon: "🎩" },
      { name: "Pharrell Lanscilo Williams", degree: "M.S. in 4-Count Beat Architecture", classYear: "Class of '98", icon: "🛸" },
      { name: "Kanye Omari West (Ye)", degree: "Fellowship in Soul Chopping & Era Reinvention", classYear: "Class of '04", icon: "🐻" },
      { name: "Jarad Anthony Higgins (Juice WRLD)", degree: "Valedictorian in Stream-of-Consciousness Improvisation", classYear: "Class of '18", icon: "🧃" },
      { name: "Prince Rogers Nelson", degree: "Honorary Chancellor Emeritus of Multi-Instrumentalism", classYear: "Class of '84", icon: "🎸" },
      { name: "Whitney Elizabeth Houston", degree: "Chair of Melodic Belting & Dynamic Control", classYear: "Class of '85", icon: "🎤" },
      { name: "James Joseph Brown", degree: "Founding Father of 'The One' & Modern Groove", classYear: "Class of '65", icon: "🥁" },
      { name: "Stevland Hardaway Morris (Stevie Wonder)", degree: "Distinguished Chair of Electronic Synthesis & Harmonica", classYear: "Class of '72", icon: "🎹" },
      { name: "Tupac Amaru Shakur", degree: "Doctorate in Sociopolitical Lyricism & West Coast Heritage", classYear: "Class of '95", icon: "🕊️" },
      { name: "Christopher Wallace (The Notorious B.I.G.)", degree: "Master of Flow Architecture & East Coast Narrative", classYear: "Class of '94", icon: "👑" },
      { name: "Marshall Mathers (Eminem)", degree: "Fellowship in Multi-Syllabic Speed & Technical Phrasing", classYear: "Class of '99", icon: "⚡" }
    ];

    const QUIZ_QUESTIONS = [
      {
        q: "1. Which producer famously mixed Michael Jackson's 'Billie Jean' 91 times before choosing Mix #2?",
        options: ["Berry Gordy", "Quincy Jones", "Teddy Riley", "Rick Rubin"],
        correct: 1
      },
      {
        q: "2. What signature musical trademark does Pharrell Williams put at the beginning of almost every song he produces?",
        options: ["A whisper of his name", "A reversed cymbal crash", "A 4-count beat intro", "A telephone dial tone"],
        correct: 2
      },
      {
        q: "3. What was the title of Kanye West's breakthrough debut track, recorded with his jaw wired shut following a near-fatal 2002 car accident?",
        options: ["Jesus Walks", "Through the Wire", "Gold Digger", "Stronger"],
        correct: 1
      },
      {
        q: "4. What instrument did Bruno Mars's mother and father train him on starting in Waikiki hotel cabaret shows at age 4?",
        options: ["Violin & Cello", "Turntables & Sampler", "Elvis impersonation & Percussion/Drums", "French Horn"],
        correct: 2
      },
      {
        q: "5. What made Juice WRLD's songwriting process historically unique compared to almost all other recording artists?",
        options: ["He typed his lyrics on an antique typewriter", "He never wrote lyrics down; every song was a 100% off-the-top freestyle", "He only recorded in total pitch darkness", "He used auto-tune on every single vowel"],
        correct: 1
      }
    ];

    function renderArtistCardHtml(artist) {
      return `
        <div class="artist-card" data-id="${artist.id}">
          <div>
            <div class="artist-card-header">
              <span class="course-code">${artist.subgenre || artist.category.toUpperCase()}</span>
              ${artist.photo_url ? `
                <img src="${artist.photo_url}" alt="${artist.name}" class="artist-badge-avatar" style="width: 54px; height: 54px; border-radius: 14px; object-fit: cover; object-position: top center; border: 2px solid var(--border-gold); background: #0c101b; flex-shrink: 0; display: block;" onerror="this.outerHTML='<div class=\'artist-badge-avatar\'>${artist.avatar_icon || '🎵'}</div>';" />
              ` : `
                <div class="artist-badge-avatar">${artist.avatar_icon || '🎵'}</div>
              `}
            </div>

            <h3 class="artist-name">${artist.name}</h3>
            <div class="artist-real-name"><i class="fa-solid fa-id-card"></i> ${artist.real_name}</div>

            <div class="artist-meta-list">
              <div class="meta-item">
                <span>Hometown / Roots</span>
                <strong>${artist.birthplace}</strong>
              </div>
              <div class="meta-item">
                <span>Active Eras</span>
                <strong>${artist.active_years}</strong>
              </div>
            </div>

            <p class="artist-bio-snippet">${artist.bio}</p>

            <div class="tracks-preview-box">
              <div class="tracks-box-title"><i class="fa-solid fa-headphones"></i> Top 5 Study Tracks</div>
              ${(artist.tracks || []).slice(0, 5).map((t, idx) => `
                <div class="track-row" onclick="playUniversityTrack('${artist.id}', ${idx})">
                  <div style="display: flex; align-items: center; gap: 0.65rem;">
                    <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); width: 16px;">${idx + 1}.</span>
                    <span class="track-title">${t.title} <small style="color: var(--text-muted);">(${t.year})</small></span>
                  </div>
                  <i class="fa-solid fa-circle-play" style="color: var(--primary);"></i>
                </div>
              `).join('')}
            </div>
          </div>

          <button class="btn btn-outline" style="width: 100%; justify-content: center;" onclick="openArtistDossier('${artist.id}')">
            <i class="fa-solid fa-folder-open"></i> Open Full Academic Dossier
          </button>
        </div>
      `;
    }

    function renderCourses() {
      const container = document.getElementById('courses-container');
      const core = ALL_ARTISTS.slice(0, 5);
      container.innerHTML = core.map(renderArtistCardHtml).join('');
    }

    function renderLibrary(artistsToRender = ALL_ARTISTS) {
      const container = document.getElementById('library-container');
      document.getElementById('library-count-badge').textContent = `${artistsToRender.length} Verified Artist Records`;
      document.getElementById('total-artists-stat').textContent = ALL_ARTISTS.length;

      if (!artistsToRender.length) {
        container.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem; color: var(--text-muted);">
            <i class="fa-solid fa-compact-disc" style="font-size: 2.5rem; margin-bottom: 1rem; color: var(--border-cyan);"></i>
            <h3>No Artists Found</h3>
            <p>Try searching another name, city, or clearing the genre filter.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = artistsToRender.map(renderArtistCardHtml).join('');
    }

    let activeGenreFilter = 'all';

    function filterLibraryGenre(genre, btnEl) {
      activeGenreFilter = genre;
      document.querySelectorAll('.genre-filter-bar .filter-pill').forEach(b => b.classList.remove('active'));
      if (btnEl) btnEl.classList.add('active');
      handleLibrarySearch();
    }

    function handleLibrarySearch() {
      const query = (document.getElementById('library-search-input').value || '').toLowerCase().trim();
      let results = ALL_ARTISTS;

      if (activeGenreFilter !== 'all') {
        results = results.filter(a => a.category === activeGenreFilter);
      }

      if (query) {
        results = results.filter(a => {
          return (
            a.name.toLowerCase().includes(query) ||
            a.real_name.toLowerCase().includes(query) ||
            a.birthplace.toLowerCase().includes(query) ||
            (a.subgenre && a.subgenre.toLowerCase().includes(query)) ||
            (a.bio && a.bio.toLowerCase().includes(query))
          );
        });
      }

      renderLibrary(results);
    }

    function filterCourseSyllabi(courseName) {
      document.querySelectorAll('.course-filter-bar .filter-pill').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');
      const container = document.getElementById('courses-container');
      const core = ALL_ARTISTS.slice(0, 5);

      if (courseName === 'all') {
        container.innerHTML = core.map(renderArtistCardHtml).join('');
      } else if (courseName === 'Course 101') {
        container.innerHTML = core.filter(a => a.id === 'michael-jackson' || a.id === 'bruno-mars').map(renderArtistCardHtml).join('');
      } else if (courseName === 'Course 201') {
        container.innerHTML = core.filter(a => a.id === 'pharrell-williams' || a.id === 'kanye-west').map(renderArtistCardHtml).join('');
      } else if (courseName === 'Course 301') {
        container.innerHTML = core.filter(a => a.id === 'juice-wrld').map(renderArtistCardHtml).join('');
      }
    }

    function renderCinema() {
      document.getElementById('cinema-container').innerHTML = WATERSHED_CINEMA.map(c => `
        <div class="cinema-card">
          <div class="cinema-thumb-wrap">
            <iframe src="https://www.youtube.com/embed/${c.youtube_id}" title="${c.title}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>
          <div class="cinema-body">
            <div style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #f87171; margin-bottom: 0.4rem;">
              <i class="fa-solid fa-radiation"></i> ${c.badge}
            </div>
            <h4 style="font-family: var(--font-heading); font-size: 1.25rem; color: #fff; margin-bottom: 0.6rem;">${c.title}</h4>
            <p style="font-size: 0.85rem; color: var(--text-light); line-height: 1.6;">${c.desc}</p>
          </div>
        </div>
      `).join('');
    }

    function renderAlumni() {
      document.getElementById('alumni-container').innerHTML = ALUMNI_DATA.map(a => `
        <div class="alumni-card">
          <div class="alumni-avatar">${a.icon}</div>
          <div>
            <div style="font-size: 1rem; font-weight: 700; color: #fff;">${a.name}</div>
            <div style="font-size: 0.78rem; color: var(--accent-gold); font-family: var(--font-display);">${a.degree}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${a.classYear} • Distinguished Honors</div>
          </div>
        </div>
      `).join('');
    }

    function renderQuiz() {
      document.getElementById('quiz-container').innerHTML = QUIZ_QUESTIONS.map((q, qIdx) => `
        <div class="quiz-question-box" id="q-box-${qIdx}">
          <div style="font-size: 1.05rem; font-weight: 700; color: #fff;">${q.q}</div>
          <div class="quiz-options">
            ${q.options.map((opt, optIdx) => `
              <button class="quiz-opt-btn" onclick="selectQuizOption(${qIdx}, ${optIdx}, this)">
                ${String.fromCharCode(65 + optIdx)}. ${opt}
              </button>
            `).join('')}
          </div>
        </div>
      `).join('');
    }

    // =========================================================================
    // 3. AUDIO PLAYBACK & CONSERVATORY LISTENING LAB
    // =========================================================================
    let currentArtistObj = null;
    let currentTrackIdx = 0;
    const audioEl = document.getElementById('univ-audio-element');
    const dockEl = document.getElementById('listening-dock');
    const playPauseBtn = document.getElementById('dock-play-pause-btn');

    function playUniversityTrack(artistId, trackIdx) {
      const artist = ALL_ARTISTS.find(a => a.id === artistId);
      if (!artist || !artist.tracks || !artist.tracks[trackIdx]) return;

      currentArtistObj = artist;
      currentTrackIdx = trackIdx;
      const track = artist.tracks[trackIdx];

      document.getElementById('dock-track-title').textContent = track.title;
      document.getElementById('dock-artist-name').textContent = `${artist.name} • ${track.album} (${track.year})`;
      document.getElementById('dock-coach-note').innerHTML = `<strong style="color: var(--primary);"><i class="fa-solid fa-headphones"></i> Listening Coach:</strong> ${track.note}`;

      dockEl.classList.add('active');
      audioEl.src = track.audio_url || 'assets/audio/song1.mp3';
      audioEl.play().then(() => {
        dockEl.classList.add('playing');
        playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      }).catch(() => {
        dockEl.classList.add('playing');
        playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      });
    }

    function togglePlayPause() {
      if (!audioEl.src) return;
      if (audioEl.paused) {
        audioEl.play();
        dockEl.classList.add('playing');
        playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      } else {
        audioEl.pause();
        dockEl.classList.remove('playing');
        playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      }
    }

    function skipTrack(direction) {
      if (!currentArtistObj || !currentArtistObj.tracks) return;
      let nextIdx = currentTrackIdx + direction;
      if (nextIdx < 0) nextIdx = currentArtistObj.tracks.length - 1;
      if (nextIdx >= currentArtistObj.tracks.length) nextIdx = 0;
      playUniversityTrack(currentArtistObj.id, nextIdx);
    }

    audioEl.addEventListener('timeupdate', () => {
      const cur = audioEl.currentTime || 0;
      const dur = audioEl.duration || 60;
      const pct = (cur / dur) * 100;
      document.getElementById('dock-progress-fill').style.width = pct + '%';
      document.getElementById('dock-cur-time').textContent = formatAudioTime(cur);
      document.getElementById('dock-total-time').textContent = formatAudioTime(dur);
    });

    audioEl.addEventListener('ended', () => { skipTrack(1); });

    function seekAudio(e) {
      const bar = document.getElementById('dock-progress-bar');
      const rect = bar.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      if (audioEl.duration) audioEl.currentTime = pct * audioEl.duration;
    }

    function formatAudioTime(seconds) {
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    // =========================================================================
    // 4. FULL MASTERCLASS DOSSIER MODAL
    // =========================================================================
        // Helper functions for safely opening lightbox without escaping bugs
    function openArtistPortraitLightbox(artistId) {
      const artist = ALL_ARTISTS.find(a => a.id === artistId);
      if (!artist || !artist.photo_url) return;
      openLightbox(artist.photo_url, artist.name, `Official Conservatory Archival Portrait • ${artist.subgenre || ''}`);
    }

    function openArtistGalleryLightbox(artistId, galleryIdx) {
      const artist = ALL_ARTISTS.find(a => a.id === artistId);
      if (!artist || !artist.gallery || !artist.gallery[galleryIdx]) return;
      const item = artist.gallery[galleryIdx];
      openLightbox(item.url, `${artist.name}: ${item.title}`, item.desc || '');
    }

    function openArtistDossier(artistId) {
      const artist = ALL_ARTISTS.find(a => a.id === artistId);
      if (!artist) return;

      const photo = artist.photo_url || '';
      const avatarFallback = artist.avatar_icon || '🎵';
      const gallery = (artist.gallery || []).filter(g => g.url && !g.url.includes('unsplash.com'));

      document.getElementById('dossier-modal-body').innerHTML = `
        <!-- Top Hero Banner with Atmospheric Ambient Layers (Zero Crop, Ambient Aura) -->
        <div class="dossier-hero-banner" style="position: relative; height: 240px; overflow: hidden; background: linear-gradient(135deg, #090d16 0%, #030712 100%);">
          ${photo ? `
            <div style="position: absolute; inset: -25px; background-image: url('${photo}'); background-size: cover; background-position: center 20%; filter: blur(30px) brightness(0.28) saturate(1.4); opacity: 0.75; transform: scale(1.15);"></div>
          ` : `
            <div style="position: absolute; inset: 0; background: radial-gradient(circle at 25% 40%, rgba(0, 242, 254, 0.08) 0%, transparent 65%);"></div>
          `}
          <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,12,20,0.15) 0%, rgba(10,12,20,0.65) 60%, rgba(10,12,20,0.98) 100%);"></div>
          <div style="position: absolute; inset: 0; background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 20px 20px; opacity: 0.35; pointer-events: none;"></div>
          
          <!-- Top badges on banner -->
          <div style="position: absolute; top: 1.25rem; left: 1.75rem; display: flex; align-items: center; gap: 0.65rem; z-index: 2;">
            <span class="course-code" style="background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); border: 1px solid var(--border-gold); padding: 4px 12px; font-weight: 700; color: var(--accent-gold);">
              <i class="fa-solid fa-certificate" style="color: var(--accent-gold);"></i> ${artist.subgenre || artist.category.toUpperCase()} MASTERCLASS
            </span>
            <span style="background: rgba(0,242,254,0.15); border: 1px solid rgba(0,242,254,0.4); color: #00f2fe; padding: 4px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">
              <i class="fa-solid fa-wave-square"></i> Conservatory Archive
            </span>
          </div>

          <!-- Watermark Crest -->
          <div style="position: absolute; right: 2rem; bottom: 1.25rem; opacity: 0.15; pointer-events: none; z-index: 1;">
            <img src="assets/images/branding/thunder-university-crest.jpg" style="height: 110px; filter: grayscale(100%); border-radius: 50%;" />
          </div>
        </div>

        <!-- Main Content Container with Overlapping Profile Avatar -->
        <div style="padding: 0 2rem 2.5rem 2rem;">
          <div style="display: flex; align-items: flex-end; gap: 1.75rem; margin-top: -85px; margin-bottom: 1.75rem; position: relative; z-index: 2;">
            
            <!-- Profile Photo Portrait Card (Full Head Fully Visible, No Circular Crop) -->
            <div class="dossier-profile-wrapper" style="position: relative; flex-shrink: 0; cursor: pointer;" onclick="openArtistPortraitLightbox('${artist.id}')" \'")}', 'Official Conservatory Portrait · ${artist.subgenre.replace(/'/g, "\'")}')" title="Click to inspect archival photo in full-screen high-res">
              ${photo ? `
                <div style="width: 145px; height: 180px; border-radius: 18px; border: 3px solid var(--border-gold); box-shadow: 0 16px 40px rgba(0,0,0,0.92), 0 0 25px rgba(255, 183, 3, 0.25); background: #0c101b; overflow: hidden; transition: transform 0.3s ease, box-shadow 0.3s ease;" onmouseover="this.style.transform='scale(1.03)'; this.style.boxShadow='0 20px 48px rgba(0,0,0,0.95), 0 0 35px rgba(0,242,254,0.4)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 16px 40px rgba(0,0,0,0.92), 0 0 25px rgba(255, 183, 3, 0.25)';">
                  <img src="${photo}" alt="${artist.name}" class="dossier-profile-img" style="width: 100%; height: 100%; object-fit: cover; object-position: top center; display: block;" onerror="this.parentElement.outerHTML='<div class=\'artist-badge-avatar\' style=\'width: 145px; height: 180px; font-size: 3.5rem; border-radius: 18px; border: 3px solid var(--border-gold); display: flex; align-items: center; justify-content: center;\'>${avatarFallback}</div>';" />
                </div>
              ` : `
                <div class="artist-badge-avatar" style="width: 145px; height: 180px; font-size: 3.5rem; border-radius: 18px; border: 3px solid var(--border-gold); box-shadow: 0 16px 40px rgba(0,0,0,0.92); display: flex; align-items: center; justify-content: center;">${avatarFallback}</div>
              `}
              <div style="position: absolute; bottom: 8px; right: 8px; background: #0b0f19; border: 2px solid var(--border-gold); border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.85);" title="Verified Conservatory Archive">
                <i class="fa-solid fa-circle-check" style="color: #00f2fe; font-size: 1.05rem;"></i>
              </div>
            </div>

            <!-- Name & Details Header -->
            <div style="flex-grow: 1; padding-bottom: 0.25rem;">
              <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                <h2 style="font-family: var(--font-heading); font-size: 2.35rem; color: #fff; margin: 0; line-height: 1.1; text-shadow: 0 2px 10px rgba(0,0,0,0.8);">${artist.name}</h2>
                <span style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); color: var(--accent-gold); padding: 3px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 700;">
                  ${artist.active_years}
                </span>
              </div>
              <div style="color: #94a3b8; font-weight: 500; font-size: 0.95rem; margin-top: 0.4rem;">
                <span style="color: var(--primary); font-weight: 600;"><i class="fa-solid fa-id-badge"></i> Legal Name:</span> ${artist.real_name} • <span style="color: var(--accent-gold); font-weight: 600;"><i class="fa-solid fa-location-dot"></i> Roots:</span> ${artist.birthplace}
              </div>
            </div>
          </div>

          <!-- Quick Stats & Lineage Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; background: rgba(0,0,0,0.35); border: 1px solid var(--border-subtle); padding: 1.25rem; border-radius: var(--radius-md);">
            <div>
              <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--accent-gold); letter-spacing: 0.08em; font-weight: 700;">Family & Music Lineage</span>
              <p style="color: #cbd5e1; font-size: 0.9rem; margin-top: 0.35rem; line-height: 1.6;">${artist.family || 'Documented music industry lineage.'}</p>
            </div>
            <div>
              <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--accent-gold); letter-spacing: 0.08em; font-weight: 700;">Primary Sound & Epoch</span>
              <p style="color: #cbd5e1; font-size: 0.9rem; margin-top: 0.35rem; line-height: 1.6;">${artist.subgenre || artist.category.toUpperCase()} • ${artist.active_years}</p>
            </div>
          </div>

          <!-- Education & Craft -->
          <div style="margin-bottom: 2rem;">
            <h4 style="font-size: 1.15rem; color: #fff; margin-bottom: 0.5rem; font-family: var(--font-display);"><i class="fa-solid fa-graduation-cap" style="color: var(--primary);"></i> Formal & Street Music Education</h4>
            <p style="color: var(--text-light); line-height: 1.7; font-size: 0.95rem;">${artist.education}</p>
          </div>

          <!-- Breakthrough Hustle -->
          <div style="margin-bottom: 2rem;">
            <h4 style="font-size: 1.15rem; color: #fff; margin-bottom: 0.5rem; font-family: var(--font-display);"><i class="fa-solid fa-door-open" style="color: var(--accent-gold);"></i> The Breakthrough Hustle (How They Made It In)</h4>
            <p style="color: var(--text-light); line-height: 1.7; font-size: 0.95rem;">${artist.breakout}</p>
          </div>

          <!-- Verified Archival Image Gallery Section (Rendered ONLY when authentic verified photos exist) -->
          ${gallery && gallery.length > 0 ? `
            <div style="margin-bottom: 2.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h4 style="font-size: 1.15rem; color: #fff; margin: 0; font-family: var(--font-display);">
                  <i class="fa-solid fa-camera-retro" style="color: var(--primary);"></i> Verified Archival Photography & Historical Exhibits
                </h4>
                <span style="color: var(--text-muted); font-size: 0.78rem;"><i class="fa-solid fa-expand"></i> Click photo to inspect full uncropped resolution</span>
              </div>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.15rem;">
                ${gallery.map((g, gIdx) => `
                  <div class="dossier-gallery-card" onclick="openArtistGalleryLightbox(\'${artist.id}\', ${gIdx})" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); overflow: hidden; cursor: pointer; transition: all 0.3s ease; position: relative;" onmouseover="this.style.borderColor='var(--primary)'; this.style.transform='translateY(-4px)'; this.style.boxShadow='0 12px 28px rgba(0,0,0,0.75)';" onmouseout="this.style.borderColor='var(--border-subtle)'; this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                    <div style="position: relative; height: 160px; overflow: hidden; background: #0c101b;">
                      <img src="${g.url}" alt="${g.title}" style="width: 100%; height: 100%; object-fit: cover; object-position: top center; transition: transform 0.4s ease;" onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'" />
                      <span style="position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.8); backdrop-filter: blur(6px); border-radius: 4px; padding: 2px 7px; font-size: 0.68rem; font-weight: 700; color: #00f2fe; border: 1px solid rgba(0,242,254,0.3);">
                        ${g.tag || 'Historical Archive'}
                      </span>
                    </div>
                    <div style="padding: 0.85rem;">
                      <strong style="color: #fff; font-size: 0.85rem; display: block; margin-bottom: 0.25rem;">${g.title}</strong>
                      <p style="color: #94a3b8; font-size: 0.75rem; margin: 0; line-height: 1.4;">${g.desc || ''}</p>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Curriculum Listening Tracks -->
          <div>
            <h4 style="font-size: 1.15rem; color: #fff; margin-bottom: 1rem; font-family: var(--font-display);"><i class="fa-solid fa-list-ol" style="color: var(--primary);"></i> The Essential 5 Listening Curriculum</h4>
            <div style="display: flex; flex-direction: column; gap: 0.85rem;">
              ${(artist.tracks || []).map((t, idx) => `
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 1rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
                  <div>
                    <strong style="color: #fff; font-size: 1rem; display: block;">${idx + 1}. "${t.title}" (${t.year})</strong>
                    <div style="color: var(--text-muted); font-size: 0.78rem; margin-bottom: 0.35rem;">Album: ${t.album}</div>
                    <div style="color: #94a3b8; font-size: 0.85rem;"><strong>Teacher's Listening Note:</strong> ${t.note}</div>
                  </div>
                  <button class="btn btn-cyan btn-sm" onclick="playUniversityTrack('${artist.id}', ${idx}); document.getElementById('dossier-modal').classList.remove('active');">
                    <i class="fa-solid fa-play"></i> Play
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      document.getElementById('dossier-modal').classList.add('active');
    }

    function openLightbox(url, title, desc) {
      document.getElementById('lightbox-img').src = url;
      document.getElementById('lightbox-title').textContent = title || 'Conservatory Visual Exhibit';
      document.getElementById('lightbox-desc').textContent = desc || '';
      document.getElementById('conservatory-lightbox').style.display = 'flex';
    }

    function closeLightbox(e) {
      if (e.target.id === 'conservatory-lightbox') {
        document.getElementById('conservatory-lightbox').style.display = 'none';
      }
    }

    function closeDossierModal(e) {
      if (e.target.id === 'dossier-modal') {
        document.getElementById('dossier-modal').classList.remove('active');
      }
    }

    // =========================================================================
    // 5. STUDENT ID EDITING & EXAMS
    // =========================================================================
    function editStudentName() {
      const cur = document.getElementById('student-display-name').textContent.trim();
      const newName = prompt("Enter student name for the official Thunder University Student ID & Degree:", cur);
      if (newName && newName.trim()) {
        document.getElementById('student-display-name').innerHTML = `${newName.trim()} <i class="fa-solid fa-pen" style="font-size: 0.75rem; color: var(--primary);"></i>`;
        document.getElementById('diploma-name').textContent = newName.trim().toUpperCase();
        localStorage.setItem('thunder_univ_student_name', newName.trim());
      }
    }

    const userAnswers = {};
    function selectQuizOption(qIdx, optIdx, btnEl) {
      userAnswers[qIdx] = optIdx;
      const box = document.getElementById(`q-box-${qIdx}`);
      box.querySelectorAll('.quiz-opt-btn').forEach(b => b.classList.remove('active', 'correct', 'wrong'));
      btnEl.classList.add('active');
    }

    function checkExamResults() {
      let score = 0;
      QUIZ_QUESTIONS.forEach((q, qIdx) => {
        const selected = userAnswers[qIdx];
        const box = document.getElementById(`q-box-${qIdx}`);
        const buttons = box.querySelectorAll('.quiz-opt-btn');

        if (selected !== undefined) {
          if (selected === q.correct) {
            score++;
            buttons[selected].classList.add('correct');
          } else {
            buttons[selected].classList.add('wrong');
            buttons[q.correct].classList.add('correct');
          }
        }
      });

      document.getElementById('quiz-score-pill').textContent = `Score: ${score} / ${QUIZ_QUESTIONS.length}`;

      if (score === QUIZ_QUESTIONS.length) {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        document.getElementById('diploma-box').style.display = 'block';
        document.getElementById('diploma-box').scrollIntoView({ behavior: 'smooth' });
        alert("🎓 CONGRATULATIONS!\nYou have scored 100% on the Thunder University Modern Music Heritage Exam!\nYour official Degree in Modern Music Heritage & Sonic Architecture has been conferred below!");
      } else {
        alert(`You scored ${score} out of ${QUIZ_QUESTIONS.length}. Review the highlighted correct answers above to reach 100% and earn your degree!`);
      }
    }

    // =========================================================================
    // 6. INITIALIZATION & ROUTING
    // =========================================================================
    document.addEventListener('DOMContentLoaded', async () => {
      const savedName = localStorage.getItem('thunder_univ_student_name');
      if (savedName) {
        document.getElementById('student-display-name').innerHTML = `${savedName} <i class="fa-solid fa-pen" style="font-size: 0.75rem; color: var(--primary);"></i>`;
        document.getElementById('diploma-name').textContent = savedName.toUpperCase();
      }

      renderCourses();
      renderLibrary(ALL_ARTISTS);
      renderCinema();
      renderAlumni();
      renderQuiz();

      // Check URL hash for direct department routing (e.g. #library, #bursar)
      const hash = window.location.hash ? window.location.hash.substring(1) : 'quad';
      if (['quad', 'courses', 'library', 'cinema', 'bursar', 'alumni', 'exam'].includes(hash)) {
        showDepartment(hash);
      }

      // Supabase Auth Guard
      if (window.supabaseClient) {
        try {
          const { data: { session } } = await window.supabaseClient.auth.getSession();
          if (!session) {
            console.log("No active session, redirecting to login.html");
            window.location.href = 'login.html';
            return;
          }

          const userEmail = session.user.email.toLowerCase();
          document.getElementById('univ-user-email').textContent = session.user.email;
          const isSuper = (userEmail === 'blackrader@gmail.com' || userEmail === 'olifedigital@gmail.com');
          
          const { data: staffMember } = await window.supabaseClient
            .from('thunderhouse_staff')
            .select('role, display_name')
            .eq('id', session.user.id)
            .maybeSingle();

          const hasAccess = isSuper || (staffMember && (staffMember.role === 'staff' || staffMember.role === 'employee' || staffMember.role === 'superuser'));

          if (!hasAccess && !isSuper) {
            alert('Access Restricted: Thunder University is reserved for Thunder House staff, employees, and authorized scholars.');
            window.location.href = 'login.html';
          }
        } catch (err) {
          console.warn('Auth guard check error:', err);
        }
      }
    });
  