import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { checkRateLimit } from "@/app/lib/ratelimit";

const EXTRACT_PROMPT = `Extract the candidate profile from this resume and return ONLY a valid JSON object matching this exact schema. No preamble, no markdown, no explanation — only the JSON:

{
  "name": "",
  "email": "",
  "phone": "",
  "location": "",
  "title": "",
  "summary": "",
  "skills": [],
  "experience": [{"company": "", "title": "", "start": "", "end": "", "description": ""}],
  "education": [{"institution": "", "degree": "", "year": ""}],
  "target_roles": [],
  "target_companies": [],
  "story_bank": []
}

Rules:
- skills: flat array of strings, extract all technical and soft skills
- experience: one entry per role, most recent first
- target_roles: infer 2-3 likely target job titles based on trajectory
- target_companies: leave as empty array []
- story_bank: leave as empty array []
- summary: 2-3 sentence professional summary in first person
- Return only the JSON object, nothing else`;

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anonymous";

  const { allowed, remaining } = await checkRateLimit(ip, "parse-resume");
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

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  const model = "claude-haiku-4-5-20251001";

  const message = await client.messages.create({
    model,
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          {
            type: "text",
            text: EXTRACT_PROMPT,
          },
        ],
      },
    ],
  });

  const text =
    (message.content[0] as { type: string; text: string }).text?.trim() ?? "";
  const clean = text
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const parsed = JSON.parse(clean);

  return NextResponse.json({
    profile: parsed,
    remaining,
  });
}
