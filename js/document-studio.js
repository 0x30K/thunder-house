/**
 * THUNDER HOUSE ENT - DOCUMENT STUDIO & LEGAL VAULT
 * Interactive entertainment industry document generator, real-time typing preview,
 * Supabase/localStorage synchronization, superuser-only master template protection,
 * and executive letterhead print engine.
 */

(function () {
  // Global State
  window.docStudioState = {
    activeType: 'split_sheet',
    data: {},
    savedDocs: [],
    inquiries: [],
    masterTemplates: {}
  };

  // Helper to test if active user is a superuser
  function isSuperuser() {
    return Boolean(
      (window.currentUserState && window.currentUserState.isSuperuser) ||
      (window.currentUserState && window.currentUserState.role === 'superuser') ||
      (window.currentUserState && (window.currentUserState.email === 'blackrader@gmail.com' || window.currentUserState.email === 'olifedigital@gmail.com'))
    );
  }

  // Canonical Factory Templates
  const FACTORY_TEMPLATES = {
    split_sheet: {
      doc_title: 'Music Production & Songwriting Split Sheet',
      track_title: 'Summer Nights (Radio Edit)',
      artist_name: 'Thunder House feat. Marcus Vance',
      producer_name: 'DJ Thunder / Thunder House ENT',
      studio_name: 'Thunder House Sound Labs, Studio A (OKC)',
      record_date: new Date().toISOString().split('T')[0],
      record_label: 'Thunder House Records / Independent',
      isrc_code: 'US-TH1-26-00104',
      iswc_code: 'T-934.821.192-0',
      sample_clearance: 'None / 100% Original Composition and Sound Recording',
      notes: 'Master recordings and stems archived at Thunder House Vault. Any sync licensing requires mutual majority approval.',
      contributors: [
        {
          name: 'Thunder House Entertainment LLC',
          alias: 'DJ Thunder',
          role: 'Producer / Composer / Beatmaker',
          pro: 'ASCAP',
          ipi: '009845123',
          publisher: 'Thunder House Publishing (ASCAP)',
          composition_split: 50.0,
          master_split: 50.0
        },
        {
          name: 'Marcus Allen Vance',
          alias: 'Marcus Vance',
          role: 'Lyricist / Topliner / Lead Vocalist',
          pro: 'BMI',
          ipi: '007623198',
          publisher: 'Vance World Music (BMI)',
          composition_split: 50.0,
          master_split: 50.0
        }
      ]
    },

    client_quote: {
      quote_no: 'TH-Q-' + new Date().getFullYear() + '-' + String(Math.floor(100 + Math.random() * 900)),
      quote_date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      client_name: 'Sarah Jenkins',
      client_company: 'Jenkins-Miller Wedding',
      client_email: 'sarah.jenkins@example.com',
      client_phone: '(405) 555-0194',
      client_address: '1240 Northwest 23rd St, Oklahoma City, OK 73106',
      event_date: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
      event_type: 'Wedding Ceremony & Reception',
      venue_name: 'The Skirvin Hilton Grand Ballroom',
      venue_address: '1 Park Ave, Oklahoma City, OK 73102',
      event_time: '4:30 PM - 10:30 PM (6.0 Hours Total)',
      guest_count: 175,
      package_name: 'Thunder Elite Sound & Light Package (Father & Son Duo)',
      package_desc: 'Comprehensive premium DJ & MC coverage, concert-grade QSC sound system, wireless microphone array, custom wedding timeline orchestration.',
      package_rate: 1850.00,
      line_items: [
        {
          name: 'Computerized Wireless LED Uplighting (12 Fixtures)',
          quantity: 1,
          rate: 350.00,
          amount: 350.00
        },
        {
          name: 'Dancing on the Clouds / Low-Lying Dry Ice Fog (First Dance)',
          quantity: 1,
          rate: 400.00,
          amount: 400.00
        },
        {
          name: 'Dual 18" Powered Subwoofer Low-End Reinforcement',
          quantity: 1,
          rate: 250.00,
          amount: 250.00
        }
      ],
      travel_fee: 0.00,
      discount: 150.00,
      retainer_percent: 50,
      terms_note: 'A 50% non-refundable retainer reserves your date on the Thunder House calendar. The remaining balance is due 7 days prior to the event date.'
    },

    photo_release: {
      release_date: new Date().toISOString().split('T')[0],
      project_title: 'Thunder House Live Concert Experience & Promotional Video Showcase',
      location: 'The Jones Assembly / Criterion Theatre, Oklahoma City, OK',
      talent_name: 'Jordan K. Taylor',
      talent_alias: 'DJ J-Storm',
      talent_address: '742 N Broadway Ave, Apt 3B, Oklahoma City, OK 73102',
      talent_phone: '(405) 555-8371',
      talent_email: 'jordan.taylor@example.com',
      compensation_type: 'Valuable consideration acknowledged / Master cut copy of edited performance reels for portfolio',
      compensation_amount: '0.00',
      is_minor: false,
      guardian_name: '',
      guardian_relation: '',
      custom_rights: 'Includes commercial marketing, social video ads, YouTube broadcasts, website hero banners, and promotional merchandise.',
      witness_name: 'Thunder House Production Manager'
    },

    performance_contract: {
      contract_no: 'TH-CTR-' + new Date().getFullYear() + '-' + String(Math.floor(100 + Math.random() * 900)),
      contract_date: new Date().toISOString().split('T')[0],
      purchaser_name: 'David Sterling',
      purchaser_company: 'Sterling Global Enterprises LLC',
      purchaser_email: 'dsterling@sterlingglobal.com',
      purchaser_phone: '(405) 555-4422',
      purchaser_address: '204 N Robinson Ave, Suite 1200, Oklahoma City, OK',
      event_title: 'Annual Winter Gala & Awards Celebration',
      event_date: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
      venue_name: 'Omni Oklahoma City Hotel - Five Moons Ballroom',
      venue_address: '100 W Oklahoma City Blvd, Oklahoma City, OK 73109',
      loadin_time: '5:00 PM (Soundcheck 6:00 PM)',
      performance_time: '7:00 PM - 11:30 PM (4.5 Hours)',
      total_fee: 2400.00,
      retainer_fee: 1200.00,
      balance_fee: 1200.00,
      balance_due_terms: 'Due upon DJ arrival prior to initial sound check on event date.',
      overtime_rate: 350.00,
      staging_reqs: 'A sturdy, clean 8ft x 4ft banquet table, level surface, and dedicated overhead cover from precipitation/sun if outdoors.',
      power_reqs: 'Minimum of two (2) dedicated 120-Volt 20-Amp AC electrical circuits within 25 feet of the DJ booth.',
      hospitality_reqs: 'Bottled drinking water and one (1) designated load-in parking pass adjacent to stage access.'
    },

    work_for_hire: {
      agreement_date: new Date().toISOString().split('T')[0],
      contractor_name: 'Christian Martinez',
      contractor_dba: 'Martinez Audio & Visual',
      contractor_role: 'Lead Videographer & Second Audio Engineer',
      contractor_email: 'christian.martinez@example.com',
      contractor_phone: '(405) 555-7790',
      contractor_address: '312 NW 10th St, Oklahoma City, OK 73103',
      tax_id: '***-**-6821',
      engagement_title: 'Thunder House Summer Live Tour - 4 Event Capture & Mixdown',
      scope_of_work: 'Provide multi-camera 4K live video capture, direct multi-track soundboard audio recording, gimbal crowd coverage, and delivery of raw camera footage (B-roll + main master audio) within 48 hours of each engagement.',
      compensation_rate: 650.00,
      payment_type: 'Per Event Engagement',
      payment_schedule: '50% upon arrival on event date; 50% upon successful delivery and verification of raw 4K files to Thunder House cloud storage.',
      governing_county: 'Oklahoma County, State of Oklahoma'
    },

    gear_rental: {
      rental_no: 'TH-RENT-' + new Date().getFullYear() + '-' + String(Math.floor(100 + Math.random() * 900)),
      agreement_date: new Date().toISOString().split('T')[0],
      renter_name: 'Marcus Vance',
      renter_phone: '(405) 555-0194',
      renter_email: 'marcus@example.com',
      renter_dl: 'OK-DL-9842103',
      checkout_date: new Date().toISOString().split('T')[0] + ' 14:00',
      return_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0] + ' 12:00',
      rental_fee: 450.00,
      deposit_amount: 500.00,
      late_fee_daily: 150.00,
      gear_items: [
        {
          desc: 'Pioneer CDJ-3000 Professional DJ Multi-Player (Pair)',
          serial: 'SN-CDJ3K-94812 / SN-CDJ3K-94813',
          condition: 'Mint / Road Case Included',
          replacement_val: 5200.00
        },
        {
          desc: 'Pioneer DJM-900NXS2 4-Channel Professional Mixer',
          serial: 'SN-DJM9-847291',
          condition: 'Excellent / Power Cable & Decksaver',
          replacement_val: 2400.00
        },
        {
          desc: 'Shure BLX288/PG58 Dual Wireless Microphone System',
          serial: 'SN-SHURE-552190',
          condition: 'Good / Flight Case with Fresh Batteries',
          replacement_val: 650.00
        }
      ]
    },

    custom: {
      doc_title: 'Executive Memorandum / Official Notice',
      reference_no: 'TH-MEMO-' + new Date().getFullYear() + '-01',
      doc_date: new Date().toISOString().split('T')[0],
      prepared_for: 'All Thunder House Entertainment Artists & Production Staff',
      subject: 'Updated Tour Sound Protocol & Master Recording Asset Archiving',
      body_content: `1. MASTER RECORDING & STEM POLICY
All original multi-track session files, DAW project bundles (.ptx, .flp, .als), vocal stems, and final DDP/WAV masters recorded under Thunder House Entertainment must be committed to the master backup array within 24 hours of tracking completion.

2. LIVE SOUND & POWER PROTOCOL
Prior to turning on power amplifiers or energized QSC speakers, all mixers and stage processors must be powered on first to eliminate harmful speaker pops. Surge protection and dedicated 20-amp circuits are strictly mandatory at all OKC venue locations.

3. ARTIST ROSTER & LICENSING
Any third-party sync placements for television, advertising, or collegiate sports broadcasts must clear through the executive office prior to contract execution.`,
      signatory_name: 'Thunder House Entertainment Executive Office',
      signatory_title: 'Managing Member / Senior Audio Director'
    }
  };

  // Master templates in current working memory
  let ACTIVE_TEMPLATES = JSON.parse(JSON.stringify(FACTORY_TEMPLATES));

  // Initialize Document Studio
  window.initDocumentStudio = async function () {
    await loadMasterTemplatesFromDatabase();
    loadSavedDocuments();
    initInquirySync();
    switchDocTemplate(window.docStudioState.activeType || 'split_sheet');
  };

  // Load master templates from Supabase or localStorage
  async function loadMasterTemplatesFromDatabase() {
    try {
      const local = localStorage.getItem('th_master_templates');
      if (local) {
        const parsed = JSON.parse(local);
        ACTIVE_TEMPLATES = { ...FACTORY_TEMPLATES, ...parsed };
      }
    } catch (e) {
      console.warn('Local master template fallback:', e);
    }

    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient
          .from('thunderhouse_site_settings')
          .select('value')
          .eq('key', 'document_master_templates')
          .maybeSingle();

        if (!error && data && data.value) {
          ACTIVE_TEMPLATES = { ...FACTORY_TEMPLATES, ...data.value };
          localStorage.setItem('th_master_templates', JSON.stringify(ACTIVE_TEMPLATES));
        }
      } catch (err) {
        console.warn('Network master templates fetch:', err);
      }
    }
  }

  // Superuser-Only: Save current form configuration as master company-wide source template
  window.saveMasterTemplateAsDefault = async function () {
    if (!isSuperuser()) {
      alert('Access Denied: Only superusers can edit and save master source templates.');
      return;
    }

    const type = window.docStudioState.activeType;
    const currentData = window.docStudioState.data;

    if (!confirm(`👑 SUPERUSER ACTION:\n\nSave your current edits to "${type.replace('_', ' ').toUpperCase()}" as the permanent master source template for all staff members?`)) {
      return;
    }

    ACTIVE_TEMPLATES[type] = JSON.parse(JSON.stringify(currentData));
    localStorage.setItem('th_master_templates', JSON.stringify(ACTIVE_TEMPLATES));

    if (window.supabaseClient) {
      try {
        const { error } = await window.supabaseClient
          .from('thunderhouse_site_settings')
          .upsert({
            key: 'document_master_templates',
            value: ACTIVE_TEMPLATES,
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });

        if (error) throw error;
      } catch (err) {
        console.warn('Supabase master template save error:', err);
      }
    }

    alert(`👑 Master Source Template Saved!\n\nAll staff will now receive these updated boilerplate clauses, pricing, and settings when creating a new ${type.replace('_', ' ')}.`);
    renderFormForActiveType();
  };

  // Superuser-Only: Restore factory defaults for active template
  window.restoreFactoryMasterTemplate = async function () {
    if (!isSuperuser()) {
      alert('Access Denied: Only superusers can modify master source templates.');
      return;
    }

    const type = window.docStudioState.activeType;
    if (!confirm(`Restore the factory original boilerplate for "${type.replace('_', ' ').toUpperCase()}"?`)) {
      return;
    }

    ACTIVE_TEMPLATES[type] = JSON.parse(JSON.stringify(FACTORY_TEMPLATES[type]));
    window.docStudioState.data = JSON.parse(JSON.stringify(FACTORY_TEMPLATES[type]));
    localStorage.setItem('th_master_templates', JSON.stringify(ACTIVE_TEMPLATES));

    if (window.supabaseClient) {
      try {
        await window.supabaseClient
          .from('thunderhouse_site_settings')
          .upsert({
            key: 'document_master_templates',
            value: ACTIVE_TEMPLATES,
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });
      } catch (e) {
        // silent
      }
    }

    alert(`Factory template restored for ${type.replace('_', ' ')}.`);
    renderFormForActiveType();
    updateLiveDocumentPreview();
  };

  // Sync inquiries from the parent admin state for the autofill helper
  function initInquirySync() {
    const sel = document.getElementById('doc-autofill-inquiry-select');
    if (!sel) return;

    if (window.allInquiries && window.allInquiries.length > 0) {
      populateInquirySelector(window.allInquiries);
    } else if (window.supabaseClient) {
      window.supabaseClient
        .from('thunderhouse_inquiries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(25)
        .then(({ data }) => {
          if (data && data.length) {
            populateInquirySelector(data);
          }
        });
    }
  }

  function populateInquirySelector(inquiries) {
    const sel = document.getElementById('doc-autofill-inquiry-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Quick Autofill from Lead / Inquiry --</option>';
    inquiries.forEach((item, idx) => {
      const name = item.client_name || item.full_name || 'Guest Lead';
      const date = item.event_date || 'Date TBD';
      const pkg = item.package_name || 'Standard Package';
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${name} (${date} - ${pkg})`;
      opt.dataset.item = JSON.stringify(item);
      sel.appendChild(opt);
    });
  }

  // Handle autofilling selected inquiry into the active document
  window.applyInquiryAutofill = function (sel) {
    const opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.dataset.item) return;

    try {
      const item = JSON.parse(opt.dataset.item);
      const name = item.client_name || item.full_name || '';
      const email = item.client_email || item.email || '';
      const phone = item.client_phone || item.phone || '';
      const date = item.event_date || '';
      const venue = item.venue_city || item.venue_location || '';
      const pkg = item.package_name || '';
      const total = parseFloat(item.estimated_total || 0);

      const d = window.docStudioState.data;

      if (window.docStudioState.activeType === 'client_quote') {
        if (name) d.client_name = name;
        if (email) d.client_email = email;
        if (phone) d.client_phone = phone;
        if (date) d.event_date = date;
        if (venue) d.venue_name = venue;
        if (pkg) d.package_name = pkg;
        if (total > 0) d.package_rate = total;
        renderFormForActiveType();
        updateLiveDocumentPreview();
        alert(`✅ Autofilled details for "${name}" into Client Quote!`);
      } else if (window.docStudioState.activeType === 'performance_contract') {
        if (name) d.purchaser_name = name;
        if (email) d.purchaser_email = email;
        if (phone) d.purchaser_phone = phone;
        if (date) d.event_date = date;
        if (venue) d.venue_name = venue;
        if (total > 0) {
          d.total_fee = total;
          d.retainer_fee = Math.round(total / 2);
          d.balance_fee = total - d.retainer_fee;
        }
        renderFormForActiveType();
        updateLiveDocumentPreview();
        alert(`✅ Autofilled details for "${name}" into Performance Contract!`);
      } else if (window.docStudioState.activeType === 'photo_release') {
        if (name) d.talent_name = name;
        if (email) d.talent_email = email;
        if (phone) d.talent_phone = phone;
        if (venue) d.location = venue;
        renderFormForActiveType();
        updateLiveDocumentPreview();
        alert(`✅ Autofilled details for "${name}" into Talent Release!`);
      } else {
        alert(`Autofill applied where applicable to ${window.docStudioState.activeType}.`);
      }
    } catch (e) {
      console.error('Error autofilling inquiry:', e);
    }
  };

  // Switch between templates
  window.switchDocTemplate = function (type) {
    if (!ACTIVE_TEMPLATES[type] && !FACTORY_TEMPLATES[type]) return;

    window.docStudioState.activeType = type;

    // Load from active master templates
    const master = ACTIVE_TEMPLATES[type] || FACTORY_TEMPLATES[type];
    window.docStudioState.data = JSON.parse(JSON.stringify(master));

    // Update active card UI
    document.querySelectorAll('.doc-template-card').forEach(c => {
      c.classList.toggle('active', c.dataset.type === type);
    });

    renderFormForActiveType();
    updateLiveDocumentPreview();
  };

  // Reset current document to master template
  window.resetCurrentDocToDefault = function () {
    const type = window.docStudioState.activeType;
    if (confirm(`Reset this ${type.replace('_', ' ')} back to company default template?`)) {
      const master = ACTIVE_TEMPLATES[type] || FACTORY_TEMPLATES[type];
      window.docStudioState.data = JSON.parse(JSON.stringify(master));
      renderFormForActiveType();
      updateLiveDocumentPreview();
    }
  };

  // =========================================================================
  // RENDER FORM EDITOR CONTROLS DYNAMICALLY
  // =========================================================================
  function renderFormForActiveType() {
    const container = document.getElementById('doc-editor-form-fields');
    if (!container) return;

    const type = window.docStudioState.activeType;
    const d = window.docStudioState.data;
    const superuser = isSuperuser();

    // Mode Banner
    let bannerHtml = '';
    if (superuser) {
      bannerHtml = `
        <div class="superuser-template-banner">
          <div>
            <div style="font-weight: 800; color: #fff; font-size: 0.88rem; display: flex; align-items: center; gap: 0.45rem;">
              <i class="fa-solid fa-crown" style="color: var(--accent-gold);"></i> Superuser Source Template Controls
            </div>
            <div style="font-size: 0.74rem; color: #cbd5e1; margin-top: 0.15rem;">
              You have superuser authoring privileges. Modifying defaults here updates the permanent master source template for all staff.
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button type="button" class="btn btn-outline btn-sm" onclick="restoreFactoryMasterTemplate()" title="Reset back to factory clauses">
              <i class="fa-solid fa-rotate-left"></i> Restore Factory
            </button>
            <button type="button" class="btn btn-sm" onclick="saveMasterTemplateAsDefault()" style="background: var(--accent-gold); color: #000; font-weight: 800; border: none; padding: 0.4rem 0.85rem;" title="Save current edits as new master template">
              <i class="fa-solid fa-cloud-arrow-up"></i> Save as Master Template
            </button>
          </div>
        </div>
      `;
    } else {
      bannerHtml = `
        <div class="staff-template-banner">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <i class="fa-solid fa-shield-halved" style="color: var(--primary); font-size: 1.1rem;"></i>
            <div>
              <strong style="color: #fff;">Staff Fill & Print Mode</strong>
              <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 0.1rem;">
                Customize, fill out, and print documents for your clients. Master source templates and legal boilerplate are protected by Superusers.
              </div>
            </div>
          </div>
          <span class="status-badge sent" style="font-size: 0.72rem; padding: 0.2rem 0.6rem;">Source Locked</span>
        </div>
      `;
    }

    let html = bannerHtml;

    if (type === 'split_sheet') {
      html += `
        <div class="doc-section-card">
          <div class="doc-section-header">
            <span class="doc-section-title"><i class="fa-solid fa-compact-disc"></i> Song & Track Information</span>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Song / Track Title</label>
              <input type="text" class="form-control" value="${escapeHtml(d.track_title)}" oninput="updateDocField('track_title', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Artist / Performer Name</label>
              <input type="text" class="form-control" value="${escapeHtml(d.artist_name)}" oninput="updateDocField('artist_name', this.value)">
            </div>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Primary Producer(s)</label>
              <input type="text" class="form-control" value="${escapeHtml(d.producer_name)}" oninput="updateDocField('producer_name', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Studio / DAW / Location</label>
              <input type="text" class="form-control" value="${escapeHtml(d.studio_name)}" oninput="updateDocField('studio_name', this.value)">
            </div>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Recording Date</label>
              <input type="date" class="form-control" value="${escapeHtml(d.record_date)}" oninput="updateDocField('record_date', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Record Label / Distributor</label>
              <input type="text" class="form-control" value="${escapeHtml(d.record_label)}" oninput="updateDocField('record_label', this.value)">
            </div>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>ISRC Identifier</label>
              <input type="text" class="form-control" value="${escapeHtml(d.isrc_code)}" oninput="updateDocField('isrc_code', this.value)">
            </div>
            <div class="doc-form-group">
              <label>ISWC Identifier</label>
              <input type="text" class="form-control" value="${escapeHtml(d.iswc_code)}" oninput="updateDocField('iswc_code', this.value)">
            </div>
          </div>
          <div class="doc-form-group">
            <label>Sample Clearance Status</label>
            <input type="text" class="form-control" value="${escapeHtml(d.sample_clearance)}" oninput="updateDocField('sample_clearance', this.value)">
          </div>
        </div>

        <div class="doc-section-card">
          <div class="doc-section-header">
            <span class="doc-section-title"><i class="fa-solid fa-users"></i> Songwriters & Producers (${d.contributors.length})</span>
            <div style="display: flex; gap: 0.5rem;">
              <button type="button" class="btn btn-outline btn-sm" onclick="equalizeSplitPercentages()" title="Split shares equally">
                <i class="fa-solid fa-scale-balanced"></i> Equalize %
              </button>
              <button type="button" class="btn btn-primary btn-sm" onclick="addSplitContributor()">
                <i class="fa-solid fa-plus"></i> Add Writer/Producer
              </button>
            </div>
          </div>

          <div id="split-contributors-list">
            ${d.contributors.map((c, i) => `
              <div class="doc-dynamic-row">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                  <strong style="color: var(--primary); font-size: 0.85rem;">Contributor #${i + 1}</strong>
                  ${d.contributors.length > 1 ? `
                    <button type="button" class="btn-row-del" onclick="removeSplitContributor(${i})" title="Remove Contributor">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  ` : ''}
                </div>
                <div class="doc-form-row">
                  <div class="doc-form-group">
                    <label>Legal Full Name</label>
                    <input type="text" class="form-control" value="${escapeHtml(c.name)}" oninput="updateContributorField(${i}, 'name', this.value)">
                  </div>
                  <div class="doc-form-group">
                    <label>Artist / Stage Alias</label>
                    <input type="text" class="form-control" value="${escapeHtml(c.alias)}" oninput="updateContributorField(${i}, 'alias', this.value)">
                  </div>
                </div>
                <div class="doc-form-row">
                  <div class="doc-form-group">
                    <label>Role</label>
                    <input type="text" class="form-control" value="${escapeHtml(c.role)}" oninput="updateContributorField(${i}, 'role', this.value)">
                  </div>
                  <div class="doc-form-group">
                    <label>PRO Affiliation (ASCAP, BMI, etc.)</label>
                    <input type="text" class="form-control" value="${escapeHtml(c.pro)}" oninput="updateContributorField(${i}, 'pro', this.value)">
                  </div>
                </div>
                <div class="doc-form-row">
                  <div class="doc-form-group">
                    <label>IPI / CAE Number</label>
                    <input type="text" class="form-control" value="${escapeHtml(c.ipi)}" oninput="updateContributorField(${i}, 'ipi', this.value)">
                  </div>
                  <div class="doc-form-group">
                    <label>Publisher / Admin Company</label>
                    <input type="text" class="form-control" value="${escapeHtml(c.publisher)}" oninput="updateContributorField(${i}, 'publisher', this.value)">
                  </div>
                </div>
                <div class="doc-form-row">
                  <div class="doc-form-group">
                    <label style="color: var(--accent-gold);">Composition Split %</label>
                    <input type="number" step="0.01" min="0" max="100" class="form-control" value="${c.composition_split}" oninput="updateContributorField(${i}, 'composition_split', parseFloat(this.value) || 0)">
                  </div>
                  <div class="doc-form-group">
                    <label style="color: var(--primary);">Master Recording Split %</label>
                    <input type="number" step="0.01" min="0" max="100" class="form-control" value="${c.master_split}" oninput="updateContributorField(${i}, 'master_split', parseFloat(this.value) || 0)">
                  </div>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="split-meter" id="split-meter-box">
            <!-- Rendered by updateSplitMeter() -->
          </div>
        </div>

        <div class="doc-section-card">
          <div class="doc-section-header">
            <span class="doc-section-title"><i class="fa-solid fa-scroll"></i> Legal Declarations & Additional Notes</span>
          </div>
          <div class="doc-form-group">
            <textarea class="form-control" rows="3" oninput="updateDocField('notes', this.value)">${escapeHtml(d.notes)}</textarea>
          </div>
        </div>
      `;
    } else if (type === 'client_quote') {
      html += `
        <div class="doc-section-card">
          <div class="doc-section-header">
            <span class="doc-section-title"><i class="fa-solid fa-file-invoice-dollar"></i> Quote Reference & Dates</span>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Quote Number</label>
              <input type="text" class="form-control" value="${escapeHtml(d.quote_no)}" oninput="updateDocField('quote_no', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Issue Date</label>
              <input type="date" class="form-control" value="${escapeHtml(d.quote_date)}" oninput="updateDocField('quote_date', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Valid Through</label>
              <input type="date" class="form-control" value="${escapeHtml(d.valid_until)}" oninput="updateDocField('valid_until', this.value)">
            </div>
          </div>
        </div>

        <div class="doc-section-card">
          <div class="doc-section-header">
            <span class="doc-section-title"><i class="fa-solid fa-user-tie"></i> Client Information</span>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Client Name / Couple</label>
              <input type="text" class="form-control" value="${escapeHtml(d.client_name)}" oninput="updateDocField('client_name', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Company / Organization</label>
              <input type="text" class="form-control" value="${escapeHtml(d.client_company)}" oninput="updateDocField('client_company', this.value)">
            </div>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Client Email</label>
              <input type="email" class="form-control" value="${escapeHtml(d.client_email)}" oninput="updateDocField('client_email', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Client Phone</label>
              <input type="text" class="form-control" value="${escapeHtml(d.client_phone)}" oninput="updateDocField('client_phone', this.value)">
            </div>
          </div>
          <div class="doc-form-group">
            <label>Billing Address</label>
            <input type="text" class="form-control" value="${escapeHtml(d.client_address)}" oninput="updateDocField('client_address', this.value)">
          </div>
        </div>

        <div class="doc-section-card">
          <div class="doc-section-header">
            <span class="doc-section-title"><i class="fa-solid fa-champagne-glasses"></i> Event Specifications</span>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Event Date</label>
              <input type="date" class="form-control" value="${escapeHtml(d.event_date)}" oninput="updateDocField('event_date', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Event Type</label>
              <input type="text" class="form-control" value="${escapeHtml(d.event_type)}" oninput="updateDocField('event_type', this.value)">
            </div>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Venue Name</label>
              <input type="text" class="form-control" value="${escapeHtml(d.venue_name)}" oninput="updateDocField('venue_name', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Venue Address & City</label>
              <input type="text" class="form-control" value="${escapeHtml(d.venue_address)}" oninput="updateDocField('venue_address', this.value)">
            </div>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Event Schedule / Hours</label>
              <input type="text" class="form-control" value="${escapeHtml(d.event_time)}" oninput="updateDocField('event_time', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Estimated Guest Count</label>
              <input type="number" class="form-control" value="${d.guest_count}" oninput="updateDocField('guest_count', parseInt(this.value) || 0)">
            </div>
          </div>
        </div>

        <div class="doc-section-card">
          <div class="doc-section-header">
            <span class="doc-section-title"><i class="fa-solid fa-sliders"></i> Base DJ / Entertainment Package</span>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group" style="flex: 2;">
              <label>Package Title</label>
              <input type="text" class="form-control" value="${escapeHtml(d.package_name)}" oninput="updateDocField('package_name', this.value)">
            </div>
            <div class="doc-form-group" style="flex: 1;">
              <label>Base Investment ($)</label>
              <input type="number" step="0.01" class="form-control" value="${d.package_rate}" oninput="updateDocField('package_rate', parseFloat(this.value) || 0)">
            </div>
          </div>
          <div class="doc-form-group">
            <label>Package Description / Features</label>
            <textarea class="form-control" rows="2" oninput="updateDocField('package_desc', this.value)">${escapeHtml(d.package_desc)}</textarea>
          </div>
        </div>

        <div class="doc-section-card">
          <div class="doc-section-header">
            <span class="doc-section-title"><i class="fa-solid fa-sparkles"></i> Production Add-ons & Upgrades (${d.line_items.length})</span>
            <button type="button" class="btn btn-outline btn-sm" onclick="addQuoteLineItem()">
              <i class="fa-solid fa-plus"></i> Add Upgrade Item
            </button>
          </div>
          <div id="quote-line-items-list">
            ${d.line_items.map((item, i) => `
              <div class="doc-dynamic-row">
                <div style="display: flex; gap: 0.65rem; align-items: flex-end;">
                  <div class="doc-form-group" style="flex: 3;">
                    <label>Item Description</label>
                    <input type="text" class="form-control" value="${escapeHtml(item.name)}" oninput="updateQuoteItem(${i}, 'name', this.value)">
                  </div>
                  <div class="doc-form-group" style="flex: 1;">
                    <label>Qty</label>
                    <input type="number" min="1" class="form-control" value="${item.quantity}" oninput="updateQuoteItem(${i}, 'quantity', parseInt(this.value) || 1)">
                  </div>
                  <div class="doc-form-group" style="flex: 1.2;">
                    <label>Rate ($)</label>
                    <input type="number" step="0.01" class="form-control" value="${item.rate}" oninput="updateQuoteItem(${i}, 'rate', parseFloat(this.value) || 0)">
                  </div>
                  <button type="button" class="btn-row-del" onclick="removeQuoteLineItem(${i})" title="Remove item">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="doc-section-card">
          <div class="doc-section-header">
            <span class="doc-section-title"><i class="fa-solid fa-calculator"></i> Investment Adjustments & Terms</span>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Travel / Setup Fee ($)</label>
              <input type="number" step="0.01" class="form-control" value="${d.travel_fee}" oninput="updateDocField('travel_fee', parseFloat(this.value) || 0)">
            </div>
            <div class="doc-form-group">
              <label>Promotional Courtesy Discount ($)</label>
              <input type="number" step="0.01" class="form-control" value="${d.discount}" oninput="updateDocField('discount', parseFloat(this.value) || 0)">
            </div>
            <div class="doc-form-group">
              <label>Retainer Percentage (%)</label>
              <input type="number" min="10" max="100" class="form-control" value="${d.retainer_percent}" oninput="updateDocField('retainer_percent', parseFloat(this.value) || 50)">
            </div>
          </div>
          <div class="doc-form-group">
            <label>Payment & Policy Terms Note</label>
            <textarea class="form-control" rows="2" oninput="updateDocField('terms_note', this.value)">${escapeHtml(d.terms_note)}</textarea>
          </div>
        </div>
      `;
    } else if (type === 'photo_release') {
      html += `
        <div class="doc-section-card">
          <div class="doc-section-header">
            <span class="doc-section-title"><i class="fa-solid fa-camera-retro"></i> Project & Production Context</span>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Project / Production Title</label>
              <input type="text" class="form-control" value="${escapeHtml(d.project_title)}" oninput="updateDocField('project_title', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Shoot / Production Date</label>
              <input type="date" class="form-control" value="${escapeHtml(d.release_date)}" oninput="updateDocField('release_date', this.value)">
            </div>
          </div>
          <div class="doc-form-group">
            <label>Location / Venue</label>
            <input type="text" class="form-control" value="${escapeHtml(d.location)}" oninput="updateDocField('location', this.value)">
          </div>
        </div>

        <div class="doc-section-card">
          <div class="doc-section-header">
            <span class="doc-section-title"><i class="fa-solid fa-id-card"></i> Talent / Model Details</span>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Full Legal Name</label>
              <input type="text" class="form-control" value="${escapeHtml(d.talent_name)}" oninput="updateDocField('talent_name', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Stage / Professional Alias</label>
              <input type="text" class="form-control" value="${escapeHtml(d.talent_alias)}" oninput="updateDocField('talent_alias', this.value)">
            </div>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Email Address</label>
              <input type="email" class="form-control" value="${escapeHtml(d.talent_email)}" oninput="updateDocField('talent_email', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Phone Number</label>
              <input type="text" class="form-control" value="${escapeHtml(d.talent_phone)}" oninput="updateDocField('talent_phone', this.value)">
            </div>
          </div>
          <div class="doc-form-group">
            <label>Residential Street Address</label>
            <input type="text" class="form-control" value="${escapeHtml(d.talent_address)}" oninput="updateDocField('talent_address', this.value)">
          </div>
        </div>

        <div class="doc-section-card">
          <div class="doc-section-header">
            <span class="doc-section-title"><i class="fa-solid fa-handshake"></i> Consideration & Rights Scope</span>
          </div>
          <div class="doc-form-group" style="margin-bottom: 0.85rem;">
            <label>Compensation / Consideration Clause</label>
            <input type="text" class="form-control" value="${escapeHtml(d.compensation_type)}" oninput="updateDocField('compensation_type', this.value)">
          </div>
          <div class="doc-form-group">
            <label>Scope of Media Distribution</label>
            <textarea class="form-control" rows="2" oninput="updateDocField('custom_rights', this.value)">${escapeHtml(d.custom_rights)}</textarea>
          </div>
          <div style="margin-top: 1rem; display: flex; align-items: center; gap: 0.75rem;">
            <input type="checkbox" id="chk-is-minor" ${d.is_minor ? 'checked' : ''} onchange="updateDocField('is_minor', this.checked); renderFormForActiveType();">
            <label for="chk-is-minor" style="font-weight: 700; color: #fff; cursor: pointer;">
              Model is a Minor (Under 18 Years Old) - Requires Parent/Guardian Execution
            </label>
          </div>
          ${d.is_minor ? `
            <div style="margin-top: 0.85rem; padding: 0.85rem; background: rgba(255, 183, 3, 0.08); border: 1px solid rgba(255, 183, 3, 0.3); border-radius: 6px;">
              <div class="doc-form-row">
                <div class="doc-form-group">
                  <label>Parent / Guardian Legal Name</label>
                  <input type="text" class="form-control" value="${escapeHtml(d.guardian_name)}" oninput="updateDocField('guardian_name', this.value)">
                </div>
                <div class="doc-form-group">
                  <label>Relationship to Minor</label>
                  <input type="text" class="form-control" value="${escapeHtml(d.guardian_relation)}" oninput="updateDocField('guardian_relation', this.value)">
                </div>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    } else if (type === 'performance_contract') {
      html += `
        <div class="doc-section-card">
          <div class="doc-section-header">
            <span class="doc-section-title"><i class="fa-solid fa-file-signature"></i> Agreement ID & Purchaser</span>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Contract Number</label>
              <input type="text" class="form-control" value="${escapeHtml(d.contract_no)}" oninput="updateDocField('contract_no', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Agreement Date</label>
              <input type="date" class="form-control" value="${escapeHtml(d.contract_date)}" oninput="updateDocField('contract_date', this.value)">
            </div>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Purchaser / Client Full Name</label>
              <input type="text" class="form-control" value="${escapeHtml(d.purchaser_name)}" oninput="updateDocField('purchaser_name', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Company / Organization</label>
              <input type="text" class="form-control" value="${escapeHtml(d.purchaser_company)}" oninput="updateDocField('purchaser_company', this.value)">
            </div>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Purchaser Email</label>
              <input type="email" class="form-control" value="${escapeHtml(d.purchaser_email)}" oninput="updateDocField('purchaser_email', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Purchaser Phone</label>
              <input type="text" class="form-control" value="${escapeHtml(d.purchaser_phone)}" oninput="updateDocField('purchaser_phone', this.value)">
            </div>
          </div>
        </div>

        <div class="doc-section-card">
          <div class="doc-section-header">
            <span class="doc-section-title"><i class="fa-solid fa-guitar"></i> Performance Details</span>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Event Name / Occasion</label>
              <input type="text" class="form-control" value="${escapeHtml(d.event_title)}" oninput="updateDocField('event_title', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Event Date</label>
              <input type="date" class="form-control" value="${escapeHtml(d.event_date)}" oninput="updateDocField('event_date', this.value)">
            </div>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Venue Name</label>
              <input type="text" class="form-control" value="${escapeHtml(d.venue_name)}" oninput="updateDocField('venue_name', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Venue Address</label>
              <input type="text" class="form-control" value="${escapeHtml(d.venue_address)}" oninput="updateDocField('venue_address', this.value)">
            </div>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Load-in / Soundcheck Time</label>
              <input type="text" class="form-control" value="${escapeHtml(d.loadin_time)}" oninput="updateDocField('loadin_time', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Performance Hours</label>
              <input type="text" class="form-control" value="${escapeHtml(d.performance_time)}" oninput="updateDocField('performance_time', this.value)">
            </div>
          </div>
        </div>

        <div class="doc-section-card">
          <div class="doc-section-header">
            <span class="doc-section-title"><i class="fa-solid fa-money-bill-wave"></i> Financials & Overtime</span>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Total Guaranteed Fee ($)</label>
              <input type="number" step="0.01" class="form-control" value="${d.total_fee}" oninput="updateDocField('total_fee', parseFloat(this.value) || 0)">
            </div>
            <div class="doc-form-group">
              <label>Retainer / Deposit ($)</label>
              <input type="number" step="0.01" class="form-control" value="${d.retainer_fee}" oninput="updateDocField('retainer_fee', parseFloat(this.value) || 0)">
            </div>
            <div class="doc-form-group">
              <label>Overtime Rate ($/hour)</label>
              <input type="number" step="0.01" class="form-control" value="${d.overtime_rate}" oninput="updateDocField('overtime_rate', parseFloat(this.value) || 0)">
            </div>
          </div>
          <div class="doc-form-group">
            <label>Balance Due Terms</label>
            <input type="text" class="form-control" value="${escapeHtml(d.balance_due_terms)}" oninput="updateDocField('balance_due_terms', this.value)">
          </div>
        </div>

        <div class="doc-section-card">
          <div class="doc-section-header">
            <span class="doc-section-title"><i class="fa-solid fa-bolt"></i> Technical Hospitality Rider Specs</span>
          </div>
          <div class="doc-form-group" style="margin-bottom: 0.65rem;">
            <label>Staging Requirements</label>
            <input type="text" class="form-control" value="${escapeHtml(d.staging_reqs)}" oninput="updateDocField('staging_reqs', this.value)">
          </div>
          <div class="doc-form-group" style="margin-bottom: 0.65rem;">
            <label>Electrical Power Requirements</label>
            <input type="text" class="form-control" value="${escapeHtml(d.power_reqs)}" oninput="updateDocField('power_reqs', this.value)">
          </div>
          <div class="doc-form-group">
            <label>Hospitality & Parking</label>
            <input type="text" class="form-control" value="${escapeHtml(d.hospitality_reqs)}" oninput="updateDocField('hospitality_reqs', this.value)">
          </div>
        </div>
      `;
    } else if (type === 'work_for_hire') {
      html += `
        <div class="doc-section-card">
          <div class="doc-section-header">
            <span class="doc-section-title"><i class="fa-solid fa-user-gear"></i> Contractor Information</span>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Agreement Date</label>
              <input type="date" class="form-control" value="${escapeHtml(d.agreement_date)}" oninput="updateDocField('agreement_date', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Contractor Legal Name</label>
              <input type="text" class="form-control" value="${escapeHtml(d.contractor_name)}" oninput="updateDocField('contractor_name', this.value)">
            </div>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>DBA / Business Entity</label>
              <input type="text" class="form-control" value="${escapeHtml(d.contractor_dba)}" oninput="updateDocField('contractor_dba', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Contractor Role / Title</label>
              <input type="text" class="form-control" value="${escapeHtml(d.contractor_role)}" oninput="updateDocField('contractor_role', this.value)">
            </div>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Email Address</label>
              <input type="email" class="form-control" value="${escapeHtml(d.contractor_email)}" oninput="updateDocField('contractor_email', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Phone Number</label>
              <input type="text" class="form-control" value="${escapeHtml(d.contractor_phone)}" oninput="updateDocField('contractor_phone', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Tax ID / SSN Last 4</label>
              <input type="text" class="form-control" value="${escapeHtml(d.tax_id)}" oninput="updateDocField('tax_id', this.value)">
            </div>
          </div>
        </div>

        <div class="doc-section-card">
          <div class="doc-section-header">
            <span class="doc-section-title"><i class="fa-solid fa-list-check"></i> Scope of Work & Compensation</span>
          </div>
          <div class="doc-form-group" style="margin-bottom: 0.75rem;">
            <label>Engagement Title</label>
            <input type="text" class="form-control" value="${escapeHtml(d.engagement_title)}" oninput="updateDocField('engagement_title', this.value)">
          </div>
          <div class="doc-form-group" style="margin-bottom: 0.75rem;">
            <label>Scope of Services & Deliverables</label>
            <textarea class="form-control" rows="3" oninput="updateDocField('scope_of_work', this.value)">${escapeHtml(d.scope_of_work)}</textarea>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Compensation Rate ($)</label>
              <input type="number" step="0.01" class="form-control" value="${d.compensation_rate}" oninput="updateDocField('compensation_rate', parseFloat(this.value) || 0)">
            </div>
            <div class="doc-form-group">
              <label>Rate Basis (Per Event / Flat / Hourly)</label>
              <input type="text" class="form-control" value="${escapeHtml(d.payment_type)}" oninput="updateDocField('payment_type', this.value)">
            </div>
          </div>
          <div class="doc-form-group">
            <label>Payment Schedule & Milestones</label>
            <input type="text" class="form-control" value="${escapeHtml(d.payment_schedule)}" oninput="updateDocField('payment_schedule', this.value)">
          </div>
        </div>
      `;
    } else if (type === 'gear_rental') {
      html += `
        <div class="doc-section-card">
          <div class="doc-section-header">
            <span class="doc-section-title"><i class="fa-solid fa-boxes-stacked"></i> Rental Agreement & Custodian</span>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Agreement Number</label>
              <input type="text" class="form-control" value="${escapeHtml(d.rental_no)}" oninput="updateDocField('rental_no', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Agreement Date</label>
              <input type="date" class="form-control" value="${escapeHtml(d.agreement_date)}" oninput="updateDocField('agreement_date', this.value)">
            </div>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Custodian / Renter Name</label>
              <input type="text" class="form-control" value="${escapeHtml(d.renter_name)}" oninput="updateDocField('renter_name', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Driver's License # & State</label>
              <input type="text" class="form-control" value="${escapeHtml(d.renter_dl)}" oninput="updateDocField('renter_dl', this.value)">
            </div>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Email Address</label>
              <input type="email" class="form-control" value="${escapeHtml(d.renter_email)}" oninput="updateDocField('renter_email', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Phone Number</label>
              <input type="text" class="form-control" value="${escapeHtml(d.renter_phone)}" oninput="updateDocField('renter_phone', this.value)">
            </div>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Scheduled Checkout Date & Time</label>
              <input type="text" class="form-control" value="${escapeHtml(d.checkout_date)}" oninput="updateDocField('checkout_date', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Scheduled Return Date & Time</label>
              <input type="text" class="form-control" value="${escapeHtml(d.return_date)}" oninput="updateDocField('return_date', this.value)">
            </div>
          </div>
        </div>

        <div class="doc-section-card">
          <div class="doc-section-header">
            <span class="doc-section-title"><i class="fa-solid fa-volume-high"></i> Itemized Gear Roster (${d.gear_items.length})</span>
            <button type="button" class="btn btn-primary btn-sm" onclick="addGearItem()">
              <i class="fa-solid fa-plus"></i> Add Gear Item
            </button>
          </div>
          <div id="gear-items-list">
            ${d.gear_items.map((g, i) => `
              <div class="doc-dynamic-row">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                  <strong style="color: var(--primary); font-size: 0.82rem;">Gear Item #${i + 1}</strong>
                  ${d.gear_items.length > 1 ? `
                    <button type="button" class="btn-row-del" onclick="removeGearItem(${i})" title="Remove item">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  ` : ''}
                </div>
                <div class="doc-form-row">
                  <div class="doc-form-group" style="flex: 2;">
                    <label>Description & Model</label>
                    <input type="text" class="form-control" value="${escapeHtml(g.desc)}" oninput="updateGearField(${i}, 'desc', this.value)">
                  </div>
                  <div class="doc-form-group" style="flex: 1.2;">
                    <label>Serial Number</label>
                    <input type="text" class="form-control" value="${escapeHtml(g.serial)}" oninput="updateGearField(${i}, 'serial', this.value)">
                  </div>
                </div>
                <div class="doc-form-row">
                  <div class="doc-form-group" style="flex: 1.5;">
                    <label>Condition at Checkout</label>
                    <input type="text" class="form-control" value="${escapeHtml(g.condition)}" oninput="updateGearField(${i}, 'condition', this.value)">
                  </div>
                  <div class="doc-form-group" style="flex: 1;">
                    <label>Replacement Value ($)</label>
                    <input type="number" step="0.01" class="form-control" value="${g.replacement_val}" oninput="updateGearField(${i}, 'replacement_val', parseFloat(this.value) || 0)">
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="doc-section-card">
          <div class="doc-section-header">
            <span class="doc-section-title"><i class="fa-solid fa-receipt"></i> Rental Pricing & Security Deposit</span>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Rental Fee ($)</label>
              <input type="number" step="0.01" class="form-control" value="${d.rental_fee}" oninput="updateDocField('rental_fee', parseFloat(this.value) || 0)">
            </div>
            <div class="doc-form-group">
              <label>Security Deposit ($)</label>
              <input type="number" step="0.01" class="form-control" value="${d.deposit_amount}" oninput="updateDocField('deposit_amount', parseFloat(this.value) || 0)">
            </div>
            <div class="doc-form-group">
              <label>Late Return Fee ($/day)</label>
              <input type="number" step="0.01" class="form-control" value="${d.late_fee_daily}" oninput="updateDocField('late_fee_daily', parseFloat(this.value) || 0)">
            </div>
          </div>
        </div>
      `;
    } else if (type === 'custom') {
      html += `
        <div class="doc-section-card">
          <div class="doc-section-header">
            <span class="doc-section-title"><i class="fa-solid fa-pen-nib"></i> Document Header</span>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group" style="flex: 2;">
              <label>Document Title</label>
              <input type="text" class="form-control" value="${escapeHtml(d.doc_title)}" oninput="updateDocField('doc_title', this.value)">
            </div>
            <div class="doc-form-group" style="flex: 1;">
              <label>Reference #</label>
              <input type="text" class="form-control" value="${escapeHtml(d.reference_no)}" oninput="updateDocField('reference_no', this.value)">
            </div>
            <div class="doc-form-group" style="flex: 1;">
              <label>Date</label>
              <input type="date" class="form-control" value="${escapeHtml(d.doc_date)}" oninput="updateDocField('doc_date', this.value)">
            </div>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Prepared For / Addressee</label>
              <input type="text" class="form-control" value="${escapeHtml(d.prepared_for)}" oninput="updateDocField('prepared_for', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Subject Line</label>
              <input type="text" class="form-control" value="${escapeHtml(d.subject)}" oninput="updateDocField('subject', this.value)">
            </div>
          </div>
        </div>

        <div class="doc-section-card">
          <div class="doc-section-header">
            <span class="doc-section-title"><i class="fa-solid fa-paragraph"></i> Document Body & Clauses</span>
          </div>
          <div class="doc-form-group">
            <textarea class="form-control" rows="10" oninput="updateDocField('body_content', this.value)">${escapeHtml(d.body_content)}</textarea>
          </div>
        </div>

        <div class="doc-section-card">
          <div class="doc-section-header">
            <span class="doc-section-title"><i class="fa-solid fa-signature"></i> Signatory Authorization</span>
          </div>
          <div class="doc-form-row">
            <div class="doc-form-group">
              <label>Authorized Signatory Name</label>
              <input type="text" class="form-control" value="${escapeHtml(d.signatory_name)}" oninput="updateDocField('signatory_name', this.value)">
            </div>
            <div class="doc-form-group">
              <label>Title / Capacity</label>
              <input type="text" class="form-control" value="${escapeHtml(d.signatory_title)}" oninput="updateDocField('signatory_title', this.value)">
            </div>
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
    if (type === 'split_sheet') {
      updateSplitMeter();
    }
  }

  // Two-way bindings
  window.updateDocField = function (field, value) {
    window.docStudioState.data[field] = value;
    updateLiveDocumentPreview();
  };

  // Contributor helpers
  window.updateContributorField = function (index, field, value) {
    if (!window.docStudioState.data.contributors[index]) return;
    window.docStudioState.data.contributors[index][field] = value;
    updateLiveDocumentPreview();
    updateSplitMeter();
  };

  window.addSplitContributor = function () {
    window.docStudioState.data.contributors.push({
      name: '',
      alias: '',
      role: 'Songwriter / Composer',
      pro: 'ASCAP',
      ipi: '',
      publisher: '',
      composition_split: 0.0,
      master_split: 0.0
    });
    renderFormForActiveType();
    updateLiveDocumentPreview();
  };

  window.removeSplitContributor = function (index) {
    if (window.docStudioState.data.contributors.length <= 1) return;
    window.docStudioState.data.contributors.splice(index, 1);
    renderFormForActiveType();
    updateLiveDocumentPreview();
  };

  window.equalizeSplitPercentages = function () {
    const list = window.docStudioState.data.contributors;
    if (!list || list.length === 0) return;
    const count = list.length;
    const baseShare = Math.floor((100 / count) * 100) / 100;
    const remainder = Math.round((100 - baseShare * count) * 100) / 100;

    list.forEach((c, idx) => {
      const share = idx === 0 ? baseShare + remainder : baseShare;
      c.composition_split = share;
      c.master_split = share;
    });

    renderFormForActiveType();
    updateLiveDocumentPreview();
  };

  function updateSplitMeter() {
    const el = document.getElementById('split-meter-box');
    if (!el || window.docStudioState.activeType !== 'split_sheet') return;

    const list = window.docStudioState.data.contributors || [];
    const compTotal = list.reduce((sum, c) => sum + (parseFloat(c.composition_split) || 0), 0);
    const mastTotal = list.reduce((sum, c) => sum + (parseFloat(c.master_split) || 0), 0);

    const compValid = Math.abs(compTotal - 100) < 0.05;
    const mastValid = Math.abs(mastTotal - 100) < 0.05;

    el.innerHTML = `
      <div>
        <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Composition Split Total</div>
        <div class="split-meter-val ${compValid ? 'valid' : 'invalid'}">
          ${compTotal.toFixed(2)}% ${compValid ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-triangle-exclamation"></i>'}
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Master Recording Total</div>
        <div class="split-meter-val ${mastValid ? 'valid' : 'invalid'}">
          ${mastTotal.toFixed(2)}% ${mastValid ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-triangle-exclamation"></i>'}
        </div>
      </div>
    `;
  }

  // Quote item helpers
  window.updateQuoteItem = function (index, field, value) {
    const item = window.docStudioState.data.line_items[index];
    if (!item) return;
    item[field] = value;
    item.amount = (item.quantity || 1) * (item.rate || 0);
    updateLiveDocumentPreview();
  };

  window.addQuoteLineItem = function () {
    window.docStudioState.data.line_items.push({
      name: 'Additional Sound / Lighting Option',
      quantity: 1,
      rate: 150.00,
      amount: 150.00
    });
    renderFormForActiveType();
    updateLiveDocumentPreview();
  };

  window.removeQuoteLineItem = function (index) {
    window.docStudioState.data.line_items.splice(index, 1);
    renderFormForActiveType();
    updateLiveDocumentPreview();
  };

  // Gear item helpers
  window.updateGearField = function (index, field, value) {
    const item = window.docStudioState.data.gear_items[index];
    if (!item) return;
    item[field] = value;
    updateLiveDocumentPreview();
  };

  window.addGearItem = function () {
    window.docStudioState.data.gear_items.push({
      desc: 'QSC K12.2 Powered 12" Loudspeaker',
      serial: 'SN-QSC-NEW',
      condition: 'Excellent',
      replacement_val: 950.00
    });
    renderFormForActiveType();
    updateLiveDocumentPreview();
  };

  window.removeGearItem = function (index) {
    if (window.docStudioState.data.gear_items.length <= 1) return;
    window.docStudioState.data.gear_items.splice(index, 1);
    renderFormForActiveType();
    updateLiveDocumentPreview();
  };

  // =========================================================================
  // BRANDED LETTERHEAD HELPERS
  // =========================================================================
  function renderPaperHeader(docTypeName, metaDetailsHtml) {
    return `
      <div class="paper-header">
        <div class="paper-brand">
          <img src="assets/images/branding/Thunder House Logo-PNG.png" alt="Thunder House Logo">
          <div class="paper-brand-text">
            <h1>Thunder House Entertainment LLC</h1>
            <div class="tagline">Oklahoma City's Premier DJ, MC & Production Experience • Father & Son Duo</div>
            <div class="contact-sub">
              Oklahoma City, OK 73102 • info@thunderhouseent.com • (800) 555-THUN • thunderhouseent.com
            </div>
          </div>
        </div>
        <div class="paper-meta-badge">
          <div class="paper-doc-type">${docTypeName}</div>
          <div class="paper-meta-details">
            ${metaDetailsHtml}
            <div>Jurisdiction: <strong>State of Oklahoma</strong></div>
          </div>
        </div>
      </div>
    `;
  }

  function renderPaperFooter() {
    return `
      <div class="paper-footer">
        <div class="paper-footer-tagline">
          Thunder House Entertainment LLC • Official Corporate Document • Oklahoma City, OK
        </div>
        <div>
          thunderhouseent.com • Legally Binding & Confidential
        </div>
      </div>
    `;
  }

  // =========================================================================
  // LIVE LETTERHEAD PREVIEW GENERATOR
  // =========================================================================
  window.updateLiveDocumentPreview = function () {
    const stage = document.getElementById('live-rendered-doc-paper');
    if (!stage) return;

    const type = window.docStudioState.activeType;
    const d = window.docStudioState.data;

    let contentHtml = '';

    if (type === 'split_sheet') {
      const compTotal = d.contributors.reduce((s, c) => s + (parseFloat(c.composition_split) || 0), 0);
      const mastTotal = d.contributors.reduce((s, c) => s + (parseFloat(c.master_split) || 0), 0);

      contentHtml = renderPaperHeader('Music Production Split Sheet', `
        <div>Date: <strong>${d.record_date}</strong></div>
        <div>ISRC: <strong>${escapeHtml(d.isrc_code)}</strong></div>
      `);

      contentHtml += `
        <div class="paper-section">
          <div class="paper-section-title"><i class="fa-solid fa-compact-disc"></i> Sound Recording & Track Metadata</div>
          <div class="paper-grid-2">
            <div class="paper-field-block">
              <div class="paper-field-label">Composition / Track Title</div>
              <div class="paper-field-value" style="font-size: 1.15rem; color: #000; font-weight: 800;">"${escapeHtml(d.track_title)}"</div>
            </div>
            <div class="paper-field-block">
              <div class="paper-field-label">Performing Artist / Feature</div>
              <div class="paper-field-value" style="font-size: 1.05rem; color: #000;">${escapeHtml(d.artist_name)}</div>
            </div>
          </div>
          <div class="paper-grid-3">
            <div class="paper-field-block">
              <div class="paper-field-label">Primary Producer(s)</div>
              <div class="paper-field-value">${escapeHtml(d.producer_name)}</div>
            </div>
            <div class="paper-field-block">
              <div class="paper-field-label">Recording Facility / DAW</div>
              <div class="paper-field-value">${escapeHtml(d.studio_name)}</div>
            </div>
            <div class="paper-field-block">
              <div class="paper-field-label">Record Label / Distributor</div>
              <div class="paper-field-value">${escapeHtml(d.record_label)}</div>
            </div>
          </div>
          <div class="paper-grid-2" style="margin-top: 0.35rem;">
            <div class="paper-field-block">
              <div class="paper-field-label">ISWC Work ID</div>
              <div class="paper-field-value">${escapeHtml(d.iswc_code || 'Pending')}</div>
            </div>
            <div class="paper-field-block">
              <div class="paper-field-label">Sample Clearance Declaration</div>
              <div class="paper-field-value">${escapeHtml(d.sample_clearance)}</div>
            </div>
          </div>
        </div>

        <div class="paper-section">
          <div class="paper-section-title"><i class="fa-solid fa-users-viewfinder"></i> Ownership Shares & Royalty Split Schedule</div>
          <table class="paper-table">
            <thead>
              <tr>
                <th>Contributor / Alias</th>
                <th>Role</th>
                <th>PRO & IPI #</th>
                <th>Publisher / Admin</th>
                <th style="text-align: right;">Composition %</th>
                <th style="text-align: right;">Master Sound %</th>
              </tr>
            </thead>
            <tbody>
              ${d.contributors.map(c => `
                <tr>
                  <td>
                    <strong>${escapeHtml(c.name || 'Contributor')}</strong>
                    ${c.alias ? `<br><small style="color: #64748b;">(aka ${escapeHtml(c.alias)})</small>` : ''}
                  </td>
                  <td>${escapeHtml(c.role || 'Writer')}</td>
                  <td>${escapeHtml(c.pro || 'None')} ${c.ipi ? `• ${escapeHtml(c.ipi)}` : ''}</td>
                  <td>${escapeHtml(c.publisher || 'Direct / Self-Published')}</td>
                  <td style="text-align: right; font-weight: 700; color: #000;">${(parseFloat(c.composition_split) || 0).toFixed(2)}%</td>
                  <td style="text-align: right; font-weight: 700; color: #000;">${(parseFloat(c.master_split) || 0).toFixed(2)}%</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" style="text-align: right; text-transform: uppercase;">Total Aggregate Percentage:</td>
                <td style="text-align: right; color: ${Math.abs(compTotal - 100) < 0.05 ? '#166534' : '#991b1b'}; font-weight: 800;">
                  ${compTotal.toFixed(2)}%
                </td>
                <td style="text-align: right; color: ${Math.abs(mastTotal - 100) < 0.05 ? '#166534' : '#991b1b'}; font-weight: 800;">
                  ${mastTotal.toFixed(2)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="paper-clause-box">
          <p><strong>LEGAL DECLARATION & WARRANTIES:</strong> The undersigned co-authors, producers, and contributors hereby certify that their respective contributions to the composition and sound recording identified above are original and do not infringe upon any third-party copyrights or proprietary rights. Each contributor affirms the percentage splits indicated above represent the full and complete distribution of publishing, songwriting, mechanical royalties, and sound recording master ownership. Governed under the laws of the State of Oklahoma.</p>
          ${d.notes ? `<p style="margin-top: 0.4rem; font-style: italic;"><strong>Additional Provisions:</strong> ${escapeHtml(d.notes)}</p>` : ''}
        </div>

        <div class="paper-sig-grid">
          ${d.contributors.map(c => `
            <div class="paper-sig-block">
              <div class="paper-sig-line">${c.name ? escapeHtml(c.name) : ''}</div>
              <div class="paper-sig-name">${escapeHtml(c.name || 'Contributor Name')}</div>
              <div class="paper-sig-role">${escapeHtml(c.role || 'Author / Producer')}</div>
              <div class="paper-sig-date">Date: ________________________</div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (type === 'client_quote') {
      const itemsSum = d.line_items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
      const subtotal = (parseFloat(d.package_rate) || 0) + itemsSum;
      const total = subtotal + (parseFloat(d.travel_fee) || 0) - (parseFloat(d.discount) || 0);
      const retainer = total * ((parseFloat(d.retainer_percent) || 50) / 100);
      const balance = total - retainer;

      contentHtml = renderPaperHeader('Client Quote & Service Estimate', `
        <div>Quote #: <strong>${escapeHtml(d.quote_no)}</strong></div>
        <div>Issue Date: <strong>${d.quote_date}</strong></div>
        <div>Valid Through: <strong>${d.valid_until}</strong></div>
      `);

      contentHtml += `
        <div class="paper-section">
          <div class="paper-grid-2">
            <div>
              <div class="paper-section-title"><i class="fa-solid fa-user-check"></i> Prepared Exclusively For</div>
              <div class="paper-field-block">
                <div class="paper-field-value" style="font-size: 1.1rem; font-weight: 800; color: #000;">${escapeHtml(d.client_name)}</div>
                ${d.client_company ? `<div style="color: #64748b; font-size: 0.85rem;">${escapeHtml(d.client_company)}</div>` : ''}
              </div>
              <div class="paper-field-block">
                <div class="paper-field-label">Contact Details</div>
                <div class="paper-field-value">${escapeHtml(d.client_email)} • ${escapeHtml(d.client_phone)}</div>
                ${d.client_address ? `<div style="font-size: 0.8rem; color: #64748b;">${escapeHtml(d.client_address)}</div>` : ''}
              </div>
            </div>
            <div>
              <div class="paper-section-title"><i class="fa-solid fa-calendar-star"></i> Event Details & Venue</div>
              <div class="paper-field-block">
                <div class="paper-field-label">Event Date & Occasion</div>
                <div class="paper-field-value" style="font-weight: 800; color: #000;">${d.event_date} (${escapeHtml(d.event_type)})</div>
              </div>
              <div class="paper-field-block">
                <div class="paper-field-label">Location / Venue</div>
                <div class="paper-field-value">${escapeHtml(d.venue_name)}</div>
                <div style="font-size: 0.8rem; color: #64748b;">${escapeHtml(d.venue_address)}</div>
              </div>
              <div class="paper-field-block">
                <div class="paper-field-label">Scheduled Hours & Guests</div>
                <div class="paper-field-value">${escapeHtml(d.event_time)} • ~${d.guest_count} Attendees</div>
              </div>
            </div>
          </div>
        </div>

        <div class="paper-section">
          <div class="paper-section-title"><i class="fa-solid fa-list-check"></i> Itemized Services & Production Upgrades</div>
          <table class="paper-table">
            <thead>
              <tr>
                <th style="width: 55%;">Package / Service Description</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Unit Investment</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>${escapeHtml(d.package_name)}</strong>
                  <div style="font-size: 0.78rem; color: #64748b; margin-top: 0.2rem;">${escapeHtml(d.package_desc)}</div>
                </td>
                <td style="text-align: center;">1</td>
                <td style="text-align: right;">$${(parseFloat(d.package_rate) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style="text-align: right; font-weight: 700; color: #000;">$${(parseFloat(d.package_rate) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
              ${d.line_items.map(it => `
                <tr>
                  <td><strong>${escapeHtml(it.name)}</strong></td>
                  <td style="text-align: center;">${it.quantity}</td>
                  <td style="text-align: right;">$${(parseFloat(it.rate) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td style="text-align: right; font-weight: 700; color: #000;">$${(parseFloat(it.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="text-align: right;">Subtotal:</td>
                <td style="text-align: right; font-weight: 700;">$${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
              ${d.travel_fee > 0 ? `
                <tr>
                  <td colspan="3" style="text-align: right;">Travel / Mileage & Logistics:</td>
                  <td style="text-align: right;">+$${parseFloat(d.travel_fee).toFixed(2)}</td>
                </tr>
              ` : ''}
              ${d.discount > 0 ? `
                <tr>
                  <td colspan="3" style="text-align: right; color: #166534;">Promotional Courtesy Discount:</td>
                  <td style="text-align: right; color: #166534;">-$${parseFloat(d.discount).toFixed(2)}</td>
                </tr>
              ` : ''}
              <tr style="font-size: 1.05rem; background: #f1f5f9;">
                <td colspan="3" style="text-align: right; font-weight: 800; color: #000;">TOTAL ESTIMATED INVESTMENT:</td>
                <td style="text-align: right; font-weight: 800; color: #000;">$${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td colspan="3" style="text-align: right; color: #b45309; font-weight: 700;">Required Date-Hold Retainer (${d.retainer_percent}%):</td>
                <td style="text-align: right; color: #b45309; font-weight: 800;">$${retainer.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td colspan="3" style="text-align: right;">Remaining Balance Due (7 Days Prior):</td>
                <td style="text-align: right; font-weight: 700;">$${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="paper-clause-box">
          <p><strong>RESERVATION TERMS & CONDITIONS:</strong> ${escapeHtml(d.terms_note)} To lock your date on the Thunder House ENT official master schedule, a signed agreement and 50% non-refundable retainer are required. In the event of date postponement, payments may be credited towards a mutually available calendar date within 12 calendar months.</p>
        </div>

        <div class="paper-sig-grid">
          <div class="paper-sig-block">
            <div class="paper-sig-line">Thunder House Entertainment LLC</div>
            <div class="paper-sig-name">Thunder House Entertainment LLC</div>
            <div class="paper-sig-role">Authorized Event Producer</div>
            <div class="paper-sig-date">Date: ${d.quote_date}</div>
          </div>
          <div class="paper-sig-block">
            <div class="paper-sig-line"></div>
            <div class="paper-sig-name">${escapeHtml(d.client_name)} (Client Acceptance)</div>
            <div class="paper-sig-role">Purchaser Signature</div>
            <div class="paper-sig-date">Date: ________________________</div>
          </div>
        </div>
      `;
    } else if (type === 'photo_release') {
      contentHtml = renderPaperHeader('Model & Media Release', `
        <div>Effective Date: <strong>${d.release_date}</strong></div>
      `);

      contentHtml += `
        <div class="paper-section">
          <div class="paper-section-title"><i class="fa-solid fa-id-badge"></i> Talent / Model & Production Identification</div>
          <div class="paper-grid-2">
            <div class="paper-field-block">
              <div class="paper-field-label">Talent / Model Full Legal Name</div>
              <div class="paper-field-value" style="font-size: 1.15rem; font-weight: 800; color: #000;">${escapeHtml(d.talent_name)}</div>
              ${d.talent_alias ? `<div style="color: #64748b; font-size: 0.85rem;">(Professional Alias: ${escapeHtml(d.talent_alias)})</div>` : ''}
            </div>
            <div class="paper-field-block">
              <div class="paper-field-label">Production / Project Title</div>
              <div class="paper-field-value" style="font-size: 1.05rem; font-weight: 700; color: #000;">${escapeHtml(d.project_title)}</div>
            </div>
          </div>
          <div class="paper-grid-3" style="margin-top: 0.5rem;">
            <div class="paper-field-block">
              <div class="paper-field-label">Talent Contact</div>
              <div class="paper-field-value">${escapeHtml(d.talent_phone)}<br>${escapeHtml(d.talent_email)}</div>
            </div>
            <div class="paper-field-block">
              <div class="paper-field-label">Street Address</div>
              <div class="paper-field-value">${escapeHtml(d.talent_address)}</div>
            </div>
            <div class="paper-field-block">
              <div class="paper-field-label">Shoot Date & Location</div>
              <div class="paper-field-value">${d.release_date}<br>${escapeHtml(d.location)}</div>
            </div>
          </div>
        </div>

        <div class="paper-clause-box">
          <p><strong>1. PERPETUAL GRANT OF RIGHTS:</strong> For valuable consideration received and acknowledged, the undersigned ("Talent") irrevocably grants to Thunder House Entertainment LLC, its licensees, successors, and assigns (collectively "Company"), the perpetual, unrestricted, worldwide right and permission to copyright, use, publish, broadcast, reproduce, license, stream, edit, and commercially exploit photographs, video footage, audio recordings, motion pictures, and likeness of Talent taken or created in connection with the Production identified above.</p>
          <p><strong>2. MEDIA PLATFORMS:</strong> This authorization encompasses all current and future media formats including, without limitation: commercial advertisements, website hero visual media, YouTube broadcasts, Instagram/TikTok promotional content, marketing trailers, broadcast television, print collateral, and live event stage visuals (${escapeHtml(d.custom_rights)}).</p>
          <p><strong>3. WAIVER OF INSPECTION & MORAL RIGHTS:</strong> Talent waives any right to inspect, review, or approve finished prints, audio edits, visual effects, or commercial copy. Talent further waives any claims for invasion of privacy, right of publicity, or defamation.</p>
          <p><strong>4. CONSIDERATION ACKNOWLEDGMENT:</strong> ${escapeHtml(d.compensation_type)}.</p>
        </div>

        ${d.is_minor ? `
          <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 0.85rem; border-radius: 4px; margin-bottom: 1.25rem;">
            <strong style="color: #92400e; font-size: 0.82rem; text-transform: uppercase;">Minor / Guardian Consent:</strong>
            <p style="margin: 0.25rem 0 0 0; font-size: 0.8rem; color: #78350f;">
              I certify that I am the parent or legal guardian of <strong>${escapeHtml(d.talent_name)}</strong> (a minor), and I have the full legal authority to execute this release on the minor's behalf.
            </p>
          </div>
        ` : ''}

        <div class="paper-sig-grid">
          <div class="paper-sig-block">
            <div class="paper-sig-line">${d.talent_name ? escapeHtml(d.talent_name) : ''}</div>
            <div class="paper-sig-name">${escapeHtml(d.talent_name)}</div>
            <div class="paper-sig-role">Talent / Model Signature</div>
            <div class="paper-sig-date">Date: ${d.release_date}</div>
          </div>
          ${d.is_minor ? `
            <div class="paper-sig-block">
              <div class="paper-sig-line"></div>
              <div class="paper-sig-name">${escapeHtml(d.guardian_name || 'Parent / Legal Guardian')}</div>
              <div class="paper-sig-role">Parent / Guardian Signature (${escapeHtml(d.guardian_relation || 'Parent')})</div>
              <div class="paper-sig-date">Date: ________________________</div>
            </div>
          ` : `
            <div class="paper-sig-block">
              <div class="paper-sig-line">Thunder House Entertainment LLC</div>
              <div class="paper-sig-name">Thunder House Entertainment LLC</div>
              <div class="paper-sig-role">Company Witness & Producer</div>
              <div class="paper-sig-date">Date: ${d.release_date}</div>
            </div>
          `}
        </div>
      `;
    } else if (type === 'performance_contract') {
      contentHtml = renderPaperHeader('Artist Performance Agreement', `
        <div>Contract #: <strong>${escapeHtml(d.contract_no)}</strong></div>
        <div>Agreement Date: <strong>${d.contract_date}</strong></div>
      `);

      contentHtml += `
        <div class="paper-section">
          <div class="paper-grid-2">
            <div>
              <div class="paper-section-title"><i class="fa-solid fa-handshake-angle"></i> Contracting Parties</div>
              <div class="paper-field-block">
                <div class="paper-field-label">Purchaser / Employer</div>
                <div class="paper-field-value" style="font-weight: 800; color: #000;">${escapeHtml(d.purchaser_name)}</div>
                ${d.purchaser_company ? `<div style="color: #64748b;">${escapeHtml(d.purchaser_company)}</div>` : ''}
                <div style="font-size: 0.8rem; color: #64748b; margin-top: 0.15rem;">${escapeHtml(d.purchaser_email)} • ${escapeHtml(d.purchaser_phone)}</div>
              </div>
              <div class="paper-field-block">
                <div class="paper-field-label">Performing Artist / Producer</div>
                <div class="paper-field-value" style="font-weight: 800; color: #000;">Thunder House Entertainment LLC</div>
                <div style="font-size: 0.8rem; color: #64748b;">Oklahoma City, OK • (800) 555-THUN • info@thunderhouseent.com</div>
              </div>
            </div>
            <div>
              <div class="paper-section-title"><i class="fa-solid fa-calendar-day"></i> Engagement & Venue</div>
              <div class="paper-field-block">
                <div class="paper-field-label">Event Occasion & Date</div>
                <div class="paper-field-value" style="font-weight: 800; color: #000;">${escapeHtml(d.event_title)} (${d.event_date})</div>
              </div>
              <div class="paper-field-block">
                <div class="paper-field-label">Venue Location</div>
                <div class="paper-field-value">${escapeHtml(d.venue_name)}</div>
                <div style="font-size: 0.8rem; color: #64748b;">${escapeHtml(d.venue_address)}</div>
              </div>
              <div class="paper-field-block">
                <div class="paper-field-label">Schedule Times</div>
                <div class="paper-field-value">Load-in: ${escapeHtml(d.loadin_time)}<br>Performance: ${escapeHtml(d.performance_time)}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="paper-section">
          <div class="paper-section-title"><i class="fa-solid fa-coins"></i> Compensation Schedule</div>
          <table class="paper-table">
            <thead>
              <tr>
                <th>Payment Milestone</th>
                <th>Due Date / Terms</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Non-Refundable Retainer Deposit</strong></td>
                <td>Due upon contract signing to lock calendar date</td>
                <td style="text-align: right; font-weight: 700; color: #b45309;">$${(parseFloat(d.retainer_fee) || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td><strong>Remaining Balance</strong></td>
                <td>${escapeHtml(d.balance_due_terms)}</td>
                <td style="text-align: right; font-weight: 700;">$${(parseFloat(d.total_fee - d.retainer_fee) || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td><strong>Overtime Performance Rate</strong></td>
                <td>Per each additional 60 minutes requested on site</td>
                <td style="text-align: right; font-weight: 700;">$${(parseFloat(d.overtime_rate) || 0).toFixed(2)} / hr</td>
              </tr>
            </tbody>
            <tfoot>
              <tr style="background: #f1f5f9;">
                <td colspan="2" style="text-align: right; font-weight: 800; color: #000;">TOTAL CONTRACT GUARANTEE:</td>
                <td style="text-align: right; font-weight: 800; color: #000; font-size: 1.05rem;">$${(parseFloat(d.total_fee) || 0).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="paper-clause-box">
          <p><strong>TECHNICAL & HOSPITALITY RIDER:</strong></p>
          <p>• <strong>Staging:</strong> ${escapeHtml(d.staging_reqs)}</p>
          <p>• <strong>Electrical Power:</strong> ${escapeHtml(d.power_reqs)}</p>
          <p>• <strong>Hospitality & Access:</strong> ${escapeHtml(d.hospitality_reqs)}</p>
          <p style="margin-top: 0.5rem;"><strong>CANCELLATION & FORCE MAJEURE:</strong> In the event Purchaser cancels within 14 days of the scheduled performance, the entire balance remains due. If performance is prevented by Acts of God, civil disorder, or extreme weather, neither party shall be held liable, and payments may be applied to a rescheduled date.</p>
        </div>

        <div class="paper-sig-grid">
          <div class="paper-sig-block">
            <div class="paper-sig-line">Thunder House Entertainment LLC</div>
            <div class="paper-sig-name">Thunder House Entertainment LLC</div>
            <div class="paper-sig-role">Artist / DJ Representative</div>
            <div class="paper-sig-date">Date: ${d.contract_date}</div>
          </div>
          <div class="paper-sig-block">
            <div class="paper-sig-line"></div>
            <div class="paper-sig-name">${escapeHtml(d.purchaser_name)}</div>
            <div class="paper-sig-role">Purchaser Authorized Signature</div>
            <div class="paper-sig-date">Date: ________________________</div>
          </div>
        </div>
      `;
    } else if (type === 'work_for_hire') {
      contentHtml = renderPaperHeader('Work-For-Hire Agreement', `
        <div>Effective: <strong>${d.agreement_date}</strong></div>
        <div>Venue: <strong>${escapeHtml(d.governing_county)}</strong></div>
      `);

      contentHtml += `
        <div class="paper-section">
          <div class="paper-section-title"><i class="fa-solid fa-user-shield"></i> Contractor & Engagement Identification</div>
          <div class="paper-grid-2">
            <div class="paper-field-block">
              <div class="paper-field-label">Contractor Legal Name</div>
              <div class="paper-field-value" style="font-size: 1.15rem; font-weight: 800; color: #000;">${escapeHtml(d.contractor_name)}</div>
              ${d.contractor_dba ? `<div style="color: #64748b; font-size: 0.85rem;">(DBA: ${escapeHtml(d.contractor_dba)})</div>` : ''}
              <div style="font-size: 0.8rem; color: #64748b; margin-top: 0.2rem;">Role: <strong>${escapeHtml(d.contractor_role)}</strong> • Tax ID: ${escapeHtml(d.tax_id)}</div>
            </div>
            <div class="paper-field-block">
              <div class="paper-field-label">Hiring Company</div>
              <div class="paper-field-value" style="font-weight: 800; color: #000;">Thunder House Entertainment LLC</div>
              <div style="font-size: 0.8rem; color: #64748b;">Oklahoma City, Oklahoma • Managing Member Office</div>
            </div>
          </div>
          <div class="paper-field-block" style="margin-top: 0.75rem;">
            <div class="paper-field-label">Project / Engagement Title</div>
            <div class="paper-field-value" style="font-size: 1rem; font-weight: 700; color: #000;">${escapeHtml(d.engagement_title)}</div>
          </div>
        </div>

        <div class="paper-clause-box">
          <p><strong>1. SCOPE OF ENGAGEMENT:</strong> ${escapeHtml(d.scope_of_work)}</p>
          <p><strong>2. WORK-FOR-HIRE & IP OWNERSHIP:</strong> Contractor expressly acknowledges and agrees that all works of authorship, video footage, sound recordings, audio mixes, master recordings, musical stems, photographs, and edits created by Contractor under this agreement constitute a "work made for hire" as defined under the United States Copyright Act (17 U.S.C. § 101). Thunder House Entertainment LLC shall be the sole and exclusive owner of all copyrights, trademarks, and intellectual property rights worldwide in perpetuity.</p>
          <p><strong>3. INDEPENDENT CONTRACTOR STATUS:</strong> Contractor performs all services as an independent contractor and not as an employee. Contractor is solely responsible for all federal, state, and local income taxes, self-employment taxes, and personal liability insurance.</p>
          <p><strong>4. CONFIDENTIALITY:</strong> Contractor shall treat all client lists, trade secrets, proprietary production techniques, and unreleased musical tracks as strictly confidential.</p>
          <p><strong>5. COMPENSATION:</strong> Company shall pay Contractor <strong>$${(parseFloat(d.compensation_rate) || 0).toFixed(2)}</strong> (${escapeHtml(d.payment_type)}). ${escapeHtml(d.payment_schedule)}.</p>
        </div>

        <div class="paper-sig-grid">
          <div class="paper-sig-block">
            <div class="paper-sig-line">Thunder House Entertainment LLC</div>
            <div class="paper-sig-name">Thunder House Entertainment LLC</div>
            <div class="paper-sig-role">Company Authorized Officer</div>
            <div class="paper-sig-date">Date: ${d.agreement_date}</div>
          </div>
          <div class="paper-sig-block">
            <div class="paper-sig-line">${d.contractor_name ? escapeHtml(d.contractor_name) : ''}</div>
            <div class="paper-sig-name">${escapeHtml(d.contractor_name)}</div>
            <div class="paper-sig-role">Independent Contractor Signature</div>
            <div class="paper-sig-date">Date: ${d.agreement_date}</div>
          </div>
        </div>
      `;
    } else if (type === 'gear_rental') {
      const totalReplacement = d.gear_items.reduce((s, g) => s + (parseFloat(g.replacement_val) || 0), 0);

      contentHtml = renderPaperHeader('Equipment Custody Agreement', `
        <div>Agreement #: <strong>${escapeHtml(d.rental_no)}</strong></div>
        <div>Date: <strong>${d.agreement_date}</strong></div>
      `);

      contentHtml += `
        <div class="paper-section">
          <div class="paper-grid-2">
            <div>
              <div class="paper-section-title"><i class="fa-solid fa-user-check"></i> Custodian / Renter</div>
              <div class="paper-field-block">
                <div class="paper-field-value" style="font-size: 1.1rem; font-weight: 800; color: #000;">${escapeHtml(d.renter_name)}</div>
                <div style="font-size: 0.8rem; color: #64748b;">${escapeHtml(d.renter_phone)} • ${escapeHtml(d.renter_email)}</div>
                <div style="font-size: 0.8rem; color: #64748b;">DL #: <strong>${escapeHtml(d.renter_dl)}</strong></div>
              </div>
            </div>
            <div>
              <div class="paper-section-title"><i class="fa-solid fa-clock"></i> Custody Window</div>
              <div class="paper-field-block">
                <div class="paper-field-label">Checkout Date & Time</div>
                <div class="paper-field-value">${escapeHtml(d.checkout_date)}</div>
              </div>
              <div class="paper-field-block">
                <div class="paper-field-label">Mandatory Return Date & Time</div>
                <div class="paper-field-value" style="font-weight: 800; color: #b45309;">${escapeHtml(d.return_date)}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="paper-section">
          <div class="paper-section-title"><i class="fa-solid fa-boxes-stacked"></i> Itemized Gear Manifest & Condition</div>
          <table class="paper-table">
            <thead>
              <tr>
                <th>Description & Model</th>
                <th>Serial Number</th>
                <th>Condition at Checkout</th>
                <th style="text-align: right;">Replacement Value</th>
              </tr>
            </thead>
            <tbody>
              ${d.gear_items.map(g => `
                <tr>
                  <td><strong>${escapeHtml(g.desc)}</strong></td>
                  <td><code>${escapeHtml(g.serial)}</code></td>
                  <td>${escapeHtml(g.condition)}</td>
                  <td style="text-align: right; font-weight: 700; color: #000;">$${(parseFloat(g.replacement_val) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="text-align: right; text-transform: uppercase;">Total Insured Equipment Value:</td>
                <td style="text-align: right; font-weight: 800; color: #000;">$${totalReplacement.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="paper-clause-box">
          <p><strong>CUSTODIAN RESPONSIBILITY & LIABILITY:</strong> The Custodian agrees that all equipment listed above has been inspected and received in operational working order. Custodian assumes full and strict liability for any damage, loss, water exposure, electrical surge damage, or theft occurring between checkout and physical check-in return at Thunder House Sound Labs. In the event of loss or irreparable damage, Custodian shall reimburse Thunder House Entertainment LLC the full Replacement Value stated above within seven (7) calendar days. Late returns incur a fee of $${parseFloat(d.late_fee_daily).toFixed(2)} per day.</p>
        </div>

        <div class="paper-sig-grid">
          <div class="paper-sig-block">
            <div class="paper-sig-line">Thunder House Entertainment LLC</div>
            <div class="paper-sig-name">Thunder House Gear Inspector</div>
            <div class="paper-sig-role">Checkout Verification</div>
            <div class="paper-sig-date">Date: ${d.agreement_date}</div>
          </div>
          <div class="paper-sig-block">
            <div class="paper-sig-line">${d.renter_name ? escapeHtml(d.renter_name) : ''}</div>
            <div class="paper-sig-name">${escapeHtml(d.renter_name)}</div>
            <div class="paper-sig-role">Custodian / Renter Signature</div>
            <div class="paper-sig-date">Date: ________________________</div>
          </div>
        </div>
      `;
    } else if (type === 'custom') {
      contentHtml = renderPaperHeader(escapeHtml(d.doc_title), `
        <div>Ref: <strong>${escapeHtml(d.reference_no)}</strong></div>
        <div>Date: <strong>${d.doc_date}</strong></div>
      `);

      contentHtml += `
        <div class="paper-section">
          <div class="paper-grid-2">
            <div class="paper-field-block">
              <div class="paper-field-label">Prepared For / Addressee</div>
              <div class="paper-field-value" style="font-size: 1.1rem; font-weight: 800; color: #000;">${escapeHtml(d.prepared_for)}</div>
            </div>
            <div class="paper-field-block">
              <div class="paper-field-label">Subject Matter</div>
              <div class="paper-field-value" style="font-size: 1.05rem; font-weight: 700; color: #000;">${escapeHtml(d.subject)}</div>
            </div>
          </div>
        </div>

        <div class="paper-section" style="margin-top: 1.25rem;">
          <div style="white-space: pre-line; line-height: 1.7; font-size: 0.92rem; color: #1e293b;">
            ${escapeHtml(d.body_content)}
          </div>
        </div>

        <div class="paper-sig-grid" style="margin-top: 3.5rem;">
          <div class="paper-sig-block" style="max-width: 320px;">
            <div class="paper-sig-line">${escapeHtml(d.signatory_name)}</div>
            <div class="paper-sig-name">${escapeHtml(d.signatory_name)}</div>
            <div class="paper-sig-role">${escapeHtml(d.signatory_title)}</div>
            <div class="paper-sig-date">Date: ${d.doc_date}</div>
          </div>
        </div>
      `;
    }

    // Append Standard Stationery Footer
    contentHtml += renderPaperFooter();

    stage.innerHTML = contentHtml;
  };

  // =========================================================================
  // DOCUMENT SAVING & VAULT STORAGE
  // =========================================================================
  window.saveCurrentDocument = async function () {
    const type = window.docStudioState.activeType;
    const d = window.docStudioState.data;

    let title = '';
    let ref = '';

    if (type === 'split_sheet') {
      title = `Split Sheet: ${d.track_title} (${d.artist_name})`;
      ref = d.isrc_code || 'SPL';
    } else if (type === 'client_quote') {
      title = `Quote: ${d.client_name} - ${d.package_name}`;
      ref = d.quote_no || 'QUO';
    } else if (type === 'photo_release') {
      title = `Talent Release: ${d.talent_name} (${d.project_title})`;
      ref = 'REL';
    } else if (type === 'performance_contract') {
      title = `Contract: ${d.purchaser_name} (${d.event_title})`;
      ref = d.contract_no || 'CTR';
    } else if (type === 'work_for_hire') {
      title = `Work-For-Hire: ${d.contractor_name} (${d.contractor_role})`;
      ref = 'WFH';
    } else if (type === 'gear_rental') {
      title = `Gear Rental: ${d.renter_name}`;
      ref = d.rental_no || 'RNT';
    } else {
      title = d.doc_title || 'Custom Document';
      ref = d.reference_no || 'DOC';
    }

    const docPayload = {
      id: d._id || ('doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)),
      doc_type: type,
      title: title,
      reference_no: ref,
      status: 'Final',
      content_json: d,
      updated_at: new Date().toISOString()
    };

    // Save to localStorage immediately
    saveToLocalStorage(docPayload);

    // If Supabase is available, sync to thunderhouse_documents
    if (window.supabaseClient) {
      try {
        const { error } = await window.supabaseClient
          .from('thunderhouse_documents')
          .upsert({
            doc_type: docPayload.doc_type,
            title: docPayload.title,
            reference_no: docPayload.reference_no,
            status: docPayload.status,
            content_json: docPayload.content_json,
            updated_at: docPayload.updated_at
          });

        if (error) {
          console.warn('Supabase save warning (saved to local vault):', error.message);
        }
      } catch (err) {
        console.warn('Network save fallback:', err);
      }
    }

    alert(`✅ Document Saved!\n\n"${title}" has been saved to your Document Vault.`);
    loadSavedDocuments();
  };

  function saveToLocalStorage(doc) {
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem('th_saved_documents') || '[]');
    } catch (e) {
      list = [];
    }
    const idx = list.findIndex(item => item.id === doc.id || (item.reference_no === doc.reference_no && item.title === doc.title));
    if (idx >= 0) {
      list[idx] = doc;
    } else {
      list.unshift(doc);
    }
    localStorage.setItem('th_saved_documents', JSON.stringify(list));
    window.docStudioState.savedDocs = list;
    updateVaultBadgeCount();
  }

  window.loadSavedDocuments = async function () {
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem('th_saved_documents') || '[]');
    } catch (e) {
      list = [];
    }

    if (window.supabaseClient) {
      try {
        const { data } = await window.supabaseClient
          .from('thunderhouse_documents')
          .select('*')
          .order('updated_at', { ascending: false });

        if (data && data.length) {
          data.forEach(dbItem => {
            if (!list.some(l => l.id === dbItem.id)) {
              list.push({
                id: dbItem.id,
                doc_type: dbItem.doc_type,
                title: dbItem.title,
                reference_no: dbItem.reference_no,
                status: dbItem.status,
                content_json: dbItem.content_json,
                updated_at: dbItem.updated_at
              });
            }
          });
        }
      } catch (e) {
        // silent
      }
    }

    window.docStudioState.savedDocs = list;
    updateVaultBadgeCount();
  };

  function updateVaultBadgeCount() {
    const count = window.docStudioState.savedDocs ? window.docStudioState.savedDocs.length : 0;
    const el = document.getElementById('doc-vault-badge-count');
    if (el) el.textContent = count;
    const elBtn = document.getElementById('doc-vault-badge-count-btn');
    if (elBtn) elBtn.textContent = count;
  }

  // Open Vault Modal
  window.openDocumentVaultModal = function () {
    const modal = document.getElementById('doc-vault-modal');
    if (!modal) return;
    renderVaultTable();
    modal.classList.add('show');
    modal.style.display = 'flex';
  };

  window.closeDocumentVaultModal = function () {
    const modal = document.getElementById('doc-vault-modal');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
  };

  function renderVaultTable() {
    const tbody = document.getElementById('doc-vault-table-body');
    if (!tbody) return;

    const list = window.docStudioState.savedDocs || [];
    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
            <i class="fa-solid fa-folder-open" style="font-size: 2rem; color: rgba(255, 255, 255, 0.2); display: block; margin-bottom: 0.5rem;"></i>
            No saved documents in vault yet. Create a document and click "Save Document".
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map((doc, idx) => {
      const typeLabel = doc.doc_type ? doc.doc_type.replace('_', ' ').toUpperCase() : 'DOCUMENT';
      const updatedStr = doc.updated_at ? new Date(doc.updated_at).toLocaleDateString() : 'Recent';

      return `
        <tr>
          <td>
            <strong style="color: #fff; font-size: 0.9rem;">${escapeHtml(doc.title || 'Untitled Document')}</strong>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(doc.reference_no || '---')}</div>
          </td>
          <td>
            <span class="status-badge" style="background: rgba(0, 229, 255, 0.12); color: var(--primary); border: 1px solid rgba(0, 229, 255, 0.3);">
              ${escapeHtml(typeLabel)}
            </span>
          </td>
          <td>
            <span class="status-badge paid" style="font-size: 0.72rem;">${escapeHtml(doc.status || 'Draft')}</span>
          </td>
          <td style="color: var(--text-muted); font-size: 0.82rem;">${updatedStr}</td>
          <td>
            <div style="display: flex; gap: 0.5rem;">
              <button type="button" class="btn btn-outline btn-sm" onclick="loadDocFromVault(${idx})" title="Open and Edit in Studio">
                <i class="fa-solid fa-pen-to-square"></i> Open
              </button>
              <button type="button" class="btn btn-outline btn-sm" onclick="deleteDocFromVault(${idx})" title="Delete from Vault" style="border-color: rgba(239, 68, 68, 0.4); color: #f87171;">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.loadDocFromVault = function (index) {
    const doc = window.docStudioState.savedDocs[index];
    if (!doc) return;

    window.docStudioState.activeType = doc.doc_type || 'split_sheet';
    window.docStudioState.data = JSON.parse(JSON.stringify(doc.content_json));

    document.querySelectorAll('.doc-template-card').forEach(c => {
      c.classList.toggle('active', c.dataset.type === doc.doc_type);
    });

    renderFormForActiveType();
    updateLiveDocumentPreview();
    closeDocumentVaultModal();
    alert(`📂 Loaded "${doc.title}" into Document Studio.`);
  };

  window.deleteDocFromVault = async function (index) {
    const doc = window.docStudioState.savedDocs[index];
    if (!doc) return;

    if (!confirm(`Delete "${doc.title}" from your saved documents?`)) return;

    window.docStudioState.savedDocs.splice(index, 1);
    localStorage.setItem('th_saved_documents', JSON.stringify(window.docStudioState.savedDocs));
    updateVaultBadgeCount();

    if (window.supabaseClient && doc.id) {
      try {
        await window.supabaseClient.from('thunderhouse_documents').delete().eq('id', doc.id);
      } catch (e) {
        // silent
      }
    }

    renderVaultTable();
  };

  // =========================================================================
  // PRINT & PDF ENGINE
  // =========================================================================
  window.printCurrentDocument = function () {
    if (window.docStudioState.activeType === 'split_sheet') {
      const list = window.docStudioState.data.contributors || [];
      const compTotal = list.reduce((s, c) => s + (parseFloat(c.composition_split) || 0), 0);
      const mastTotal = list.reduce((s, c) => s + (parseFloat(c.master_split) || 0), 0);

      if (Math.abs(compTotal - 100) >= 0.05 || Math.abs(mastTotal - 100) >= 0.05) {
        if (!confirm(`⚠️ Warning: Split percentages do not equal 100.00% (Composition: ${compTotal.toFixed(2)}%, Master: ${mastTotal.toFixed(2)}%). Do you still wish to proceed with printing?`)) {
          return;
        }
      }
    }

    window.print();
  };

  // Helper function to escape HTML
  function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();
