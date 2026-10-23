/**
 * Thunder House ENT - Production System Error Logger
 * Captures, deduplicates, and logs system issues with rate-limiting and local fallback.
 */

(function () {
  const MAX_LOGS_PER_MINUTE = 10;
  const LOCAL_CACHE_LIMIT = 30;
  let logCountThisMinute = 0;
  let minuteResetTimer = null;
  const recentSignatures = new Set();

  function resetRateLimit() {
    logCountThisMinute = 0;
    recentSignatures.clear();
  }

  function getClientContext() {
    return {
      url: window.location.href,
      pathname: window.location.pathname,
      referrer: document.referrer || null,
      userAgent: navigator.userAgent,
      screen: `${window.innerWidth}x${window.innerHeight}`,
      timestamp: new Date().toISOString()
    };
  }

  function saveLocalFallback(logItem) {
    try {
      const existing = JSON.parse(localStorage.getItem('th_local_error_logs') || '[]');
      existing.unshift(logItem);
      if (existing.length > LOCAL_CACHE_LIMIT) existing.length = LOCAL_CACHE_LIMIT;
      localStorage.setItem('th_local_error_logs', JSON.stringify(existing));
    } catch (e) {}
  }

  async function recordError(source, message, options = {}) {
    if (!message) return;

    // Rate Limiting
    if (!minuteResetTimer) {
      minuteResetTimer = setTimeout(() => {
        resetRateLimit();
        minuteResetTimer = null;
      }, 60000);
    }

    const cleanMsg = String(message).trim().substring(0, 1000);
    const signature = `${source}:::${cleanMsg}`;

    // Suppress rapid-fire exact duplicates within the minute
    if (recentSignatures.has(signature)) return;
    recentSignatures.add(signature);

    if (logCountThisMinute >= MAX_LOGS_PER_MINUTE) {
      console.warn('[ThunderLogger] Rate limit reached. Suppressing excess logs for 60s.');
      return;
    }
    logCountThisMinute++;

    const logPayload = {
      source: source || 'app',
      error_message: cleanMsg,
      error_stack: options.stack ? String(options.stack).substring(0, 4000) : null,
      severity: options.severity || 'error',
      context: {
        ...getClientContext(),
        ...(options.context || {})
      },
      last_occurred_at: new Date().toISOString()
    };

    // Always store in local fallback
    saveLocalFallback(logPayload);

    // Send to Supabase
    if (window.supabaseClient) {
      try {
        // Try atomic RPC function first
        const { error } = await window.supabaseClient.rpc('log_thunder_error', {
          p_source: logPayload.source,
          p_message: logPayload.error_message,
          p_stack: logPayload.error_stack,
          p_context: logPayload.context,
          p_severity: logPayload.severity
        });

        // Fallback to direct insert if RPC function not yet created
        if (error) {
          await window.supabaseClient
            .from('thunderhouse_system_errors')
            .upsert({
              source: logPayload.source,
              error_message: logPayload.error_message,
              error_stack: logPayload.error_stack,
              context: logPayload.context,
              severity: logPayload.severity,
              last_occurred_at: logPayload.last_occurred_at
            }, { onConflict: 'source,error_message' });
        }
      } catch (err) {
        // Silent catch to prevent recursive error loops
      }
    }
  }

  // Global Logger API
  window.ThunderLogger = {
    error: (source, msg, opts) => recordError(source, msg, { ...opts, severity: 'error' }),
    warn: (source, msg, opts) => recordError(source, msg, { ...opts, severity: 'warn' }),
    critical: (source, msg, opts) => recordError(source, msg, { ...opts, severity: 'critical' }),
    getLocalLogs: () => {
      try {
        return JSON.parse(localStorage.getItem('th_local_error_logs') || '[]');
      } catch (e) {
        return [];
      }
    },
    clearLocalLogs: () => {
      try {
        localStorage.removeItem('th_local_error_logs');
      } catch (e) {}
    }
  };

  // Auto-capture uncaught script errors
  window.addEventListener('error', (event) => {
    // Ignore benign cross-origin extension noise
    if (event.filename && (event.filename.includes('chrome-extension:') || event.filename.includes('moz-extension:'))) {
      return;
    }
    const source = window.location.pathname.split('/').pop() || 'global';
    window.ThunderLogger.error(source, event.message, {
      stack: event.error ? event.error.stack : `${event.filename}:${event.lineno}:${event.colno}`,
      context: { filename: event.filename, lineno: event.lineno }
    });
  });

  // Auto-capture unhandled Promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : null;
    const source = window.location.pathname.split('/').pop() || 'promise';
    window.ThunderLogger.error(source, `Unhandled Promise: ${msg}`, { stack });
  });

})();
