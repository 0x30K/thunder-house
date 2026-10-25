/**
 * Thunder House ENT - Production Admin Shell Engine
 * Manages Sidebar, Mobile Bottom Bar, Session/Role Authentication,
 * Real-Time Badges, Global New Lead Modal, and Toast Notifications.
 */

(function () {
  // Ensure System Error Logger is active across all admin views
  if (!window.ThunderLogger && typeof document !== 'undefined') {
    const s = document.createElement('script');
    s.src = '../js/system-logger.js';
    document.head.appendChild(s);
  }

  const NAV = [
    { id: 'today', href: 'today.html', icon: 'fa-house', label: 'Today' },
    { group: 'Broadcast' },
    { id: 'wire', href: 'wire.html', icon: 'fa-bolt', label: 'Thunder Wire', badgeId: 'nav-wire-count', gold: true },
    { group: 'Sell' },
    { id: 'leads', href: 'leads.html', icon: 'fa-inbox', label: 'Leads', badgeId: 'nav-leads-count' },
    { id: 'invoices', href: 'invoices.html', icon: 'fa-file-invoice-dollar', label: 'Quotes & Invoices' },
    { id: 'contracts', href: 'contracts.html', icon: 'fa-file-signature', label: 'Contracts & Vault' },
    { group: 'Perform' },
    { id: 'calendar', href: 'calendar.html', icon: 'fa-calendar-days', label: 'Calendar' },
    { id: 'gigs', href: 'gigs.html', icon: 'fa-compact-disc', label: 'Gigs Run-of-Show' },
    { id: 'gear', href: 'gear.html', icon: 'fa-boxes-stacked', label: 'Equipment Fleet', badgeId: 'nav-gear-count' },
    { id: 'consultations', href: 'consultations.html', icon: 'fa-clipboard-list', label: 'Consultations', badgeId: 'nav-consult-count', gold: true },
    { group: 'Business' },
    { id: 'analytics', href: 'analytics.html', icon: 'fa-chart-line', label: 'Website Analytics', gold: true },
    { id: 'clients', href: 'clients.html', icon: 'fa-users', label: 'Clients CRM' },
    { id: 'money', href: 'money.html', icon: 'fa-chart-column', label: 'Money Analytics' },
    { id: 'settings', href: 'settings.html', icon: 'fa-gear', label: 'Settings' }
  ];

  const page = document.body.dataset.page || '';

  // 1. Render Sidebar
  const sidebarEl = document.getElementById('sidebar');
  if (sidebarEl) {
    const links = NAV.map(item => {
      if (item.group) return `<div class="nav-group">${item.group}</div>`;
      const badge = item.badgeId ? `<span class="nav-count${item.gold ? ' gold' : ''}" id="${item.badgeId}" style="display:none">0</span>` : '';
      return `<a class="nav-link${item.id === page ? ' active' : ''}" href="${item.href}"><i class="fa-solid ${item.icon}"></i>${item.label}${badge}</a>`;
    }).join('');

    sidebarEl.innerHTML = `
      <a class="sidebar-brand" href="today.html">
        <img src="../assets/images/branding/Thunder%20House%20Logo-PNG.png" alt="Thunder House ENT">
        <div>
          <strong>THUNDER HOUSE</strong>
          <small>STAFF ADMIN</small>
        </div>
      </a>
      ${links}
      <div class="sidebar-foot">
        <a class="nav-link" href="../university.html"><i class="fa-solid fa-graduation-cap"></i>Thunder University</a>
        <a class="nav-link" href="../index.html" target="_blank"><i class="fa-solid fa-arrow-up-right-from-square"></i>View Public Website</a>
        <div class="user-chip" id="admin-user-chip">
          <div class="avatar" id="admin-user-avatar">TH</div>
          <div class="grow" style="min-width:0; overflow:hidden">
            <div id="admin-user-name" style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">Owner</div>
            <div class="muted" id="admin-user-role" style="font-size:0.72rem">Superuser</div>
          </div>
          <button id="admin-logout-btn" class="btn-icon" style="background:none; border:none; color:var(--text-muted); cursor:pointer" title="Log out">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
          </button>
        </div>
      </div>
    `;
  }

  // 2. Render Mobile Tab Bar
  const mobileBar = document.createElement('nav');
  mobileBar.className = 'mobile-tabbar';
  mobileBar.innerHTML = `
    <a href="today.html" class="${page === 'today' ? 'active' : ''}"><i class="fa-solid fa-house"></i><span>Today</span></a>
    <a href="leads.html" class="${page === 'leads' ? 'active' : ''}"><i class="fa-solid fa-inbox"></i><span>Leads</span></a>
    <a href="gigs.html" class="${page === 'gigs' ? 'active' : ''}"><i class="fa-solid fa-compact-disc"></i><span>Gigs</span></a>
    <a href="invoices.html" class="${page === 'invoices' ? 'active' : ''}"><i class="fa-solid fa-file-invoice-dollar"></i><span>Invoices</span></a>
    <a href="settings.html" class="${page === 'settings' ? 'active' : ''}"><i class="fa-solid fa-gear"></i><span>Settings</span></a>
  `;
  document.body.appendChild(mobileBar);

  // 3. Render Toast Container
  const toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  document.body.appendChild(toastContainer);

  window.showToast = function (message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = 'fa-circle-check green';
    if (type === 'error') icon = 'fa-circle-exclamation pink';
    if (type === 'gold') icon = 'fa-bell gold';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };

  // 4. Render Global "New Lead" Modal
  const modalHTML = `
    <div id="global-new-lead-modal" class="modal-scrim" style="display:none">
      <div class="modal-box">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem">
          <div class="label" style="font-size:0.95rem"><i class="fa-solid fa-bolt cyan"></i> Quick Intake: New Lead</div>
          <button class="btn btn-icon" id="btn-close-lead-modal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form id="global-new-lead-form">
          <div class="grid g-2">
            <div class="field">
              <label>Full Name *</label>
              <input class="input" id="nl-name" required placeholder="e.g. Maya Lin">
            </div>
            <div class="field">
              <label>Phone *</label>
              <input class="input" id="nl-phone" required placeholder="405-555-0199">
            </div>
          </div>
          <div class="grid g-2">
            <div class="field">
              <label>Email *</label>
              <input class="input" type="email" id="nl-email" required placeholder="maya@example.com">
            </div>
            <div class="field">
              <label>Event Type</label>
              <select class="input" id="nl-type">
                <option value="Wedding">Wedding</option>
                <option value="Birthday Party">Birthday Party</option>
                <option value="Corporate Event">Corporate Event</option>
                <option value="School Dance / Prom">School Dance / Prom</option>
                <option value="Quinceañera">Quinceañera</option>
                <option value="Private Celebration">Private Celebration</option>
              </select>
            </div>
          </div>
          <div class="grid g-2">
            <div class="field">
              <label>Event Date</label>
              <input class="input" type="date" id="nl-date">
            </div>
            <div class="field">
              <label>Venue / City</label>
              <input class="input" id="nl-city" placeholder="e.g. Oklahoma City, OK">
            </div>
          </div>
          <div class="grid g-2">
            <div class="field">
              <label>Package</label>
              <select class="input" id="nl-package">
                <option value="Thunder Party · 4 hrs">Thunder Party ($700)</option>
                <option value="Thunder Premium · 6 hrs">Thunder Premium ($900)</option>
                <option value="Custom Wedding · 6+ hrs">Custom Wedding ($1,500)</option>
                <option value="Thunder Basic · 3 hrs">Thunder Basic ($500)</option>
                <option value="Thunder All-Night · 8 hrs">Thunder All-Night ($1,200)</option>
              </select>
            </div>
            <div class="field">
              <label>Estimated Amount ($)</label>
              <input class="input gold num" id="nl-amount" type="number" value="700">
            </div>
          </div>
          <div class="field">
            <label>Notes / Requirements</label>
            <textarea class="input" id="nl-notes" placeholder="Music styles, venue power, special requests..."></textarea>
          </div>
          <div class="head-actions" style="justify-content:flex-end; margin-top:1.25rem">
            <button type="button" class="btn" id="btn-cancel-lead-modal">Cancel</button>
            <button type="submit" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Save Lead & Client</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Hook global new lead buttons
  document.querySelectorAll('.btn-primary').forEach(btn => {
    if (btn.textContent.includes('New lead') || btn.textContent.includes('Add client')) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openNewLeadModal();
      });
    }
  });

  const leadModal = document.getElementById('global-new-lead-modal');
  const closeLeadModalBtn = document.getElementById('btn-close-lead-modal');
  const cancelLeadModalBtn = document.getElementById('btn-cancel-lead-modal');
  const leadForm = document.getElementById('global-new-lead-form');

  function openNewLeadModal() {
    leadModal.style.display = 'flex';
  }
  function closeNewLeadModal() {
    leadModal.style.display = 'none';
  }

  if (closeLeadModalBtn) closeLeadModalBtn.onclick = closeNewLeadModal;
  if (cancelLeadModalBtn) cancelLeadModalBtn.onclick = closeNewLeadModal;

  if (leadForm) {
    leadForm.onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById('nl-name').value.trim();
      const phone = document.getElementById('nl-phone').value.trim();
      const email = document.getElementById('nl-email').value.trim().toLowerCase();
      const eventType = document.getElementById('nl-type').value;
      const eventDate = document.getElementById('nl-date').value || null;
      const city = document.getElementById('nl-city').value.trim();
      const pkg = document.getElementById('nl-package').value;
      const amount = parseFloat(document.getElementById('nl-amount').value) || 0;
      const notes = document.getElementById('nl-notes').value.trim();

      try {
        if (window.supabaseClient) {
          // 1. Insert into inquiries
          await window.supabaseClient.from('thunderhouse_inquiries').insert([{
            full_name: name,
            email: email,
            phone: phone,
            event_type: eventType,
            event_date: eventDate,
            venue_location: city,
            package_name: pkg,
            estimated_total: amount,
            notes: notes,
            status: 'new',
            source: 'admin'
          }]);

          // 2. Insert or update clients CRM
          await window.supabaseClient.from('thunderhouse_clients').upsert([{
            full_name: name,
            email: email,
            phone: phone,
            source: 'admin',
            status: 'lead',
            notes: notes ? `Lead note: ${notes}` : null
          }], { onConflict: 'email' });
        }

        window.showToast(`Lead created for ${name}!`, 'success');
        closeNewLeadModal();
        leadForm.reset();
        // Dispatch event for active page to reload
        window.dispatchEvent(new CustomEvent('thunderhouse:lead-created'));
      } catch (err) {
        console.error('Failed to create lead:', err);
        window.showToast('Error saving lead: ' + err.message, 'error');
      }
    };
  }

  // 5. Auth and Session Verification
  document.addEventListener('DOMContentLoaded', async () => {
    // Logout action
    const logoutBtn = document.getElementById('admin-logout-btn');
    if (logoutBtn) {
      logoutBtn.onclick = async () => {
        if (window.supabaseClient) {
          await window.supabaseClient.auth.signOut();
        }
        window.location.href = '../login.html';
      };
    }

    if (window.supabaseClient) {
      try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        const urlParams = new URLSearchParams(window.location.search);
        const isPreview = urlParams.get('preview') === '1' || window.location.hostname === 'localhost';

        if (!session && !isPreview) {
          // Not logged in -> redirect to login
          window.location.href = '../login.html';
          return;
        }

        let userEmail = session?.user?.email || 'owner@thunderhouseent.com';
        let role = 'superuser';
        let displayName = 'Owner';

        if (session) {
          // Query thunderhouse_staff or thunderhouse_team
          const { data: staffMember } = await window.supabaseClient
            .from('thunderhouse_staff')
            .select('*')
            .eq('email', userEmail)
            .maybeSingle();

          if (staffMember) {
            displayName = staffMember.display_name || staffMember.full_name || displayName;
            role = staffMember.role || 'staff';
          }
        }

        // Update user chip UI
        const nameEl = document.getElementById('admin-user-name');
        const roleEl = document.getElementById('admin-user-role');
        const avatarEl = document.getElementById('admin-user-avatar');
        if (nameEl) nameEl.textContent = displayName;
        if (roleEl) {
          roleEl.innerHTML = role === 'superuser'
            ? `<span class="gold"><i class="fa-solid fa-crown"></i> Superuser</span>`
            : `<span>Staff</span>`;
        }
        if (avatarEl) {
          const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
          avatarEl.textContent = initials || 'TH';
        }

        window.currentStaffUser = { email: userEmail, role, displayName };

        // 6. Update Real-Time Nav Badges
        updateBadges();
      } catch (e) {
        console.warn('Session verification issue:', e);
      }
    }
  });

  async function updateBadges() {
    if (!window.supabaseClient) return;
    try {
      // Count leads
      const { count: leadsCount } = await window.supabaseClient
        .from('thunderhouse_inquiries')
        .select('*', { count: 'exact', head: true })
        .in('status', ['new', 'quoted', 'hold']);

      const leadsBadge = document.getElementById('nav-leads-count');
      if (leadsBadge && leadsCount && leadsCount > 0) {
        leadsBadge.textContent = leadsCount;
        leadsBadge.style.display = 'inline-flex';
      }

      // Count consultations
      const { count: consultCount } = await window.supabaseClient
        .from('thunderhouse_intakes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const consultBadge = document.getElementById('nav-consult-count');
      if (consultBadge && consultCount && consultCount > 0) {
        consultBadge.textContent = consultCount;
        consultBadge.style.display = 'inline-flex';
      }

      // Count Thunder Wire selected / new stories
      let wireCount = 0;
      try {
        const { count, error } = await window.supabaseClient
          .from('thunderwire_feed')
          .select('*', { count: 'exact', head: true })
          .eq('selected_for_show', true);
        if (!error && count !== null) {
          wireCount = count;
        } else {
          const legacy = await window.supabaseClient
            .from('thunderpulse_feed')
            .select('*', { count: 'exact', head: true })
            .eq('selected_for_show', true);
          if (!legacy.error && legacy.count !== null) wireCount = legacy.count;
        }
      } catch (err) {}

      const wireBadge = document.getElementById('nav-wire-count') || document.getElementById('nav-pulse-count');
      if (wireBadge && wireCount > 0) {
        wireBadge.textContent = `${wireCount}/5`;
        wireBadge.style.display = 'inline-flex';
      }

      // Count Equipment out on gig or in maintenance
      try {
        const { count: gearOutCount } = await window.supabaseClient
          .from('thunderhouse_equipment')
          .select('*', { count: 'exact', head: true })
          .neq('status', 'Available in Studio');

        const gearBadge = document.getElementById('nav-gear-count');
        if (gearBadge && gearOutCount && gearOutCount > 0) {
          gearBadge.textContent = gearOutCount;
          gearBadge.style.display = 'inline-flex';
        }
      } catch (err) {}
    } catch (e) {
      console.warn('Badge count refresh:', e);
    }
  }

  window.refreshAdminBadges = updateBadges;
})();
