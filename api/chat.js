// Trip chat: forwards questions (with the current trip plan) to Claude.
// Needs ANTHROPIC_API_KEY in Vercel → Project → Settings → Environment Variables.
// Optional CHAT_CODE: a family passcode people type once before chatting.

const SYSTEM =
  "You are a friendly, concise trip helper inside a family's Japan Trip Explorer website. " +
  "Answer from the trip plan in the user's message; when it is silent, give practical, kid-aware advice and say it is a suggestion. " +
  "Keep answers under 120 words, plain text, short lines or '- ' bullets. Prices are estimates. " +
  "If asked to change the plan, say which tab or button does it (Plan, Disney, Ideas tabs, or the 'Tonight' switch on the day card). " +
  "Only help with this trip and travel in Japan and Singapore; politely decline unrelated requests.";

const hits = new Map(); // simple per-instance rate limit: 20 questions / 10 min per IP

function json(body, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

export default {
  async fetch(request) {
    const key = process.env.ANTHROPIC_API_KEY;
    const code = process.env.CHAT_CODE || "";

    if (request.method === "GET") return json({ ready: !!key, needsCode: !!code });
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    if (!key) return json({ code: "not_configured", error: "Chat isn't set up yet." }, 503);

    // Only accept calls from this site.
    const origin = request.headers.get("origin") || "";
    const host = request.headers.get("host") || "";
    try {
      if (origin && new URL(origin).host !== host) return json({ error: "Forbidden" }, 403);
    } catch {
      return json({ error: "Forbidden" }, 403);
    }

    const ip = (request.headers.get("x-forwarded-for") || "anon").split(",")[0].trim();
    const now = Date.now();
    const recent = (hits.get(ip) || []).filter((t) => now - t < 600000);
    if (recent.length >= 20) return json({ code: "rate_limited", error: "Too many questions. Try again in a few minutes." }, 429);
    recent.push(now);
    hits.set(ip, recent);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Bad request" }, 400);
    }
    if (code && body.code !== code) return json({ code: "need_code", error: "Family code needed." }, 401);

    const msgs = Array.isArray(body.messages) ? body.messages.slice(-8) : [];
    const clean = msgs
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content.slice(0, 14000) }));
    if (!clean.length || clean[clean.length - 1].role !== "user") return json({ error: "Bad request" }, 400);
    if (clean.reduce((n, m) => n + m.content.length, 0) > 30000) return json({ error: "Question too long." }, 413);

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2026-10-21", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-haiku-5-5", max_tokens: 600, system: SYSTEM, messages: clean }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("Anthropic API error", r.status, data && data.error);
      return json({ code: "upstream", error: "Claude couldn't answer just now. Try again." }, 502);
    }
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    return json({ text: text || "Sorry, I don't have an answer for that." });
  },
};
