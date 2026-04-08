export default function Footer() {
  return (
    <footer className="border-t border-gray-100 py-8">
      <div className="mx-auto max-w-7xl px-6 text-center text-sm text-gray-400">
        &copy; 2026 Micha Ophir &middot; Built by AI agents, in public &middot;{" "}
        <a
          href="mailto:micha@michaophir.com"
          className="text-gray-500 underline decoration-gray-300 underline-offset-4 transition hover:text-gray-900 hover:decoration-gray-900"
        >
          micha@michaophir.com
        </a>
      </div>
    </footer>
  );
}
