/**
 * Thunder House ENT - Production Web Analytics Beacon
 * Tracks anonymous visitor metrics, referral sources, and conversion funnels
 * directly into Supabase and bridges to Google Analytics (gtag).
 */

(function () {
  if (typeof window === 'undefined') return;

  // 1. Generate or retrieve anonymous session ID
  let sessionId = sessionStorage.getItem('th_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    sessionStorage.setItem('th_session_id', sessionId);
  }

  // 2. Parse Environment & Device Info
  const ua = navigator.userAgent || '';
  let deviceType = 'Desktop';
  if (/iPad|Tablet/i.test(ua)) deviceType = 'Tablet';
  else if (/Mobile|Android|iPhone/i.test(ua)) deviceType = 'Mobile';

  let browser = 'Other';
  if (/Chrome/i.test(ua) && !/Edge|Edg/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Edge|Edg/i.test(ua)) browser = 'Edge';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';

  let referrer = document.referrer || 'Direct';
  if (referrer.includes('instagram.com')) referrer = 'Instagram (@thunderhouseent)';
  else if (referrer.includes('google.com')) referrer = 'Google Search';
  else if (referrer.includes('tiktok.com')) referrer = 'TikTok';
  else if (referrer.includes('facebook.com')) referrer = 'Facebook';
  else if (referrer.includes(window.location.hostname)) referrer = 'Internal Navigation';

  const screenRes = `${window.screen.width}x${window.screen.height}`;
  const pagePath = window.location.pathname || '/';
  const pageTitle = document.title || 'Thunder House ENT';

  // 3. Dispatch Beacon to Supabase
  async function recordPageView() {
    // Wait for Supabase client if loading asynchronously
    let attempts = 0;
    while (!window.supabaseClient && attempts < 15) {
      await new Promise(r => setTimeout(r, 200));
      attempts++;
    }

    if (!window.supabaseClient) return;

    try {
      await window.supabaseClient.from('thunderhouse_web_analytics').insert([{
        session_id: sessionId,
        page_path: pagePath,
        page_title: pageTitle,
        referrer: referrer,
        device_type: deviceType,
        screen_resolution: screenRes,
        browser: browser,
        city: 'Oklahoma City', // Default regional metro
        created_at: new Date().toISOString()
      }]);
    } catch (e) {
      // Keep completely silent on analytics failures
    }
  }

  // Record initial page load
  if (document.readyState === 'complete') {
    recordPageView();
  } else {
    window.addEventListener('load', recordPageView);
  }

  // 4. Track Conversion Events (Quote Button Clicks, Call Clicks)
  document.addEventListener('click', (e) => {
    const target = e.target.closest('a, button');
    if (!target) return;

    const href = target.getAttribute('href') || '';
    const text = (target.textContent || '').trim();

    if (href.includes('tel:') || text.toLowerCase().includes('call') || text.includes('283-2533')) {
      trackEvent('phone_call_click', { phone: href });
    } else if (href.includes('intake.html') || text.toLowerCase().includes('quote') || text.toLowerCase().includes('lock in')) {
      trackEvent('quote_intake_click', { button_text: text });
    } else if (text.toLowerCase().includes('sample mix') || text.toLowerCase().includes('preview')) {
      trackEvent('sample_mix_play', { item: text });
    }
  });

  function trackEvent(eventName, params = {}) {
    // Send to Google Analytics if present
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
    // Also log to Supabase analytics
    if (window.supabaseClient) {
      window.supabaseClient.from('thunderhouse_web_analytics').insert([{
        session_id: sessionId,
        page_path: `${pagePath} [EVENT: ${eventName}]`,
        page_title: `Event: ${eventName}`,
        referrer: referrer,
        device_type: deviceType,
        browser: browser,
        created_at: new Date().toISOString()
      }]).then(() => {});
    }
  }

  window.ThunderAnalytics = { trackEvent };
})();
