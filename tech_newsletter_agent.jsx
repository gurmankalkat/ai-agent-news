import { useState, useRef } from "react";

// ── GET THE CHECK EDITORIAL DNA ──
// Derived from analyzing all episodes. These are the SPECIFIC beats they cover,
// not generic "tech news" buckets.
const GTC_SEARCH_QUERIES = [
  // BEAT 1: AI Lab Wars & Model Drama
  // They LOVE: OpenAI vs Elon lawsuit, Anthropic deals, xAI/Grok drama, model benchmarks, AGI debates
  {
    label: "AI Lab Wars",
    icon: "⚔️",
    queries: [
      "OpenAI Anthropic Google DeepMind xAI news deal partnership lawsuit",
      "AI model launch benchmark frontier Claude GPT Gemini Grok",
      "Sam Altman Dario Amodei Elon Musk AI company news",
    ],
  },
  // BEAT 2: Big Tech Power Moves
  // CEO transitions, earnings that actually matter, capex spending, acquisitions, antitrust
  {
    label: "Big Tech Moves",
    icon: "🏢",
    queries: [
      "Apple Google Meta Microsoft Amazon CEO earnings acquisition deal",
      "tech company IPO valuation acquisition billion deal 2026",
      "big tech antitrust regulation AI spending capex",
    ],
  },
  // BEAT 3: Startup "Get the Check" Segment
  // They evaluate startups: Would we invest? Consumer products, hardware, health tech, viral products
  {
    label: "Startups & Founders",
    icon: "💰",
    queries: [
      "startup funding round Series A B YC launch founder raise",
      "consumer startup product launch viral hardware device",
      "AI startup founding team launch product market fit",
    ],
  },
  // BEAT 4: AI Infrastructure & Compute
  // Data centers, GPUs, Nvidia, Cerebras, chips, energy grid, SpaceXAI, compute deals
  {
    label: "AI Infra & Chips",
    icon: "🔌",
    queries: [
      "data center AI GPU Nvidia chip compute infrastructure energy",
      "Cerebras chip IPO semiconductor AI hardware",
      "AI compute deal data center power grid megawatt",
    ],
  },
  // BEAT 5: AI Tools & Developer Economy
  // Cursor, coding tools, AI agents, developer tools, AI product launches
  {
    label: "AI Tools & Dev",
    icon: "🛠️",
    queries: [
      "Cursor coding AI tool developer agent IDE launch",
      "AI agent tool product launch developer workflow",
      "AI code generation copilot vibe coding tool",
    ],
  },
  // BEAT 6: Consumer, Health & Culture x Tech
  // Peptides/GLP-1, telehealth, hearing aids, consumer hardware, tech meets culture
  {
    label: "Culture x Tech",
    icon: "✨",
    queries: [
      "consumer tech product viral app social media launch",
      "health tech GLP-1 telehealth wellness consumer startup",
      "tech culture design product taste consumer brand",
    ],
  },
  // BEAT 7: Geopolitics & Policy
  // US-China AI race, data center regulation, AOC/Bernie bills, Trump tech policy
  {
    label: "Tech Policy",
    icon: "🌍",
    queries: [
      "AI regulation policy data center legislation congress",
      "US China AI chip export trade tech policy",
      "tech regulation antitrust AI safety policy government",
    ],
  },
];

