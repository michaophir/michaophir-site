const projects = [
  {
    title: "Job Scraper",
    description:
      "Agentic pipeline scraping 40+ companies, filtered by role, delivered via Telegram.",
    status: "Active",
    link: "https://github.com/michaophir/sandbox",
  },
  {
    title: "michaophir.com",
    description:
      "This site — built by an AI agent team, in public.",
    status: "In Progress",
    link: null,
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
        {projects.map((project) => (
          <div
            key={project.title}
            className="group rounded-xl border border-gray-200 bg-white p-6 transition hover:border-gray-300 hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold">{project.title}</h3>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
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
            {project.link && (
              <a
                href={project.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm font-medium text-gray-900 underline decoration-gray-300 underline-offset-4 transition hover:decoration-gray-900"
              >
                View on GitHub
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
