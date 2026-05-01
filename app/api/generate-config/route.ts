import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { checkRateLimit } from "@/app/lib/ratelimit";

const GENERATE_CONFIG_PROMPT = `You are a job search assistant. Given this candidate profile, generate target companies and role filters for a job search.

Return ONLY a valid JSON object with this exact schema — no preamble, no markdown, no explanation:

{
  "target_companies": [
    {"company_name": "", "website": "", "tier": 1}
  ],
  "role_filters": [
    {"field": "title", "value": ""},
    {"field": "seniority", "value": ""},
    {"field": "domain", "value": ""}
  ],
  "preferences": {
    "locations": [],
    "work_arrangement": [],
    "company_size": [],
    "company_stage": [],
    "industries": [],
    "open_to_relocation": false,
    "excluded_companies": []
  }
}

Rules:
- target_companies: 30-50 companies matching candidate background and seniority. Tier 1 = dream, Tier 2 = strong fit, Tier 3 = backup. Include real websites. Never include companies from experience[].
- role_filters title: generate 10-15 title variants at candidate level and one level above.
- role_filters seniority: seniority signals in job titles.
- role_filters domain: 8-12 industry/market keywords only. NOT technical skills or tools.
- excluded_companies: always populate from experience[]. Never repeat in target_companies.
- Return only the JSON object, nothing else.`;

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anonymous";

  const { allowed, remaining } = await checkRateLimit(ip, "generate-config");
  if (!allowed) {
    return NextResponse.json(
      {
        error:
          "Free limit reached. Add your Anthropic key in Settings to continue.",
        code: "RATE_LIMITED",
      },
      { status: 429 }
    );
  }

  const body = await req.json();
  const profile = body.profile;
  if (!profile) {
    return NextResponse.json({ error: "No profile provided" }, { status: 400 });
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `${GENERATE_CONFIG_PROMPT}\n\nCandidate profile:\n${JSON.stringify(profile, null, 2)}`,
      },
    ],
  });

  const text =
    (message.content[0] as { type: string; text: string }).text?.trim() ?? "";
  const clean = text
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const config = JSON.parse(clean);

  return NextResponse.json({
    config,
    remaining,
  });
}
