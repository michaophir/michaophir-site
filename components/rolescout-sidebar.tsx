"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  getCandidateProfile,
  getLastRunSummary,
  getOpenRolesCsv,
} from "@/app/lab/rolescout/lib/storage";

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
};

const STORAGE_KEY = "rolescout_sidebar_collapsed";
const OPEN_EVENT = "rolescout-sidebar-open";
const COLLAPSE_CHANGED_EVENT = "rolescout-sidebar-collapse-changed";

function subscribeCollapsed(callback: () => void) {
  window.addEventListener(COLLAPSE_CHANGED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(COLLAPSE_CHANGED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getCollapsedSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function getCollapsedServerSnapshot() {
  return false;
}

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
function IconScout() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l2.39 4.84L19.8 7.6l-3.9 3.8.92 5.38L12 14.77l-4.82 2.01.92-5.38-3.9-3.8 5.41-.76L12 2z" />
    </svg>
  );
}
function IconHelp() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconSettings() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
    </svg>
  );
}

function IconHamburger() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/lab/rolescout", icon: <IconDashboard /> },
  { label: "Scout", href: "/lab/rolescout/scout", icon: <IconScout /> },
  { label: "Discover Roles", href: "/lab/rolescout/review", icon: <IconSearch /> },
  { label: "Applications", href: "/lab/rolescout/applications", icon: <IconBriefcase /> },
];

const SECONDARY_NAV_ITEMS: NavItem[] = [
  { label: "Profile & Skills", href: "/lab/rolescout/profile", icon: <IconProfile /> },
  { label: "Settings", href: "/lab/rolescout/settings", icon: <IconSettings /> },
  { label: "Help", href: "/lab/rolescout/help", icon: <IconHelp /> },
];

