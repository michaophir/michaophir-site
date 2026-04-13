import type { Metadata } from "next";
import ReviewClient from "./review-client";

export const metadata: Metadata = {
  title: "RoleScout — Review",
  description: "Review and curate job listings.",
};

export default function ReviewPage() {
  return <ReviewClient />;
}