const NEWSLETTER_SYSTEM_PROMPT = `You are writing a daily tech newsletter called "the daily byte" that sits at the intersection of The Skimm's accessibility, Get the Check's opinionated tech analysis, and Gen Z internet fluency.

WHAT GET THE CHECK ACTUALLY COVERS (match this energy):
- AI lab drama: OpenAI vs Elon, Anthropic deals, model wars, who's winning and who's fumbling
- Big tech power moves: CEO transitions, earnings that actually matter (capex, FCF), acquisitions
- "Would we invest?" analysis on startups: they evaluate real companies, ask hard questions about unit economics, TAM, and whether the founder energy is there
- AI infrastructure: data centers, compute deals, chip companies, energy grid problems, GPU economics
- Developer tools & coding: Cursor, AI agents, coding tool consolidation
- Consumer x culture: products that go viral, health tech (GLP-1s, peptides, hearing aids), products where tech meets taste
- Geopolitics: US-China AI race, data center regulation debates, trade policy

VOICE RULES:
- You're the group chat friend who actually reads earnings reports AND keeps up with TikTok. That's the lane.
- Conversational but never dumb. You understand revenue multiples and you understand memes.
- Short punchy sentences. Then real analysis when it matters. The Skimm gives you the headline. You give the headline AND the take.
- You can use "ngl", "iykyk", "tbh", "lowkey" SPARINGLY. Like once or twice total. Not every paragraph.
- Pop culture and internet references welcome. But only when they land.
- Have opinions. If a company's valuation is insane, say that. If a product is mid, say it's mid. If something is genuinely impressive, give credit.
- No corporate speak. No "It's worth noting." No "In today's landscape." 
- Think: three women on a podcast who work in tech, follow fashion, trade on Kalshi, and have strong opinions about everything.

FORMAT:
Return ONLY valid JSON (no markdown fences, no preamble). Structure:
{
  "date": "the newsletter date like 'Thursday, May 22, 2026'",
  "greeting": "a short punchy greeting line. 1 sentence. set the vibe for the day.",
  "topStory": {
    "headline": "catchy headline, 8 words max",
    "emoji": "one relevant emoji",
    "body": "2-3 short paragraphs. be SPECIFIC with numbers, names, and facts. explain why it matters. have an opinion.",
    "tldr": "one sentence TLDR that captures both the fact and the take",
    "articleIndex": the number from the [N] tag of the PRIMARY article you used for this story (e.g. 3)
  },
  "stories": [
    {
      "headline": "catchy headline",
      "emoji": "one emoji",
      "body": "1-2 paragraphs. specific facts plus your take. why should someone in their 20s-30s in tech care?",
      "tldr": "one line",
      "articleIndex": the number from the [N] tag of the PRIMARY article you used
    }
  ],
  "wouldWeInvest": {
    "company": "name of one startup or company from the news",
    "verdict": "yes, no, or it's complicated",
    "reasoning": "2-3 sentences. channel the Get the Check energy of actually evaluating the business.",
    "articleIndex": the number from the [N] tag if applicable, or null
  },
  "hotTake": "your spiciest opinion on something in today's news. 1-2 sentences. have a real point of view. be the person at the dinner party everyone turns to listen to.",
  "signoff": "a fun signoff. short."
}

IMPORTANT: The articleIndex field MUST be an integer (not a string) matching the [N] number from the articles provided. This is how we link readers to the real source. Every topStory and every story MUST have an articleIndex.

Give me 4-6 stories total (including the top story). Every story MUST reference real facts from the sources. Don't make up numbers or names. Be funny but accurate. Prioritize stories that match Get the Check's beats: AI drama, big tech moves, startup evaluation, infrastructure/compute, dev tools, consumer x culture, policy.

CRITICAL: Your entire response must be ONLY the JSON object. No preamble, no explanation, no markdown fences, no text before or after the JSON. Start with { and end with }. If you have fewer articles than expected, still write the newsletter with whatever you have. NEVER refuse or explain — just output the JSON.`;

