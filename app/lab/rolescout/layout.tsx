import Navbar from "@/components/navbar";
import RolescoutBetaBanner from "@/components/rolescout-beta-banner";
import RoleScoutSidebar, { MobileSidebarTrigger } from "@/components/rolescout-sidebar";

export default function RoleScoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <RolescoutBetaBanner />
      <Navbar />
      <div className="flex">
        <RoleScoutSidebar />
        <main className="flex-1 min-w-0 px-10 py-10">
          <MobileSidebarTrigger />
          {children}
        </main>
      </div>
    </div>
  );
}
