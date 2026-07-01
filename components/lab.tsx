type Project = {
  title: string;
  description: string;
  status: "Active" | "In Progress";
  href: string | null;
  github: string | null;
  favicon: string | null;
};

const projects: Project[] = [
  {
    title: "beachouse.ai",
    description:
      "Your home, in full view — quietly keeping an eye on your second home, whether you're there or not. Visibility into every visit, bill, and detail.",
    status: "Active",
    href: "https://beachouse.ai",
    github: null,
    favicon: "https://www.google.com/s2/favicons?domain=beachouse.ai&sz=64",
  },
  {
    title: "artcubbies.com",
    description:
      "Keep what they make — a private digital archive for your kid's artwork. Photograph, organize, and preserve creations without the paper pile on the counter.",
    status: "Active",
    href: "https://www.artcubbies.com/",
    github: null,
    favicon: "https://www.google.com/s2/favicons?domain=artcubbies.com&sz=64",
  },
  {
    title: "RoleScout",
    description:
      "AI-powered job hunt OS — target companies, track applications, find signal in the noise.",
    status: "Active",
    href: "https://www.getrolescout.com/",
    github: null,
    favicon: "https://www.google.com/s2/favicons?domain=getrolescout.com&sz=64",
  },
];

export default function Lab() {
  return (
    <section id="lab" className="flex flex-col justify-center">
      <p className="mb-3 text-sm font-medium uppercase tracking-widest text-gray-400">
        The Lab
      </p>
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Active Projects
      </h2>
      <div className="mt-8 flex flex-col gap-4">
        {projects.map((project) => {
          const Card = (
            <div className="group h-full rounded-xl border border-gray-200 bg-white p-6 transition hover:border-gray-300 hover:shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {project.favicon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={project.favicon}
                      alt=""
                      className="h-5 w-5 rounded shrink-0"
                    />
                  )}
                  <h3 className="text-lg font-semibold">{project.title}</h3>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    project.status === "Active"
                      ? "bg-green-50 text-green-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {project.status}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {project.description}
              </p>
              {project.github && (
                <span className="mt-3 inline-block text-sm font-medium text-gray-500 underline decoration-gray-300 underline-offset-4 transition group-hover:text-gray-900 group-hover:decoration-gray-900">
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
