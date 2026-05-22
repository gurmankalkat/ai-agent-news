"use client";

import { useState, useRef } from "react";

const GTC_SEARCH_QUERIES = [
  {
    label: "AI Lab Wars",
    icon: "⚔️",
    queries: [
      "OpenAI Anthropic Google DeepMind xAI news deal partnership lawsuit",
      "AI model launch benchmark frontier Claude GPT Gemini Grok",
      "Sam Altman Dario Amodei Elon Musk AI company news",
    ],
  },
  {
    label: "Big Tech Moves",
    icon: "🏢",
    queries: [
      "Apple Google Meta Microsoft Amazon CEO earnings acquisition deal",
      "tech company IPO valuation acquisition billion deal 2026",
      "big tech antitrust regulation AI spending capex",
    ],
  },
  {
    label: "Startups & Founders",
    icon: "💰",
    queries: [
      "startup funding round Series A B YC launch founder raise",
      "consumer startup product launch viral hardware device",
      "AI startup founding team launch product market fit",
    ],
  },
  {
    label: "AI Infra & Chips",
    icon: "🔌",
    queries: [
      "data center AI GPU Nvidia chip compute infrastructure energy",
      "Cerebras chip IPO semiconductor AI hardware",
      "AI compute deal data center power grid megawatt",
    ],
  },
  {
    label: "AI Tools & Dev",
    icon: "🛠️",
    queries: [
      "Cursor coding AI tool developer agent IDE launch",
      "AI agent tool product launch developer workflow",
      "AI code generation copilot vibe coding tool",
    ],
  },
  {
    label: "Culture x Tech",
    icon: "✨",
    queries: [
      "consumer tech product viral app social media launch",
      "health tech GLP-1 telehealth wellness consumer startup",
      "tech culture design product taste consumer brand",
    ],
  },
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

export default function TechNewsletterAgent() {
  const [step, setStep] = useState("idle");
  const [newsletter, setNewsletter] = useState(null);
  const [error, setError] = useState(null);
  const [searchProgress, setSearchProgress] = useState([]);
  const [rawArticles, setRawArticles] = useState([]);
  const [selectedBeats, setSelectedBeats] = useState(GTC_SEARCH_QUERIES.map((_, i) => i));
  const [debugInfo, setDebugInfo] = useState(null);
  const contentRef = useRef(null);

  const toggleBeat = (idx) => {
    setSelectedBeats((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  async function searchBeat(query, category) {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, category }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || `Search failed for ${category}`);
    }
    const data = await res.json();
    return data.articles || [];
  }

  async function generateNewsletter(articles) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articles, dateStr }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.error === "JSON_PARSE_FAILED") {
        setDebugInfo({ claudeResponse: data.rawText, stopReason: data.stopReason, parseError: true });
        throw new Error("JSON_PARSE_FAILED");
      }
      throw new Error(data.error || "Generation failed");
    }

    setDebugInfo({ stopReason: data.stopReason });
    return data.newsletter;
  }

  async function runPipeline() {
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
        setSearchProgress((prev) => [...prev, { category: beat.label, status: "searching" }]);

        const beatResults = [];
        for (const q of beat.queries) {
          try {
            const results = await searchBeat(q, beat.label);
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

      const uniqueArticles = allArticles.filter(
        (a, i, arr) => arr.findIndex((b) => b.url === a.url) === i
      );

      const sorted = uniqueArticles
        .sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate))
        .slice(0, 15);

      const result = await generateNewsletter(sorted);

      const resolveSource = (item) => {
        if (item && item.articleIndex != null) {
          const idx = item.articleIndex - 1;
          const article = sorted[idx];
          if (article) {
            item.source = article.source;
            item.sourceUrl = article.url;
          }
        }
        return item;
      };

      if (result.stories) result.stories.forEach(resolveSource);

      setNewsletter(result);
      setStep("done");
    } catch (err) {
      const msg = err.message || "";
      if (msg === "JSON_PARSE_FAILED") {
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
        fontFamily: "'Inter', system-ui, sans-serif",
        background: "#FFFFFF",
        minHeight: "100vh",
        color: "#111111",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fade-up { animation: fadeUp 0.5s ease-out both; }
        .fade-up-1 { animation-delay: 0.1s; }
        .fade-up-2 { animation-delay: 0.2s; }
        .fade-up-3 { animation-delay: 0.3s; }
        .fade-up-4 { animation-delay: 0.4s; }
        .fade-up-5 { animation-delay: 0.5s; }
        .beat-chip {
          padding: 9px 18px;
          border-radius: 100px;
          border: 1.5px solid #E5E5E5;
          background: #FFFFFF;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.15s ease;
          user-select: none;
          font-family: 'Inter', sans-serif;
          color: #666;
        }
        .beat-chip:hover { border-color: #111111; color: #111111; }
        .beat-chip.active { background: #C8191A; color: #FFFFFF; border-color: #C8191A; }
        .generate-btn {
          background: #C8191A;
          color: #FFFFFF;
          border: none;
          padding: 15px 40px;
          border-radius: 100px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
          letter-spacing: 0.01em;
        }
        .generate-btn:hover { background: #A31415; transform: translateY(-1px); }
        .generate-btn:disabled { background: #ccc; cursor: not-allowed; transform: none; }
        .story-card { padding: 28px 0; border-bottom: 1px solid #E5E5E5; }
        .story-card:last-child { border-bottom: none; }
        .progress-bar {
          height: 2px;
          background: linear-gradient(90deg, #C8191A, #ddd, #C8191A);
          background-size: 200% auto;
          animation: shimmer 1.5s linear infinite;
        }
        .tag {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-family: 'Inter', sans-serif;
        }
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #E5E5E5;
          border-top-color: #C8191A;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          display: inline-block;
          flex-shrink: 0;
        }
        .save-btn {
          padding: 11px 28px;
          border-radius: 100px;
          border: 1.5px solid #E5E5E5;
          background: transparent;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          color: #666;
          transition: all 0.15s;
        }
        .save-btn:hover { border-color: #111111; color: #111111; }
        @media print {
          @page { margin: 1.5cm; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { background: white; }
          .no-print { display: none !important; }
          .save-btn { display: none !important; }
          details { display: none !important; }
          .story-card { break-inside: avoid; }
        }
      `}</style>

      {/* HEADER */}
      <div
        className="no-print"
        style={{
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #E5E5E5",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "#C8191A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            ⚡
          </div>
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Cut The Check
          </span>
        </div>
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            color: "#999",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: 500,
          }}
        >
          Powered by Get the Check's editorial lens
        </span>
      </div>

      {/* MAIN */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "52px 24px" }}>

        {/* HERO */}
        <div className="fade-up no-print" style={{ marginBottom: 52 }}>
          <h1
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 56,
              fontWeight: 900,
              lineHeight: 1.0,
              letterSpacing: "0.01em",
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            Tech news through the{" "}
            <span style={{ color: "#C8191A" }}>
              Get the Check
            </span>{" "}
            lens
          </h1>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.65,
              color: "#666",
              fontFamily: "'Inter', sans-serif",
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

        {/* BEAT PICKER */}
        <div className="fade-up fade-up-1 no-print" style={{ marginBottom: 28 }}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 12,
              color: "#999",
              fontFamily: "'Inter', sans-serif",
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
        <div className="fade-up fade-up-2 no-print" style={{ marginBottom: 52 }}>
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

        {/* ERROR */}
        {error && (
          <div
            className="fade-up no-print"
            style={{
              background: "#FFF0F0",
              border: "1px solid #FECDD3",
              borderRadius: 10,
              padding: "14px 18px",
              marginBottom: 16,
              fontSize: 14,
              color: "#C8191A",
              fontFamily: "'Inter', sans-serif",
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
              background: "#FAFAFA",
              border: "1px solid #E5E5E5",
              borderRadius: 10,
              padding: "14px 18px",
            }}
          >
            <summary
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: "#666",
                cursor: "pointer",
              }}
            >
              🔍 Debug: see what Claude returned
            </summary>
            <div style={{ marginTop: 14 }}>
              {debugInfo.stopReason && (
                <div
                  style={{
                    fontSize: 12,
                    fontFamily: "'Inter', sans-serif",
                    color: "#999",
                    marginBottom: 8,
                  }}
                >
                  Stop reason: <strong>{debugInfo.stopReason}</strong>
                  {debugInfo.stopReason === "max_tokens" && (
                    <span style={{ color: "#C8191A" }}>
                      {" "}— Response was cut off despite 8192 token limit. Try selecting fewer beats.
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
                    border: "1px solid #E5E5E5",
                  }}
                >
                  {debugInfo.claudeResponse}
                </pre>
              )}
            </div>
          </details>
        )}

        {/* PROGRESS */}
        {searchProgress.length > 0 && step !== "done" && (
          <div className="fade-up no-print" style={{ marginBottom: 32 }}>
            <div className="progress-bar" style={{ width: "100%", marginBottom: 20 }} />
            {searchProgress.map((p, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "9px 0",
                  fontSize: 14,
                  fontFamily: "'Inter', sans-serif",
                  color: p.status === "done" ? "#111111" : "#999",
                }}
              >
                {p.status === "searching" ? (
                  <span className="spinner" />
                ) : (
                  <span style={{ fontSize: 14, color: "#C8191A", fontWeight: 700, width: 16, display: "inline-block" }}>✓</span>
                )}
                <span>{p.category}</span>
                {p.count !== undefined && (
                  <span style={{ color: "#bbb", fontSize: 12 }}>{p.count} articles</span>
                )}
              </div>
            ))}
            {step === "generating" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 0",
                  fontSize: 14,
                  fontFamily: "'Inter', sans-serif",
                  color: "#C8191A",
                  fontWeight: 500,
                }}
              >
                <span className="spinner" />
                Claude is writing your newsletter...
              </div>
            )}
          </div>
        )}

        {/* ── NEWSLETTER OUTPUT ── */}
        {newsletter && step === "done" && (
          <div ref={contentRef} className="fade-up">

            {/* Newsletter masthead */}
            <div
              style={{
                textAlign: "center",
                marginBottom: 40,
                paddingBottom: 32,
                borderTop: "3px solid #C8191A",
                paddingTop: 28,
                borderBottom: "1px solid #E5E5E5",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  color: "#999",
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                  marginBottom: 10,
                }}
              >
                ⚡ Cut The Check
              </div>
              <h2
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 36,
                  fontWeight: 800,
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                }}
              >
                {newsletter.date}
              </h2>
            </div>

            {/* STORIES */}
            {(newsletter.stories || []).map((story, i) => (
              <div key={i} className={`story-card fade-up fade-up-${Math.min(i + 1, 5)}`}>
                <h3
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 26,
                    fontWeight: 800,
                    lineHeight: 1.15,
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  {story.emoji} {story.headline}
                </h3>
                <div
                  style={{
                    fontSize: 15,
                    lineHeight: 1.7,
                    fontFamily: "'Inter', sans-serif",
                    color: "#444",
                    whiteSpace: "pre-line",
                    marginBottom: 14,
                  }}
                >
                  {story.body}
                </div>
                <div
                  style={{
                    padding: "10px 14px",
                    background: "#F4F4F4",
                    borderLeft: "3px solid #C8191A",
                    fontSize: 13,
                    fontFamily: "'Inter', sans-serif",
                    color: "#555",
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ fontWeight: 700, color: "#C8191A", marginRight: 6 }}>TLDR —</span>
                  {story.tldr}
                </div>
                {story.source && (
                  <div style={{ marginTop: 10, fontSize: 12, color: "#bbb", fontFamily: "'Inter', sans-serif" }}>
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

            {/* SIGNOFF */}
            {newsletter.signoff && (
              <div
                className="fade-up fade-up-5"
                style={{
                  textAlign: "center",
                  padding: "32px 0",
                  borderTop: "1px solid #E5E5E5",
                  marginTop: 8,
                }}
              >
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 15,
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
                    onClick={() => window.print()}
                  >
                    📄 Download PDF
                  </button>
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
                    fontFamily: "'Inter', sans-serif",
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
                        padding: "10px 0",
                        borderBottom: "1px solid #F0F0F0",
                        fontSize: 13,
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      <div style={{ fontWeight: 500, color: "#333", marginBottom: 3 }}>
                        {a.title}
                      </div>
                      <div style={{ color: "#bbb", fontSize: 11 }}>
                        {a.source} · {a.category} ·{" "}
                        {a.publishedDate ? new Date(a.publishedDate).toLocaleDateString() : ""}
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
          className="no-print"
          style={{
            marginTop: 64,
            paddingTop: 24,
            borderTop: "1px solid #E5E5E5",
            textAlign: "center",
            fontSize: 12,
            color: "#ccc",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Exa + Claude · Editorial lens: Get the Check · Built by Gurman
        </div>
      </div>
    </div>
  );
}
