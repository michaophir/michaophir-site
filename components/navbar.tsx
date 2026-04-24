import Image from "next/image";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white backdrop-blur-sm">
      <div className="flex items-center justify-between px-10 py-4">
        <a href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Image
            src="/logo.png"
            alt="Micha Ophir"
            width={32}
            height={32}
            className="rounded-full"
          />
          Micha Ophir
        </a>
        <div className="flex items-center gap-6 text-sm font-medium text-gray-600">
          <div className="hidden lg:flex items-center gap-6">
            <a href="/lab" className="transition hover:text-gray-900">
              The Lab
            </a>
          </div>
          <a
            href="https://cal.com/michaophir/30min"
            className="rounded-full bg-gray-900 px-4 py-1.5 text-white transition hover:bg-gray-700"
          >
            Book 30 min
          </a>
        </div>
      </div>
    </nav>
  );
}
