// api/diagnose.js — Vercel serverless function (Node 18+)
// Holds the Anthropic API key server-side and proxies the Service Advisor chat.
// Set ANTHROPIC_API_KEY in your Vercel project: Settings → Environment Variables.

const SYSTEM = `You are the service advisor for Tony's European Auto Service, an independent European auto specialist in Alexandria, Louisiana, family-owned for 30 years, phone (318) 445-6007, open Mon-Fri 7am-4pm. You serve BMW, Mercedes-Benz, Porsche, Audi, Land Rover, Jaguar, Volkswagen, Volvo, Maserati, Lamborghini, Mini and similar marques, including classics and exotics.
When a customer describes a symptom: (1) briefly name the most likely 1-3 causes in plain English, (2) give an honest urgency read (safe to drive / get it looked at soon / stop driving it), (3) invite them to book. Keep it warm, concise (under 110 words), confident but never a definitive diagnosis — that happens in the bay. Never quote exact prices. Always close by pointing them to call (318) 445-6007. If asked something unrelated to their car, gently steer back.`;

// ---- abuse controls (no external infra; tune freely) ----
const RATE_LIMIT = 15;            // max requests…
const RATE_WINDOW_MS = 60 * 1000; // …per IP per this window
const MAX_MSG_LEN = 1500;         // chars per message
const MAX_MESSAGES = 12;          // history depth kept (also caps cost)
// Hosts allowed to call the endpoint from a browser. Cross-site embeds are
// rejected; requests with no Origin header (curl, server-to-server) are let
// through and rely on the rate limit + length caps below.
const ALLOWED_HOSTS = new Set(["tonyseuro.com", "www.tonyseuro.com", "localhost", "127.0.0.1"]);

// Best-effort in-memory sliding window. Survives only within a warm instance,
// which (with Fluid Compute reusing instances) blunts the common case. For
// hard guarantees across regions, back this with Vercel KV / Upstash later.
const hits = new Map(); // ip -> number[] (request timestamps)

function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "unknown";
}

function rateLimited(ip, now) {
  const recent = (hits.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  // Opportunistic cleanup so the map can't grow without bound.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (!v.some(t => now - t < RATE_WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

function originAllowed(req) {
  const origin = req.headers.origin || req.headers.referer;
  if (!origin) return true; // no Origin (curl / SSR) — fall through to rate limit
  try {
    const host = new URL(origin).hostname;
    return ALLOWED_HOSTS.has(host) || host.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!originAllowed(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const now = Date.now();
  const ip = clientIp(req);
  if (rateLimited(ip, now)) {
    res.setHeader("Retry-After", Math.ceil(RATE_WINDOW_MS / 1000));
    res.status(429).json({
      error: "Too many requests. Please give it a moment — or call us at (318) 445-6007.",
    });
    return;
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({ error: "Server is not configured. Set ANTHROPIC_API_KEY." });
    return;
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const incoming = Array.isArray(body.messages) ? body.messages : [];
    // keep only role/content, drop oversized turns, cap history length to control cost
    const messages = incoming
      .filter(m =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.length <= MAX_MSG_LEN
      )
      .slice(-MAX_MESSAGES);
    if (!messages.length) {
      res.status(400).json({ error: "No valid messages provided." });
      return;
    }

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6", // swap to "claude-haiku-4-5-20251001" for lower cost
        max_tokens: 1000,
        system: SYSTEM,
        messages,
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      console.error("Anthropic error:", data);
      res.status(502).json({ error: "Upstream error" });
      return;
    }
    const text = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n")
      .trim();
    res.status(200).json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Request failed" });
  }
};
