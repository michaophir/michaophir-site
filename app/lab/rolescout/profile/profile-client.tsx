"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { trackEvent } from "@/app/lib/analytics";
import {
  getAnthropicKey,
  getCandidateProfile,
  getResumeFilename,
  removeResumeFilename,
  setCandidateProfile,
  setResumeFilename,
} from "../lib/storage";

type UploadTab = "upload" | "linkedin";

const SAMPLE_PROFILE = {
  name: "Alex Rivera",
  email: "alex.rivera@email.com",
  phone: "(555) 012-3456",
  location: "San Francisco, CA",
  title: "Staff Product Manager",
  summary:
    "Staff Product Manager with 12 years of experience building data-intensive B2B and consumer products at scale. Known for shipping AI-native features before they were mainstream, driving cross-functional alignment across engineering and go-to-market teams, and turning complex technical systems into products operators actually use. Comfortable owning 0-to-1 and scaling existing platforms.",
  skills: [
    "AI Product Strategy",
    "LLMs",
    "Agentic Workflows",
    "Prompt Engineering",
    "RAG Systems",
    "Python",
    "SQL",
    "Snowflake",
    "Kafka",
    "Data Pipelines",
    "Event Instrumentation",
    "Third-Party API Integrations",
    "Workflow Automation",
    "Developer-Facing Platforms",
    "B2B SaaS",
    "Enterprise Sales Motion",
    "Product-Led Growth",
    "Roadmap Planning",
    "Cross-Functional Alignment",
    "Stakeholder Management",
    "Vendor Evaluation",
    "Go-to-Market",
    "A/B Testing",
    "Data Enrichment",
    "Martech",
    "Customer Data Platforms",
    "Figma",
    "Agile",
  ],
  experience: [
    {
      company: "Meridian Analytics",
      title: "Staff Product Manager, AI Platform",
      start: "2022",
      end: "Present",
      description:
        "Built an internal RAG-based search product using LangChain, OpenAI embeddings, and Weaviate that replaced a decade-old keyword search system. Drove 3x improvement in query relevance. Rescued a stalled Kafka-Snowflake event pipeline that replaced a legacy ad reporting system. Reduced vendor spend by $400K annually by consolidating the martech and CDP stack. Founded the Technical PM function from scratch and operated as a peer on the engineering leadership team.",
    },
    {
      company: "Streamline",
      title: "Senior Product Manager, Data Infrastructure",
      start: "2019",
      end: "2022",
      description:
        "Owned the data enrichment platform end to end — third-party API integrations, event schema design, and downstream Snowflake pipelines. Shipped a self-serve data explorer that cut analyst support tickets by 60%. Led the migration of 4 legacy pipelines to a real-time Kafka architecture. Grew the platform from 5 internal teams to 40+ across the org.",
    },
    {
      company: "NovaSaaS",
      title: "Product Manager, Growth",
      start: "2016",
      end: "2019",
      description:
        "Owned the onboarding and activation funnel for a B2B SaaS product. Reduced time-to-value from 21 days to 4 days through a series of onboarding experiments. Launched a product-led growth motion that contributed 30% of new ARR within 12 months. Worked closely with sales and CS to build a feedback loop that directly informed the roadmap.",
    },
    {
      company: "FinEdge",
      title: "Associate Product Manager",
      start: "2014",
      end: "2016",
      description:
        "Supported roadmap planning for a financial data analytics product. Defined and launched a transparency feature that shifted users from support tickets to self-service data exploration. Coordinated delivery across 5 departments to hit a regulatory deadline.",
    },
  ],
  education: [
    { institution: "UC Berkeley", degree: "BS Computer Science", year: "2014" },
    {
      institution: "Stanford Graduate School of Business",
      degree: "MBA, Technology and Entrepreneurship",
      year: "2018",
    },
  ],
  target_roles: [
    "Staff Product Manager",
    "Principal Product Manager",
    "Director of Product",
    "Head of Product",
    "Group Product Manager",
  ],
  target_companies: [
    { company_name: "Anthropic", website: "https://anthropic.com", tier: 1 },
    { company_name: "OpenAI", website: "https://openai.com", tier: 1 },
    { company_name: "Databricks", website: "https://databricks.com", tier: 1 },
    { company_name: "Stripe", website: "https://stripe.com", tier: 1 },
    { company_name: "Ramp", website: "https://ramp.com", tier: 1 },
    { company_name: "Harvey", website: "https://harvey.ai", tier: 1 },
    { company_name: "Decagon", website: "https://decagon.ai", tier: 1 },
    { company_name: "Sierra", website: "https://sierra.ai", tier: 1 },
    { company_name: "Cursor", website: "https://cursor.com", tier: 1 },
    { company_name: "Glean", website: "https://glean.com", tier: 1 },
    { company_name: "Perplexity", website: "https://perplexity.ai", tier: 2 },
    { company_name: "Plaid", website: "https://plaid.com", tier: 2 },
    { company_name: "Cohere", website: "https://cohere.com", tier: 2 },
    { company_name: "Linear", website: "https://linear.app", tier: 2 },
    { company_name: "Notion", website: "https://notion.so", tier: 2 },
    { company_name: "Figma", website: "https://figma.com", tier: 2 },
    { company_name: "Vercel", website: "https://vercel.com", tier: 2 },
    { company_name: "Mercury", website: "https://mercury.com", tier: 2 },
    { company_name: "Brex", website: "https://brex.com", tier: 2 },
    { company_name: "Vanta", website: "https://vanta.com", tier: 2 },
    { company_name: "ElevenLabs", website: "https://elevenlabs.io", tier: 2 },
    { company_name: "Scale AI", website: "https://scale.com", tier: 2 },
    { company_name: "Spotify", website: "https://spotify.com", tier: 2 },
    { company_name: "Rippling", website: "https://rippling.com", tier: 2 },
    { company_name: "Deel", website: "https://deel.com", tier: 2 },
    { company_name: "Intercom", website: "https://intercom.com", tier: 2 },
    { company_name: "Amplitude", website: "https://amplitude.com", tier: 2 },
    { company_name: "Mixpanel", website: "https://mixpanel.com", tier: 2 },
    { company_name: "Retool", website: "https://retool.com", tier: 2 },
    { company_name: "Airtable", website: "https://airtable.com", tier: 2 },
    { company_name: "Weights & Biases", website: "https://wandb.ai", tier: 2 },
    { company_name: "Hugging Face", website: "https://huggingface.co", tier: 2 },
    { company_name: "Modal", website: "https://modal.com", tier: 2 },
    { company_name: "Replit", website: "https://replit.com", tier: 2 },
    { company_name: "Klaviyo", website: "https://klaviyo.com", tier: 3 },
    { company_name: "Attentive", website: "https://attentive.com", tier: 3 },
    { company_name: "Justworks", website: "https://justworks.com", tier: 3 },
    { company_name: "BetterUp", website: "https://betterup.com", tier: 3 },
    { company_name: "Hinge Health", website: "https://hingehealth.com", tier: 3 },
    { company_name: "Rokt", website: "https://rokt.com", tier: 3 },
  ],
  role_filters: [
    { field: "title", value: "Chief Product Officer" },
    { field: "title", value: "CPO" },
    { field: "title", value: "Vice President of Product" },
    { field: "title", value: "VP of Product" },
    { field: "title", value: "Senior Director of Product" },
    { field: "title", value: "Director of Product Management" },
    { field: "title", value: "Director of Product" },
    { field: "title", value: "Head of Product" },
    { field: "title", value: "Founding Product" },
    { field: "title", value: "Group Product Manager" },
    { field: "title", value: "Staff Product Manager" },
    { field: "title", value: "Principal Product Manager" },
    { field: "title", value: "Principal Product" },
    { field: "title", value: "Senior Product Manager" },
    { field: "title", value: "Product Lead" },
    { field: "title", value: "Product Manager" },
    { field: "title", value: "Technical Product Manager" },
    { field: "seniority", value: "Principal" },
    { field: "seniority", value: "Director" },
    { field: "seniority", value: "VP" },
    { field: "seniority", value: "Head" },
    { field: "seniority", value: "Staff" },
    { field: "seniority", value: "Senior" },
    { field: "seniority", value: "Founding" },
    { field: "domain", value: "AI" },
    { field: "domain", value: "machine learning" },
    { field: "domain", value: "data" },
    { field: "domain", value: "fintech" },
    { field: "domain", value: "developer tools" },
    { field: "domain", value: "analytics" },
    { field: "domain", value: "infrastructure" },
    { field: "domain", value: "SaaS" },
    { field: "domain", value: "media" },
    { field: "domain", value: "adtech" },
    { field: "skill", value: "LLM" },
    { field: "skill", value: "agentic" },
    { field: "skill", value: "RAG" },
    { field: "skill", value: "SQL" },
    { field: "skill", value: "data pipeline" },
    { field: "skill", value: "API" },
    { field: "skill", value: "platform" },
    { field: "skill", value: "B2B" },
    { field: "skill", value: "enterprise" },
    { field: "skill", value: "growth" },
    { field: "skill", value: "roadmapping" },
    { field: "skill", value: "cross-functional" },
    { field: "skill", value: "workflow automation" },
    { field: "skill", value: "generative AI" },
    { field: "skill", value: "Snowflake" },
    { field: "skill", value: "Kafka" },
    { field: "skill", value: "product-led growth" },
    { field: "skill", value: "0 to 1" },
    { field: "skill", value: "go-to-market" },
  ],
  preferences: {
    locations: ["San Francisco, CA", "New York, NY", "Remote"],
    work_arrangement: ["remote", "hybrid"],
    company_size: ["startup", "mid-size"],
    company_stage: ["Series B", "Series C", "public"],
    industries: ["AI", "fintech", "developer tools", "data", "SaaS"],
    open_to_relocation: false,
    excluded_companies: [],
  },
  story_bank: [],
};

