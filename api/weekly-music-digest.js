/**
 * Thunder House ENT - Weekly Fresh Drops / Hot Crate Email Digest Engine
 * File: api/weekly-music-digest.js
 * 
 * Automatically compiles the latest scouted tracks from thunderhouse_music_scout,
 * queries official artist metadata & photos (from Wikipedia REST API & iTunes),
 * and dispatches a cyber dark-luxe newsletter to staff DJs.
 * 
 * Supported Query Parameters:
 *   - ?preview=true   -> Return rendered HTML directly for in-browser visual inspection
 *   - ?force=true     -> Trigger immediate dispatch regardless of cron schedule
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kxoivmflghfgtvawhktt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4b2l2bWZsZ2hmZ3R2YXdoa3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NTI5NTEsImV4cCI6MjEwNzIyODk1MX0.lrbLr6Q6tNwRWUGH7T3g6dL3jwU3TbaoUL1yRliBgTY';
const SITE_URL = 'https://www.thunderhouseent.com';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Fetch verified artist photo and artwork without hallucination
 */
async function fetchArtistMedia(artistName, trackTitle) {
  let photoUrl = null;
  let bioSummary = null;
  let itunesUrl = null;

  // 1. Wikipedia Summary API
  try {
    const cleanArtist = (artistName || '').split('&')[0].split('feat.')[0].split('ft.')[0].trim();
    const wikiSlug = encodeURIComponent(cleanArtist.replace(/\s+/g, '_'));
    const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${wikiSlug}`, {
      headers: { 'User-Agent': 'ThunderHouseScout/2.0 (olifedigital@gmail.com)' }
    });
    if (wikiRes.ok) {
      const wikiData = await wikiRes.json();
      if (wikiData.thumbnail && wikiData.thumbnail.source) {
        photoUrl = wikiData.thumbnail.source;
      }
      if (wikiData.extract) {
        bioSummary = wikiData.extract;
      }
    }
  } catch (err) {
    // Graceful fallback
  }

  // 2. iTunes Search API (for official release artwork fallback)
  if (!photoUrl) {
    try {
      const cleanTitle = (trackTitle || '').replace(/\[.*?\]/g, '').trim();
      const term = encodeURIComponent(`${artistName} ${cleanTitle}`.trim());
      const itunesRes = await fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=1`);
      if (itunesRes.ok) {
        const itunesData = await itunesRes.json();
        if (itunesData.results && itunesData.results.length > 0) {
          const item = itunesData.results[0];
          photoUrl = item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '300x300bb') : null;
          itunesUrl = item.trackViewUrl || item.artistViewUrl;
        }
      }
    } catch (itunesErr) {
      // Graceful fallback
    }
  }

  return { photoUrl, bioSummary, itunesUrl };
}

