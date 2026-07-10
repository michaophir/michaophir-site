type Project = {
  title: string;
  description: string;
  status: "Active" | "In Progress";
  href: string | null;
  github: string | null;
  favicon: string | null;
  accent: "aspen" | "lake" | "sky";
};

const projects: Project[] = [
  {
    title: "beachouse.ai",
    description:
      "Your home, in full view — quietly keeping an eye on your second home, whether you're there or not. Visibility into every visit, bill, and detail.",
    status: "Active",
    href: "https://beachouse.ai",
    github: null,
    favicon: "https://icons.duckduckgo.com/ip3/beachouse.ai.ico",
    accent: "aspen",
  },
  {
    title: "artcubbies.com",
    description:
      "Keep what they make — a private digital archive for your kid's artwork. Photograph, organize, and preserve creations without the paper pile on the counter.",
    status: "Active",
    href: "https://www.artcubbies.com/",
    github: null,
    favicon: "https://icons.duckduckgo.com/ip3/artcubbies.com.ico",
    accent: "lake",
  },
  {
    title: "RoleScout",
    description:
      "AI-powered job hunt OS — target companies, track applications, find signal in the noise.",
    status: "Active",
    href: "https://www.getrolescout.com/",
    github: null,
    favicon: "https://icons.duckduckgo.com/ip3/getrolescout.com.ico",
    accent: "sky",
  },
];

const accentBar: Record<Project["accent"], string> = {
  aspen: "bg-aspen",
  lake: "bg-lake",
  sky: "bg-sky",
};

export default function Lab() {
  return (
    <section id="lab" className="flex flex-col justify-center">
      <p className="mb-3 font-mono text-xs font-bold uppercase tracking-eyebrow text-aspen-hover">
        The Lab
      </p>
      <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Active Projects
      </h2>
      <div className="mt-8 flex flex-col gap-4">
        {projects.map((project) => {
          const Card = (
            <div className="group relative h-full overflow-hidden rounded-2xl border border-border-soft bg-white p-6 transition hover:border-border hover:shadow-sm">
              <div
                aria-hidden
                className={`absolute inset-x-0 top-0 h-[2px] ${accentBar[project.accent]}`}
              />
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
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    project.status === "Active"
                      ? "bg-[#EDF3DD] text-[#4E7D0E]"
                      : "bg-aspen-28 text-[#9C6B05]"
                  }`}
                >
                  {project.status}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {project.description}
              </p>
              {project.github && (
                <span className="mt-3 inline-block text-sm font-medium text-ink-soft underline decoration-border underline-offset-4 transition group-hover:text-ink group-hover:decoration-ink">
                  View project &rarr;
                </span>
              )}
            </div>
          );

          return project.href ? (
            <a key={project.title} href={project.href} className="block">
              {Card}
            </a>
          ) : (
            <div key={project.title}>{Card}</div>
          );
        })}
      </div>
    </section>
  );
}
