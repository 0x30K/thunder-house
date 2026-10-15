import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { amountDueNow, invoiceNumberFromNote, recordSquarePayment } from "../_shared/payments.ts";

// Square calls this when a payment completes (including payments made on Square's own
// checkout page). Every request is verified with the webhook signature key before use.
const WEBHOOK_URL = Deno.env.get("SQUARE_WEBHOOK_URL") ||
  "https://kxoivmflghfgtvawhktt.supabase.co/functions/v1/square-webhook";

async function validSignature(rawBody: string, header: string | null): Promise<boolean> {
  const key = Deno.env.get("SQUARE_WEBHOOK_SIGNATURE_KEY");
  if (!key || !header) return false;
  const cryptoKey = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(WEBHOOK_URL + rawBody));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
  // constant-time compare
  if (expected.length !== header.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ header.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("ok");

  const raw = await req.text();
  if (!(await validSignature(raw, req.headers.get("x-square-hmacsha256-signature")))) {
    console.warn("Rejected webhook: bad or missing signature");
    return new Response("invalid signature", { status: 403 });
  }

  try {
    const event = JSON.parse(raw);
    const payment = event?.data?.object?.payment;
    if (!payment || !String(event.type || "").startsWith("payment.") || payment.status !== "COMPLETED") {
      return new Response("ignored");
    }

    const invoiceNumber = invoiceNumberFromNote(payment.note);
    if (!invoiceNumber) return new Response("no invoice reference");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: inv } = await supabase.from("thunderhouse_invoices").select("*").eq("invoice_number", invoiceNumber).maybeSingle();
    if (!inv) return new Response("invoice not found");

    const updated = await recordSquarePayment(supabase, inv, {
      paymentId: payment.id,
      amount: (payment.amount_money?.amount ?? 0) / 100,
      method: `Square (${payment.source_type || "Checkout"})`,
      source: "square_webhook",
      stage: amountDueNow(inv).stage,
    });
    console.log(updated ? `Recorded ${payment.id} for ${invoiceNumber}` : `Already recorded ${payment.id}`);
    return new Response("ok");
  } catch (err: any) {
    console.error("Webhook error:", err);
    // 500 makes Square retry later
    return new Response("error", { status: 500 });
  }
});
