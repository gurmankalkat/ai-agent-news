import { NextResponse } from "next/server";

export async function POST(request) {
  const { query, category } = await request.json();

  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "EXA_API_KEY not configured" }, { status: 500 });
  }

  const today = new Date();
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const US_NEWS_DOMAINS = [
    "techcrunch.com",
    "theverge.com",
    "wired.com",
    "arstechnica.com",
    "bloomberg.com",
    "wsj.com",
    "nytimes.com",
    "washingtonpost.com",
    "reuters.com",
    "apnews.com",
    "fortune.com",
    "businessinsider.com",
    "cnbc.com",
    "axios.com",
    "forbes.com",
    "engadget.com",
    "venturebeat.com",
    "zdnet.com",
    "cnet.com",
    "semafor.com",
    "theatlantic.com",
    "npr.org",
    "protocol.com",
    "theinformation.com",
    "platformer.news",
  ];

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
      includeDomains: US_NEWS_DOMAINS,
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
    return NextResponse.json(
      { error: `Exa search failed for "${category}": ${errText}` },
      { status: res.status }
    );
  }

  const data = await res.json();
  const articles = (data.results || []).map((r) => ({
    title: r.title,
    url: r.url,
    publishedDate: r.publishedDate,
    text: r.text?.substring(0, 800) || "",
    highlights: r.highlights || [],
    source: new URL(r.url).hostname.replace("www.", ""),
    category,
  }));

  return NextResponse.json({ articles });
}
