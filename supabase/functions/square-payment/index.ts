import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE = "https://www.thunderhouseent.com";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const action = payload.action || "create_payment_link";

    // Service-role client: invoices and settings are no longer readable with the public key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Square credentials: Edge Function secrets first, then the staff-only settings row.
    // There is deliberately NO hard-coded fallback token.
    let appId = Deno.env.get("SQUARE_APP_ID") || "sq0idp-qAjndUvkLYGtpnkKiQoDhQ";
    let accessToken = Deno.env.get("SQUARE_ACCESS_TOKEN");
    let locationId = Deno.env.get("SQUARE_LOCATION_ID") || "LQJ2VPXJ31QKV";

    if (!accessToken) {
      const { data: settingsData } = await supabase
        .from("thunderhouse_site_settings")
        .select("value")
        .eq("key", "square_settings")
        .maybeSingle();

      if (settingsData && settingsData.value) {
        appId = settingsData.value.app_id || appId;
        accessToken = settingsData.value.access_token;
        locationId = settingsData.value.location_id || locationId;
      }
    }

    // ---------------------------------------------------------------------
    // ACTION: GET PUBLIC CONFIG (app id + location id are public by design)
    // ---------------------------------------------------------------------
    if (action === "get_public_config") {
      return json({ success: true, app_id: appId, location_id: locationId });
    }

    if (!accessToken) {
      throw new Error("Square is not configured yet. Add SQUARE_ACCESS_TOKEN in Supabase Edge Function secrets.");
    }

    // Look up the real invoice so amounts and links come from the database, not the browser
    async function findInvoice(id?: string, number?: string) {
      if (!id && !number) return null;
      let q = supabase.from("thunderhouse_invoices").select("*");
      q = id ? q.eq("id", id) : q.eq("invoice_number", number!);
      const { data } = await q.maybeSingle();
      return data;
    }

    // ---------------------------------------------------------------------
    // ACTION: CREATE SQUARE CHECKOUT PAYMENT LINK (Hosted Checkout)
    // ---------------------------------------------------------------------
    if (action === "create_payment_link") {
      let inv = await findInvoice(payload.invoice_id, payload.invoice_data?.invoice_number);
      const fromDb = !!inv;
      if (!inv) inv = payload.invoice_data; // legacy: invoice not saved yet
      if (!inv) throw new Error("Invoice data is required to create a payment link.");

      const invoiceNum = inv.invoice_number || "INV-TH";
      const clientName = inv.client_name || "Valued Client";
      const clientEmail = (inv.client_email || "").trim();
      const balanceDue = parseFloat(inv.balance_due !== undefined && inv.balance_due !== null ? inv.balance_due : (inv.total_amount || 0));

      if (balanceDue <= 0) {
        throw new Error("Invoice balance is already paid or zero.");
      }

      const amountCents = Math.round(balanceDue * 100);
      const keyParam = fromDb && inv.client_key ? `&key=${encodeURIComponent(inv.client_key)}` : "";
      const redirectUrl = `${SITE}/invoice?num=${encodeURIComponent(invoiceNum)}${keyParam}&paid=true`;

      const isValidEmail = clientEmail && clientEmail.includes("@") && !clientEmail.endsWith("example.com") && !clientEmail.endsWith(".test");

      const squareRes = await fetch("https://connect.squareup.com/v2/online-checkout/payment-links", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Square-Version": "2024-09-19",
        },
        body: JSON.stringify({
          idempotency_key: `th-link-${inv.id || invoiceNum}-${Date.now()}`,
          quick_pay: {
            name: `Invoice #${invoiceNum} - ${clientName}`,
            price_money: { amount: amountCents, currency: "USD" },
            location_id: locationId,
          },
          checkout_options: {
            redirect_url: redirectUrl,
            ask_for_shipping_address: false,
            accepted_payment_methods: { apple_pay: true, google_pay: true, cash_app_pay: true, afterpay_clearpay: false },
          },
          pre_populated_data: isValidEmail ? { buyer_email: clientEmail } : undefined,
        }),
      });

      const squareData = await squareRes.json();

      if (!squareRes.ok || squareData.errors) {
        console.error("Square API Error:", squareData.errors);
        throw new Error(squareData.errors?.[0]?.detail || "Failed to generate Square payment link.");
      }

      const paymentLinkUrl = squareData.payment_link?.url || squareData.payment_link?.long_url;

      if (fromDb && inv.id) {
        await supabase
          .from("thunderhouse_invoices")
          .update({ square_payment_link: paymentLinkUrl, updated_at: new Date().toISOString() })
          .eq("id", inv.id);
      }

      return json({ success: true, payment_link: paymentLinkUrl, order_id: squareData.payment_link?.order_id });
    }

    // ---------------------------------------------------------------------
    // ACTION: PROCESS EMBEDDED CARD / APPLE PAY / GOOGLE PAY / CASH APP
    // ---------------------------------------------------------------------
    if (action === "process_payment") {
      const { source_id, invoice_number, invoice_id, amount, client_email } = payload;

      if (!source_id) {
        throw new Error("Missing payment token from Square Web Payments SDK.");
      }

      const inv = await findInvoice(invoice_id, invoice_number);
      if (!inv) throw new Error("Invoice not found.");

      const amountCents = Math.round(parseFloat(amount) * 100);
      if (!(amountCents > 0)) {
        throw new Error("Invalid payment amount.");
      }

      const isValidEmail = client_email && client_email.includes("@") && !client_email.endsWith("example.com");

      const squareRes = await fetch("https://connect.squareup.com/v2/payments", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Square-Version": "2024-09-19",
        },
        body: JSON.stringify({
          source_id: source_id,
          idempotency_key: `th-pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          amount_money: { amount: amountCents, currency: "USD" },
          location_id: locationId,
          buyer_email_address: isValidEmail ? client_email : undefined,
          note: `Thunder House ENT Invoice #${inv.invoice_number}`,
        }),
      });

      const squareData = await squareRes.json();

      if (!squareRes.ok || squareData.errors) {
        console.error("Square Payment Error:", squareData.errors);
        throw new Error(squareData.errors?.[0]?.detail || "Payment failed to process.");
      }

      const payment = squareData.payment;

      if (payment.status === "COMPLETED" || payment.status === "APPROVED") {
        // Record what Square actually charged; only mark Paid when the balance is covered
        const charged = (payment.amount_money?.amount ?? amountCents) / 100;
        const total = parseFloat(inv.total_amount || 0);
        const paidSoFar = parseFloat(inv.amount_paid || 0) + charged;
        const balance = Math.max(0, Math.round((total - paidSoFar) * 100) / 100);

        await supabase.from("thunderhouse_invoices").update({
          status: balance <= 0 ? "Paid" : "Partially Paid",
          amount_paid: paidSoFar,
          balance_due: balance,
          payment_method: `Square (${payment.source_type || "Card"})`,
          updated_at: new Date().toISOString(),
        }).eq("id", inv.id);

        return json({ success: true, status: "COMPLETED", payment_id: payment.id, receipt_url: payment.receipt_url });
      } else {
        return json({ success: false, status: payment.status, message: "Payment was not completed." }, 400);
      }
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err: any) {
    console.error("Square Payment Handler Error:", err);
    return json({ success: false, error: err.message }, 500);
  }
});
