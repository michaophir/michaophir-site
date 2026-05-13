import Navbar from "@/components/navbar";
import RolescoutBetaBanner from "@/components/rolescout-beta-banner";
import RolescoutChrome from "./rolescout-chrome";

export default function RoleScoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <RolescoutBetaBanner />
      <Navbar />
      <RolescoutChrome>{children}</RolescoutChrome>
    </div>
  );
}
