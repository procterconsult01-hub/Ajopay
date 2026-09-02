// netlify/functions/sync-data.js
//
// Backs the Ajopay "Sync across devices" feature. Stores/retrieves a full
// snapshot of a person's groups under a short sync code, using Netlify
// Blobs (a real server-side key-value store — not the browser). No
// account system: the code itself is the shared secret that links
// devices to the same data. Treat it like a password — anyone with the
// code can read and overwrite that data.

import { getStore } from "@netlify/blobs";

export default async (req) => {
  const url = new URL(req.url);
  const rawCode = (url.searchParams.get("code") || "").trim();

  if (!rawCode || rawCode.length < 4 || rawCode.length > 32) {
    return new Response(JSON.stringify({ error: "Invalid or missing sync code" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const key = rawCode.toLowerCase();
  const store = getStore("ajopay-sync");

  if (req.method === "GET") {
    try {
      const data = await store.get(key, { type: "json" });
      return new Response(JSON.stringify({ data: data || null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "read_failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (req.method === "POST") {
    try {
      const body = await req.json();
      await store.setJSON(key, body);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "write_failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ error: "method_not_allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = { path: "/.netlify/functions/sync-data" };

