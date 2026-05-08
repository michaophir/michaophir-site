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
- role_filters title: Title filters MUST be generic, standalone role names that match how companies actually post jobs. They contain ONLY the role + seniority. They NEVER include domain qualifiers like AI, ML, Platform, Growth, Infrastructure, etc.

GOOD examples by role type:

Product roles: 'Product Manager', 'Senior Product Manager', 'Staff Product Manager', 'Principal Product Manager', 'Group Product Manager', 'Director of Product', 'Head of Product', 'VP of Product', 'Founding Product Manager', 'Technical Product Manager'

Engineering roles: 'Software Engineer', 'Senior Software Engineer', 'Staff Software Engineer', 'Principal Engineer', 'Engineering Manager', 'Director of Engineering', 'VP of Engineering', 'Founding Engineer', 'Senior Backend Engineer', 'Senior Frontend Engineer', 'Senior Full Stack Engineer'

Design roles: 'Product Designer', 'Senior Product Designer', 'Staff Designer', 'Principal Designer', 'Design Lead', 'Director of Design', 'Head of Design', 'VP of Design', 'UX Designer'

Data / ML roles: 'Data Scientist', 'Senior Data Scientist', 'Staff Data Scientist', 'Machine Learning Engineer', 'Senior ML Engineer', 'Research Scientist', 'Applied Scientist', 'Data Engineer'

Operations / GTM roles: 'Product Marketing Manager', 'Sales Engineer', 'Solutions Architect', 'Customer Success Manager', 'Account Executive', 'Chief of Staff'

BAD examples (NEVER produce these):
- 'Senior Product Manager, AI Platform'
- 'Staff Software Engineer, ML Infrastructure'
- 'Principal Designer, Generative AI'
- 'Senior Data Scientist, Recommendations'
- 'Head of Product, AI'
- 'VP Engineering, Platform'

Rule: If you find yourself writing a comma in a title filter, stop. The text after the comma belongs in domain filters.

ALWAYS INCLUDE THE BASE ROLE NAME (without seniority prefix) for the candidate's primary role family:
- Product: 'Product Manager'
- Engineering: 'Software Engineer', 'Backend Engineer', 'Frontend Engineer', or 'Full Stack Engineer' (whichever matches the candidate)
- Design: 'Product Designer' or 'Designer'
- Data / ML: 'Data Scientist', 'Data Engineer', or 'Machine Learning Engineer' (whichever matches)
- Sales: 'Account Executive', 'Sales Engineer'
- Customer Success: 'Customer Success Manager'
- Marketing: 'Product Marketing Manager'
- Operations: 'Operations Manager', 'Chief of Staff'
- Research: 'Research Scientist', 'Applied Scientist'

Many companies, especially startups and AI-native companies, post roles without seniority prefixes (e.g. 'Product Manager at OpenAI', 'Software Engineer at Anthropic'). The seniority filter handles level matching separately, so the base role name is required regardless of the candidate's seniority.

If the candidate fits multiple role families, include base names for each.

The candidate's domain expertise (AI, ML, RAG, agentic, growth, infrastructure, fintech, etc.) goes into the domain filters separately. The combination of matching title + matching domain in description is what produces a high-scoring role.

Generate 10-15 title filter variations covering the candidate's target seniority range and role family. Use the role family that matches the candidate's experience (Product, Engineering, Design, Data/ML, GTM, etc.).
- role_filters seniority: one row per seniority signal. Each value must be a single word that appears standalone in job titles. Example: Principal, Senior, Staff, Director, VP, Head, Chief, Lead. Never combine multiple values in one row.
- role_filters domain: short single or two-word keywords that appear verbatim in job descriptions (e.g. 'fintech', 'AI', 'machine learning', 'privacy', 'compliance', 'analytics', 'SaaS'). Max 3 words per value. Never use phrases like 'AI and Machine Learning' — split into separate rows: 'AI' and 'machine learning'.
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
