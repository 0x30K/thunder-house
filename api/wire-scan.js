/**
 * Thunder House ENT - Server-Side Wire Ingestion Engine
 * Vercel Serverless Function: fetches RSS directly without CORS restrictions,
 * auto-classifies into 5 show blocks, and syncs directly into Supabase.
 */

const SUPABASE_URL = 'https://kxoivmflghfgtvawhktt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4b2l2bWZsZ2hmZ3R2YXdoa3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NTI5NTEsImV4cCI6MjEwNzIyODk1MX0.lrbLr6Q6tNwRWUGH7T3g6dL3jwU3TbaoUL1yRliBgTY';

const FEEDS = [
  { name: 'XXL Mag', url: 'https://www.xxlmag.com/feed/', defaultCategory: 'lead' },
  { name: 'AllHipHop', url: 'https://allhiphop.com/feed/', defaultCategory: 'lead' },
  { name: 'Billboard', url: 'https://www.billboard.com/feed/', defaultCategory: 'drops' },
  { name: 'HipHopDX', url: 'https://hiphopdx.com/rss/news.xml', defaultCategory: 'shade' }
];

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const allItems = [];

    for (let f of FEEDS) {
      try {
        const response = await fetch(f.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          signal: AbortSignal.timeout(6000)
        });

        if (!response.ok) continue;
        const xml = await response.text();
        const parsed = parseRssItems(xml, f.name, f.defaultCategory);
        allItems.push(...parsed);
      } catch (feedErr) {
        console.warn(`[Wire Scan] Failed ${f.name}:`, feedErr.message);
      }
    }

    // Deduplicate in-memory by clean source_url and normalized title
    const uniqueMap = new Map();
    const seenTitles = new Set();
    for (let item of allItems) {
      const cUrl = cleanSourceUrl(item.source_url);
      const nTitle = normalizeTitle(item.title);
      if (cUrl && !uniqueMap.has(cUrl) && !seenTitles.has(nTitle)) {
        uniqueMap.set(cUrl, item);
        seenTitles.add(nTitle);
      }
    }
    const finalItems = Array.from(uniqueMap.values());

    // Sync to Supabase - Checking against existing database records to NEVER re-scout duplicate stories
    let savedCount = 0;
    const targetTable = 'thunderpulse_feed'; // Supabase active table
    let brandNewStories = [];

    try {
      const existingUrls = new Set();
      const existingTitles = new Set();

      try {
        const existingRes = await fetch(`${SUPABASE_URL}/rest/v1/${targetTable}?select=source_url,title`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });
        if (existingRes.ok) {
          const existingData = await existingRes.json();
          if (Array.isArray(existingData)) {
            existingData.forEach(row => {
              if (row.source_url) existingUrls.add(cleanSourceUrl(row.source_url));
              if (row.title) existingTitles.add(normalizeTitle(row.title));
            });
          }
        }
      } catch (exErr) {
        console.warn('[Wire Scan] Existing database pre-check notice:', exErr.message);
      }

      // Filter to ONLY fresh, previously un-scouted stories
      brandNewStories = finalItems.filter(item => {
        const cUrl = cleanSourceUrl(item.source_url);
        const nTitle = normalizeTitle(item.title);
        if (existingUrls.has(cUrl) || existingTitles.has(nTitle)) {
          return false; // Skip already scouted story
        }
        existingUrls.add(cUrl);
        existingTitles.add(nTitle);
        return true;
      });

      if (brandNewStories.length > 0) {
        const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/${targetTable}?on_conflict=source_url`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=ignore-duplicates'
          },
          body: JSON.stringify(brandNewStories)
        });

        if (upsertRes.ok) {
          savedCount = brandNewStories.length;
        }
      }

      // Maintain 7-day archive and 30-day storage purge
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/rpc/maintain_thunderwire_lifecycle`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (lifecycleErr) {}
    } catch (dbErr) {
      console.warn('[Wire Scan] DB sync error:', dbErr.message);
    }

    return res.status(200).json({
      success: true,
      totalDiscovered: finalItems.length,
      newSaved: savedCount,
      brandNewCount: brandNewStories.length,
      stories: finalItems.slice(0, 30)
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

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

function normalizeTitle(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseRssItems(xml, sourceName, fallbackCategory) {
  const items = xml.split(/<item[\s>]/i).slice(1);
  const results = [];

  for (let raw of items.slice(0, 10)) {
    const titleMatch = raw.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = raw.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
    const descMatch = raw.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const pubDateMatch = raw.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i);
    const imgMatch = raw.match(/<enclosure[^>]*url=["']([^"']+)["']/i) 
      || raw.match(/<media:content[^>]*url=["']([^"']+)["']/i)
      || raw.match(/<img[^>]*src=["']([^"']+)["']/i);

    if (!titleMatch || !linkMatch) continue;

    const title = cleanString(titleMatch[1]);
    const cleanUrl = cleanSourceUrl(linkMatch[1]);
    if (!title || !cleanUrl) continue;

    // Check publication age - do NOT scout stories older than 7 days
    const pubDate = pubDateMatch ? new Date(pubDateMatch[1]) : new Date();
    const pubTime = !isNaN(pubDate.getTime()) ? pubDate.getTime() : Date.now();
    if (Date.now() - pubTime > 7 * 24 * 60 * 60 * 1000) {
      continue;
    }

    let desc = descMatch ? cleanString(descMatch[1].replace(/<[^>]*>/g, '')) : title;
    if (desc.length > 280) desc = desc.substring(0, 277) + '...';

    const cat = classifyCategory(title + ' ' + desc, fallbackCategory);
    const heat = 75 + Math.floor(Math.random() * 22);

    results.push({
      title: title,
      summary: desc || title,
      content: desc || title,
      source_name: sourceName,
      source_url: cleanUrl,
      image_url: imgMatch ? imgMatch[1] : getFallbackImage(cat),
      category: cat,
      virality_score: heat,
      verification_status: title.toLowerCase().includes('rumor') ? 'rumor' : 'confirmed',
      talking_points: [
        title,
        desc,
        `Reported by ${sourceName} breaking across national entertainment wire.`
      ],
      why_it_matters: 'Major cultural conversation capturing nationwide digital momentum.',
      host_question: `Charlamagne style: Is this chess or pure panic? What's your immediate reaction?`,
      tags: [sourceName, cat.toUpperCase()],
      published_at: new Date(pubTime).toISOString()
    });
  }

  return results;
}

function classifyCategory(text, fallback) {
  const t = text.toLowerCase();
  if (t.includes('florida man') || t.includes('bizarre') || t.includes('wild') || t.includes('drive-thru') || t.includes('caught on video') || t.includes('crazy') || t.includes('fight') || t.includes('arrested for')) {
    return 'wild';
  }
  if (t.includes('beef') || t.includes('diss') || t.includes('feud') || t.includes('calls out') || t.includes('slams') || t.includes('unfollows') || t.includes('drama') || t.includes('cheat') || t.includes('divorce') || t.includes('lawsuit') || t.includes('sues') || t.includes('court')) {
    return 'shade';
  }
  if (t.includes('drops') || t.includes('releases') || t.includes('album') || t.includes('single') || t.includes('video') || t.includes('stream') || t.includes('ep') || t.includes('tracklist') || t.includes('remix')) {
    return 'drops';
  }
  if (t.includes('record') || t.includes('billboard') || t.includes('sales') || t.includes('diamond') || t.includes('streaming numbers') || t.includes('deal') || t.includes('bought') || t.includes('rights') || t.includes('mental health') || t.includes('million') || t.includes('billion')) {
    return 'realtalk';
  }
  return fallback || 'lead';
}

function cleanString(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8212;/g, '—')
    .replace(/&#160;/g, ' ')
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
