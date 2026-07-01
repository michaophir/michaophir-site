import Navbar from "@/components/navbar";
import Hero from "@/components/hero";
import Lab from "@/components/lab";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <main className="relative min-h-screen">
      {/* Aspen radial glow — soft dusk over paper */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px]"
        style={{
          background:
            "radial-gradient(90% 320px at 8% 0%, rgba(138,91,214,0.10) 0%, rgba(212,91,122,0.06) 38%, rgba(247,244,238,0) 72%)",
        }}
      />
      <Navbar />
      <div className="mx-auto max-w-7xl px-6 py-16 lg:py-24">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-12">
          <Hero />
          <Lab />
        </div>
      </div>
      <Footer />
    </main>
  );
}
