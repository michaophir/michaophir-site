export default function Hero() {
  return (
    <section className="flex flex-col justify-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
        Micha Ophir
      </h1>
      <p className="mt-6 max-w-lg text-lg leading-relaxed text-gray-600">
        Product leader with 15+ years shipping at the intersection of audio
        &amp; media{" "}
        <span className="text-gray-400">(Spotify, TuneIn)</span>, adtech, and
        fintech <span className="text-gray-400">(Bloomberg)</span>. Building
        AI-native tools and experimenting in public.
      </p>
      <div className="mt-8">
        <a
          href="mailto:micha@michaophir.com"
          className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-700"
        >
          Get in touch
          <span aria-hidden="true">&rarr;</span>
        </a>
      </div>
    </section>
  );
}
