import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import RoleScoutSidebar from "@/components/rolescout-sidebar";

export const metadata: Metadata = {
  title: "RoleScout — Profile & Skills",
  description: "Resume, skills, and story bank for smarter job matching.",
};

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <Navbar />
      <div className="flex">
        <RoleScoutSidebar activeHref="/lab/rolescout/profile" />
        <main className="flex-1 px-10 py-10">
          <div className="max-w-6xl">
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Profile &amp; Skills
              </h2>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white px-6 py-20 shadow-sm">
              <div className="mx-auto max-w-md text-center">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <svg
                    className="h-7 w-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4M12 17h.01" />
                  </svg>
                </div>
                <h3 className="mb-2 text-xl font-semibold text-slate-900">
                  Under Construction
                </h3>
                <p className="text-sm leading-relaxed text-gray-500">
                  This section is coming soon. You&apos;ll be able to upload
                  your resume, define your skills, and build your story bank
                  here.
                </p>
                <a
                  href="/lab/rolescout"
                  className="mt-6 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  &larr; Back to Dashboard
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
