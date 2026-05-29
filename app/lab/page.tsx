import type { Metadata } from "next";
import Navbar from "@/components/navbar";

export const metadata: Metadata = {
  title: "The Lab — Micha Ophir",
  description:
    "Projects in AI-native products, tools, and workflows. Built in public.",
};

type Project = {
  title: string;
  description: string;
  status: "Active" | "Planned";
  href: string | null;
};

const ACTIVE: Project[] = [
  {
    title: "beachouse.ai",
    description:
      "Your home, in full view — quietly keeping an eye on your second home, whether you're there or not. Visibility into every visit, bill, and detail.",
    status: "Active",
    href: "https://beachouse.ai",
  },
  {
    title: "RoleScout",
    description:
      "AI-powered job hunt OS — target companies, track applications, find signal in the noise.",
    status: "Active",
    href: "https://www.getrolescout.com/",
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

function StatusBadge({ status }: { status: Project["status"] }) {
  const classes =
    status === "Active"
      ? "bg-green-50 text-green-700"
      : "bg-gray-100 text-gray-500";
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}
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
      className={`group h-full rounded-xl border border-gray-200 bg-white p-6 transition ${
        muted
          ? "opacity-60"
          : "hover:border-gray-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold text-slate-900">
          {project.title}
        </h3>
        <StatusBadge status={project.status} />
      </div>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
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

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      )}
    </div>
  );
}

export default function LabPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-16">
        {/* Header */}
        <header className="mb-14">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-gray-400">
            The Lab
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Projects, built in public.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600">
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
