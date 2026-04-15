import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import RoleScoutSidebar from "@/components/rolescout-sidebar";

export const metadata: Metadata = {
  title: "RoleScout — Dashboard",
  description: "AI-powered job search OS.",
};

type TopMatch = {
  role: string;
  company: string;
  match: number;
};

type UpcomingAction = {
  role: string;
  company: string;
  stage: string;
  action: string;
  date: string | null;
};

const TOP_MATCHES: TopMatch[] = [
  { role: "Senior Frontend Engineer", company: "Stripe", match: 92 },
  { role: "Staff Software Engineer", company: "Figma", match: 88 },
];

const UPCOMING_ACTIONS: UpcomingAction[] = [
  {
    role: "Senior Software Engineer",
    company: "Notion",
    stage: "Technical",
    action: "System design interview",
    date: "Apr 17",
  },
  {
    role: "Staff Engineer, Frontend",
    company: "Linear",
    stage: "Phone Interview",
    action: "Technical phone screen",
    date: "Apr 15",
  },
  {
    role: "Engineering Lead",
    company: "Loom",
    stage: "Applied",
    action: "Wait for recruiter response",
    date: null,
  },
  {
    role: "Senior Full Stack Engineer",
    company: "Retool",
    stage: "Screening",
    action: "Recruiter call scheduled",
    date: "Apr 14",
  },
];

function StatCard({
  icon,
  iconBg,
  iconColor,
  value,
  label,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <p className="text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );
}

function StarIcon() {
  return (
    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.363 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.196-1.539-1.118l1.287-3.957a1 1 0 00-.363-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
    </svg>
  );
}

export default function RoleScoutDashboard() {
  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <Navbar />
      <div className="flex">
        <RoleScoutSidebar activeHref="/lab/rolescout" />
        <main className="flex-1 px-10 py-10">
          <div className="max-w-6xl">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Welcome back, Micha
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Here&apos;s your job search at a glance.
              </p>
            </div>

            {/* Stat cards */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
                iconBg="bg-purple-100"
                iconColor="text-purple-600"
                value={3}
                label="Saved Roles"
              />
              <StatCard
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
                  </svg>
                }
                iconBg="bg-orange-100"
                iconColor="text-orange-600"
                value={12}
                label="New Roles This Week"
              />
              <StatCard
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
                  </svg>
                }
                iconBg="bg-green-100"
                iconColor="text-green-600"
                value={8}
                label="Active Applications"
              />
              <StatCard
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="5" width="18" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 3v4M8 3v4M3 10h18" />
                  </svg>
                }
                iconBg="bg-purple-100"
                iconColor="text-purple-600"
                value={2}
                label="Interviews Scheduled"
              />
            </div>

            {/* Two panels */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-1 flex items-start justify-between">
                  <h3 className="text-base font-semibold text-slate-900">Top Matches</h3>
                  <a
                    href="/lab/rolescout/review"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    View all &rarr;
                  </a>
                </div>
                <p className="mb-5 text-xs text-gray-400">From your last scraper run</p>
                <ul className="space-y-3">
                  {TOP_MATCHES.map((m) => (
                    <li
                      key={m.role}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/60 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{m.role}</p>
                        <p className="text-xs text-gray-500">{m.company}</p>
                      </div>
                      <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700">
                        <StarIcon />
                        {m.match}%
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-start justify-between">
                  <h3 className="text-base font-semibold text-slate-900">Upcoming Actions</h3>
                  <a
                    href="/lab/rolescout/applications"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    View all &rarr;
                  </a>
                </div>
                <ul className="space-y-4">
                  {UPCOMING_ACTIONS.map((a) => (
                    <li key={a.role} className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{a.role}</p>
                        <p className="truncate text-xs text-gray-500">
                          {a.company} &middot; {a.stage}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-700">{a.action}</p>
                        {a.date && (
                          <p className="mt-0.5 flex items-center justify-end gap-1 text-xs text-gray-400">
                            <ClockIcon />
                            {a.date}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
