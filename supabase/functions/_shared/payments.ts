// Shared payment rules for Thunder House ENT (used by square-payment and square-webhook).
// Policy: $200 non-refundable retainer locks the date; the rest is due 14 days before the event.

export const RETAINER_DEFAULT = 200;

export function money(n: unknown): number {
  const v = parseFloat(String(n ?? 0));
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
}

/** What the client owes right now, and which stage that is. */
export function amountDueNow(inv: any) {
  const total = money(inv.total_amount);
  const paid = money(inv.amount_paid);
  const retainer = Math.min(money(inv.deposit_requested ?? RETAINER_DEFAULT) || RETAINER_DEFAULT, total);
  const remaining = Math.max(0, Math.round((total - paid) * 100) / 100);
  if (remaining <= 0) return { stage: "paid" as const, due: 0, retainer, total, paid, remaining };
  if (paid < retainer) {
    return { stage: "retainer" as const, due: Math.min(Math.round((retainer - paid) * 100) / 100, remaining), retainer, total, paid, remaining };
  }
  return { stage: "balance" as const, due: remaining, retainer, total, paid, remaining };
}

/** Status label after payments change. */
export function statusFor(paid: number, total: number, retainer: number) {
  if (paid >= total - 0.005) return "Paid";
  if (paid >= retainer - 0.005) return "Retainer Paid";
  return paid > 0 ? "Partially Paid" : "Sent";
}

/**
 * Record a completed Square payment exactly once (keyed by Square's payment id),
 * then add it to the invoice. Safe to call from both the card form and the webhook.
 * Returns the updated invoice, or null if this payment was already recorded.
 */
export async function recordSquarePayment(
  supabase: any,
  inv: any,
  p: { paymentId: string; amount: number; method: string; source: string; stage: string },
) {
  const { data: inserted, error } = await supabase
    .from("thunderhouse_payments")
    .upsert({
      invoice_id: inv.id,
      invoice_number: inv.invoice_number,
      square_payment_id: p.paymentId,
      amount: money(p.amount),
      kind: p.stage,
      method: p.method,
      source: p.source,
    }, { onConflict: "square_payment_id", ignoreDuplicates: true })
    .select("id");
  if (error) throw new Error("Could not record payment: " + error.message);
  if (!inserted || inserted.length === 0) return null; // already recorded

  // Re-read so a manual cash entry made in admin is never overwritten
  const { data: fresh } = await supabase.from("thunderhouse_invoices").select("*").eq("id", inv.id).single();
  const cur = fresh || inv;
  const total = money(cur.total_amount);
  const retainer = Math.min(money(cur.deposit_requested ?? RETAINER_DEFAULT) || RETAINER_DEFAULT, total);
  const paid = Math.round((money(cur.amount_paid) + money(p.amount)) * 100) / 100;
  const remaining = Math.max(0, Math.round((total - paid) * 100) / 100);

  const { data: updated } = await supabase.from("thunderhouse_invoices").update({
    amount_paid: paid,
    balance_due: remaining,
    status: statusFor(paid, total, retainer),
    payment_method: p.method,
    // the old link was for a fixed amount; the invoice page makes a fresh one for the next stage
    square_payment_link: null,
    updated_at: new Date().toISOString(),
  }).eq("id", inv.id).select("*").single();
  return updated;
}

/** Pull the invoice number out of a Square payment note ("... Invoice #TH-INV-2026-001 ..."). */
export function invoiceNumberFromNote(note?: string | null): string | null {
  const m = /Invoice #([A-Za-z0-9-]+)/.exec(note || "");
  return m ? m[1] : null;
}

/**
 * Before taking a retainer: is the event date still free for this client?
 * Returns a message if it's locked for another invoice or held for a different client.
 */
export async function dateConflict(supabase: any, inv: any): Promise<string | null> {
  if (!inv.event_date) return null;
  const { data: day } = await supabase
    .from("thunderhouse_availability").select("*").eq("date", inv.event_date).maybeSingle();
  if (!day) return null;
  if (day.status === "booked" && day.locked_invoice_number && day.locked_invoice_number !== inv.invoice_number) {
    return "Sorry, this date has already been booked by another client. Please contact Thunder House ENT about other dates.";
  }
  const holdActive = day.status === "held" && day.hold_expires_at && new Date(day.hold_expires_at) > new Date();
  if (holdActive && (day.hold_email || "").toLowerCase() !== (inv.client_email || "").toLowerCase()) {
    return "This date is currently on hold for another client. Please contact Thunder House ENT.";
  }
  return null;
}
