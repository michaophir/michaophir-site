import Image from "next/image";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border-soft bg-paper/85 backdrop-blur-md">
      <div className="flex items-center justify-between px-10 py-4">
        <a
          href="/"
          className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-ink"
        >
          <Image
            src="/logo.png"
            alt="Micha Ophir"
            width={32}
            height={32}
            className="rounded-full"
          />
          Micha Ophir
        </a>
        <div className="flex items-center gap-6 text-sm font-medium text-ink-soft">
          <div className="hidden items-center gap-6 lg:flex">
            <a href="/lab" className="transition hover:text-ink">
              The Lab
            </a>
          </div>
          <a
            href="https://cal.com/michaophir/30min"
            className="rounded-full bg-aspen px-4 py-1.5 font-semibold text-white transition hover:bg-aspen-hover"
          >
            Book 30 min
          </a>
        </div>
      </div>
    </nav>
  );
}
