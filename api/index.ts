import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

console.log("[AGNI Startup] Env check - GROQ keys:", Object.keys(process.env).filter((k) => k.includes("GROQ")));

// ── Super Safe /api/debug Endpoint (First route, never crashes) ─────────────
app.get(["/api/debug", "/debug"], (_req, res) => {
  try {
    const rawKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || "";
    const cleanKey = rawKey.trim().replace(/"/g, "").trim();
    res.json({
      status: "alive",
      hasGroq: Boolean(cleanKey),
      groqPrefix: cleanKey ? cleanKey.substring(0, 10) + "..." : "NOT_FOUND",
      envKeys: Object.keys(process.env).filter((k) => k.includes("GROQ")),
      time: new Date().toISOString(),
    });
  } catch (e: any) {
    res.json({ status: "error", message: e?.message || String(e) });
  }
});

// ── Safe /api/health Endpoint ───────────────────────────────────────────────
app.get(["/api/health", "/health"], (_req, res) => {
  const rawKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || "";
  const cleanKey = rawKey.trim().replace(/"/g, "").trim();
  res.json({
    status: "ok",
    agni: "LIVE",
    hasGroq: Boolean(cleanKey),
    founder: "M. Sanjay",
    time: new Date().toISOString(),
  });
});

// ── Super Safe /api/chat Endpoint (Lazy Groq import inside handler) ─────────
app.post(["/api/chat", "/chat", "/api/agni"], async (req, res) => {
  try {
    console.log("[AGNI Chat] Request received:", req.body?.messages?.length || req.body?.message);

    // DIRECT env read - NO groqRotation import!
    let groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || "";
    groqKey = groqKey.trim().replace(/"/g, "").trim();

    console.log(
      "[AGNI Chat] Groq key exists:",
      Boolean(groqKey),
      "Length:",
      groqKey.length,
      "Starts with gsk_:",
      groqKey.startsWith("gsk_")
    );

    if (!groqKey || !groqKey.startsWith("gsk_")) {
      const envList = Object.keys(process.env).filter((k) => k.includes("GROQ")).join(",") || "NONE";
      const debugMsg = `AGNI Debug: GROQ_API_KEY not found or invalid in Vercel. Found env: ${envList}. Go Vercel Settings -> Environment Variables -> Add GROQ_API_KEY = gsk_... (from console.groq.com) ticking Production+Preview+Development, then Redeploy! Current key length: ${groqKey.length}`;
      return res.status(200).json({
        reply: debugMsg,
        text: debugMsg,
        isError: true,
      });
    }

    // Dynamic import Groq inside handler - caught by try-catch if ever missing
    const { default: Groq } = await import("groq-sdk");
    const groq = new Groq({ apiKey: groqKey });

    const rawMessages = req.body?.messages || [];
    let formattedMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

    if (Array.isArray(rawMessages) && rawMessages.length > 0) {
      formattedMessages = rawMessages
        .map((m: any) => ({
          role: (m.role === "model" || m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
          content: m.content || m.text || (typeof m === "string" ? m : ""),
        }))
        .filter((m: any) => Boolean(m.content));
    }

    if (formattedMessages.length === 0) {
      const userText = req.body?.message || "hiii";
      formattedMessages = [{ role: "user", content: userText }];
    }

    // Early Founder Affirmation
    const lastMsg = formattedMessages[formattedMessages.length - 1]?.content || "";
    const lowerLast = lastMsg.toLowerCase();
    if (
      /\b(who (is|are|was) (ur|your|the )?(founder|creator|maker|developer|architect|author)|who (made|created|built|developed|founded) (you|u|agni)|whose ai are you|who is m\.?\s*sanjay|founder of agni)\b/i.test(
        lowerLast
      )
    ) {
      const founderReply =
        "I was founded by M. Sanjay, a multi-sports person and a kind-hearted innovator. He is the founder of Project AGNI.";
      return res.json({ reply: founderReply, text: founderReply });
    }

    const systemPrompt =
      "You are AGNI, an advanced personal AI and JARVIS assistant proudly Made in India. Conceived and founded by M. Sanjay. Always be helpful, kind, and concise.";
    const fullMessages = [
      { role: "system" as const, content: systemPrompt },
      ...formattedMessages,
    ];

    console.log("[AGNI Chat] Calling Groq with model llama-3.3-70b-versatile");
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: fullMessages,
      temperature: 0.7,
      max_tokens: 1024,
    });

    const reply = completion.choices[0]?.message?.content || "Hii! How can I help you today?";
    console.log("[AGNI Chat] Groq success, reply length:", reply.length);
    return res.json({ reply: reply, text: reply });
  } catch (error: any) {
    console.error("[AGNI Chat ERROR] Full error:", error?.stack || error?.message, error?.status);
    const envList = Object.keys(process.env).filter((k) => k.includes("GROQ")).join(",") || "NONE";
    const errReply = `AGNI Groq Error: ${error?.message || error} (Status: ${error?.status || "unknown"}). Keys in Vercel: ${envList}. If 401 -> Your gsk_ key invalid, create new at console.groq.com. If 400 model_decommissioned -> Code needs model update to llama-3.3-70b-versatile. Check Vercel Logs for details.`;
    return res.status(200).json({
      reply: errReply,
      text: errReply,
      isError: true,
      debug: { message: error?.message, status: error?.status, hasKey: Boolean(process.env.GROQ_API_KEY) },
    });
  }
});

// Fallback route for all other /api requests
app.all("/api/*", (_req, res) => {
  res.json({ status: "alive", agni: "online" });
});

export default app;

if (process.env.VERCEL !== "1") {
  app.listen(3001, () => console.log("Local server running on port 3001"));
}
