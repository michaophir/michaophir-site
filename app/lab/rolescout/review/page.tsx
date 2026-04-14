import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import ReviewClient from "./review-client";

export const metadata: Metadata = {
  title: "RoleScout — Review",
  description: "Review and curate job listings.",
};

export default function ReviewPage() {
  return (
    <>
      <Navbar />
      <ReviewClient />
    </>
  );
}