export default function TechNewsletterAgent() {
  const [step, setStep] = useState("idle");
  const [newsletter, setNewsletter] = useState(null);
  const [error, setError] = useState(null);
  const [searchProgress, setSearchProgress] = useState([]);
  const [rawArticles, setRawArticles] = useState([]);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [exaKey, setExaKey] = useState("");
  const [selectedBeats, setSelectedBeats] = useState(
    GTC_SEARCH_QUERIES.map((_, i) => i)
  );
  const [debugInfo, setDebugInfo] = useState(null);
  const contentRef = useRef(null);

  const toggleBeat = (idx) => {
    setSelectedBeats((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  async function searchExa(query, category, apiKey) {
    const today = new Date();
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        numResults: 4,
        startPublishedDate: twoDaysAgo.toISOString(),
        contents: {
          text: { maxCharacters: 1000 },
          highlights: true,
        },
        category: "news",
        type: "auto",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Exa search failed for "${category}": ${errText}`);
    }

    const data = await res.json();
    return (data.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      publishedDate: r.publishedDate,
      text: r.text?.substring(0, 800) || "",
      highlights: r.highlights || [],
      source: new URL(r.url).hostname.replace("www.", ""),
      category,
    }));
  }

  async function generateNewsletter(articles) {
    // Keep article summaries SHORT to leave room for output
    const articleSummaries = articles
      .map(
        (a, i) =>
          `[${i + 1}] "${a.title}" (${a.source}, beat: ${a.category})\nURL: ${a.url}\n${a.text?.substring(0, 400)}`
      )
      .join("\n\n---\n\n");

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: NEWSLETTER_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Articles from today. Write the newsletter for ${dateStr}. ONLY output JSON, nothing else.\n\n${articleSummaries}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API error: ${errText.substring(0, 300)}`);
    }

    const data = await res.json();
    const rawText = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Store raw response for debug
    setDebugInfo((prev) => ({ ...prev, claudeResponse: rawText.substring(0, 2000), stopReason: data.stop_reason || "unknown" }));

    // Clean markdown fences
    const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    // Try direct parse
    try {
      return JSON.parse(cleaned);
    } catch (e1) {
      // Try extracting balanced JSON
      const start = cleaned.indexOf("{");
      if (start >= 0) {
        let depth = 0, inStr = false, esc = false;
        for (let i = start; i < cleaned.length; i++) {
          const c = cleaned[i];
          if (esc) { esc = false; continue; }
          if (c === "\\") { esc = true; continue; }
          if (c === '"' && !esc) { inStr = !inStr; continue; }
          if (inStr) continue;
          if (c === "{" || c === "[") depth++;
          if (c === "}" || c === "]") depth--;
          if (depth === 0) {
            try {
              return JSON.parse(cleaned.substring(start, i + 1));
            } catch (e2) { break; }
          }
        }
      }

      throw new Error(`JSON_PARSE_FAILED::${cleaned.substring(0, 800)}`);
    }
  }

  async function runPipeline() {
    if (!exaKey) {
      setError("Drop your Exa API key first.");
      return;
    }
    setStep("searching");
    setError(null);
    setSearchProgress([]);
    setRawArticles([]);
    setNewsletter(null);
    setDebugInfo(null);

    try {
      const allArticles = [];
      const beats = selectedBeats.map((i) => GTC_SEARCH_QUERIES[i]);

      for (const beat of beats) {
        setSearchProgress((prev) => [
          ...prev,
          { category: beat.label, status: "searching" },
        ]);

        const beatResults = [];
        for (const q of beat.queries) {
          try {
            const results = await searchExa(q, beat.label, exaKey);
            beatResults.push(...results);
          } catch (e) {
            console.warn(`Query failed: ${q}`, e);
          }
        }
        allArticles.push(...beatResults);

        setSearchProgress((prev) =>
          prev.map((p) =>
            p.category === beat.label
              ? { ...p, status: "done", count: beatResults.length }
              : p
          )
        );
      }

      setRawArticles(allArticles);
      setStep("generating");

      // Dedupe by URL
      const uniqueArticles = allArticles.filter(
        (a, i, arr) => arr.findIndex((b) => b.url === a.url) === i
      );

      // Sort by recency and take top articles
      const sorted = uniqueArticles
        .sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate))
        .slice(0, 15);

      const result = await generateNewsletter(sorted);

      // Resolve articleIndex to real URLs from scraped data
      const resolveSource = (item) => {
        if (item && item.articleIndex != null) {
          const idx = item.articleIndex - 1; // [N] is 1-indexed
          const article = sorted[idx];
          if (article) {
            item.source = article.source;
            item.sourceUrl = article.url;
          }
        }
        return item;
      };

      if (result.topStory) resolveSource(result.topStory);
      if (result.stories) result.stories.forEach(resolveSource);
      if (result.wouldWeInvest) resolveSource(result.wouldWeInvest);

      setNewsletter(result);
      setStep("done");
    } catch (err) {
      const msg = err.message || "";
      if (msg.startsWith("JSON_PARSE_FAILED::")) {
        const raw = msg.replace("JSON_PARSE_FAILED::", "");
        setDebugInfo((prev) => ({ ...prev, parseError: true, rawSnippet: raw }));
        setError("Claude's response wasn't valid JSON. Expand the debug panel below to see what it returned.");
      } else {
        setError(msg);
      }
      setStep("error");
    }
  }

  return (
    <div
      style={{
        fontFamily: "'Instrument Sans', 'DM Sans', system-ui, sans-serif",
        background: "#FFFDF8",
        minHeight: "100vh",
        color: "#1a1a1a",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700;9..144,800&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .fade-up { animation: fadeUp 0.5s ease-out both; }
        .fade-up-1 { animation-delay: 0.1s; }
        .fade-up-2 { animation-delay: 0.2s; }
        .fade-up-3 { animation-delay: 0.3s; }
        .fade-up-4 { animation-delay: 0.4s; }
        .fade-up-5 { animation-delay: 0.5s; }
        .beat-chip {
          padding: 10px 18px;
          border-radius: 100px;
          border: 1.5px solid #e0dcd4;
          background: #FFFDF8;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
          user-select: none;
          font-family: 'DM Sans', sans-serif;
          color: #666;
        }
        .beat-chip:hover { border-color: #1a1a1a; color: #1a1a1a; }
        .beat-chip.active {
          background: #1a1a1a;
          color: #FFFDF8;
          border-color: #1a1a1a;
        }
        .generate-btn {
          background: #1a1a1a;
          color: #FFFDF8;
          border: none;
          padding: 16px 40px;
          border-radius: 100px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
          font-family: 'DM Sans', sans-serif;
          letter-spacing: -0.01em;
        }
        .generate-btn:hover { background: #333; transform: translateY(-1px); }
        .generate-btn:disabled { background: #ccc; cursor: not-allowed; transform: none; }
        .api-input {
          padding: 14px 20px;
          border: 1.5px solid #e0dcd4;
          border-radius: 12px;
          font-size: 14px;
          width: 100%;
          max-width: 420px;
          background: #FFFDF8;
          font-family: 'DM Sans', sans-serif;
          color: #1a1a1a;
          outline: none;
          transition: border-color 0.2s;
        }
        .api-input:focus { border-color: #1a1a1a; }
        .api-input::placeholder { color: #bbb; }
        .story-card {
          padding: 28px 0;
          border-bottom: 1px solid #eae6de;
        }
        .story-card:last-child { border-bottom: none; }
        .top-story-card {
          background: #1a1a1a;
          color: #FFFDF8;
          border-radius: 20px;
          padding: 36px;
          margin-bottom: 32px;
        }
        .progress-bar {
          height: 3px;
          background: linear-gradient(90deg, #1a1a1a, #888, #1a1a1a);
          background-size: 200% auto;
          animation: shimmer 1.5s linear infinite;
          border-radius: 2px;
        }
        .tag {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-family: 'DM Sans', sans-serif;
        }
        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid #ddd;
          border-top-color: #1a1a1a;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          display: inline-block;
        }
        .hot-take-box {
          background: linear-gradient(135deg, #FF6B35, #FF2E63, #D63AF9);
          background-size: 200% 200%;
          animation: gradientMove 4s ease infinite;
          border-radius: 16px;
          padding: 28px 32px;
          color: white;
          margin: 32px 0;
        }
        .invest-box {
          background: #F0FDF4;
          border: 1.5px solid #BBF7D0;
          border-radius: 16px;
          padding: 28px 32px;
          margin: 32px 0;
        }
        .invest-box.no { background: #FFF1F2; border-color: #FECDD3; }
        .invest-box.complicated { background: #FFFBEB; border-color: #FDE68A; }
        .save-btn {
          padding: 12px 28px;
          border-radius: 100px;
          border: 1.5px solid #e0dcd4;
          background: transparent;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          color: #666;
          transition: all 0.2s;
        }
        .save-btn:hover { border-color: #1a1a1a; color: #1a1a1a; }
      `}</style>

      {/* HEADER */}
      <div
        style={{
          padding: "24px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #eae6de",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#1a1a1a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            ⚡
          </div>
          <span
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            the daily byte
          </span>
        </div>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            color: "#999",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: 500,
          }}
        >
          powered by Get the Check's editorial lens
        </span>
      </div>

      {/* MAIN */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px" }}>
        {/* HERO */}
        <div className="fade-up" style={{ marginBottom: 48 }}>
          <h1
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 40,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              marginBottom: 16,
            }}
          >
            tech news through the{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #FF6B35, #FF2E63)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              get the check
            </span>{" "}
            lens
          </h1>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: "#777",
              fontFamily: "'DM Sans', sans-serif",
              maxWidth: 540,
            }}
          >
            Exa scrapes today's news across the beats Get the Check actually
            covers: AI lab wars, big tech power moves, startups worth
            evaluating, compute infrastructure, dev tools, and culture x tech.
            Claude writes it like the group chat friend who reads earnings
            reports and keeps up with TikTok.
          </p>
        </div>

        {/* API KEY */}
        {!exaKey && (
          <div className="fade-up fade-up-1" style={{ marginBottom: 40 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 10,
                color: "#999",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Exa API Key
            </label>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <input
                className="api-input"
                type="password"
                placeholder="paste your exa api key"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && apiKeyInput && setExaKey(apiKeyInput)
                }
              />
              <button
                className="generate-btn"
                style={{ padding: "14px 28px", fontSize: 14 }}
                onClick={() => apiKeyInput && setExaKey(apiKeyInput)}
                disabled={!apiKeyInput}
              >
                Save
              </button>
            </div>
            <p
              style={{
                fontSize: 12,
                color: "#bbb",
                marginTop: 8,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Free at{" "}
              <a
                href="https://dashboard.exa.ai"
                target="_blank"
                rel="noreferrer"
                style={{ color: "#999", textDecoration: "underline" }}
              >
                dashboard.exa.ai
              </a>
            </p>
          </div>
        )}

        {exaKey && (
          <>
            {/* BEAT PICKER */}
            <div className="fade-up fade-up-2" style={{ marginBottom: 32 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 12,
                  color: "#999",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Select your beats
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {GTC_SEARCH_QUERIES.map((beat, i) => (
                  <button
                    key={i}
                    className={`beat-chip ${selectedBeats.includes(i) ? "active" : ""}`}
                    onClick={() => toggleBeat(i)}
                  >
                    {beat.icon} {beat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* GENERATE */}
            <div className="fade-up fade-up-3" style={{ marginBottom: 48 }}>
              <button
                className="generate-btn"
                onClick={runPipeline}
                disabled={
                  step === "searching" ||
                  step === "generating" ||
                  selectedBeats.length === 0
                }
              >
                {step === "searching"
                  ? "🔍 Scraping across all beats..."
                  : step === "generating"
                    ? "✍️ Writing your newsletter..."
                    : "Generate tomorrow's newsletter"}
              </button>
            </div>
          </>
        )}

        {/* ERROR */}
        {error && (
          <div
            className="fade-up"
            style={{
              background: "#FFF0F0",
              border: "1px solid #FFD4D4",
              borderRadius: 12,
              padding: "16px 20px",
              marginBottom: 16,
              fontSize: 14,
              color: "#C44",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {error}
          </div>
        )}

        {/* DEBUG PANEL */}
        {debugInfo && step === "error" && (
          <details
            style={{
              marginBottom: 32,
              background: "#F8F7F4",
              border: "1px solid #eae6de",
              borderRadius: 12,
              padding: "16px 20px",
            }}
          >
            <summary
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: "#666",
                cursor: "pointer",
              }}
            >
              🔍 Debug: see what Claude returned
            </summary>
            <div style={{ marginTop: 16 }}>
              {debugInfo.stopReason && (
                <div
                  style={{
                    fontSize: 12,
                    fontFamily: "'DM Sans', sans-serif",
                    color: "#999",
                    marginBottom: 8,
                  }}
                >
                  Stop reason: <strong>{debugInfo.stopReason}</strong>
                  {debugInfo.stopReason === "max_tokens" && (
                    <span style={{ color: "#C44" }}>
                      {" "}— Response was cut off! Try selecting fewer beats.
                    </span>
                  )}
                </div>
              )}
              {debugInfo.claudeResponse && (
                <pre
                  style={{
                    fontSize: 11,
                    fontFamily: "monospace",
                    color: "#555",
                    background: "#fff",
                    padding: 12,
                    borderRadius: 8,
                    overflow: "auto",
                    maxHeight: 300,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    border: "1px solid #eee",
                    marginBottom: 8,
                  }}
                >
                  {debugInfo.claudeResponse}
                </pre>
              )}
              {debugInfo.rawSnippet && !debugInfo.claudeResponse && (
                <pre
                  style={{
                    fontSize: 11,
                    fontFamily: "monospace",
                    color: "#555",
                    background: "#fff",
                    padding: 12,
                    borderRadius: 8,
                    overflow: "auto",
                    maxHeight: 300,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    border: "1px solid #eee",
                  }}
                >
                  {debugInfo.rawSnippet}
                </pre>
              )}
            </div>
          </details>
        )}

        {/* ARTICLES SENT TO CLAUDE */}
        {rawArticles.length > 0 && step === "error" && (
          <details
            style={{
              marginBottom: 32,
              background: "#F8F7F4",
              border: "1px solid #eae6de",
              borderRadius: 12,
              padding: "16px 20px",
            }}
          >
            <summary
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: "#666",
                cursor: "pointer",
              }}
            >
              📰 Debug: {rawArticles.length} articles Exa found
            </summary>
            <div style={{ marginTop: 12 }}>
              {rawArticles.map((a, i) => (
                <div
                  key={i}
                  style={{
                    padding: "8px 0",
                    borderBottom: "1px solid #eee",
                    fontSize: 12,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <div style={{ fontWeight: 500, color: "#333" }}>
                    [{i + 1}] {a.title}
                  </div>
                  <div style={{ color: "#999", fontSize: 11, marginTop: 2 }}>
                    {a.source} · {a.category} ·{" "}
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#999" }}
                    >
                      link
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* PROGRESS */}
        {searchProgress.length > 0 && step !== "done" && (
          <div className="fade-up" style={{ marginBottom: 32 }}>
            <div className="progress-bar" style={{ width: "100%", marginBottom: 20 }} />
            {searchProgress.map((p, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 0",
                  fontSize: 14,
                  fontFamily: "'DM Sans', sans-serif",
                  color: p.status === "done" ? "#1a1a1a" : "#999",
                }}
              >
                {p.status === "searching" ? (
                  <span className="spinner" />
                ) : (
                  <span style={{ fontSize: 16 }}>✓</span>
                )}
                <span>{p.category}</span>
                {p.count !== undefined && (
                  <span style={{ color: "#bbb", fontSize: 12 }}>
                    {p.count} articles
                  </span>
                )}
              </div>
            ))}
            {step === "generating" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 0",
                  fontSize: 14,
                  fontFamily: "'DM Sans', sans-serif",
                  color: "#FF6B35",
                  fontWeight: 500,
                }}
              >
                <span className="spinner" style={{ borderTopColor: "#FF6B35" }} />
                Claude is writing your newsletter...
              </div>
            )}
          </div>
        )}

        {/* ── NEWSLETTER OUTPUT ── */}
        {newsletter && step === "done" && (
          <div ref={contentRef} className="fade-up">
            {/* Header */}
            <div
              style={{
                textAlign: "center",
                marginBottom: 40,
                paddingBottom: 32,
                borderBottom: "1px solid #eae6de",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  color: "#999",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                ⚡ the daily byte
              </div>
              <h2
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  marginBottom: 12,
                }}
              >
                {newsletter.date}
              </h2>
              <p
                style={{
                  fontSize: 16,
                  color: "#666",
                  fontFamily: "'DM Sans', sans-serif",
                  fontStyle: "italic",
                }}
              >
                {newsletter.greeting}
              </p>
            </div>

            {/* TOP STORY */}
            {newsletter.topStory && (
              <div className="top-story-card fade-up fade-up-1">
                <div
                  className="tag"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    color: "#fff",
                    marginBottom: 16,
                  }}
                >
                  Top Story
                </div>
                <h3
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontSize: 26,
                    fontWeight: 700,
                    lineHeight: 1.2,
                    letterSpacing: "-0.02em",
                    marginBottom: 16,
                  }}
                >
                  {newsletter.topStory.emoji} {newsletter.topStory.headline}
                </h3>
                <div
                  style={{
                    fontSize: 15,
                    lineHeight: 1.7,
                    fontFamily: "'DM Sans', sans-serif",
                    color: "rgba(255,255,255,0.85)",
                    whiteSpace: "pre-line",
                  }}
                >
                  {newsletter.topStory.body}
                </div>
                <div
                  style={{
                    marginTop: 20,
                    padding: "12px 16px",
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    fontSize: 14,
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 500,
                  }}
                >
                  <span style={{ opacity: 0.6 }}>TLDR:</span>{" "}
                  {newsletter.topStory.tldr}
                </div>
                {newsletter.topStory.source && (
                  <div style={{ marginTop: 12, fontSize: 12, opacity: 0.5 }}>
                    via{" "}
                    {newsletter.topStory.sourceUrl ? (
                      <a
                        href={newsletter.topStory.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "inherit", textDecoration: "underline" }}
                      >
                        {newsletter.topStory.source}
                      </a>
                    ) : (
                      newsletter.topStory.source
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STORIES */}
            {(newsletter.stories || []).map((story, i) => (
              <div
                key={i}
                className={`story-card fade-up fade-up-${Math.min(i + 2, 5)}`}
              >
                <h3
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontSize: 20,
                    fontWeight: 700,
                    lineHeight: 1.3,
                    letterSpacing: "-0.01em",
                    marginBottom: 12,
                  }}
                >
                  {story.emoji} {story.headline}
                </h3>
                <div
                  style={{
                    fontSize: 15,
                    lineHeight: 1.7,
                    fontFamily: "'DM Sans', sans-serif",
                    color: "#555",
                    whiteSpace: "pre-line",
                    marginBottom: 12,
                  }}
                >
                  {story.body}
                </div>
                <div
                  style={{
                    padding: "10px 14px",
                    background: "#F5F3EE",
                    borderRadius: 8,
                    fontSize: 13,
                    fontFamily: "'DM Sans', sans-serif",
                    color: "#666",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "#999" }}>TLDR:</span>{" "}
                  {story.tldr}
                </div>
                {story.source && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#bbb" }}>
                    via{" "}
                    {story.sourceUrl ? (
                      <a
                        href={story.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#bbb", textDecoration: "underline", textUnderlineOffset: 2 }}
                      >
                        {story.source}
                      </a>
                    ) : (
                      story.source
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* WOULD WE INVEST */}
            {newsletter.wouldWeInvest && (
              <div
                className={`invest-box fade-up fade-up-4 ${
                  newsletter.wouldWeInvest.verdict === "no"
                    ? "no"
                    : newsletter.wouldWeInvest.verdict === "yes"
                      ? ""
                      : "complicated"
                }`}
              >
                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    fontWeight: 700,
                    marginBottom: 10,
                    color: "#999",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  💸 Would We Invest?
                </div>
                <h4
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontSize: 20,
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  {newsletter.wouldWeInvest.company}
                </h4>
                <div
                  className="tag"
                  style={{
                    background:
                      newsletter.wouldWeInvest.verdict === "yes"
                        ? "#16A34A"
                        : newsletter.wouldWeInvest.verdict === "no"
                          ? "#DC2626"
                          : "#D97706",
                    color: "#fff",
                    marginBottom: 12,
                  }}
                >
                  {newsletter.wouldWeInvest.verdict === "yes"
                    ? "✅ Yes"
                    : newsletter.wouldWeInvest.verdict === "no"
                      ? "❌ No"
                      : "🤔 It's Complicated"}
                </div>
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.6,
                    fontFamily: "'DM Sans', sans-serif",
                    color: "#555",
                  }}
                >
                  {newsletter.wouldWeInvest.reasoning}
                </p>
                {newsletter.wouldWeInvest.sourceUrl && (
                  <div style={{ marginTop: 12, fontSize: 12, color: "#999" }}>
                    via{" "}
                    <a
                      href={newsletter.wouldWeInvest.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#999", textDecoration: "underline", textUnderlineOffset: 2 }}
                    >
                      {newsletter.wouldWeInvest.source}
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* HOT TAKE */}
            {newsletter.hotTake && (
              <div className="hot-take-box fade-up fade-up-4">
                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    fontWeight: 700,
                    marginBottom: 10,
                    opacity: 0.8,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  🔥 Hot Take
                </div>
                <p
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontSize: 18,
                    fontWeight: 600,
                    lineHeight: 1.5,
                  }}
                >
                  {newsletter.hotTake}
                </p>
              </div>
            )}

            {/* SIGNOFF */}
            {newsletter.signoff && (
              <div
                className="fade-up fade-up-5"
                style={{
                  textAlign: "center",
                  padding: "32px 0",
                  borderTop: "1px solid #eae6de",
                  marginTop: 16,
                }}
              >
                <p
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontSize: 16,
                    fontStyle: "italic",
                    color: "#999",
                  }}
                >
                  {newsletter.signoff}
                </p>
                <div
                  style={{
                    marginTop: 20,
                    display: "flex",
                    justifyContent: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    className="save-btn"
                    onClick={() => {
                      const el = contentRef.current;
                      if (el) {
                        const range = document.createRange();
                        range.selectNodeContents(el);
                        const sel = window.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(range);
                        document.execCommand("copy");
                        sel.removeAllRanges();
                      }
                    }}
                  >
                    📋 Copy newsletter
                  </button>
                  <button
                    className="save-btn"
                    onClick={() => {
                      setNewsletter(null);
                      setStep("idle");
                      setSearchProgress([]);
                      setRawArticles([]);
                      setError(null);
                    }}
                  >
                    🔄 Generate new
                  </button>
                </div>
              </div>
            )}

            {/* RAW SOURCES */}
            {rawArticles.length > 0 && (
              <details style={{ marginTop: 32 }}>
                <summary
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    color: "#999",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  View {rawArticles.length} source articles from Exa
                </summary>
                <div style={{ marginTop: 16 }}>
                  {rawArticles.map((a, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "12px 0",
                        borderBottom: "1px solid #f0ece4",
                        fontSize: 13,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 500,
                          color: "#333",
                          marginBottom: 4,
                        }}
                      >
                        {a.title}
                      </div>
                      <div style={{ color: "#bbb", fontSize: 11 }}>
                        {a.source} · {a.category} ·{" "}
                        {a.publishedDate
                          ? new Date(a.publishedDate).toLocaleDateString()
                          : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* FOOTER */}
        <div
          style={{
            marginTop: 64,
            paddingTop: 24,
            borderTop: "1px solid #eae6de",
            textAlign: "center",
            fontSize: 12,
            color: "#ccc",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Exa + Claude · Editorial lens: Get the Check · Built by Gurman
        </div>
      </div>
    </div>
  );
}
