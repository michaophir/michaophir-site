export default function Hero() {
  return (
    <section className="flex flex-col justify-center">
      <h1 className="font-display text-5xl font-bold leading-[0.9] tracking-[-0.035em] text-ink sm:text-6xl lg:text-7xl">
        Micha Ophir
      </h1>
      <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
        Product leader with 15+ years shipping at the intersection of media,
        audio, and fintech (Spotify, TuneIn, Bloomberg). Building AI-native
        tools and experimenting in public.
      </p>
      <div className="mt-8">
        <a
          href="mailto:info@michaophir.com"
          className="inline-flex items-center gap-2 rounded-full bg-aspen px-6 py-3 text-sm font-semibold text-white transition hover:bg-aspen-hover"
        >
          Get in touch
          <span aria-hidden="true">&rarr;</span>
        </a>
      </div>
    </section>
  );
}
