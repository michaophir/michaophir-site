/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Aspen — Neutrals
        ink: "#16181C",
        "ink-soft": "#5B5E66",
        paper: "#F7F4EE",
        "paper-soft": "#FBF9F4",
        stone: "#3C4654",

        // Aspen — Accents
        aspen: {
          DEFAULT: "#F0A50A",
          hover: "#CE8C07",
          pressed: "#9C6B05",
          55: "#ECC766",
          28: "#F6E4B4",
          12: "#FCF3DD",
        },
        lake: "#07C0A4",
        sky: "#2E86E6",
        meadow: "#6FA61C",

        // Aspen — Dusk (rare, hero/footer accents only)
        "dusk-violet": "#7C58C9",
        "sunset-rose": "#D45B7A",
        coral: "#E8915A",

        // Aspen — Borders
        border: {
          DEFAULT: "#EBE7DE",
          soft: "#EFEBE2",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      letterSpacing: {
        eyebrow: ".18em",
      },
    },
  },
  plugins: [],
}
