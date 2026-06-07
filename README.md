# Get The Check — Newsletter Agent

A Next.js app that generates a daily tech newsletter in the voice of Get the Check. Pick your beats, click generate, get a full newsletter in ~30 seconds. No database, no auth, no scheduling — it's a personal tool that runs on demand.

---

## What it does

Exa scrapes today's headlines across whichever beats you select. Claude reads them, picks the 5–6 best stories, and writes them up with real analysis and a strong take — not a press release rehash. The output can be downloaded as PDF or copied for email.

---

## Stack

- **Next.js 15** (App Router)
- **Exa** — neural news search with domain filtering
- **Claude** (`claude-sonnet-4-6`) — newsletter writer
- **No database** — everything is ephemeral, generated on demand

---

## Setup

```bash
npm install
```

Create `.env.local`:

```
EXA_API_KEY=your_exa_key
ANTHROPIC_API_KEY=your_anthropic_key
```

```bash
npm run dev
# → http://localhost:3000
```

---

## File structure

```
src/app/
  page.js              — UI + pipeline orchestrator
  api/search/route.js  — Exa search (one call per beat query)
  api/generate/route.js — Claude newsletter generation
```

---

## How the pipeline works

```
User selects beats
       ↓
For each beat → POST /api/search
       ↓
Exa returns articles (last 24h, curated domains)
       ↓
Pool all results → deduplicate by URL → sort by recency → slice to top 25
       ↓
POST /api/generate with those 25 articles
       ↓
Claude writes 5–6 stories as JSON
       ↓
Resolve articleIndex → real source URLs
       ↓
Render newsletter
```

Beat fetching is **sequential, not parallel** — so the progress UI can show each beat completing one at a time.

---

## Beats

| Beat | Query intent |
|---|---|
| ⚔️ AI Lab Wars | AI company news, funding, deals, model announcements |
| 🏢 Big Tech Moves | Earnings, revenue, financial results |
| 💰 Startups & Founders | Funding rounds, launches, founder news |
| 🔌 AI Infra & Chips | Data centers, compute investment, chip companies |
| 🛠️ AI Tools & Dev | Developer tools, coding AI, agent frameworks |
| ✨ Culture x Tech | Consumer products, health tech, tech x taste |
| 🌍 Tech Policy | Regulation, government, US-China tech race |

---

## Search (`/api/search`)

Wraps the Exa neural search API. Called once per beat query.

**Key parameters:**
- `numResults: 4` — up to 4 articles per query, combined into a larger pool before Claude sees them
- `startPublishedDate: oneDayAgo` — last 24 hours only
- `includeDomains` — curated allowlist of ~25 quality sources (TechCrunch, The Verge, Bloomberg, WSJ, etc.). This is the main quality gate — Exa won't return tabloids or SEO spam
- `contents.text.maxCharacters: 1000` — article body snippet, truncated further to 400 chars before sending to Claude
- `category: "news"`, `type: "auto"` — tells Exa to treat this as a news search

---

## From 25+ articles to 5–6 stories

After Exa returns results, the client trims the pool before anything reaches Claude:

1. **Pool** — each beat query returns up to 4 articles. With 7 beats selected that's up to 28 raw results, often less due to the 24h window and domain allowlist.
2. **Deduplicate** — any URL that appeared in multiple beat queries is collapsed to one entry. A story about an OpenAI funding round might surface under both "AI Lab Wars" and "Startups & Founders"; it's kept once.
3. **Sort by recency** — remaining articles are sorted by `publishedDate` descending so the freshest news ranks first.
4. **Slice to 25** — the top 25 go to Claude. This is a soft cap: enough to cover all beats, small enough to stay within a reasonable token budget.
5. **Claude edits** — Claude reads all 25, decides which 5–6 are actually worth writing about given the beats and voice, and writes full stories for those. The rest are silently dropped. This is intentional — a human editor would do the same thing, and Claude is better at judging newsworthiness in context than any hard-coded filter.

The result is that Exa handles breadth (surfacing everything published today across quality sources) and Claude handles judgment (picking what's interesting and writing it well).

---

## Generation (`/api/generate`)

Calls Claude to write the newsletter from the pooled articles.

**Article preparation** — each article is passed as a numbered block:
```
[1] "Title" (source, beat: category)
URL: https://...
{first 400 chars of article text}
```

**Why 25 articles?** Claude decides which 5–6 stories to write. 25 gives it enough coverage across all beats without being overwhelming. Fewer and some beats get dropped before Claude even sees them.

**Source attribution** — Claude tags each story with an `articleIndex` integer matching the `[N]` number in the article list. After generation, the client resolves that index back to the real URL. More reliable than asking Claude to reproduce URLs accurately.

**JSON output schema:**
```json
{
  "date": "Thursday, June 6, 2026",
  "stories": [
    {
      "headline": "8 words max",
      "emoji": "one emoji",
      "body": "2–3 short paragraphs",
      "tldr": "one sentence fact + take",
      "articleIndex": 3
    }
  ],
  "signoff": "short fun signoff"
}
```

**`max_tokens: 8192`** — enough for 5–6 fully written stories. If Claude hits this limit mid-response, the JSON will be malformed. The debug panel surfaces this (`stop_reason: max_tokens`) and suggests selecting fewer beats.

**JSON parsing** — two-pass: first a straight `JSON.parse`, then a bracket-depth walker to extract valid JSON if Claude wrapped it in extra text. If both fail, a fallback newsletter is assembled from raw article titles and snippets so the UI never returns empty.

---

## Voice

The system prompt defines a specific editorial voice — the goal is to sound like a group chat friend who actually reads earnings reports and keeps up with TikTok. Key rules:

- Conversational but never dumbed down
- Short punchy sentences for context, real analysis when it matters
- Opinions required — if a valuation is insane, say so
- No corporate speak ("It's worth noting", "In today's landscape")
- Specific numbers and names from the actual sources — never fabricated

---

## Key design decisions

| Decision | Why |
|---|---|
| Sequential beat fetching | Progress UI shows each beat completing in real time |
| Deduplicate by URL before sending to Claude | Same article can surface across multiple beat queries |
| Claude decides which stories to write | Hard-coded filters would miss context; Claude knows the beats and voice |
| `articleIndex` instead of URLs in Claude's output | Claude can't reliably reproduce URLs; index resolved client-side |
| Domain allowlist in Exa, not Claude | Cheaper to filter at search time than to let junk reach the LLM |
| Sort by recency, slice to 25 | Newest wins on overflow — correct behavior for a daily news product |
| No database | Personal tool; everything regenerates on demand |
