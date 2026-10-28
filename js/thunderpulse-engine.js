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
    if (!window.supabaseClient) return 'thunderwire_feed';
    try {
      const { error } = await window.supabaseClient
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

  return {
    scanNow,
    classifyCategory,
    getFeedTable,
    maintainLifecycle
  };
})();

// Legacy backwards compatibility alias
window.ThunderPulse = window.ThunderWire;
