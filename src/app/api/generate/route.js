import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const NEWSLETTER_SYSTEM_PROMPT = `You are writing a daily tech newsletter called "Get The Check" that sits at the intersection of The Skimm's accessibility, Get the Check's opinionated tech analysis, and Gen Z internet fluency.

WHAT GET THE CHECK ACTUALLY COVERS (match this energy):
- AI lab drama: OpenAI vs Elon, Anthropic deals, model wars, who's winning and who's fumbling
- Big tech power moves: CEO transitions, earnings that actually matter (capex, FCF), acquisitions
- Startup analysis: evaluate real companies, ask hard questions about unit economics, TAM, and whether the founder energy is there
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
  "stories": [
    {
      "headline": "catchy headline, 8 words max",
      "emoji": "one relevant emoji",
      "body": "2-3 short paragraphs. be SPECIFIC with numbers, names, and facts. explain why it matters. have an opinion.",
      "tldr": "one sentence TLDR that captures both the fact and the take",
      "articleIndex": the number from the [N] tag of the PRIMARY article you used for this story (e.g. 3)
    }
  ],
  "signoff": "a fun signoff. short."
}

IMPORTANT: The articleIndex field MUST be an integer (not a string) matching the [N] number from the articles provided. This is how we link readers to the real source. Every story MUST have an articleIndex.

Give me 5-6 stories. Every story MUST reference real facts from the sources. Don't make up numbers or names. Be funny but accurate. Prioritize stories that match Get the Check's beats: AI drama, big tech moves, startup evaluation, infrastructure/compute, dev tools, consumer x culture, policy.

CRITICAL: Your entire response must be ONLY the JSON object. No preamble, no explanation, no markdown fences, no text before or after the JSON. Start with { and end with }. If you have fewer articles than expected, still write the newsletter with whatever you have. NEVER refuse or explain — just output the JSON.`;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  const { articles, dateStr } = await request.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const articleSummaries = articles
    .map(
      (a, i) =>
        `[${i + 1}] "${a.title}" (${a.source}, beat: ${a.category})\nURL: ${a.url}\n${a.text?.substring(0, 400)}`
    )
    .join("\n\n---\n\n");

  let message;
  try {
    message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: NEWSLETTER_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Articles from today. Write the newsletter for ${dateStr}. ONLY output JSON, nothing else.\n\n${articleSummaries}`,
        },
      ],
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Anthropic API error: ${err.message}` },
      { status: 500 }
    );
  }

  const rawText = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  const stopReason = message.stop_reason || "unknown";

  const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  let newsletter;
  try {
    newsletter = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    if (start >= 0) {
      let depth = 0, inStr = false, esc = false;
      for (let i = start; i < cleaned.length; i++) {
        const c = cleaned[i];
        if (esc) { esc = false; continue; }
        if (c === "\\") { esc = true; continue; }
        if (c === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (c === "{" || c === "[") depth++;
        if (c === "}" || c === "]") depth--;
        if (depth === 0) {
          try {
            newsletter = JSON.parse(cleaned.substring(start, i + 1));
            break;
          } catch { break; }
        }
      }
    }

    if (!newsletter) {
      return NextResponse.json(
        { error: "JSON_PARSE_FAILED", rawText: cleaned.substring(0, 1000), stopReason },
        { status: 422 }
      );
    }
  }

  return NextResponse.json({ newsletter, stopReason });
}