const SAMPLE_PROFILE_JSON = JSON.stringify(SAMPLE_PROFILE, null, 2);

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
- skills: flat array of strings, extract all technical and soft skills mentioned
- experience: one entry per role, most recent first
- target_roles: infer 2-3 likely target job titles based on trajectory
- target_companies: leave as empty array []
- story_bank: leave as empty array []
- summary: 2-3 sentence professional summary in first person
- Return only the JSON object, nothing else`;

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
- target_companies: 30-50 companies that match the candidate's background, seniority, and industry. Tier 1 = dream companies, Tier 2 = strong fit, Tier 3 = good backup. Include real company websites. Do NOT include companies they have already worked at.
- role_filters field types:
  - title: job titles to match (e.g. 'Senior Product Manager', 'Director of Product', 'Head of Product', 'Staff Product Manager', 'Principal Product Manager', 'VP of Product', 'Group Product Manager') Generate at least 10-15 title variants covering the candidate's seniority level and one level above.
  - seniority: one row per seniority signal. Each value must be a single word that appears standalone in job titles. Example: Principal, Senior, Staff, Director, VP, Head, Chief, Lead. Never combine multiple values in one row.
  - domain: short single or two-word keywords that appear verbatim in job descriptions (e.g. 'fintech', 'AI', 'machine learning', 'privacy', 'compliance', 'analytics', 'SaaS'). Max 3 words per value. Never use phrases like 'AI and Machine Learning' — split into separate rows: 'AI' and 'machine learning'.
- skill rows: do NOT include. Skills come from the candidate's skills[] array and are used directly for scoring.
- preferences: infer from the candidate's location, career history, and seniority level. work_arrangement options: remote/hybrid/onsite. company_size options: startup/mid-size/enterprise.
- excluded_companies: always populate with companies the candidate has worked at, based on their experience[]. Never include these in target_companies.
- Return only the JSON object, nothing else.`;

