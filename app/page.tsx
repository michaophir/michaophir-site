import Navbar from "@/components/navbar";
import Hero from "@/components/hero";
import Lab from "@/components/lab";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F5F5F7]">
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
