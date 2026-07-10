import type { Metadata } from "next";
import Navbar from "@/components/navbar";

export const metadata: Metadata = {
  title: "The Lab — Micha Ophir",
  description:
    "Projects in AI-native products, tools, and workflows. Built in public.",
};

type Accent = "aspen" | "lake" | "sky";

type Project = {
  title: string;
  description: string;
  status: "Active" | "Planned";
  href: string | null;
  favicon?: string;
  accent?: Accent;
};

const ACTIVE: Project[] = [
  {
    title: "beachouse.ai",
    description:
      "Your home, in full view — quietly keeping an eye on your second home, whether you're there or not. Visibility into every visit, bill, and detail.",
    status: "Active",
    href: "https://beachouse.ai",
    favicon: "https://icons.duckduckgo.com/ip3/beachouse.ai.ico",
    accent: "aspen",
  },
  {
    title: "artcubbies.com",
    description:
      "Keep what they make — a private digital archive for your kid's artwork. Photograph, organize, and preserve creations without the paper pile on the counter.",
    status: "Active",
    href: "https://www.artcubbies.com/",
    favicon: "https://icons.duckduckgo.com/ip3/artcubbies.com.ico",
    accent: "lake",
  },
  {
    title: "RoleScout",
    description:
      "AI-powered job hunt OS — target companies, track applications, find signal in the noise.",
    status: "Active",
    href: "https://www.getrolescout.com/",
    favicon: "https://icons.duckduckgo.com/ip3/getrolescout.com.ico",
    accent: "sky",
  },
];

const PLANNED: Project[] = [
  {
    title: "AI-Run Company",
    description: "A company run by AI agents, built in public.",
    status: "Planned",
    href: null,
  },
  {
    title: "Agentic Hedge Fund",
    description:
      "Autonomous trading agents researching theses and managing positions, built in public.",
    status: "Planned",
    href: null,
  },
];

const accentBar: Record<Accent, string> = {
  aspen: "bg-aspen",
  lake: "bg-lake",
  sky: "bg-sky",
};

function StatusBadge({ status }: { status: Project["status"] }) {
  const classes =
    status === "Active"
      ? "bg-[#EDF3DD] text-[#4E7D0E]"
      : "bg-paper-soft text-ink-soft";
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${classes}`}
    >
      {status}
    </span>
  );
}

function ProjectCard({
  project,
  muted,
}: {
  project: Project;
  muted?: boolean;
}) {
  const card = (
    <div
      className={`group relative h-full overflow-hidden rounded-2xl border border-border-soft bg-white p-6 transition ${
        muted ? "opacity-60" : "hover:border-border hover:shadow-sm"
      }`}
    >
      {project.accent && (
        <div
          aria-hidden
          className={`absolute inset-x-0 top-0 h-[2px] ${accentBar[project.accent]}`}
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {project.favicon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.favicon}
              alt=""
              className="h-5 w-5 shrink-0 rounded"
            />
          )}
          <h3 className="font-display text-lg font-semibold text-ink">
            {project.title}
          </h3>
        </div>
        <StatusBadge status={project.status} />
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        {project.description}
      </p>
    </div>
  );

  if (project.href) {
    return (
      <a href={project.href} className="block">
        {card}
      </a>
    );
  }
  return <div>{card}</div>;
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h2 className="mb-4 font-mono text-xs font-bold uppercase tracking-eyebrow text-aspen-hover">
      {title}
    </h2>
  );
}

export default function LabPage() {
  return (
    <div className="relative min-h-screen text-ink">
      {/* Aspen radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px]"
        style={{
          background:
            "radial-gradient(90% 320px at 8% 0%, rgba(138,91,214,0.10) 0%, rgba(212,91,122,0.06) 38%, rgba(247,244,238,0) 72%)",
        }}
      />
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-16">
        {/* Header */}
        <header className="mb-14">
          <p className="mb-3 font-mono text-xs font-bold uppercase tracking-eyebrow text-aspen-hover">
            The Lab
          </p>
          <h1 className="font-display text-4xl font-bold leading-[0.95] tracking-[-0.035em] text-ink sm:text-5xl">
            Projects, built in public.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">
            Projects in AI-native products, tools, and workflows. Built in
            public.
          </p>
        </header>

        {/* Active */}
        <section className="mb-12">
          <SectionHeading title="Active Projects" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {ACTIVE.map((p) => (
              <ProjectCard key={p.title} project={p} />
            ))}
          </div>
        </section>

        {/* Planned */}
        <section>
          <SectionHeading title="Planned Projects" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {PLANNED.map((p) => (
              <ProjectCard key={p.title} project={p} muted />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
