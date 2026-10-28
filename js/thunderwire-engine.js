/**
 * Thunder Wire Intelligence Feed & Morning Show Ingest Engine
 * Continuously monitors music, hip-hop, celebrity gossip, and viral feeds.
 * Deduplicates, auto-categorizes into 5 show blocks, and syncs to Supabase.
 */

window.ThunderWire = (function () {
  // Curated Feed Endpoints (strictly verified music journalism RSS feeds)
  const FEEDS = [
    { name: 'AllHipHop', url: 'https://allhiphop.com/feed/', type: 'rss', defaultCategory: 'lead' },
    { name: 'XXL Mag', url: 'https://www.xxlmag.com/feed/', type: 'rss', defaultCategory: 'lead' },
    { name: 'Billboard', url: 'https://www.billboard.com/feed/', type: 'rss', defaultCategory: 'drops' },
    { name: 'HipHopDX', url: 'https://hiphopdx.com/rss/news.xml', type: 'rss', defaultCategory: 'shade' }
  ];

  // CORS proxies for cross-origin RSS fetching in browser
  const PROXIES = [
    url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`
  ];

  let detectedTable = null;

  async function getFeedTable() {
    if (detectedTable) return detectedTable;
    if (!window.supabaseClient) return 'thunderpulse_feed';
    try {
      const { data, error } = await window.supabaseClient
        .from('thunderpulse_feed')
        .select('id', { count: 'exact', head: true });
      if (!error) {
        detectedTable = 'thunderpulse_feed';
        return detectedTable;
      }
    } catch (e) {}
    try {
      const { data, error } = await window.supabaseClient
        .from('thunderwire_feed')
        .select('id', { count: 'exact', head: true });
      if (!error) {
        detectedTable = 'thunderwire_feed';
        return detectedTable;
      }
    } catch (e) {}
    detectedTable = 'thunderpulse_feed';
    return detectedTable;
  }

  function cleanSourceUrl(rawUrl) {
    if (!rawUrl) return '';
    try {
      const u = new URL(rawUrl.trim());
      u.hash = '';
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'ref', 'source', 'rss'];
      trackingParams.forEach(p => u.searchParams.delete(p));
      let clean = u.toString();
      if (clean.endsWith('/') && u.pathname !== '/') clean = clean.slice(0, -1);
      return clean;
    } catch (e) {
      return rawUrl.trim();
    }
  }

  function normalizeHeadline(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Run a live wire scan across feeds
   */
  async function scanNow(onProgress) {
    if (!window.supabaseClient) {
      if (window.ThunderLogger) window.ThunderLogger.critical('thunder_wire', 'Supabase client not initialized during scanNow');
      throw new Error('Supabase client not initialized');
    }

    const table = await getFeedTable();
    let totalDiscovered = 0;
    let newSaved = 0;

    // Load existing URLs and headlines from database to guarantee we NEVER rescout duplicate stories
    const existingUrls = new Set();
    const existingTitles = new Set();
    try {
      const { data: existingRows } = await window.supabaseClient
        .from(table)
        .select('source_url, title');
      if (Array.isArray(existingRows)) {
        existingRows.forEach(r => {
          if (r.source_url) existingUrls.add(cleanSourceUrl(r.source_url));
          if (r.title) existingTitles.add(normalizeHeadline(r.title));
        });
      }
    } catch (exErr) {
      console.warn('[Thunder Wire] Existing story pre-check note:', exErr);
    }

    // 1. Try high-speed serverless wire scanner (bypasses browser CORS completely)
    try {
      if (onProgress) onProgress('Sweeping live culture feeds via serverless wire…');
      const apiRes = await fetch('/api/wire-scan', { signal: AbortSignal.timeout(10000) });
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data && data.success && Array.isArray(data.stories) && data.stories.length > 0) {
          for (let item of data.stories) {
            const cUrl = cleanSourceUrl(item.source_url);
            const nTitle = normalizeHeadline(item.title);
            if (existingUrls.has(cUrl) || existingTitles.has(nTitle)) {
              continue; // Already scouted!
            }
            existingUrls.add(cUrl);
            existingTitles.add(nTitle);

            const { error } = await window.supabaseClient
              .from(table)
              .upsert([item], { onConflict: 'source_url', ignoreDuplicates: true });
            if (!error) newSaved++;
          }
          return { totalDiscovered: data.totalDiscovered || data.stories.length, newSaved: newSaved };
        }
      }
    } catch (apiErr) {
      if (window.ThunderLogger) {
        window.ThunderLogger.warn('thunder_wire', `Serverless scanner note: ${apiErr.message}`);
      }
    }

    // 2. Direct client fallback loop
    for (let f of FEEDS) {
      if (onProgress) onProgress(`Scanning ${f.name}…`);
      try {
        let items = [];
        if (f.type === 'reddit') {
          items = await fetchReddit(f.url, f.name, f.defaultCategory);
        } else {
          items = await fetchRSS(f.url, f.name, f.defaultCategory);
        }

        totalDiscovered += items.length;

        // Ingest into Supabase, filtering out any story previously scouted
        for (let item of items) {
          const cUrl = cleanSourceUrl(item.source_url);
          const nTitle = normalizeHeadline(item.title);
          if (existingUrls.has(cUrl) || existingTitles.has(nTitle)) {
            continue; // Already scouted!
          }
          existingUrls.add(cUrl);
          existingTitles.add(nTitle);

          const { error } = await window.supabaseClient
            .from(table)
            .upsert([item], { onConflict: 'source_url', ignoreDuplicates: true });

          if (!error) newSaved++;
        }
      } catch (err) {
        console.warn(`[Thunder Wire] Feed error on ${f.name}:`, err.message);
        if (window.ThunderLogger) {
          window.ThunderLogger.error('thunder_wire', `Feed error on ${f.name}: ${err.message}`);
        }
      }
    }

    try {
      await maintainLifecycle();
    } catch (e) {}

    return { totalDiscovered, newSaved };
  }

  /**
   * Fetch Reddit JSON feeds
   */
  async function fetchReddit(url, sourceName, fallbackCategory) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Reddit HTTP ${res.status}`);
    const data = await res.json();
    const posts = data?.data?.children || [];

    return posts
      .filter(p => !p.data.stickied && !p.data.is_video && p.data.title)
      .map(p => {
        const d = p.data;
        const title = d.title;
        const cat = classifyCategory(title, fallbackCategory);
        const virality = Math.min(98, 60 + Math.floor((d.score || 100) / 100));

        return {
          title: cleanHeadline(title),
          summary: d.selftext ? d.selftext.substring(0, 300) : title,
          content: d.selftext || title,
          source_name: sourceName,
          source_url: `https://reddit.com${d.permalink}`,
          image_url: d.thumbnail && d.thumbnail.startsWith('http') ? d.thumbnail : getFallbackImage(cat),
          category: cat,
          virality_score: virality,
          verification_status: d.title.toLowerCase().includes('rumor') ? 'rumor' : 'confirmed',
          talking_points: [
            cleanHeadline(title),
            `Community reaction score: ${d.score || 0} upvotes with ${d.num_comments || 0} comments`,
            'Trending discussion on internet culture forums'
          ],
          why_it_matters: 'Raw audience sentiment and instant reaction before it hits mainstream news.',
          host_question: `What's your immediate reaction to this: are people overreacting or is this valid?`,
          tags: ['Community', 'Trending', sourceName],
          published_at: new Date(d.created_utc * 1000).toISOString()
        };
      });
  }

  /**
   * Fetch XML RSS Feeds
   */
  async function fetchRSS(feedUrl, sourceName, fallbackCategory) {
    let xmlText = null;

    // Try direct or proxies
    for (let proxy of PROXIES) {
      try {
        const proxied = proxy(feedUrl);
        const res = await fetch(proxied, { signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          xmlText = await res.text();
          if (xmlText && (xmlText.includes('<rss') || xmlText.includes('<feed') || xmlText.includes('<channel'))) {
            break;
          }
        }
      } catch (e) {}
    }

    if (!xmlText) return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const items = Array.from(doc.querySelectorAll('item, entry')).slice(0, 8);

    return items.map(el => {
      const title = el.querySelector('title')?.textContent || '';
      const link = el.querySelector('link')?.textContent || el.querySelector('link')?.getAttribute('href') || '';
      const cleanUrl = cleanSourceUrl(link);
      const pubDate = el.querySelector('pubDate, published, updated')?.textContent;

      if (!title || !cleanUrl) return null;

      // Filter out items older than 7 days so stale stories are never scouted
      if (pubDate) {
        const pubTime = new Date(pubDate).getTime();
        if (!isNaN(pubTime) && (Date.now() - pubTime > 7 * 24 * 60 * 60 * 1000)) {
          return null;
        }
      }

      const desc = el.querySelector('description, summary, content')?.textContent || '';
      const cleanDesc = desc.replace(/<[^>]*>/g, '').trim().substring(0, 300);

      const cat = classifyCategory(title + ' ' + cleanDesc, fallbackCategory);
      let img = el.querySelector('enclosure[type^="image"]')?.getAttribute('url')
        || el.querySelector('media\\:content, content')?.getAttribute('url')
        || getFallbackImage(cat);

      return {
        title: cleanHeadline(title),
        summary: cleanDesc || title,
        content: cleanDesc || title,
        source_name: sourceName,
        source_url: cleanUrl,
        image_url: img,
        category: cat,
        virality_score: 75 + Math.floor(Math.random() * 20),
        verification_status: title.toLowerCase().includes('rumor') || title.toLowerCase().includes('speculation') ? 'rumor' : 'confirmed',
        talking_points: [
          cleanHeadline(title),
          cleanDesc.substring(0, 140) + '...',
          `Reported by ${sourceName}`
        ],
        why_it_matters: 'Major culture and entertainment development gaining national industry momentum.',
        host_question: `Charlamagne style: Is this person completely out of their mind or are they making chess moves?`,
        tags: [sourceName, cat.toUpperCase()],
        published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString()
      };
    }).filter(i => i && i.title && i.source_url);
  }

  /**
   * Smart Classification into the 5 Show Buckets
   */
  function classifyCategory(text, fallback) {
    const t = text.toLowerCase();
    if (t.includes('florida man') || t.includes('bizarre') || t.includes('wild') || t.includes('drive-thru') || t.includes('caught on video') || t.includes('crazy') || t.includes('fight') || t.includes('arrested for')) {
      return 'wild';
    }
    if (t.includes('beef') || t.includes('diss') || t.includes('feud') || t.includes('calls out') || t.includes('slams') || t.includes('unfollows') || t.includes('drama') || t.includes('cheat') || t.includes('divorce') || t.includes('lawsuit')) {
      return 'shade';
    }
    if (t.includes('drops') || t.includes('releases') || t.includes('album') || t.includes('single') || t.includes('video') || t.includes('stream') || t.includes('ep') || t.includes('tracklist') || t.includes('remix')) {
      return 'drops';
    }
    if (t.includes('record') || t.includes('billboard') || t.includes('sales') || t.includes('diamond') || t.includes('streaming numbers') || t.includes('deal') || t.includes('bought') || t.includes('rights') || t.includes('mental health') || t.includes('inspiration')) {
      return 'realtalk';
    }
    return fallback || 'lead';
  }

  function cleanHeadline(str) {
    return str.replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  function getFallbackImage(cat) {
    const maps = {
      lead: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800',
      shade: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
      drops: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800',
      wild: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800',
      realtalk: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800'
    };
    return maps[cat] || maps.lead;
  }

  /**
   * Thunder Wire Lifecycle Maintenance:
   * Stories stay on active wire for 7 days, move to 30-day archive, then purge after 30 days.
   */
  async function maintainLifecycle() {
    if (!window.supabaseClient) return { archived: 0, deleted: 0 };
    try {
      const { data, error } = await window.supabaseClient.rpc('maintain_thunderwire_lifecycle');
      if (!error && data) {
        return {
          archived: data.archived_count || 0,
          deleted: data.deleted_count || 0,
          executedAt: data.executed_at
        };
      }
    } catch (e) {}

    // Fallback direct table maintenance
    try {
      const table = await getFeedTable();
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // 1. Delete expired stories (>30 days)
      const { data: delData } = await window.supabaseClient
        .from(table)
        .delete()
        .lt('published_at', thirtyDaysAgo);

      // 2. Mark stories older than 7 days as archived
      await window.supabaseClient
        .from(table)
        .update({ is_archived: true })
        .lt('published_at', sevenDaysAgo)
        .or('is_archived.is.null,is_archived.eq.false');

      return { success: true };
    } catch (err) {
      console.warn('[Thunder Wire] Lifecycle maintenance note:', err);
      return { success: false };
    }
  }

  /**
   * Dispatches The Daily Wire 7AM Email Briefing.
   * Works both in Vercel serverless environment and directly via client Supabase Edge Function fallback.
   */
  async function dispatchDailyWireDigest(overrideRecipients = null) {
    const startTime = Date.now();
    // 1. Try serverless endpoint first
    try {
      const resp = await fetch('/api/daily-wire-digest?force=true', { method: 'POST' });
      const contentType = resp.headers.get('content-type') || '';
      if (resp.ok && contentType.includes('application/json')) {
        const data = await resp.json();
        if (data && data.success) return data;
      }
    } catch (_) {}

    // 2. Direct Supabase Edge Function dispatch fallback
    if (!window.supabaseClient) {
      throw new Error('Supabase client not initialized.');
    }

    const { data: autoData } = await window.supabaseClient
      .from('thunderhouse_automations')
      .select('*')
      .eq('id', 'daily_wire_digest')
      .single();

    let recipients = overrideRecipients || (autoData?.config?.recipients) || ['breshaun.black@gmail.com', 'olifedigital@gmail.com'];
    if (!Array.isArray(recipients) || recipients.length === 0) {
      recipients = ['breshaun.black@gmail.com', 'olifedigital@gmail.com'];
    }

    const table = await getFeedTable();
    let { data: stories } = await window.supabaseClient
      .from(table)
      .select('*')
      .eq('is_archived', false)
      .order('virality_score', { ascending: false })
      .limit(6);

    if (!stories || stories.length === 0) {
      const { data: fallbackStories } = await window.supabaseClient
        .from(table)
        .select('*')
        .order('virality_score', { ascending: false })
        .limit(6);
      stories = fallbackStories || [];
    }

    if (!stories || !stories.length) {
      throw new Error('No active stories found on Thunder Wire to compile.');
    }

    const leadStory = stories[0];
    const otherStories = stories.slice(1, 5);
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    const scheduleTime = autoData?.schedule_time || '07:00';

    const getCatColor = (cat) => {
      if (cat === 'lead') return { bg: 'rgba(0, 229, 255, 0.15)', text: '#00e5ff', border: 'rgba(0, 229, 255, 0.4)', name: 'The Opening Bell' };
      if (cat === 'shade') return { bg: 'rgba(255, 0, 85, 0.15)', text: '#ff0055', border: 'rgba(255, 0, 85, 0.4)', name: 'The Shade Storm' };
      if (cat === 'drops') return { bg: 'rgba(255, 183, 3, 0.15)', text: '#ffb703', border: 'rgba(255, 183, 3, 0.4)', name: 'The Drop Zone' };
      if (cat === 'wild') return { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.4)', name: 'Are You Out Your Mind?!' };
      return { bg: 'rgba(148, 163, 184, 0.15)', text: '#cbd5e1', border: 'rgba(148, 163, 184, 0.4)', name: 'Real Talk' };
    };

    const leadCat = getCatColor(leadStory.category);
    const leadHeat = leadStory.virality_score || 95;
    const leadPoints = Array.isArray(leadStory.talking_points) ? leadStory.talking_points : [leadStory.summary];

    const otherRows = otherStories.map(s => {
      const c = getCatColor(s.category);
      const h = s.virality_score || 85;
      return `
        <tr>
          <td style="padding: 16px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align: top;">
                  <div style="margin-bottom: 6px;">
                    <span style="background: ${c.bg}; color: ${c.text}; border: 1px solid ${c.border}; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: 800; text-transform: uppercase;">
                      ${c.name}
                    </span>
                    <span style="background: rgba(255, 183, 3, 0.15); color: #ffb703; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 800; margin-left: 4px;">
                      ⚡ Heat ${h}
                    </span>
                  </div>
                  <h3 style="font-size: 16px; font-weight: 700; color: #ffffff; margin: 0 0 6px 0; line-height: 1.35;">
                    ${escapeHtml(s.title)}
                  </h3>
                  <p style="font-size: 13px; line-height: 1.5; color: #94a3b8; margin: 0 0 8px 0;">
                    ${escapeHtml(s.summary || '')}
                  </p>
                  <div style="font-size: 11px; color: #64748b;">
                    Source: <span style="color: #cbd5e1;">${escapeHtml(s.source_name || 'Thunder Wire')}</span>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    }).join('');

    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>⚡ The Daily Wire</title>
</head>
<body style="margin: 0; padding: 0; background-color: #060911; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #060911; width: 100%; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 640px; background-color: #0c101c; border: 1px solid rgba(0, 229, 255, 0.25); border-radius: 14px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.85), 0 0 40px rgba(0, 229, 255, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #090e1a 0%, #111a2e 100%); padding: 32px 28px 24px; text-align: center; border-bottom: 2px solid rgba(0, 229, 255, 0.35);">
              <div style="font-size: 11px; font-weight: 800; letter-spacing: 2px; color: #00e5ff; text-transform: uppercase; margin-bottom: 6px;">
                ⚡ THUNDER HOUSE ENTERTAINMENT · #WAKEITUP
              </div>
              <h1 style="margin: 0 0 6px 0; font-size: 32px; font-weight: 800; letter-spacing: 1px; color: #ffffff; text-transform: uppercase;">
                THE DAILY WIRE
              </h1>
              <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 14px;">
                Morning Culture, Music &amp; Broadcast Intelligence Briefing
              </div>
              <div style="display: inline-block; background: rgba(0, 229, 255, 0.08); border: 1px solid rgba(0, 229, 255, 0.3); border-radius: 30px; padding: 5px 16px; font-size: 12px; color: #ffb703; font-weight: 700;">
                📅 ${escapeHtml(dateFormatted)} · ⚡ ${escapeHtml(scheduleTime)} CST
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <div style="margin-bottom: 28px; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(0, 229, 255, 0.3); border-radius: 12px; overflow: hidden; box-shadow: 0 0 25px rgba(0, 229, 255, 0.1); padding: 22px;">
                <div style="margin-bottom: 10px;">
                  <span style="background: ${leadCat.bg}; color: ${leadCat.text}; border: 1px solid ${leadCat.border}; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase;">
                    ${leadCat.name}
                  </span>
                  <span style="background: rgba(255, 183, 3, 0.2); color: #ffb703; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; margin-left: 6px;">
                    🔥 Heat ${leadHeat}
                  </span>
                  <span style="color: #64748b; font-size: 12px; margin-left: 8px;">
                    via ${escapeHtml(leadStory.source_name || 'AllHipHop')}
                  </span>
                </div>
                <h2 style="font-size: 22px; font-weight: 800; line-height: 1.3; color: #ffffff; margin: 0 0 10px 0;">
                  ${escapeHtml(leadStory.title)}
                </h2>
                <p style="font-size: 14.5px; line-height: 1.6; color: #cbd5e1; margin: 0 0 16px 0;">
                  ${escapeHtml(leadStory.summary || '')}
                </p>
                <div style="background: rgba(0, 229, 255, 0.05); border-left: 3px solid #00e5ff; border-radius: 0 8px 8px 0; padding: 12px 16px; margin-bottom: 14px;">
                  <div style="font-size: 11px; font-weight: 800; color: #00e5ff; text-transform: uppercase; margin-bottom: 6px;">
                    🎙️ On-Air Host Talking Points
                  </div>
                  <ul style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.5; color: #e2e8f0;">
                    ${leadPoints.slice(0, 3).map(pt => `<li>${escapeHtml(pt)}</li>`).join('')}
                  </ul>
                </div>
                <div style="background: rgba(255, 0, 85, 0.08); border-left: 3px solid #ff0055; border-radius: 0 8px 8px 0; padding: 12px 16px;">
                  <div style="font-size: 11px; font-weight: 800; color: #ff0055; text-transform: uppercase; margin-bottom: 4px;">
                    💬 Charlamagne Style Prompt / Debate
                  </div>
                  <div style="font-size: 13.5px; font-weight: 600; color: #ffffff;">
                    "${escapeHtml(leadStory.host_question || 'What is your honest take on this?')}"
                  </div>
                </div>
              </div>
              <div style="margin-bottom: 20px;">
                <h3 style="font-size: 15px; font-weight: 800; color: #00e5ff; letter-spacing: 1px; text-transform: uppercase; margin: 0 0 12px 0; border-bottom: 1px solid rgba(0, 229, 255, 0.2); padding-bottom: 8px;">
                  ⚡ Today's Morning Rundown
                </h3>
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  ${otherRows}
                </table>
              </div>
              <div style="text-align: center; margin: 30px 0 10px;">
                <a href="https://thunderhouseent.com/admin/wire.html" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #00e5ff 0%, #0099ff 100%); color: #000; font-weight: 800; font-size: 13px; text-decoration: none; padding: 12px 24px; border-radius: 25px; margin: 6px; text-transform: uppercase;">
                  ⚡ Open Producer Desk
                </a>
                <a href="https://thunderhouseent.com/admin/automations.html" target="_blank" style="display: inline-block; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color: #fff; font-weight: 700; font-size: 13px; text-decoration: none; padding: 12px 22px; border-radius: 25px; margin: 6px; text-transform: uppercase;">
                  ⚙️ Manage Schedule
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #030407; padding: 20px 28px; border-top: 1px solid rgba(255, 255, 255, 0.08); text-align: center; font-size: 12px; color: #64748b;">
              <strong style="color: #cbd5e1;">Thunder House Entertainment</strong> · Oklahoma City, OK<br>
              Direct to: <strong style="color: #94a3b8;">${recipients.map(escapeHtml).join(', ')}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const cleanSub = leadStory.title ? leadStory.title.substring(0, 50) : 'Morning Culture Briefing';
    const subject = `⚡ The Daily Wire: ${cleanSub} [Morning Briefing]`;

    const edgeResp = await fetch('https://kxoivmflghfgtvawhktt.supabase.co/functions/v1/send-booking-confirmation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.supabaseClient.supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4b2l2bWZsZ2hmZ3R2YXdoa3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NTI5NTEsImV4cCI6MjEwNzIyODk1MX0.lrbLr6Q6tNwRWUGH7T3g6dL3jwU3TbaoUL1yRliBgTY'}`
      },
      body: JSON.stringify({
        type: 'daily_wire_digest',
        recipients: recipients,
        subject: subject,
        html: emailHtml,
        text: `⚡ The Daily Wire: ${leadStory.title}\n${leadStory.summary}`
      })
    });

    const edgeJson = await edgeResp.json().catch(() => ({}));
    if (!edgeResp.ok || (edgeJson && edgeJson.success === false)) {
      throw new Error(edgeJson?.error || ('Edge dispatch failed with status ' + edgeResp.status));
    }

    const duration = Date.now() - startTime;
    const summary = `Daily Wire digest dispatched to ${recipients.join(', ')} (${stories.length} stories curated).`;

    // Update automation and log
    await window.supabaseClient.from('thunderhouse_automations').update({
      last_run_at: new Date().toISOString(),
      last_run_status: 'success',
      last_run_summary: summary,
      last_duration_ms: duration,
      updated_at: new Date().toISOString()
    }).eq('id', 'daily_wire_digest');

    await window.supabaseClient.from('thunderhouse_automation_logs').insert({
      automation_id: 'daily_wire_digest',
      status: 'success',
      summary: summary,
      duration_ms: duration,
      triggered_by: 'manual_admin'
    });

    return {
      success: true,
      count: stories.length,
      recipients: recipients,
      duration_ms: duration
    };
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return {
    scanNow,
    classifyCategory,
    getFeedTable,
    maintainLifecycle,
    dispatchDailyWireDigest
  };
})();

// Legacy backwards compatibility alias
window.ThunderPulse = window.ThunderWire;
