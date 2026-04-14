import type { ReactNode } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
};

function IconDashboard() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="14" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="14" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconProfile() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
    </svg>
  );
}
function IconBriefcase() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/lab/rolescout", icon: <IconDashboard /> },
  { label: "Profile & Skills", href: "/lab/rolescout/profile", icon: <IconProfile /> },
  { label: "Discover Roles", href: "/lab/rolescout/review", icon: <IconSearch /> },
  { label: "My Applications", href: "/lab/rolescout/monitoring", icon: <IconBriefcase /> },
];

export default function RoleScoutSidebar({ activeHref }: { activeHref: string }) {
  return (
    <aside className="sticky top-[65px] flex h-[calc(100vh-65px)] w-[260px] shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="px-6 py-6">
        <h1 className="text-lg font-bold tracking-tight text-slate-900">RoleScout</h1>
        <p className="text-xs text-gray-400">Job Search OS</p>
      </div>
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = item.href === activeHref;
            return (
              <li key={item.label}>
                <a
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-blue-700 text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-slate-900"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4">
        <div className="rounded-lg bg-gray-100 p-4">
          <p className="text-xs font-semibold text-blue-700">Pro tip</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            Keep your story bank updated to ace behavioral interviews.
          </p>
        </div>
      </div>
    </aside>
  );
}
