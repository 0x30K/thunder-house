/**
 * Thunder Wire Intelligence Feed & Morning Show Ingest Engine
 * (Maintained for legacy compatibility with existing scripts)
 */

window.ThunderWire = (function () {
  const FEEDS = [
    { name: 'AllHipHop', url: 'https://allhiphop.com/feed/', type: 'rss', defaultCategory: 'lead' },
    { name: 'XXL Mag', url: 'https://www.xxlmag.com/feed/', type: 'rss', defaultCategory: 'lead' },
    { name: 'Billboard', url: 'https://www.billboard.com/feed/', type: 'rss', defaultCategory: 'drops' },
    { name: 'HipHopDX', url: 'https://hiphopdx.com/rss/news.xml', type: 'rss', defaultCategory: 'shade' },
    { name: 'r/hiphopheads', url: 'https://www.reddit.com/r/hiphopheads/hot.json?limit=15', type: 'reddit', defaultCategory: 'drops' },
    { name: 'r/nottheonion', url: 'https://www.reddit.com/r/nottheonion/hot.json?limit=15', type: 'reddit', defaultCategory: 'wild' }
  ];

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

  async function scanNow(onProgress) {
    if (!window.supabaseClient) {
      throw new Error('Supabase client not initialized');
    }

    const table = await getFeedTable();
    let totalDiscovered = 0;
    let newSaved = 0;

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

        for (let item of items) {
          const { error } = await window.supabaseClient
            .from(table)
            .upsert([item], { onConflict: 'source_url', ignoreDuplicates: true });

          if (!error) newSaved++;
        }
      } catch (err) {
        console.warn(`[Thunder Wire] Feed error on ${f.name}:`, err.message);
      }
    }

    return { totalDiscovered, newSaved };
  }

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

  async function fetchRSS(feedUrl, sourceName, fallbackCategory) {
    let xmlText = null;

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
      const pubDate = el.querySelector('pubDate, published, updated')?.textContent;
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
        source_url: link.trim(),
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
    }).filter(i => i.title && i.source_url);
  }

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

  return {
    scanNow,
    classifyCategory,
    getFeedTable
  };
})();

// Legacy backwards compatibility alias
window.ThunderPulse = window.ThunderWire;
