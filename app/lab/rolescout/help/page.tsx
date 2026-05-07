import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

export const metadata: Metadata = {
  title: "RoleScout — Help",
  description: "Everything you need to get the most out of RoleScout.",
};

type HelpSection = {
  slug: string;
  title: string;
  order: number;
  html: string;
};

function parseFrontmatter(raw: string): {
  title: string;
  order: number;
  body: string;
} {
  if (!raw.startsWith("---")) {
    return { title: "", order: 999, body: raw };
  }
  const end = raw.indexOf("\n---", 3);
  if (end === -1) {
    return { title: "", order: 999, body: raw };
  }
  const fm = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\r?\n/, "");
  let title = "";
  let order = 999;
  for (const line of fm.split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    const value = m[2].trim().replace(/^"(.*)"$/, "$1");
    if (key === "title") title = value;
    else if (key === "order") {
      const n = Number(value);
      if (!Number.isNaN(n)) order = n;
    }
  }
  return { title, order, body };
}

function loadHelpSections(): HelpSection[] {
  const dir = path.join(process.cwd(), "docs", "help");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"));
  const sections: HelpSection[] = files.map((file) => {
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    const { title, order, body } = parseFrontmatter(raw);
    const html = marked.parse(body, { async: false }) as string;
    return {
      slug: file.replace(/\.md$/, ""),
      title,
      order,
      html,
    };
  });
  sections.sort((a, b) => a.order - b.order);
  return sections;
}

const PROSE_CLASSES = [
  "text-sm text-slate-700 leading-relaxed",
  "[&>p]:mb-4 [&>p:last-child]:mb-0",
  "[&>h2]:text-lg [&>h2]:font-semibold [&>h2]:text-slate-900 [&>h2]:mt-6 [&>h2]:mb-2 [&>h2:first-child]:mt-0",
  "[&>h3]:text-base [&>h3]:font-semibold [&>h3]:text-slate-900 [&>h3]:mt-5 [&>h3]:mb-2",
  "[&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>ul]:space-y-1",
  "[&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-4 [&>ol]:space-y-1",
  "[&_li]:text-sm",
  "[&_strong]:font-semibold [&_strong]:text-slate-900",
  "[&_a]:text-blue-600 [&_a]:underline hover:[&_a]:text-blue-700",
  "[&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12px] [&_code]:text-slate-800",
].join(" ");

export default function HelpPage() {
  const sections = loadHelpSections();

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Help
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Everything you need to get the most out of RoleScout
        </p>
      </div>
      <div className="space-y-6">
        {sections.map((section) => (
          <article
            key={section.slug}
            className="rounded-xl border border-gray-200 bg-white p-6"
          >
            <h3 className="mb-4 text-xl font-semibold tracking-tight text-slate-900">
              {section.title}
            </h3>
            <div
              className={PROSE_CLASSES}
              dangerouslySetInnerHTML={{ __html: section.html }}
            />
          </article>
        ))}
      </div>
    </div>
  );
}
