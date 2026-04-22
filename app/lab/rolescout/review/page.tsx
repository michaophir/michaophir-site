import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import RoleScoutSidebar, { MobileSidebarTrigger } from "@/components/rolescout-sidebar";
import ReviewClient, { ReviewUploadButton } from "./review-client";

export const metadata: Metadata = {
  title: "RoleScout — Review",
  description: "Review and curate job listings.",
};

export default function ReviewPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <Navbar />
      <div className="flex">
        <RoleScoutSidebar activeHref="/lab/rolescout/review" />
        <main className="flex-1 min-w-0 px-10 py-10">
          <MobileSidebarTrigger />
          <div className="max-w-7xl">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  Discover Roles
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Review and save roles from your last scraper run.
                </p>
              </div>
              <ReviewUploadButton />
            </div>
            <ReviewClient />
          </div>
        </main>
      </div>
    </div>
  );
}
