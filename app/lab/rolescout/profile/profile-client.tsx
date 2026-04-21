"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  title: "Senior Product Manager",
  summary:
    "Senior Product Manager with 8 years of experience building consumer and B2B SaaS products. Track record of launching 0-to-1 products and scaling them to millions of users. Strong technical background with experience working closely with engineering and data teams.",
  skills: [
    "Product Strategy",
    "Roadmap Planning",
    "A/B Testing",
    "SQL",
    "Data Analysis",
    "User Research",
    "Agile",
    "Figma",
    "Go-to-Market",
    "Stakeholder Management",
  ],
  experience: [
    {
      company: "Acme Corp",
      title: "Senior Product Manager",
      start: "2021",
      end: "Present",
      description:
        "Led a team of 3 PMs building the core analytics platform. Grew DAU 40% through a personalization initiative.",
    },
    {
      company: "Startup Inc",
      title: "Product Manager",
      start: "2018",
      end: "2021",
      description:
        "Owned the onboarding flow end to end. Reduced time-to-value from 14 days to 3 days.",
    },
  ],
  education: [
    { institution: "UC Berkeley", degree: "BS Computer Science", year: "2016" },
  ],
  target_roles: ["Director of Product", "VP of Product", "Head of Product"],
  target_companies: [],
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

function SpinnerSm() {
  return (
    <svg className="h-3 w-3 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export default function ProfileClient() {
  const [isParsing, setIsParsing] = useState(false);
  const [tab, setTab] = useState<UploadTab>("upload");
  const [missingKey, setMissingKey] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [profileText, setProfileText] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [saveMessage, setSaveMessage] = useState<"saved" | "invalid" | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const existing = getCandidateProfile();
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
    setFilename(getResumeFilename());
  }, []);

  async function handleFile(file: File) {
    setUploadError(null);
    setMissingKey(false);

    const apiKey = getAnthropicKey();
    if (!apiKey) {
      setMissingKey(true);
      return;
    }

    setResumeFilename(file.name);
    setFilename(file.name);

    setIsParsing(true);
    try {
      const parsed = await parseResumeWithAnthropic(file, apiKey);
      const pretty = JSON.stringify(parsed, null, 2);
      setProfileText(pretty);
      setCandidateProfile(JSON.stringify(parsed));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setUploadError(message);
    } finally {
      setIsParsing(false);
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
    setUploadError(null);
    setMissingKey(false);
  }

  function handleSave() {
    try {
      const parsed = JSON.parse(profileText);
      const pretty = JSON.stringify(parsed, null, 2);
      setProfileText(pretty);
      setCandidateProfile(JSON.stringify(parsed));
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
            className="rounded-full text-gray-400 px-4 py-1.5 text-sm font-medium cursor-not-allowed"
          >
            Paste LinkedIn URL
          </button>
        </div>

        {isParsing ? (
          <div className="mt-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
            <div className="flex items-center justify-center gap-2">
              <SpinnerSm />
              <p className="text-base font-semibold text-slate-900">
                Parsing your Resume...
              </p>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              This takes about 10–15 seconds.
            </p>
          </div>
        ) : hasFile ? (
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

        {missingKey && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 mt-4">
            No API key found. Add your Anthropic key in Settings to enable AI parsing.{" "}
            <a href="/lab/rolescout/settings" className="font-medium underline">
              Go to Settings →
            </a>
          </div>
        )}

        {uploadError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 mt-4">
            Parsing failed: {uploadError}. Check your API key in Settings and try again.
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-3 mb-6">
        Skills are inferred by AI from what you provide — always editable.
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
    </div>
  );
}
