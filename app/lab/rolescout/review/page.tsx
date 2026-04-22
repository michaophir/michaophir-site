import type { Metadata } from "next";
import ReviewClient from "./review-client";

export const metadata: Metadata = {
  title: "RoleScout — Review",
  description: "Review and curate job listings.",
};

export default function ReviewPage() {
  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Discover Roles
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Review and save roles from your last scraper run.
        </p>
      </div>
      <ReviewClient />
    </div>
  );
}
