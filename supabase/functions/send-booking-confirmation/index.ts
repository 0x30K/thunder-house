import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE = "https://www.thunderhouseent.com";

/** "2026-11-28" -> "November 28th, 2026". Anything else (e.g. "Flexible: Spring 2027") is left as is. */
function prettyDate(s?: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || "");
  if (!m) return s || "";
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const d = +m[3];
  const sfx = d % 100 >= 11 && d % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][d % 10] || "th");
  return `${months[+m[2] - 1]} ${d}${sfx}, ${m[1]}`;
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    // Service-role client: settings and invoices are staff-only now
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1. SMTP credentials: Edge Function secrets first, then the staff-only settings row
    let smtpUser = Deno.env.get("SMTP_USER") || Deno.env.get("GMAIL_USER");
    let smtpPass = Deno.env.get("SMTP_PASS") || Deno.env.get("GMAIL_APP_PASSWORD");

    if (!smtpPass) {
      const { data } = await supabase
        .from("thunderhouse_site_settings")
        .select("value")
        .eq("key", "email_settings")
        .maybeSingle();

      if (data && data.value) {
        smtpUser = smtpUser || data.value.smtp_user;
        smtpPass = data.value.smtp_pass;
      }
    }

    if (!smtpPass || !smtpUser) {
      console.warn("SMTP credentials not configured.");
      return new Response(
        JSON.stringify({
          success: true,
          status: "pending_config",
          message: "Email dispatch pending SMTP configuration.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass.replace(/\s+/g, ""),
      },
    });

    // =========================================================================
    // CASE A: INVOICE EMAIL DISPATCH
    // Everything (recipient, amounts, links) comes from the saved invoice, so this
    // endpoint can't be used to send arbitrary emails to arbitrary people.
    // =========================================================================
    if (payload.type === "invoice" || payload.is_invoice || payload.type === "invoice_dispatched") {
      const requestedNumber = payload.invoice_data?.invoice_number || payload.invoice_number;
      if (!requestedNumber) {
        return new Response(
          JSON.stringify({ success: false, error: "Invoice number is required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { data: inv } = await supabase
        .from("thunderhouse_invoices")
        .select("*")
        .eq("invoice_number", requestedNumber)
        .maybeSingle();
      if (!inv) {
        return new Response(
          JSON.stringify({ success: false, error: "Invoice not found." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const clientName = inv.client_name || "Valued Client";
      const clientEmail = inv.client_email;
      const invoiceNumber = inv.invoice_number;
      const totalAmount = parseFloat(inv.total_amount || 0);
      const balanceDue = parseFloat(inv.balance_due !== undefined && inv.balance_due !== null ? inv.balance_due : totalAmount);
      const dueDate = inv.due_date ? prettyDate(inv.due_date) : "Upon Receipt";
      const eventDate = inv.event_date ? prettyDate(inv.event_date) : "To Be Scheduled";
      const venueCity = inv.venue_city || "Oklahoma City, OK";
      const invoiceUrl = `${SITE}/invoice?num=${encodeURIComponent(invoiceNumber)}&key=${encodeURIComponent(inv.client_key)}`;
      const notes = inv.notes || "";
      const items = Array.isArray(inv.items) && inv.items.length > 0 ? inv.items : [
        { description: "Thunder House Entertainment Services", quantity: 1, rate: totalAmount, amount: totalAmount }
      ];

      if (!clientEmail) {
        return new Response(
          JSON.stringify({ success: false, error: "Client email is required for invoice dispatch." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate items rows HTML
      const itemsHtmlRows = items.map((it: any) => {
        const qty = it.quantity || 1;
        const rate = parseFloat(it.rate || it.amount || 0);
        const amount = parseFloat(it.amount || (qty * rate) || 0);
        return `
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
            <td style="padding: 10px 8px; color: #fff;">
              <strong>${escapeHtml(it.description || "Service Item")}</strong>
              ${it.details ? `<div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">${escapeHtml(it.details)}</div>` : ""}
            </td>
            <td style="padding: 10px 8px; text-align: center; color: #cbd5e1;">${escapeHtml(String(qty))}</td>
            <td style="padding: 10px 8px; text-align: right; color: #cbd5e1;">$${rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="padding: 10px 8px; text-align: right; color: #3d86ff; font-weight: 700;">$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        `;
      }).join("");

      const itemsText = items.map((it: any) => {
        const qty = it.quantity || 1;
        const rate = parseFloat(it.rate || it.amount || 0);
        const amount = parseFloat(it.amount || (qty * rate) || 0);
        return `- ${it.description} (Qty ${qty} @ $${rate.toFixed(2)}) = $${amount.toFixed(2)}`;
      }).join("\n");

      // Plain text fallback
      const invoicePlainText = `Hi ${clientName},

Your invoice from Thunder House ENT is ready.

INVOICE SUMMARY:
- Invoice #: ${invoiceNumber}
- Due Date: ${dueDate}
- Event Date: ${eventDate}
- Venue / City: ${venueCity}
- Total Amount: $${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Balance Due: $${balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

LINE ITEMS:
${itemsText}

${notes ? `NOTES / TERMS:\n${notes}\n` : ""}
VIEW & PAY YOUR INVOICE:
${invoiceUrl}

Thunder House ENT • Oklahoma City, OK
Phone: (405) 283-2533
Email: ${smtpUser}`;

      // Rich Cyber Dark-Mode HTML
      const invoiceHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${escapeHtml(invoiceNumber)} | Thunder House ENT</title>
</head>
<body style="margin: 0; padding: 30px 15px; background-color: #05070b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <div style="background-color: #07090e; color: #f8fafc; padding: 35px 28px; border-radius: 16px; max-width: 620px; margin: 0 auto; border: 1px solid #3d86ff; box-shadow: 0 15px 45px rgba(0,0,0,0.8), 0 0 30px rgba(30, 111, 255, 0.15);">

    <!-- Branding Header -->
    <div style="text-align: center; margin-bottom: 26px;">
      <h1 style="color: #3d86ff; margin: 0 0 6px 0; font-size: 28px; letter-spacing: 1.5px; font-weight: 800;">THUNDER HOUSE ENT</h1>
      <div style="display: inline-block; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); color: #ffb703; font-weight: 700; padding: 4px 14px; border-radius: 20px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
        OKC Event DJ & MC Services • Invoice
      </div>
    </div>

    <!-- Invoice Header Callout -->
    <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 20px; margin-bottom: 22px;">
      <table role="presentation" style="width: 100%; border-collapse: collapse; border-bottom: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 14px;">
        <tr>
          <td style="padding: 0 12px 12px 0; vertical-align: bottom;">
            <span style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.5px;">Invoice Number</span>
            <div style="color: #fff; font-size: 22px; margin: 2px 0 0 0; font-weight: 800; letter-spacing: 0.5px;">${escapeHtml(invoiceNumber)}</div>
          </td>
          <td style="padding: 0 0 12px 12px; vertical-align: bottom; text-align: right;">
            <span style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.5px;">Due Date</span>
            <div style="color: #ffb703; font-size: 15px; font-weight: 700; margin-top: 2px; white-space: nowrap;">${escapeHtml(dueDate)}</div>
          </td>
        </tr>
      </table>
      <p style="color: #cbd5e1; font-size: 14.5px; line-height: 1.55; margin: 0;">
        Hi <strong>${escapeHtml(clientName)}</strong>, thank you for choosing Thunder House ENT! Please review your invoice details below.
      </p>
    </div>

    <!-- Event & Client Summary Grid -->
    <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 16px; margin-bottom: 22px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; color: #cbd5e1;">
        <tr>
          <td style="padding: 5px 0; color: #94a3b8; width: 40%;">Event Date:</td>
          <td style="font-weight: 600; color: #fff; text-align: right;">${escapeHtml(eventDate)}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #94a3b8;">Location / Venue:</td>
          <td style="font-weight: 600; color: #fff; text-align: right;">${escapeHtml(venueCity)}</td>
        </tr>
      </table>
    </div>

    <!-- Items Table -->
    <div style="background: rgba(30, 111, 255, 0.03); border: 1px solid rgba(30, 111, 255, 0.2); border-radius: 10px; padding: 18px; margin-bottom: 22px;">
      <h3 style="color: #3d86ff; font-size: 13px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">
        Itemized Breakdown
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
        <thead>
          <tr style="border-bottom: 1px solid rgba(30, 111, 255, 0.25); color: #94a3b8; font-size: 11px; text-transform: uppercase;">
            <th style="text-align: left; padding: 6px 8px;">Description</th>
            <th style="text-align: center; padding: 6px 8px; width: 45px;">Qty</th>
            <th style="text-align: right; padding: 6px 8px; width: 85px;">Rate</th>
            <th style="text-align: right; padding: 6px 8px; width: 95px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtmlRows}
        </tbody>
      </table>

      <!-- Totals -->
      <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.1); text-align: right;">
        <div style="font-size: 13px; color: #94a3b8; margin-bottom: 4px;">
          Total Invoiced: <strong style="color: #fff;">$${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
        </div>
        <div style="font-size: 18px; color: #ffb703; font-weight: 800;">
          Balance Due: $${balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
    </div>

    ${notes ? `
    <!-- Notes / Terms -->
    <div style="background: rgba(255, 255, 255, 0.02); border-left: 3px solid #3d86ff; border-radius: 4px; padding: 12px 14px; margin-bottom: 22px;">
      <strong style="color: #fff; font-size: 12.5px; display: block; margin-bottom: 4px;">Notes & Instructions:</strong>
      <p style="color: #94a3b8; font-size: 12.5px; line-height: 1.5; margin: 0;">${escapeHtml(notes).replace(/\n/g, "<br>")}</p>
    </div>` : ""}

    <!-- Action Buttons -->
    <div style="text-align: center; margin-bottom: 26px;">
      <a href="${escapeHtml(invoiceUrl)}" target="_blank" style="display: inline-block; background: #1e6fff; color: #ffffff; font-weight: 800; font-size: 15px; text-decoration: none; padding: 14px 28px; border-radius: 30px; box-shadow: 0 0 25px rgba(30, 111, 255, 0.4); text-transform: uppercase; letter-spacing: 0.5px; margin: 6px;">
        ⚡ View &amp; Pay Invoice
      </a>
    </div>

    <!-- Contact & Footer -->
    <div style="text-align: center; padding-top: 18px; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 12px; color: #64748b; line-height: 1.6;">
      <strong style="color: #94a3b8;">Thunder House ENT</strong> • Oklahoma City, OK<br>
      Email: <a href="mailto:${smtpUser}" style="color: #3d86ff; text-decoration: none;">${smtpUser}</a> • Website: <a href="https://www.thunderhouseent.com" style="color: #3d86ff; text-decoration: none;">thunderhouseent.com</a><br>
      <span style="font-size: 11px; color: #475569;">Questions regarding this invoice? Reply directly to this email.</span>
    </div>
  </div>
</body>
</html>`;

      // Dispatch Invoice Email to Client
      await transporter.sendMail({
        from: `"Thunder House ENT" <${smtpUser}>`,
        to: clientEmail,
        replyTo: smtpUser,
        subject: `⚡ Thunder House ENT: Invoice #${invoiceNumber} for ${clientName}`,
        text: invoicePlainText,
        html: invoiceHtml,
        headers: {
          "X-Priority": "3",
          "X-Entity-Ref-ID": `th-inv-${invoiceNumber}-${Date.now()}`,
        },
      });

      return new Response(
        JSON.stringify({ success: true, message: `Invoice #${invoiceNumber} sent successfully to ${clientEmail}.` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // CASE C: THE DAILY WIRE DIGEST EMAIL
    // =========================================================================
    if (payload.type === "daily_wire_digest" || payload.is_daily_wire) {
      let recipientList: string[] = [];
      if (Array.isArray(payload.recipients)) {
        recipientList = payload.recipients.map((s: any) => String(s).trim()).filter(Boolean);
      } else if (typeof payload.recipients === "string") {
        recipientList = payload.recipients.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
      if (recipientList.length === 0) {
        recipientList = ["breshaun.black@gmail.com", "olifedigital@gmail.com"];
      }

      const subject = payload.subject || `⚡ The Daily Wire: Morning Culture & Music Intelligence`;
      const htmlContent = payload.html || `<p>The Daily Wire morning culture briefing.</p>`;
      const textContent = payload.text || `The Daily Wire morning culture briefing.`;

      const results = [];
      for (const toEmail of recipientList) {
        try {
          await transporter.sendMail({
            from: `"The Daily Wire · Thunder House" <${smtpUser}>`,
            to: toEmail,
            replyTo: smtpUser,
            subject: subject,
            text: textContent,
            html: htmlContent,
            headers: {
              "X-Priority": "2",
              "X-Entity-Ref-ID": `th-daily-wire-${Date.now()}`,
            },
          });
          results.push({ email: toEmail, status: "sent" });
        } catch (mErr: any) {
          console.error(`Daily wire dispatch error to ${toEmail}:`, mErr);
          results.push({ email: toEmail, status: "error", error: mErr.message });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `The Daily Wire digest dispatched to ${recipientList.length} recipient(s).`,
          results
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // CASE B: STANDARD BOOKING CONFIRMATION & RESERVATION
    // =========================================================================
    const {
      client_name,
      client_email,
      client_phone,
      event_date,
      event_time,
      venue_city,
      package_name,
      estimated_total,
      notes,
    } = payload;

    const formattedTotal = estimated_total ? `$${Number(estimated_total).toLocaleString()}` : "$0";
    const eventDateText = event_date ? prettyDate(event_date) : "To Be Determined";
    const eventTimeText = event_time || "Full Event";
    const venueText = venue_city || "Oklahoma City, OK";
    const pkgText = package_name || "Thunder House DJ Package";

    // Hold wording follows the superuser setting; don't promise a hold the calendar couldn't place
    const { data: bookingCfg } = await supabase
      .from("thunderhouse_site_settings").select("value").eq("key", "booking_settings").maybeSingle();
    const holdHours = parseInt(bookingCfg?.value?.hold_hours, 10) || 72;
    const holdSentence = payload.held === true
      ? `We have received your event details and are holding your requested date for ${holdHours} hours.`
      : !event_date
        ? `We have received your message and will get back to you within 24 hours.`
        : `We have received your event details. Your requested date isn't open to hold right now, so we'll reach out with the closest options.`;

    const clientPlainText = `Hi ${client_name},

Thank you for requesting a quote with Thunder House ENT! ${holdSentence}

RESERVATION SUMMARY:
- Client Name: ${client_name}
- Package: ${pkgText}
- Event Date: ${eventDateText}
- Reserved Hours: ${eventTimeText}
- Venue / Location: ${venueText}
- Estimated Investment: ${formattedTotal}

WHAT HAPPENS NEXT:
We'll reach out within 24 hours to confirm the details. To lock in your date, sign your performance agreement and pay a $200 non-refundable retainer (applied to your total). The remaining balance is due 14 days before your event.

If you have questions, reply directly to this email or call us at (405) 283-2533.

Thunder House ENT • Oklahoma City, OK
Website: https://www.thunderhouseent.com
Email: booking@thunderhouseent.com`;

    const clientHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thunder House ENT Reservation</title>
</head>
<body style="margin: 0; padding: 30px 15px; background-color: #05070b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <div style="background-color: #07090e; color: #f8fafc; padding: 35px 30px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #3d86ff; box-shadow: 0 15px 45px rgba(0,0,0,0.8), 0 0 30px rgba(30, 111, 255, 0.15);">

    <div style="text-align: center; margin-bottom: 28px;">
      <h1 style="color: #3d86ff; margin: 0 0 6px 0; font-size: 28px; letter-spacing: 1.5px; font-weight: 800;">THUNDER HOUSE ENT</h1>
      <div style="display: inline-block; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); color: #ffb703; font-weight: 700; padding: 4px 14px; border-radius: 20px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
        OKC Event DJ & MC Services • Father & Son Duo
      </div>
    </div>

    <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; padding: 20px; margin-bottom: 22px;">
      <h2 style="color: #fff; font-size: 18px; margin: 0 0 10px 0;">
        ⚡ Booking Request Received!
      </h2>
      <p style="color: #cbd5e1; font-size: 15px; line-height: 1.55; margin: 0;">
        Hi <strong>${escapeHtml(client_name)}</strong>, thank you for requesting a quote with Thunder House ENT! ${holdSentence}
      </p>
    </div>

    <div style="background: rgba(30, 111, 255, 0.04); border: 1px solid rgba(30, 111, 255, 0.25); border-radius: 10px; padding: 22px; margin-bottom: 22px;">
      <h3 style="color: #3d86ff; font-size: 15px; margin: 0 0 16px 0; border-bottom: 1px solid rgba(30, 111, 255, 0.2); padding-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
        Reservation Summary
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #cbd5e1;">
        <tr>
          <td style="padding: 7px 0; color: #94a3b8;">Package:</td>
          <td style="font-weight: 700; color: #fff; text-align: right;">${escapeHtml(pkgText)}</td>
        </tr>
        <tr>
          <td style="padding: 7px 0; color: #94a3b8;">Event Date:</td>
          <td style="font-weight: 700; color: #fff; text-align: right;">${escapeHtml(eventDateText)}</td>
        </tr>
        <tr>
          <td style="padding: 7px 0; color: #94a3b8;">Reserved Hours:</td>
          <td style="font-weight: 700; color: #3d86ff; text-align: right;">${escapeHtml(eventTimeText)}</td>
        </tr>
        <tr>
          <td style="padding: 7px 0; color: #94a3b8;">Venue / City:</td>
          <td style="font-weight: 700; color: #fff; text-align: right;">${escapeHtml(venueText)}</td>
        </tr>
        <tr style="border-top: 1px solid rgba(255, 255, 255, 0.1); export:">
          <td style="padding: 14px 0 4px 0; color: #ffb703; font-weight: 700; font-size: 15px;">Estimated Investment:</td>
          <td style="padding: 14px 0 4px 0; font-weight: 800; color: #ffb703; font-size: 20px; text-align: right;">${escapeHtml(formattedTotal)}</td>
        </tr>
      </table>
    </div>

    <div style="background: rgba(34, 197, 94, 0.08); border-left: 3px solid #22c55e; border-radius: 4px; padding: 14px 16px; margin-bottom: 24px;">
      <p style="color: #86efac; font-size: 13.5px; line-height: 1.5; margin: 0;">
        <strong>What's Next?</strong> We'll reach out within 24 hours to confirm the details. To lock in your date, sign your performance agreement and pay a $200 non-refundable retainer (applied to your total). The remaining balance is due 14 days before your event.
      </p>
    </div>

    <div style="text-align: center; padding-top: 18px; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 12px; color: #64748b; line-height: 1.6;">
      <strong style="color: #94a3b8;">Thunder House ENT</strong> • Oklahoma City, OK<br>
      Phone: (405) 283-2533 • Email: <a href="mailto:${smtpUser}" style="color: #3d86ff; text-decoration: none;">${smtpUser}</a><br>
      <span style="font-size: 11px; color: #475569;">You received this email because you requested an event quote at thunderhouseent.com.</span>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `"Thunder House ENT" <${smtpUser}>`,
      to: client_email,
      replyTo: smtpUser,
      subject: `Thunder House ENT: Reservation Summary for ${client_name}`,
      text: clientPlainText,
      html: clientHtml,
      headers: {
        "X-Priority": "3",
        "X-Entity-Ref-ID": `th-${Date.now()}`,
      },
    });

    // Admin Alert Email
    const adminPlainText = `NEW BOOKING INQUIRY:
Client: ${client_name}
Email: ${client_email}
Phone: ${client_phone}
Date: ${eventDateText}
Hours: ${eventTimeText}
Venue: ${venueText}
Package: ${pkgText}
Estimated Total: ${formattedTotal}
Notes: ${notes || "None"}
`;

    const adminHtml = `
      <div style="font-family: sans-serif; padding: 20px; background: #0f172a; color: #f8fafc; border-radius: 8px;">
        <h2 style="color: #3d86ff; margin-top: 0;">${payload.held === true ? `New Quote: Date Held ${holdHours} Hours` : "New Quote Request"}</h2>
        <p><strong>Client:</strong> ${escapeHtml(client_name)}</p>
        <p><strong>Email:</strong> <a href="mailto:${escapeHtml(client_email)}" style="color: #3d86ff;">${escapeHtml(client_email)}</a></p>
        <p><strong>Phone:</strong> <a href="tel:${escapeHtml(client_phone)}" style="color: #3d86ff;">${escapeHtml(client_phone)}</a></p>
        <p><strong>Date & Time:</strong> ${escapeHtml(eventDateText)} (${escapeHtml(eventTimeText)})</p>
        <p><strong>Venue / City:</strong> ${escapeHtml(venueText)}</p>
        <p><strong>Package:</strong> ${escapeHtml(pkgText)}</p>
        <p><strong>Estimated Total:</strong> ${escapeHtml(formattedTotal)}</p>
        <p><strong>Notes:</strong> ${escapeHtml(notes || "None")}</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Thunder House Bookings" <${smtpUser}>`,
      to: smtpUser,
      replyTo: client_email,
      subject: `Thunder House: New Event Inquiry from ${client_name} (${formattedTotal})`,
      text: adminPlainText,
      html: adminHtml,
    });

    return new Response(
      JSON.stringify({ success: true, message: "Confirmation emails sent successfully." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Email send error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