module.exports = async function handler(req, res) {
  const startTime = Date.now();
  const isPreview = req.query.preview === 'true' || req.query.format === 'html';
  const isForce = req.query.force === 'true';

  try {
    // 1. Fetch Weekly Music Automation Configuration
    let automationConfig = {
      enabled: true,
      recipients: ['breshaun.black@gmail.com', 'olifedigital@gmail.com'],
      track_count: 8,
      subject_prefix: '🔥 Fresh Drops · Music of the Week',
      include_artist_links: true
    };

    try {
      const autoRes = await fetch(`${SUPABASE_URL}/rest/v1/thunderhouse_automations?id=eq.weekly_music_digest&select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (autoRes.ok) {
        const autoData = await autoRes.json();
        if (autoData && autoData[0]) {
          const row = autoData[0];
          if (!isForce && !isPreview && row.enabled === false) {
            return res.status(200).json({
              success: true,
              skipped: true,
              reason: 'Weekly Music Digest automation is currently PAUSED in settings.'
            });
          }
          if (row.config) {
            automationConfig = { ...automationConfig, ...row.config };
          }
        }
      }
    } catch (cfgErr) {
      console.warn('Could not read automation config, using defaults:', cfgErr.message);
    }

    const recipients = automationConfig.recipients && automationConfig.recipients.length > 0
      ? automationConfig.recipients
      : ['breshaun.black@gmail.com', 'olifedigital@gmail.com'];
    const trackLimit = parseInt(automationConfig.track_count, 10) || 8;

    // 2. Fetch Latest Active Tracks from thunderhouse_music_scout
    let tracks = [];
    try {
      const trackRes = await fetch(
        `${SUPABASE_URL}/rest/v1/thunderhouse_music_scout?order=scouted_at.desc&limit=${trackLimit}`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );
      if (trackRes.ok) {
        tracks = await trackRes.json();
      }
    } catch (trackErr) {
      console.error('Error fetching tracks:', trackErr);
    }

    if (!tracks || tracks.length === 0) {
      if (isPreview) {
        return res.status(200).send('<p style="font-family:sans-serif; padding:2rem; background:#05070b; color:#fff">No fresh tracks found in Thunder Crate database to preview.</p>');
      }
      return res.status(200).json({
        success: true,
        message: 'No active tracks found in thunderhouse_music_scout.',
        tracks_count: 0
      });
    }

    // 3. Enhance tracks with real media (Wikipedia & iTunes)
    const enhancedTracks = [];
    for (const track of tracks) {
      const media = await fetchArtistMedia(track.artist, track.title);
      enhancedTracks.push({
        ...track,
        photoUrl: media.photoUrl,
        bioSummary: media.bioSummary,
        itunesUrl: media.itunesUrl
      });
    }

    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    const subject = `${automationConfig.subject_prefix || '🔥 Fresh Drops · Music of the Week'} — ${dateStr}`;

    // 4. Render HTML Email Template (Cyber Dark-Luxe Aesthetics)
    const tracksHtml = enhancedTracks.map((track, idx) => {
      const cleanTitle = (track.title || 'Untitled').replace(/\[.*?\]/g, '').trim();
      const hasClean = track.clean_downloaded;
      const hasDirty = track.dirty_downloaded;
      const links = track.artist_links || {};

      let chips = [];
      if (links.soundcloud) {
        chips.push(`<a href="${escapeHtml(links.soundcloud)}" target="_blank" style="color:#ff5500; font-size:11px; text-decoration:none; margin-right:8px; font-weight:600">SoundCloud ↗</a>`);
      }
      if (links.instagram) {
        chips.push(`<a href="${escapeHtml(links.instagram)}" target="_blank" style="color:#e1306c; font-size:11px; text-decoration:none; margin-right:8px; font-weight:600">Instagram ↗</a>`);
      }
      if (links.website) {
        chips.push(`<a href="${escapeHtml(links.website)}" target="_blank" style="color:#00f0ff; font-size:11px; text-decoration:none; margin-right:8px; font-weight:600">Website ↗</a>`);
      }
      if (links.tiktok) {
        chips.push(`<a href="${escapeHtml(links.tiktok)}" target="_blank" style="color:#fff; font-size:11px; text-decoration:none; margin-right:8px; font-weight:600">TikTok ↗</a>`);
      }
      if (track.itunesUrl) {
        chips.push(`<a href="${escapeHtml(track.itunesUrl)}" target="_blank" style="color:#fa586a; font-size:11px; text-decoration:none; margin-right:8px; font-weight:600">Apple Music ↗</a>`);
      }

      // Real Artist Photo or Fallback Gradient
      const avatarHtml = track.photoUrl
        ? `<img src="${escapeHtml(track.photoUrl)}" alt="${escapeHtml(track.artist)}" style="width:58px; height:58px; border-radius:10px; object-fit:cover; border:1px solid rgba(255,183,3,0.3); display:block;">`
        : `<div style="width:58px; height:58px; border-radius:10px; background:linear-gradient(135deg, rgba(255,183,3,0.15), rgba(30,111,255,0.15)); border:1px solid rgba(255,183,3,0.3); display:flex; align-items:center; justify-content:center; color:#ffb703; font-size:22px; text-align:center; line-height:58px;">🎵</div>`;

      return `
        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 18px; margin-bottom: 16px;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <!-- Artist Photo / Artwork Thumbnail -->
              <td style="width: 68px; vertical-align: top; padding-right: 14px;">
                ${avatarHtml}
              </td>

              <!-- Song & Artist Details -->
              <td style="vertical-align: top;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                  <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #ffb703; letter-spacing: 0.5px;">
                    #${idx + 1} · ${escapeHtml(track.genre || 'Hip-Hop')}
                  </span>
                  ${track.release_date ? `<span style="font-size: 11px; color: #64748b;">Drop: ${escapeHtml(track.release_date)}</span>` : ''}
                </div>

                <div style="font-size: 17px; font-weight: 800; color: #ffffff; margin-bottom: 4px; line-height: 1.3;">
                  ${escapeHtml(cleanTitle)}
                </div>

                <div style="font-size: 14px; font-weight: 700; color: #00f0ff; margin-bottom: 8px;">
                  ${escapeHtml(track.artist)}
                </div>

                <!-- Version Badges & Streaming Links -->
                <div style="margin-bottom: 10px;">
                  ${hasClean ? `
                    <span style="display: inline-block; background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.4); color: #4ade80; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; margin-right: 6px;">
                      ✓ Clean (Radio)
                    </span>
                  ` : ''}

                  ${hasDirty ? `
                    <span style="display: inline-block; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; margin-right: 6px;">
                      🔥 Dirty (Explicit)
                    </span>
                  ` : ''}

                  <a href="${SITE_URL}/admin/music.html" target="_blank" style="display: inline-block; background: rgba(0, 240, 255, 0.12); border: 1px solid rgba(0, 240, 255, 0.35); color: #00f0ff; font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 6px; text-decoration: none;">
                    ▶ Play in Crate
                  </a>
                </div>

                <!-- Verified Artist Links -->
                ${chips.length > 0 ? `
                  <div style="padding-top: 8px; border-top: 1px dashed rgba(255, 255, 255, 0.08); font-size: 11px; color: #94a3b8;">
                    <span style="color: #64748b; margin-right: 6px;">Verified Links:</span>
                    ${chips.join('')}
                  </div>
                ` : ''}
              </td>
            </tr>
          </table>
        </div>
      `;
    }).join('');

    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 30px 15px; background-color: #05070b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <div style="background-color: #07090e; color: #f8fafc; padding: 35px 28px; border-radius: 16px; max-width: 640px; margin: 0 auto; border: 1px solid rgba(255, 183, 3, 0.3); box-shadow: 0 15px 45px rgba(0,0,0,0.8), 0 0 35px rgba(255, 183, 3, 0.1);">

    <!-- Header / Branding -->
    <div style="text-align: center; margin-bottom: 26px;">
      <h1 style="color: #ffb703; margin: 0 0 6px 0; font-size: 26px; letter-spacing: 1.5px; font-weight: 800; text-transform: uppercase;">
        ⚡ THUNDER CRATE · FRESH DROPS
      </h1>
      <div style="display: inline-block; background: rgba(0, 240, 255, 0.12); border: 1px solid rgba(0, 240, 255, 0.35); color: #00f0ff; font-weight: 700; padding: 4px 14px; border-radius: 20px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
        Music of the Week • Staff DJ Intelligence
      </div>
      <div style="color: #94a3b8; font-size: 13px; margin-top: 8px;">
        ${escapeHtml(dateStr)} • ${enhancedTracks.length} Trending Drops Curated
      </div>
    </div>

    <!-- Executive Greeting Banner -->
    <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
      <p style="margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
        Here are your latest <strong style="color: #ffb703;">Fresh Drops of the Week</strong> scouted across Hip-Hop, R&amp;B, and club charts. Each release features Clean (Radio) and Dirty (Explicit) tracks staged in your 30-day cloud vault, ready for your upcoming weekend gigs.
      </p>
    </div>

    <!-- Track List -->
    <div style="margin-bottom: 28px;">
      ${tracksHtml}
    </div>

    <!-- Quick Action Launch Buttons -->
    <div style="text-align: center; margin: 30px 0 20px 0;">
      <a href="${SITE_URL}/admin/music.html" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #ffb703, #d97706); color: #000000; font-weight: 800; font-size: 14px; text-decoration: none; padding: 14px 30px; border-radius: 30px; box-shadow: 0 0 25px rgba(255, 183, 3, 0.35); text-transform: uppercase; letter-spacing: 0.5px; margin: 6px;">
        🎧 Open Thunder Crate Player
      </a>
      <a href="${SITE_URL}/admin/today.html" target="_blank" style="display: inline-block; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.2); color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 24px; border-radius: 30px; text-transform: uppercase; letter-spacing: 0.5px; margin: 6px;">
        📊 Today Dashboard
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding-top: 22px; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 12px; color: #64748b; line-height: 1.6;">
      <strong style="color: #94a3b8;">Thunder House Entertainment</strong> • Oklahoma City, OK<br>
      Automated via <strong>Thunder Crate Music Ingest Engine</strong><br>
      <span style="font-size: 11px; color: #475569;">To update delivery schedule or recipients, visit Automations Station in the Admin panel.</span>
    </div>
  </div>
</body>
</html>`;

    // Plain text fallback
    const emailText = `THUNDER CRATE · FRESH DROPS OF THE WEEK
${dateStr}

${enhancedTracks.map((t, i) => {
  const cleanTitle = (t.title || 'Untitled').replace(/\[.*?\]/g, '').trim();
  return `${i + 1}. ${t.artist} - ${cleanTitle} [${t.genre || 'Hip-Hop'}]
Clean: ${t.clean_downloaded ? 'YES' : 'NO'} | Dirty: ${t.dirty_downloaded ? 'YES' : 'NO'}
Play: ${SITE_URL}/admin/music.html`;
}).join('\n\n')}

Open Thunder Crate: ${SITE_URL}/admin/music.html`;

    if (isPreview) {
      return res.status(200).send(emailHtml);
    }

    // 5. Dispatch via Supabase Edge Function
    let dispatchStatus = 'sent';
    let dispatchSummary = `Successfully dispatched to ${recipients.join(', ')}`;
    let edgeResData = null;

    try {
      const edgeRes = await fetch(`${SUPABASE_URL}/functions/v1/send-booking-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          type: 'weekly_music_digest',
          recipients: recipients,
          subject: subject,
          html: emailHtml,
          text: emailText,
          tracks: enhancedTracks
        })
      });

      edgeResData = await edgeRes.json().catch(() => ({}));
      if (!edgeRes.ok || (edgeResData && edgeResData.success === false)) {
        dispatchStatus = 'error';
        dispatchSummary = `Edge dispatch warning: ${edgeResData?.error || edgeRes.statusText}`;
      } else if (edgeResData && edgeResData.status === 'pending_config') {
        dispatchSummary = `Email compiled. SMTP credentials pending in Supabase secrets.`;
      }
    } catch (edgeErr) {
      dispatchStatus = 'error';
      dispatchSummary = `Edge dispatch error: ${edgeErr.message}`;
    }

    const durationMs = Date.now() - startTime;

    // 6. Update Automation Station State & Execution Log
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/thunderhouse_automations?id=eq.weekly_music_digest`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          last_run_at: new Date().toISOString(),
          last_run_status: dispatchStatus === 'sent' ? 'success' : 'error',
          last_run_summary: dispatchSummary,
          last_duration_ms: durationMs,
          updated_at: new Date().toISOString()
        })
      });

      await fetch(`${SUPABASE_URL}/rest/v1/thunderhouse_automation_logs`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          automation_id: 'weekly_music_digest',
          status: dispatchStatus === 'sent' ? 'success' : 'error',
          summary: dispatchSummary,
          duration_ms: durationMs,
          triggered_by: isForce ? 'manual_admin' : 'scheduled_cron'
        })
      });
    } catch (dbErr) {
      console.warn('Logging update note:', dbErr.message);
    }

    return res.status(200).json({
      success: true,
      status: dispatchStatus,
      summary: dispatchSummary,
      tracks_curated: enhancedTracks.length,
      recipients: recipients,
      duration_ms: durationMs,
      edge_response: edgeResData
    });

  } catch (err) {
    console.error('Fatal weekly music digest error:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
