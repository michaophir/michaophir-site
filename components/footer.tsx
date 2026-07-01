export default function Footer() {
  return (
    <footer className="border-t border-border-soft bg-paper-soft py-8">
      <div className="mx-auto max-w-7xl px-6 text-center text-sm text-ink-soft">
        &copy; 2026 Micha Ophir &middot; Built by a human and AI agents, in public &middot;{" "}
        <a
          href="mailto:info@michaophir.com"
          className="text-aspen underline decoration-aspen-55 underline-offset-4 transition hover:text-aspen-hover hover:decoration-aspen-hover"
        >
          info@michaophir.com
        </a>
      </div>
    </footer>
  );
}
