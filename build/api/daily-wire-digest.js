/**
 * Thunder House ENT - The Daily Wire 7:00 AM Email Ingestion & Dispatcher
 * Compiles the morning culture intelligence feed into a cyber dark-luxe email
 * and dispatches to configured executive recipients.
 */

const https = require('https');

const SUPABASE_URL = 'https://kxoivmflghfgtvawhktt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4b2l2bWZsZ2hmZ3R2YXdoa3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NTI5NTEsImV4cCI6MjEwNzIyODk1MX0.lrbLr6Q6tNwRWUGH7T3g6dL3jwU3TbaoUL1yRliBgTY';

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const startTime = Date.now();
  const isForce = req.query && (req.query.force === 'true' || req.query.manual === 'true');
  const isPreview = req.query && req.query.preview === 'true';

  try {
    // 1. Fetch Automation Configuration from database
    const autoCfg = await fetchSupabase(`/rest/v1/thunderhouse_automations?id=eq.daily_wire_digest&select=*`);
    const automation = Array.isArray(autoCfg) && autoCfg[0] ? autoCfg[0] : null;

    if (!automation && !isForce) {
      return res.status(404).json({ success: false, error: 'daily_wire_digest automation not found' });
    }

    const isEnabled = automation ? automation.enabled : true;
    if (!isEnabled && !isForce && !isPreview) {
      return res.status(200).json({
        success: true,
        skipped: true,
        message: 'The Daily Wire 7am digest is currently paused in the Automation Station.'
      });
    }

    // Determine Recipients (from request, automation config, or default)
    let recipients = ['breshaun.black@gmail.com', 'olifedigital@gmail.com'];
    if (automation && automation.config && Array.isArray(automation.config.recipients) && automation.config.recipients.length > 0) {
      recipients = automation.config.recipients;
    }
    if (req.body && Array.isArray(req.body.recipients) && req.body.recipients.length > 0) {
      recipients = req.body.recipients;
    }

    // 2. Fetch Active Wire Stories from thunderpulse_feed (or thunderwire_feed)
    let stories = await fetchSupabase(`/rest/v1/thunderpulse_feed?select=*&is_archived=neq.true&order=virality_score.desc&limit=6`);
    if (!Array.isArray(stories) || stories.length === 0) {
      stories = await fetchSupabase(`/rest/v1/thunderwire_feed?select=*&is_archived=neq.true&order=virality_score.desc&limit=6`);
    }

    if (!Array.isArray(stories) || stories.length === 0) {
      // Fallback query if archived flag filter returned empty
      stories = await fetchSupabase(`/rest/v1/thunderpulse_feed?select=*&order=virality_score.desc&limit=6`);
    }

    if (!Array.isArray(stories) || stories.length === 0) {
      return res.status(200).json({
        success: false,
        message: 'No active stories found on the Thunder Wire to compile.'
      });
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

    const subject = `⚡ The Daily Wire: ${cleanSubject(leadStory.title)} [Morning Executive Briefing]`;

    // 3. Generate HTML & Plaintext Email
    const emailHtml = generateEmailHtml({
      leadStory,
      otherStories,
      dateFormatted,
      recipients,
      totalCount: stories.length,
      scheduleTime: automation ? automation.schedule_time : '07:00'
    });

    const emailText = generateEmailText({
      leadStory,
      otherStories,
      dateFormatted,
      recipients
    });

    if (isPreview) {
      return res.status(200).send(emailHtml);
    }

    // 4. Dispatch via Supabase Edge Function
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
          type: 'daily_wire_digest',
          recipients: recipients,
          subject: subject,
          html: emailHtml,
          text: emailText,
          stories: stories
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

    // 5. Update Automation Station State & Execution Log
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/thunderhouse_automations?id=eq.daily_wire_digest`, {
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
          automation_id: 'daily_wire_digest',
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
      recipients: recipients,
      subject: subject,
      storiesCount: stories.length,
      leadStory: leadStory.title,
      summary: dispatchSummary,
      edgeResponse: edgeResData,
      durationMs: durationMs
    });

  } catch (err) {
    console.error('[The Daily Wire] General error:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Supabase REST Helper
function fetchSupabase(path) {
  return new Promise((resolve) => {
    const url = new URL(path, SUPABASE_URL);
    https.get(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

function cleanSubject(str) {
  if (!str) return 'Morning Intelligence';
  let clean = str.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").trim();
  if (clean.length > 55) clean = clean.substring(0, 52) + '...';
  return clean;
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

function getCategoryColor(cat) {
  if (cat === 'lead') return { bg: 'rgba(0, 229, 255, 0.15)', text: '#00e5ff', border: 'rgba(0, 229, 255, 0.4)', name: 'The Opening Bell' };
  if (cat === 'shade') return { bg: 'rgba(255, 0, 85, 0.15)', text: '#ff0055', border: 'rgba(255, 0, 85, 0.4)', name: 'The Shade Storm' };
  if (cat === 'drops') return { bg: 'rgba(255, 183, 3, 0.15)', text: '#ffb703', border: 'rgba(255, 183, 3, 0.4)', name: 'The Drop Zone' };
  if (cat === 'wild') return { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.4)', name: 'Are You Out Your Mind?!' };
  return { bg: 'rgba(148, 163, 184, 0.15)', text: '#cbd5e1', border: 'rgba(148, 163, 184, 0.4)', name: 'Real Talk' };
}

// Generate Cyber Dark-Luxe Responsive HTML Email
function generateEmailHtml({ leadStory, otherStories, dateFormatted, recipients, totalCount, scheduleTime }) {
  const leadCat = getCategoryColor(leadStory.category);
  const leadHeat = leadStory.virality_score || 95;
  const leadPoints = Array.isArray(leadStory.talking_points) ? leadStory.talking_points : [leadStory.summary];

  const otherCardsHtml = otherStories.map(story => {
    const cat = getCategoryColor(story.category);
    const heat = story.virality_score || 85;
    return `
      <tr>
        <td style="padding: 16px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="vertical-align: top;">
                <div style="margin-bottom: 6px;">
                  <span style="display: inline-block; background: ${cat.bg}; color: ${cat.text}; border: 1px solid ${cat.border}; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                    ${cat.name}
                  </span>
                  <span style="display: inline-block; background: rgba(255, 183, 3, 0.15); color: #ffb703; padding: 3px 8px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-left: 6px;">
                    🔥 Heat ${heat}
                  </span>
                </div>
                <a href="${escapeHtml(story.source_url || 'https://thunderhouseent.com/admin/wire.html')}" target="_blank" style="color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; line-height: 1.4; display: block; margin-bottom: 6px;">
                  ${escapeHtml(story.title)}
                </a>
                <div style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin-bottom: 6px;">
                  ${escapeHtml(story.summary || '')}
                </div>
                <div style="font-size: 11.5px; color: #64748b;">
                  Source: <strong style="color: #cbd5e1;">${escapeHtml(story.source_name || 'Thunder Wire')}</strong>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Daily Wire · Thunder House ENT</title>
</head>
<body style="margin: 0; padding: 25px 12px; background-color: #04060a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 650px; margin: 0 auto; background-color: #07090e; border-radius: 16px; border: 1px solid #1e293b; box-shadow: 0 20px 50px rgba(0,0,0,0.85); overflow: hidden;">
    
    <!-- Header Banner -->
    <tr>
      <td style="background: linear-gradient(135deg, #090d16 0%, #111827 100%); padding: 32px 28px 24px; border-bottom: 2px solid #00e5ff; text-align: center;">
        <div style="font-size: 11px; font-weight: 800; color: #00e5ff; letter-spacing: 2.5px; text-transform: uppercase; margin-bottom: 6px;">
          ⚡ THUNDER HOUSE ENTERTAINMENT · #WAKEITUP
        </div>
        <h1 style="margin: 0 0 6px 0; font-size: 32px; font-weight: 800; letter-spacing: 1px; color: #ffffff; text-transform: uppercase;">
          THE DAILY WIRE
        </h1>
        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 14px;">
          Morning Culture, Music &amp; Broadcast Intelligence Briefing
        </div>
        <div style="display: inline-block; background: rgba(0, 229, 255, 0.08); border: 1px solid rgba(0, 229, 255, 0.3); border-radius: 30px; padding: 5px 16px; font-size: 12px; color: #ffb703; font-weight: 700;">
          📅 ${escapeHtml(dateFormatted)} · ⏰ ${escapeHtml(scheduleTime)} CST
        </div>
      </td>
    </tr>

    <!-- Stats Bar -->
    <tr>
      <td style="background: rgba(255, 255, 255, 0.02); padding: 12px 28px; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 12px; color: #94a3b8;">
          <tr>
            <td>
              <strong style="color: #00e5ff;">5 Curated Stories</strong> in today's wire
            </td>
            <td align="right">
              Peak Virality: <strong style="color: #ffb703;">Heat ${leadHeat}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Content Body -->
    <tr>
      <td style="padding: 28px;">
        
        <!-- TOP LEAD STORY HERO CARD -->
        <div style="margin-bottom: 28px; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(0, 229, 255, 0.3); border-radius: 12px; overflow: hidden; box-shadow: 0 0 25px rgba(0, 229, 255, 0.1);">
          ${leadStory.image_url ? `
            <div style="height: 220px; background-image: url('${escapeHtml(leadStory.image_url)}'); background-size: cover; background-position: center; position: relative;">
            </div>
          ` : ''}
          <div style="padding: 22px;">
            <div style="margin-bottom: 10px;">
              <span style="background: ${leadCat.bg}; color: ${leadCat.text}; border: 1px solid ${leadCat.border}; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
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

            <!-- Talking Points -->
            <div style="background: rgba(0, 229, 255, 0.05); border-left: 3px solid #00e5ff; border-radius: 0 8px 8px 0; padding: 12px 16px; margin-bottom: 14px;">
              <div style="font-size: 11px; font-weight: 800; color: #00e5ff; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                🎙️ On-Air Host Talking Points
              </div>
              <ul style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.5; color: #e2e8f0;">
                ${leadPoints.slice(0, 3).map(pt => `<li>${escapeHtml(pt)}</li>`).join('')}
              </ul>
            </div>

            <!-- Debate Question -->
            <div style="background: rgba(255, 0, 85, 0.08); border-left: 3px solid #ff0055; border-radius: 0 8px 8px 0; padding: 12px 16px;">
              <div style="font-size: 11px; font-weight: 800; color: #ff0055; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                💬 Charlamagne Style Prompt / Call-In Debate
              </div>
              <div style="font-size: 13.5px; font-weight: 600; color: #ffffff; line-height: 1.4;">
                "${escapeHtml(leadStory.host_question || 'What is your honest take on this: smart move or completely out of their mind?')}"
              </div>
            </div>
          </div>
        </div>

        <!-- BREAKING CULTURE WIRE STORIES -->
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 15px; font-weight: 800; color: #00e5ff; letter-spacing: 1px; text-transform: uppercase; margin: 0 0 12px 0; border-bottom: 1px solid rgba(0, 229, 255, 0.2); padding-bottom: 8px;">
            ⚡ Today's Morning Rundown
          </h3>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${otherCardsHtml}
          </table>
        </div>

        <!-- CALL TO ACTION BUTTONS -->
        <div style="text-align: center; margin: 32px 0 10px;">
          <a href="https://thunderhouseent.com/admin/wire.html" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #00e5ff 0%, #0099ff 100%); color: #000000; font-weight: 800; font-size: 14px; text-decoration: none; padding: 14px 28px; border-radius: 30px; box-shadow: 0 0 25px rgba(0, 229, 255, 0.4); text-transform: uppercase; letter-spacing: 0.5px; margin: 6px;">
            ⚡ Open Producer Desk &amp; Prompter
          </a>
          <a href="https://thunderhouseent.com/admin/automations.html" target="_blank" style="display: inline-block; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 13px 24px; border-radius: 30px; text-transform: uppercase; letter-spacing: 0.5px; margin: 6px;">
            ⚙️ Manage Schedule &amp; Recipients
          </a>
        </div>

      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #030407; padding: 24px 28px; border-top: 1px solid rgba(255, 255, 255, 0.08); text-align: center; font-size: 12px; color: #64748b; line-height: 1.6;">
        <strong style="color: #cbd5e1;">Thunder House Entertainment</strong> • Oklahoma City, OK<br>
        Direct to: <strong style="color: #94a3b8;">${recipients.map(escapeHtml).join(', ')}</strong><br>
        <span style="font-size: 11px; color: #475569;">
          Automated Daily Intelligence Dispatch • To adjust time, pause, or update recipients, visit <a href="https://thunderhouseent.com/admin/automations.html" style="color: #00e5ff; text-decoration: none;">Automation Station</a>.
        </span>
      </td>
    </tr>

  </table>
</body>
</html>`;
}

function generateEmailText({ leadStory, otherStories, dateFormatted, recipients }) {
  return `⚡ THE DAILY WIRE · THUNDER HOUSE ENTERTAINMENT
Morning Culture & Music Intelligence Briefing
${dateFormatted}
==================================================

[TOP STORY: ${leadStory.category.toUpperCase()} | HEAT ${leadStory.virality_score || 95}]
${leadStory.title}
Source: ${leadStory.source_name}
Link: ${leadStory.source_url}

SUMMARY:
${leadStory.summary}

ON-AIR HOST TALKING POINTS:
${(Array.isArray(leadStory.talking_points) ? leadStory.talking_points : [leadStory.summary]).map(p => `• ${p}`).join('\n')}

DEBATE PROMPT:
"${leadStory.host_question || 'What is your take on this?'}"

==================================================
TODAY'S RUNDOWN:
${otherStories.map((s, i) => `${i + 1}. [${s.category.toUpperCase()}] ${s.title}\n   ${s.summary}\n   Link: ${s.source_url}\n`).join('\n')}

==================================================
Open Producer Desk & Teleprompter: https://thunderhouseent.com/admin/wire.html
Manage Automation Schedule & Recipients: https://thunderhouseent.com/admin/automations.html

Dispatched to: ${recipients.join(', ')}
Thunder House ENT • Oklahoma City, OK
`;
}