const TEXTAREA_PLACEHOLDER = `{
  "name": "", "email": "", "phone": "", "location": "", "title": "",
  "summary": "", "skills": [], "experience": [], "education": [],
  "target_roles": [], "target_companies": [], "story_bank": []
}`;

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

async function parseResumeWithAnthropic(file: File, apiKey: string): Promise<unknown> {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Unsupported file type. Upload a PDF.");
  }
  const base64data = await fileToBase64(file);
  const model =
    localStorage.getItem("rolescout_model_anthropic") ?? "claude-haiku-4-5-20251001";

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
            {
              type: "text",
              text: EXTRACT_PROMPT,
            },
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
  const parsed = JSON.parse(clean);
  return parsed;
}

async function parseResume(
  file: File,
  apiKey: string | null,
  setParseRemaining: (n: number | null) => void
): Promise<unknown> {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Unsupported file type. Upload a PDF.");
  }

  if (apiKey) {
    const profile = await parseResumeWithAnthropic(file, apiKey);
    setParseRemaining(null);
    return profile;
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
  setParseRemaining(data.remaining ?? null);
  return data.profile;
}

function downloadJson(content: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "candidate_profile.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function IconPaperclip() {
  return (
    <svg
      className="h-4 w-4 text-gray-400 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a4 4 0 10-5.656-5.656l-6.586 6.586a6 6 0 108.486 8.486L20 13"
      />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
      />
    </svg>
  );
}

