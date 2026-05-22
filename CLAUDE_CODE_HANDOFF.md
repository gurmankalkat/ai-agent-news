# The Daily Byte — Claude Code Handoff

## What This Is

An AI-powered editorial agent that scrapes today's tech news via the Exa API and generates a daily newsletter written in the voice of **Get the Check** (a tech podcast) meets **The Skimm** meets **Gen Z internet culture**. Built as a React artifact in Claude.ai, now being ported to a standalone app.

**Built by:** Gurman Kalkat
**Stack:** React + Exa Search API + Anthropic Claude API
**Status:** Working prototype with one critical bug (JSON parsing failures from Claude's response being truncated)

---

## Architecture

```
User clicks "Generate" 
    ↓
[1] EXA SEARCH LAYER
    - 7 editorial "beats" derived from Get the Check's actual coverage
    - Each beat fires 3 targeted search queries (21 total)
    - Each query: Exa /search endpoint, filtered to last 48hrs, category: "news"
    - Returns up to 4 articles per query with text + highlights
    ↓
[2] ARTICLE PIPELINE  
    - Deduplicate by URL
    - Sort by publish date (newest first)
    - Take top 15 articles
    - Each article carries: title, url, publishedDate, text (800 chars), 
      highlights, source hostname, beat category
    ↓
[3] CLAUDE GENERATION
    - System prompt defines the editorial voice + JSON schema
    - User message contains all 15 articles formatted as:
      [1] "Title" (source.com, beat: AI Lab Wars)
      URL: https://...
      First 400 chars of article text...
    - Claude returns structured JSON with newsletter content
    - Each story includes articleIndex (integer) pointing to source article
    ↓
[4] URL RESOLUTION
    - articleIndex from Claude maps back to the scraped articles array
    - Real Exa URLs get attached as sourceUrl on each story
    - "via" links point to the exact source article
    ↓
[5] RENDER
    - Top story (dark card), regular stories, "Would We Invest?" section,
      hot take (gradient card), signoff
    - Every "via" is a clickable link to the real article
```

---

## The Critical Bug to Fix

**Problem:** The Anthropic API as called from Claude.ai artifacts has a `max_tokens` limit (likely capped at ~1000 by the environment). A full newsletter JSON with 5-6 stories exceeds this, so the response gets truncated mid-JSON. The parser fails.

**Evidence:** The error chain was:
1. `"Unexpected token 'I', "I don't se"... is not valid JSON"` — Claude returned text instead of JSON
2. After adding stronger prompt instructions, it started returning JSON but truncated
3. `stop_reason` is likely `max_tokens` (debug panel was added to verify)

**Solutions to explore in Claude Code (where there's no token cap):**
1. Set `max_tokens: 8192` or higher — this should just work in a real Node.js environment
2. If still too long, split into two calls: one for story selection + outlines, one for full writing
3. Or use streaming to handle longer responses
4. The current artifact version has a debug panel that shows Claude's raw response + stop_reason — use this to verify the fix

---

## Get the Check Editorial DNA

Extracted from analyzing 6+ episodes of the podcast. These are NOT generic tech news categories — they're the specific beats the show actually covers:

### Beat 1: AI Lab Wars ⚔️
OpenAI vs Elon lawsuit, Anthropic compute deals, xAI/Grok drama, model benchmarks, AGI debates, Sam Altman drama, Greg Brockman's journal getting subpoenaed

### Beat 2: Big Tech Power Moves 🏢
CEO transitions (Tim Cook → John Ternus), earnings with real analysis (capex freakouts, FCF breakdowns), $700B collective data center spend, acquisitions, the Sam Altman vs Sarah Friar drama at OpenAI

### Beat 3: Startups — "Get the Check" Segment 💰
Their signature segment where they evaluate startups like VCs. They ask: Would we invest? They've covered Amano ($20 hearing aids, went viral with 11M views on X), Mochi Health (500K patients, bootstrapped, sued by Eli Lilly), BuildForever/Extra (consumer email). They care about unit economics, TAM, founder energy, and whether the product is actually good.

### Beat 4: AI Infrastructure & Compute 🔌
Cerebras IPO at $49B (95x revenue multiple on $510M rev), Colossus at 11% utilization, GPU economics (racks from 8 servers to 512), $20M/megawatt data center costs, energy grid bottlenecks, half of planned 2026 megawatts already canceled

### Beat 5: AI Tools & Developer Economy 🛠️
xAI/Cursor deal ($60B acquisition or $10B compute deal), Composer model benchmarks, coding tool consolidation, GitHub Copilot alternatives, the data moat of coding tools (Cursor's unique RL harness)

### Beat 6: Consumer × Culture ✨
Peptide craze (BPC-157, GLP-1s, FDA reclassification in July), HIMS sending meds without doctors, biohacker culture in SF vs NYC, Pinterest maintaining "taste" (saves over likes, no contact imports), consumer products where tech meets culture

### Beat 7: Tech Policy & Geopolitics 🌍
AOC + Bernie's data center moratorium act, Garry Tan's response, Trump's China trip (brought Jensen, Tim Cook, Elon), US-China AI safety dialogue, data center tax exemptions, Trump's non-binding pledge on energy costs

---

## The Voice

The newsletter voice is a specific cocktail:

**The Skimm's accessibility** — Anyone can read it. No jargon walls. Complex topics broken down without being condescending.

**Get the Check's opinionated analysis** — Three women (Maya, Monica/Anika, Priya) who work in tech, have opinions, understand cap tables AND couture. They say "this is mid" when it's mid. They evaluate companies with real financial analysis. They have running jokes (Priya wanting peptides, Maya going through her promos inbox).

**Gen Z internet fluency** — "ngl", "iykyk", "tbh" used SPARINGLY. Pop culture references. Lowercase energy. Short punchy sentences then longer ones for real analysis. Never try-hard.

**Key voice rules from the system prompt:**
- No "In today's fast-paced world" energy
- No "It's worth noting"
- Have genuine opinions
- Understand revenue multiples AND memes
- If something is mid, say it's mid
- No semicolons (Gurman's preference)
- No em dashes as stylistic punctuation

---

## Project Files (Reference Material)

These PDFs contain full episode transcripts and show notes from Get the Check:

```
Get_the_Check__Elon_Musk_v__OpenAI_heats_up_surprise_SpaceXAI_and_Anthropic_deal_Cerebras_IPO.pdf
Get_the_Check__Apple_CEO_Tim_Cook_steps_down_big_tech_s_earnings_xAI_and_Cursor_deal.pdf
Get_the_Chselves.pdf  (peptide episode — Myra Ahmad / Mansi Hukmani)
Get_the_Check__Inside_BuildForever__Naveen_Gavini_Former_Pinterest_CPO_on_Launching_Extra_and_Building_for_Joy.pdf
Get_the_Check__Dimitri_Knight_on_Taste_in_AI_and_What_Designers_Do_Next.pdf
_AOC_v_Garry_Tan_on_data_centers_Trumps_China_trip_Arish_cofounder_of_Amano_the_hearing_aid.pdf
Daily_Skimms.pdf  (reference for The Skimm's newsletter format/style)
```

Plus full transcript PDFs for deeper context on each episode.

---

## Exa API Reference

**Endpoint:** `POST https://api.exa.ai/search`

**Auth:** `x-api-key` header

**Key params used:**
```json
{
  "query": "search terms",
  "numResults": 4,
  "startPublishedDate": "ISO date (48hrs ago)",
  "contents": {
    "text": { "maxCharacters": 1000 },
    "highlights": true
  },
  "category": "news",
  "type": "auto"
}
```

**Response shape:**
```json
{
  "results": [
    {
      "title": "string",
      "url": "string",
      "publishedDate": "ISO date",
      "text": "article text",
      "highlights": ["key sentences"],
      "author": "string"
    }
  ]
}
```

**Free tier:** 1,000 credits at dashboard.exa.ai
**Docs:** https://docs.exa.ai/reference/search

---

## Anthropic API Usage

**Endpoint:** `POST https://api.anthropic.com/v1/messages`

**Model:** `claude-sonnet-4-20250514`

**Key constraints discovered:**
- In Claude.ai artifacts, `max_tokens` is likely capped at ~1000
- Assistant message prefill (`{ role: "assistant", content: "{" }`) is NOT supported in artifact API calls
- In Claude Code / standalone Node.js, neither of these limits should apply

**Current system prompt** is ~1500 words covering voice rules, editorial beats, and JSON schema. See the full prompt in the source code constant `NEWSLETTER_SYSTEM_PROMPT`.

---

## Current Source Code

The complete React component is in `tech_newsletter_agent.jsx`. Key sections:

1. **Lines 6-84:** `GTC_SEARCH_QUERIES` — The 7 editorial beats with 3 queries each
2. **Lines 86-142:** `NEWSLETTER_SYSTEM_PROMPT` — The full Claude system prompt
3. **Lines 164-202:** `searchExa()` — Exa API integration
4. **Lines 205-280:** `generateNewsletter()` — Claude API call + JSON parsing
5. **Lines 282-377:** `runPipeline()` — Orchestration + URL resolution
6. **Lines 380+:** React UI with editorial layout

---

## What to Build Next

### Immediate (fix the bug)
- [ ] Port to Next.js or standalone React app with a real backend
- [ ] Move API calls to server-side (Exa key shouldn't be in the browser)
- [ ] Set `max_tokens: 8192` on the Anthropic call — this alone probably fixes parsing
- [ ] Add proper error boundaries

### Product improvements
- [ ] Email delivery (Resend, SendGrid, or Loops)
- [ ] Scheduled daily generation (cron job or Vercel cron)
- [ ] Save newsletter history
- [ ] "Read more" that fetches full article text via Exa Contents API
- [ ] Share buttons (copy formatted HTML, share to Twitter/LinkedIn)
- [ ] Custom beat selection saved per user
- [ ] RSS feed output

### Editorial refinements
- [ ] Feed recent Get the Check episodes to Claude as additional context for voice matching
- [ ] A/B test different system prompts for voice quality
- [ ] Add a "What GTC would say" sidebar that matches newsletter stories to past episode topics
- [ ] Trending topics detection (what's the story everyone will be talking about tomorrow)

### Infra
- [ ] Rate limiting on Exa calls (21 queries is a lot per generation)
- [ ] Cache Exa results for the day (no need to re-scrape for regenerations)
- [ ] Streaming Claude response for better UX
- [ ] Analytics on which beats produce the most selected stories

---

## Design Direction

**Current aesthetic:** Warm cream background (#FFFDF8), Fraunces serif for headlines, DM Sans for body, black cards for top stories, gradient cards for hot takes. Editorial/magazine feel. No generic AI slop.

**Fonts loaded:** Instrument Sans, Fraunces (variable weight), DM Sans

**Key colors:**
- Background: #FFFDF8 (warm cream)
- Text: #1a1a1a
- Accent gradient: #FF6B35 → #FF2E63 (used for hot takes and hero text)
- Borders: #eae6de
- TLDR backgrounds: #F5F3EE
- Invest yes: #16A34A / no: #DC2626 / complicated: #D97706

---

## How to Run in Claude Code

```bash
# 1. Create a new project directory
mkdir daily-byte && cd daily-byte

# 2. Initialize with Vite + React
npm create vite@latest . -- --template react
npm install

# 3. Copy tech_newsletter_agent.jsx to src/App.jsx
# (replace the default App component)

# 4. Create .env file
echo "VITE_EXA_API_KEY=your-key-here" > .env

# 5. Port API calls to server-side
# Move Exa and Anthropic calls to an API route or serverless function
# The Anthropic SDK: npm install @anthropic-ai/sdk
# The Exa SDK: npm install exa-js

# 6. Run
npm run dev
```

The main thing Claude Code needs to do: move the two fetch calls (Exa + Anthropic) to a backend, set proper `max_tokens`, and the newsletter generation should work cleanly.
