// netlify/functions/verify-payment.js
//
// Server-side Paystack verification. The browser never sees or holds the
// Paystack SECRET key — only this function does, via an environment
// variable set in the Netlify dashboard. This closes the gap where a
// tampered client could otherwise fake a "successful" payment.
//
// Setup (one-time):
//   Netlify dashboard -> Site configuration -> Environment variables
//   -> Add variable: PAYSTACK_SECRET_KEY = sk_test_... (or sk_live_... when ready)
//
// Get this key from: Paystack dashboard -> Settings -> API Keys & Webhooks
// Use the SECRET key here, never the public key (pk_...) — the public key
// is the one that goes in the Ajopay group's "Paystack public key" field
// in the app itself.

export default async (req) => {
  const url = new URL(req.url);
  const reference = url.searchParams.get("reference");

  if (!reference) {
    return new Response(JSON.stringify({ error: "Missing reference" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return new Response(
      JSON.stringify({
        error: "Server not configured. Set PAYSTACK_SECRET_KEY in Netlify environment variables.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const psRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );
    const data = await psRes.json();

    if (!data || !data.status || !data.data) {
      return new Response(JSON.stringify({ verified: false, reason: "not_found" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tx = data.data;
    const verified = tx.status === "success";

    return new Response(
      JSON.stringify({
        verified,
        amount: tx.amount, // kobo
        currency: tx.currency,
        paidAt: tx.paid_at,
        reference: tx.reference,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: "verification_failed" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = { path: "/.netlify/functions/verify-payment" };