type StepStatus = "idle" | "running" | "done" | "failed";

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "running") return <span aria-hidden>⏳</span>;
  if (status === "done") return <span aria-hidden>✅</span>;
  if (status === "failed") return <span aria-hidden>❌</span>;
  return <span aria-hidden className="text-gray-400">○</span>;
}

export default function ProfileClient() {
  const [tab, setTab] = useState<UploadTab>("upload");
  const [isDragging, setIsDragging] = useState(false);

  const [profileText, setProfileText] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [saveMessage, setSaveMessage] = useState<"saved" | "invalid" | null>(null);

  const [parseStatus, setParseStatus] = useState<StepStatus>("idle");
  const [configStatus, setConfigStatus] = useState<StepStatus>("idle");
  const [parseStepError, setParseStepError] = useState<string | null>(null);
  const [configStepError, setConfigStepError] = useState<string | null>(null);
  const [parseRemaining, setParseRemaining] = useState<number | null>(null);
  const [configRemaining, setConfigRemaining] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = await getCandidateProfile();
      if (cancelled) return;
      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          setProfileText(JSON.stringify(parsed, null, 2));
        } catch {
          setProfileText(SAMPLE_PROFILE_JSON);
        }
      } else {
        setProfileText(SAMPLE_PROFILE_JSON);
      }
    })();
    setFilename(getResumeFilename());
    return () => {
      cancelled = true;
    };
  }, []);

  async function runConfigGeneration(
    baseProfile: unknown,
    apiKey: string | null
  ): Promise<void> {
    let config: {
      target_companies?: unknown;
      role_filters?: unknown;
      preferences?: unknown;
    };

    if (apiKey) {
      const model =
        localStorage.getItem("rolescout_model_anthropic") ??
        "claude-haiku-4-5-20251001";

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
              content: `${GENERATE_CONFIG_PROMPT}\n\nCandidate profile:\n${JSON.stringify(baseProfile, null, 2)}`,
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
          /* fall through */
        }
        throw new Error(msg);
      }

      const data = await response.json();
      const text: string = data?.content?.[0]?.text?.trim() ?? "";
      if (!text) throw new Error("Empty response from model.");
      const clean = text
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      config = JSON.parse(clean);
      setConfigRemaining(null);
    } else {
      const response = await fetch("/api/generate-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: baseProfile }),
      });

      if (response.status === 429) {
        const data = await response.json();
        throw new Error(data.error);
      }

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      setConfigRemaining(data.remaining ?? null);
      config = data.config;
    }

    const updatedProfile = {
      ...(baseProfile as Record<string, unknown>),
      target_companies: config.target_companies ?? [],
      role_filters: config.role_filters ?? [],
      preferences: config.preferences ?? {},
    };

    const pretty = JSON.stringify(updatedProfile, null, 2);
    setProfileText(pretty);
    await setCandidateProfile(JSON.stringify(updatedProfile));
  }

  async function handleFile(file: File) {
    setParseStatus("running");
    setConfigStatus("idle");
    setParseStepError(null);
    setConfigStepError(null);

    const apiKey = getAnthropicKey() || null;

    setResumeFilename(file.name);
    setFilename(file.name);

    let parsed: unknown;
    try {
      parsed = await parseResume(file, apiKey, setParseRemaining);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setParseStepError(message);
      setParseStatus("failed");
      void trackEvent("resume_parse_failed", {
        error_type: message.slice(0, 100),
      });
      return;
    }

    setParseStatus("done");
    const pretty = JSON.stringify(parsed, null, 2);
    setProfileText(pretty);
    await setCandidateProfile(JSON.stringify(parsed));

    setConfigStatus("running");
    try {
      await runConfigGeneration(parsed, apiKey);
      setConfigStatus("done");
      await emitResumeUploaded();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setConfigStepError(message);
      setConfigStatus("failed");
      void trackEvent("config_generation_failed", {
        error_type: message.slice(0, 100),
      });
    }
  }

  async function emitResumeUploaded() {
    try {
      const json = await getCandidateProfile();
      const parsed = json ? (JSON.parse(json) as Record<string, unknown>) : {};
      const skills = Array.isArray(parsed.skills) ? parsed.skills.length : 0;
      const companies = Array.isArray(parsed.target_companies)
        ? (parsed.target_companies as unknown[]).length
        : 0;
      void trackEvent("resume_uploaded", {
        skills_extracted: skills,
        target_companies: companies,
      });
    } catch {
      void trackEvent("resume_uploaded", {
        skills_extracted: 0,
        target_companies: 0,
      });
    }
  }

  async function retryConfigOnly() {
    setConfigStatus("running");
    setConfigStepError(null);

    const apiKey = getAnthropicKey() || null;

    let baseProfile: unknown;
    try {
      baseProfile = JSON.parse(profileText);
    } catch {
      setConfigStepError(
        "Cannot retry — profile JSON is invalid. Save first."
      );
      setConfigStatus("failed");
      return;
    }

    try {
      await runConfigGeneration(baseProfile, apiKey);
      setConfigStatus("done");
      await emitResumeUploaded();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setConfigStepError(message);
      setConfigStatus("failed");
      void trackEvent("config_generation_failed", {
        error_type: message.slice(0, 100),
      });
    }
  }

  function onBrowseClick() {
    fileInputRef.current?.click();
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave() {
    setIsDragging(false);
  }

  function handleRemoveFile() {
    removeResumeFilename();
    setFilename("");
    setParseStatus("idle");
    setConfigStatus("idle");
    setParseStepError(null);
    setConfigStepError(null);
  }

  async function handleSave() {
    try {
      const parsed = JSON.parse(profileText);
      const pretty = JSON.stringify(parsed, null, 2);
      setProfileText(pretty);
      await setCandidateProfile(JSON.stringify(parsed));
      setSaveMessage("saved");
      window.setTimeout(() => setSaveMessage(null), 2500);
    } catch {
      setSaveMessage("invalid");
      window.setTimeout(() => setSaveMessage(null), 2500);
    }
  }

  function handleDownload() {
    if (!profileText.trim()) return;
    downloadJson(profileText);
  }

  function handleClear() {
    setProfileText("");
    setSaveMessage(null);
  }

  const dropZoneClass = useMemo(() => {
    const base =
      "mt-4 rounded-xl border-2 border-dashed p-8 text-center transition";
    const border = isDragging
      ? "border-slate-400 bg-gray-50"
      : "border-gray-200 hover:border-gray-300";
    return `${base} ${border}`;
  }, [isDragging]);

  const downloadDisabled = profileText.trim() === "";
  const hasFile = filename !== "";

  return (
    <div className="max-w-3xl">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab("upload")}
            className={
              tab === "upload"
                ? "rounded-full bg-slate-900 text-white px-4 py-1.5 text-sm font-medium"
                : "rounded-full text-gray-500 px-4 py-1.5 text-sm font-medium hover:text-slate-900"
            }
          >
            Upload Resume
          </button>
          <button
            type="button"
            disabled
            title="Coming soon"
            className="hidden rounded-full text-gray-400 px-4 py-1.5 text-sm font-medium cursor-not-allowed"
          >
            Paste LinkedIn URL
          </button>
        </div>

        {hasFile ? (
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center min-w-0">
                <IconPaperclip />
                <span className="text-sm text-slate-900 ml-2 truncate">{filename}</span>
              </div>
              <div className="flex items-center shrink-0">
                <button
                  type="button"
                  onClick={onBrowseClick}
                  className="rounded border border-gray-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-gray-100 transition"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  aria-label="Remove file"
                  className="ml-2 text-red-400 hover:text-red-600 transition"
                >
                  <IconTrash />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={dropZoneClass}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
          >
            <p className="text-sm text-gray-500">Drag &amp; drop your Resume here</p>
            <p className="text-xs text-gray-400 my-2">or</p>
            <button
              type="button"
              onClick={onBrowseClick}
              className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-gray-50 transition"
            >
              Browse files
            </button>
            <p className="text-xs text-gray-400 mt-3">PDF only · up to 10 MB</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={onFileInputChange}
          className="hidden"
        />

        {(parseStatus !== "idle" || configStatus !== "idle") && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <StepIcon status={parseStatus} />
              <span className={parseStatus === "failed" ? "text-red-600" : ""}>
                {parseStatus === "running" && "Parsing resume..."}
                {parseStatus === "done" && "Resume parsed"}
                {parseStatus === "failed" &&
                  (parseStepError
                    ? `Resume parsing failed — ${parseStepError}`
                    : "Resume parsing failed — please try again")}
                {parseStatus === "idle" && "Parsing resume..."}
              </span>
            </div>

            <div
              className={`flex items-center gap-3 text-sm ${
                parseStatus === "failed" ? "opacity-40" : ""
              }`}
            >
              <StepIcon
                status={parseStatus === "failed" ? "idle" : configStatus}
              />
              <span className={configStatus === "failed" ? "text-red-600" : ""}>
                {configStatus === "running" &&
                  "Generating target companies & role filters..."}
                {configStatus === "done" &&
                  "Target companies & role filters generated"}
                {configStatus === "failed" &&
                  "Config generation failed — your profile is saved, retry below"}
                {configStatus === "idle" &&
                  "Generating target companies & role filters..."}
              </span>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <StepIcon
                status={
                  parseStatus === "done" && configStatus === "done"
                    ? "done"
                    : "idle"
                }
              />
              <span>
                {parseStatus === "done" && configStatus === "done"
                  ? "Done — review your profile below"
                  : "Done"}
              </span>
            </div>

            {configStatus === "failed" && configStepError && (
              <p className="text-xs text-gray-400 pl-7">{configStepError}</p>
            )}

            {configStatus === "failed" && (
              <button
                type="button"
                onClick={retryConfigOnly}
                className="mt-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-gray-50 transition"
              >
                Retry config generation
              </button>
            )}
          </div>
        )}

        {(parseRemaining !== null || configRemaining !== null) && (
          <p
            className={`text-xs mt-2 ${
              parseRemaining === 0 || configRemaining === 0
                ? "text-amber-600"
                : "text-gray-400"
            }`}
          >
            {parseRemaining === 0 || configRemaining === 0
              ? "Free limit reached — add your Anthropic key in Settings for unlimited runs."
              : `${parseRemaining ?? "—"} free parse${
                  parseRemaining === 1 ? "" : "s"
                } remaining · ${configRemaining ?? "—"} free config${
                  configRemaining === 1 ? "" : "s"
                } remaining today.`}
          </p>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-3 mb-6">
        Skills are inferred by AI from what you provide - editable in Candidate Profile.
      </p>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-900">Candidate Profile</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-full bg-slate-900 text-white px-4 py-1.5 text-sm font-medium hover:bg-slate-700 transition"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloadDisabled}
              className={
                downloadDisabled
                  ? "rounded-full border border-gray-200 text-gray-300 px-4 py-1.5 text-sm font-medium cursor-not-allowed"
                  : "rounded-full border border-gray-200 text-slate-700 px-4 py-1.5 text-sm font-medium hover:bg-gray-50 transition"
              }
            >
              Download JSON
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full border border-gray-200 text-gray-500 px-4 py-1.5 text-sm font-medium hover:bg-gray-50 transition"
            >
              Clear
            </button>
          </div>
        </div>
        <textarea
          value={profileText}
          onChange={(e) => setProfileText(e.target.value)}
          spellCheck={false}
          placeholder={TEXTAREA_PLACEHOLDER}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-xs text-slate-900 focus:border-slate-400 focus:outline-none resize-none min-h-[480px]"
        />
        {saveMessage === "saved" && (
          <p className="text-xs text-green-600 mt-2">Profile saved.</p>
        )}
        {saveMessage === "invalid" && (
          <p className="text-xs text-red-500 mt-2">Invalid JSON — check formatting.</p>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 mt-4">
        <h3 className="text-lg font-semibold text-slate-900">Scout Config Prompt</h3>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          This prompt controls how your target companies and role filters are
          generated from your profile.
        </p>
        <textarea
          readOnly
          defaultValue={GENERATE_CONFIG_PROMPT}
          className="w-full h-64 font-mono text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-xl p-4 resize-none"
        />
        <p className="text-xs text-gray-400 mt-2">
          Prompt editing and custom config generation coming soon
        </p>
      </div>
    </div>
  );
}