function ExpandedNavList({
  items,
  pathname,
  onNavClick,
}: {
  items: NavItem[];
  pathname: string;
  onNavClick?: () => void;
}) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = item.href === pathname;
        return (
          <li key={item.label}>
            <Link
              href={item.href}
              onClick={onNavClick}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-blue-700 text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-slate-900"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function CollapsedNavList({
  items,
  pathname,
}: {
  items: NavItem[];
  pathname: string;
}) {
  return (
    <ul className="flex flex-col items-center space-y-1">
      {items.map((item) => {
        const active = item.href === pathname;
        return (
          <li key={item.label}>
            <Link
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
                active
                  ? "text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-slate-900"
              }`}
            >
              {item.icon}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function GettingStartedCard() {
  const [mounted, setMounted] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [hasLastRun, setHasLastRun] = useState(false);
  const [hasOpenRoles, setHasOpenRoles] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const lsGet = (k: string) => {
      try {
        return window.localStorage.getItem(k) ?? "";
      } catch {
        return "";
      }
    };
    (async () => {
      const [profile, lastRun, openRoles] = await Promise.all([
        getCandidateProfile(),
        getLastRunSummary(),
        getOpenRolesCsv(),
      ]);
      if (cancelled) return;

      let profileName = "";
      try {
        const parsed = JSON.parse(profile || "{}");
        profileName = String(parsed?.name ?? "").trim();
      } catch {
        profileName = "";
      }
      const isDemoProfile = profileName === "Alex Rivera";
      const lastRunComplete = lsGet("rolescout_last_run_complete") === "true";

      setHasProfile(Boolean(profile) && !isDemoProfile);
      setHasLastRun(Boolean(lastRun) && lastRunComplete);
      setHasOpenRoles(Boolean(openRoles) && lastRunComplete);
      setMounted(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!mounted) {
    return <div className="rounded-lg bg-gray-50 p-3" />;
  }

  const allDone = hasProfile && hasLastRun && hasOpenRoles;

  if (allDone) {
    return (
      <div className="rounded-lg bg-gray-50 p-3">
        <p className="text-xs font-semibold text-green-700">✓ You&apos;re all set</p>
        <p className="text-xs text-gray-500">Your job search OS is ready.</p>
      </div>
    );
  }

  const items: { label: string; href: string; done: boolean }[] = [
    { label: "Upload your resume", href: "/lab/rolescout/profile", done: hasProfile },
    { label: "Scout for open roles", href: "/lab/rolescout/scout", done: hasLastRun },
    { label: "Review your matches", href: "/lab/rolescout/review", done: hasOpenRoles },
  ];

  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="text-xs font-semibold text-slate-900">Get started</p>
      {items.map((item) => (
        <div key={item.href} className="mt-1.5 flex items-center gap-1.5 text-xs">
          {item.done ? (
            <>
              <span aria-hidden="true" className="text-green-600">✓</span>
              <span className="text-gray-400 line-through">{item.label}</span>
            </>
          ) : (
            <>
              <span
                aria-hidden="true"
                className="inline-block h-3 w-3 rounded-full border border-gray-300"
              />
              <Link href={item.href} className="text-blue-600 hover:underline">
                {item.label}
              </Link>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function ExpandedContent({
  pathname,
  onNavClick,
  onCollapse,
}: {
  pathname: string;
  onNavClick?: () => void;
  onCollapse?: () => void;
}) {
  return (
    <>
      <div className="flex items-start justify-between px-6 py-6">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">RoleScout</h1>
          <p className="text-xs text-gray-400">Job Search OS</p>
        </div>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Collapse sidebar"
            className="text-gray-400 hover:text-slate-900 transition"
          >
            <IconChevronLeft />
          </button>
        )}
      </div>
      <nav className="px-3">
        <ExpandedNavList items={NAV_ITEMS} pathname={pathname} onNavClick={onNavClick} />
        <div className="mx-3 my-2 h-px bg-gray-100" />
        <ExpandedNavList
          items={SECONDARY_NAV_ITEMS}
          pathname={pathname}
          onNavClick={onNavClick}
        />
      </nav>
      <div className="mt-auto px-4 pb-4">
        <GettingStartedCard />
      </div>
    </>
  );
}

function CollapsedContent({
  pathname,
  onExpand,
}: {
  pathname: string;
  onExpand: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onExpand}
        aria-label="Expand sidebar"
        className="flex items-center justify-center w-full py-4 text-gray-400 hover:text-slate-900 transition"
      >
        <IconChevronRight />
      </button>
      <nav className="flex-1">
        <CollapsedNavList items={NAV_ITEMS} pathname={pathname} />
        <div className="mx-3 my-2 h-px bg-gray-100" />
        <CollapsedNavList items={SECONDARY_NAV_ITEMS} pathname={pathname} />
      </nav>
    </>
  );
}

export default function RoleScoutSidebar() {
  const pathname = usePathname() ?? "";
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    getCollapsedSnapshot,
    getCollapsedServerSnapshot
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const handler = () => setMobileOpen(true);
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, []);

  function toggleCollapse() {
    const next = !collapsed;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent(COLLAPSE_CHANGED_EVENT));
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex sticky top-[65px] h-[calc(100vh-65px)] shrink-0 flex-col border-r border-gray-200 bg-white ${
          hydrated ? "transition-all duration-200" : ""
        } ${collapsed ? "w-[64px]" : "w-[260px]"}`}
      >
        {collapsed ? (
          <CollapsedContent pathname={pathname} onExpand={toggleCollapse} />
        ) : (
          <ExpandedContent pathname={pathname} onCollapse={toggleCollapse} />
        )}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          />
          <aside className="fixed top-0 left-0 h-full w-[260px] z-50 bg-white border-r border-gray-200 shadow-lg lg:hidden flex flex-col">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="absolute top-4 right-4 text-gray-400 hover:text-slate-900 transition"
            >
              <IconClose />
            </button>
            <ExpandedContent
              pathname={pathname}
              onNavClick={() => setMobileOpen(false)}
            />
          </aside>
        </>
      )}
    </>
  );
}

export function MobileSidebarTrigger() {
  function onClick() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(OPEN_EVENT));
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="lg:hidden mb-6 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-slate-900 transition"
    >
      <IconHamburger />
      Menu
    </button>
  );
}
