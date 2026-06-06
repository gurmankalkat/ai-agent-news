# How Get The Check Works

## Overview

A Next.js app with no database. The user picks beats, clicks a button, and gets a newsletter. Everything happens in a single pipeline triggered client-side.

---

## Files

```
src/app/page.js                  — UI + pipeline orchestrator
src/app/api/search/route.js      — Exa search (one call per beat query)
src/app/api/generate/route.js    — Claude newsletter generation
```

---

## The Pipeline

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

---

## `src/app/page.js`

The whole app lives here. Key responsibilities:

**Beat definitions (`GTC_SEARCH_QUERIES`)** — 7 beats, each with a label, icon, and one or more Exa queries. All queries are broad by design so Exa has room to surface the most relevant recent articles rather than locking in on a narrow topic.

**`runPipeline()`** — the main orchestrator. Calls `/api/search` for each selected beat sequentially (not parallel — so the progress UI shows beat-by-beat). Collects all results, deduplicates by URL, sorts by `publishedDate` descending, and passes the top 25 to `/api/generate`.

**Why 25?** Claude decides which 5–6 stories to write. Giving it 25 articles means it has enough to find good stories across all beats without being overwhelming. The previous cap was 15, which was tight enough that beats with slightly older articles could be cut out entirely before Claude even saw them.

**Source attribution (`resolveSource`)** — Claude tags each story with an `articleIndex` integer in its JSON response (e.g., `articleIndex: 3` means article [3] in the list it was given). After generation, the client resolves that index back to the real article URL and domain so the "via source" link works.

**Newsletter date** — set to tomorrow's date. The newsletter is written today for tomorrow's send.

---

## `src/app/api/search/route.js`

Wraps the Exa search API. Called once per beat query.

**Key parameters:**
- `numResults: 4` — Exa returns up to 4 articles per query. Arbitrary starting number; changing it changes how many options Claude has from each beat before the pool is combined and trimmed.
- `startPublishedDate: oneDayAgo` — only articles from the last 24 hours.
- `includeDomains` — a curated allowlist of ~25 quality tech/news sources (TechCrunch, The Verge, Bloomberg, WSJ, etc.). This is the main quality gate. Exa won't return tabloids or SEO spam.
- `contents.text.maxCharacters: 1000` — pulls up to 1000 chars of article body. Truncated further to 400 chars before sending to Claude to keep token usage manageable.
- `category: "news"`, `type: "auto"` — tells Exa to treat this as a news search.

---

## `src/app/api/generate/route.js`

Calls Claude to write the newsletter.

**System prompt** defines the voice ("Get the Check" energy — opinionated, conversational, no corporate speak), the beats to prioritize, and the output format. Claude is told to return **only** a JSON object — no markdown, no preamble.

**Article formatting** — each article is passed as a numbered block like `[1] "Title" (source, beat: category)\nURL\n{first 400 chars of text}`. The number is what Claude uses for `articleIndex`.

**Output schema:**
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

**`max_tokens: 8192`** — enough headroom for 5–6 fully written stories. If Claude hits this limit mid-response, the JSON will be malformed. The debug panel surfaces this (`stop_reason: max_tokens`) and suggests selecting fewer beats.

**JSON parsing** — the response goes through a two-pass parse: first a straight `JSON.parse`, then a bracket-depth walker to extract valid JSON if Claude wrapped it in extra text. If both fail, the raw response is shown in the debug panel.

**Model: `claude-sonnet-4-6`** — good balance of quality and speed for this task. Fast enough for interactive use, smart enough to write in voice and handle the structured output reliably.

---

## Key Design Decisions

| Decision | Why |
|---|---|
| Sequential beat fetching | Lets the progress UI show each beat completing one at a time |
| Deduplicate by URL before sending to Claude | The same article can surface across multiple beat queries |
| Claude decides which stories to write | Claude knows the beats, the voice, and what's interesting — hard-coded filters would just make things worse |
| `articleIndex` instead of embedding URLs in Claude's output | More reliable than asking Claude to reproduce URLs accurately; resolved client-side |
| Domain allowlist in Exa, not Claude | Exa is cheaper to filter than Claude; better to not let junk articles in at all |
| `slice(0, 25)` after sorting by recency | Enough articles for Claude to cover all beats; sorting by recency means newest wins when there's overflow, which is fine since this is a daily news product |
