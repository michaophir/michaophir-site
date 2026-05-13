export const EXTRACT_PROMPT = `Extract the candidate profile from this resume and return ONLY a valid JSON object matching this exact schema. No preamble, no markdown, no explanation — only the JSON:

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
- skills: flat array of strings, extract all technical and soft skills mentioned
- experience: one entry per role, most recent first
- target_roles: infer 2-3 likely target job titles based on trajectory
- target_companies: leave as empty array []
- story_bank: leave as empty array []
- summary: 2-3 sentence professional summary in first person
- Return only the JSON object, nothing else`;

export const GENERATE_CONFIG_PROMPT = `You are a job search assistant. Given this candidate profile, generate target companies and role filters for a job search.

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
- target_companies: 30-50 companies that match the candidate's background, seniority, and industry. Tier 1 = dream companies, Tier 2 = strong fit, Tier 3 = good backup. Include real company websites. Do NOT include companies they have already worked at.
- role_filters field types:
  - title: Title filters MUST be generic, standalone role names that match how companies actually post jobs. They contain ONLY the role + seniority. They NEVER include domain qualifiers like AI, ML, Platform, Growth, Infrastructure, etc.

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
  - seniority: one row per seniority signal. Each value must be a single word that appears standalone in job titles. Example: Principal, Senior, Staff, Director, VP, Head, Chief, Lead. Never combine multiple values in one row.
  - domain: short single or two-word keywords that appear verbatim in job descriptions (e.g. 'fintech', 'AI', 'machine learning', 'privacy', 'compliance', 'analytics', 'SaaS'). Max 3 words per value. Never use phrases like 'AI and Machine Learning' — split into separate rows: 'AI' and 'machine learning'.
- skill rows: do NOT include. Skills come from the candidate's skills[] array and are used directly for scoring.
- preferences: infer from the candidate's location, career history, and seniority level. work_arrangement options: remote/hybrid/onsite. company_size options: startup/mid-size/enterprise.
- excluded_companies: always populate with companies the candidate has worked at, based on their experience[]. Never include these in target_companies.
- Return only the JSON object, nothing else.`;

export type GeneratedConfig = {
  target_companies?: unknown;
  role_filters?: unknown;
  preferences?: unknown;
};

export type ParseResumeResult = {
  profile: unknown;
  remaining: number | null;
};

export type GenerateConfigResult = {
  config: GeneratedConfig;
  remaining: number | null;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("File read error"));
    reader.readAsDataURL(file);
  });
}

function resolveAnthropicModel(): string {
  if (typeof window === "undefined") return "claude-haiku-4-5-20251001";
  return (
    window.localStorage.getItem("rolescout_model_anthropic") ??
    "claude-haiku-4-5-20251001"
  );
}

async function parseResumeWithAnthropic(file: File, apiKey: string): Promise<unknown> {
  const base64data = await fileToBase64(file);
  const model = resolveAnthropicModel();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "pdfs-2024-09-25",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
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
                data: base64data,
              },
            },
            { type: "text", text: EXTRACT_PROMPT },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    let msg = `HTTP ${response.status}`;
    try {
      const errJson = JSON.parse(errText);
      msg = errJson?.error?.message ?? msg;
    } catch {
      // fall through
    }
    throw new Error(msg);
  }

  const data = await response.json();
  const text: string = data?.content?.[0]?.text?.trim() ?? "";
  if (!text) throw new Error("Empty response from model.");
  const clean = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(clean);
}

export async function parseResume(
  file: File,
  apiKey: string | null
): Promise<ParseResumeResult> {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Unsupported file type. Upload a PDF.");
  }

  if (apiKey) {
    const profile = await parseResumeWithAnthropic(file, apiKey);
    return { profile, remaining: null };
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/parse-resume", {
    method: "POST",
    body: formData,
  });

  if (response.status === 429) {
    const data = await response.json();
    throw new Error(data.error);
  }

  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }

  const data = await response.json();
  return { profile: data.profile, remaining: data.remaining ?? null };
}

export async function generateConfig(
  profile: unknown,
  apiKey: string | null
): Promise<GenerateConfigResult> {
  if (apiKey) {
    const model = resolveAnthropicModel();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: `${GENERATE_CONFIG_PROMPT}\n\nCandidate profile:\n${JSON.stringify(profile, null, 2)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let msg = `HTTP ${response.status}`;
      try {
        const errJson = JSON.parse(errText);
        msg = errJson?.error?.message ?? msg;
      } catch {
        // fall through
      }
      throw new Error(msg);
    }

    const data = await response.json();
    const text: string = data?.content?.[0]?.text?.trim() ?? "";
    if (!text) throw new Error("Empty response from model.");
    const clean = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    return { config: JSON.parse(clean) as GeneratedConfig, remaining: null };
  }

  const response = await fetch("/api/generate-config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  });

  if (response.status === 429) {
    const data = await response.json();
    throw new Error(data.error);
  }

  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }

  const data = await response.json();
  return {
    config: data.config as GeneratedConfig,
    remaining: data.remaining ?? null,
  };
}

export function mergeProfileWithConfig(
  baseProfile: unknown,
  config: GeneratedConfig
): Record<string, unknown> {
  return {
    ...(baseProfile as Record<string, unknown>),
    target_companies: config.target_companies ?? [],
    role_filters: config.role_filters ?? [],
    preferences: config.preferences ?? {},
  };
}
