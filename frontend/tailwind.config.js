// Design tokens. One source of truth for the product's visual language —
// pages should reach for these names rather than one-off hex values.
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Neutral ramp tuned for a true-black canvas. "label" tiers follow
        // the idea of primary/secondary/tertiary text, not arbitrary greys.
        canvas: "#000000",
        surface: {
          DEFAULT: "#161617",   // raised panels
          2: "#1D1D1F",         // controls, inputs, nested panels
          3: "#2C2C2E",         // hover / pressed
        },
        hairline: "rgba(255,255,255,0.12)",
        label: {
          DEFAULT: "#F5F5F7",   // primary text
          2: "#A1A1A6",         // secondary text
          3: "#6E6E73",         // tertiary / captions / disabled
        },
        // The single interactive accent. Links, primary actions, focus.
        accent: {
          DEFAULT: "#2997FF",
          hover: "#47A6FF",
          pressed: "#0077ED",
          soft: "rgba(41,151,255,0.14)",
        },
        // Semantic states only — never decoration.
        positive: "#30D158",
        caution: "#FFD60A",
        critical: "#FF453A",
      },
      fontFamily: {
        // SF Pro renders natively on Apple devices; Inter (with optical
        // sizing) is the closest match everywhere else.
        sans: [
          "-apple-system", "BlinkMacSystemFont", "SF Pro Text", "Inter",
          "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif",
        ],
        display: [
          "-apple-system", "BlinkMacSystemFont", "SF Pro Display", "Inter",
          "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif",
        ],
        mono: ["SF Mono", "JetBrains Mono", "ui-monospace", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        // [size, { lineHeight, letterSpacing }] — display sizes tighten
        // tracking as they grow, body sizes stay neutral.
        "display-xl": ["clamp(3rem, 7vw, 5.5rem)", { lineHeight: "1.04", letterSpacing: "-0.035em" }],
        "display-lg": ["clamp(2.5rem, 5vw, 4rem)", { lineHeight: "1.06", letterSpacing: "-0.03em" }],
        "display-md": ["clamp(2rem, 3.6vw, 3rem)", { lineHeight: "1.08", letterSpacing: "-0.025em" }],
        "title": ["1.75rem", { lineHeight: "1.14", letterSpacing: "-0.02em" }],
        "headline": ["1.3125rem", { lineHeight: "1.24", letterSpacing: "-0.012em" }],
        "body-lg": ["1.3125rem", { lineHeight: "1.38", letterSpacing: "-0.01em" }],
        "body": ["1.0625rem", { lineHeight: "1.47", letterSpacing: "-0.01em" }],
        "callout": ["0.9375rem", { lineHeight: "1.43", letterSpacing: "-0.006em" }],
        "footnote": ["0.8125rem", { lineHeight: "1.38", letterSpacing: "0" }],
        "caption": ["0.75rem", { lineHeight: "1.33", letterSpacing: "0" }],
      },
      borderRadius: {
        // Radius communicates hierarchy: big containers are softer than
        // the controls inside them.
        control: "10px",
        panel: "18px",
        stage: "28px",
      },
      transitionTimingFunction: {
        // Apple's standard curve — fast start, long gentle settle.
        apple: "cubic-bezier(0.28, 0.11, 0.32, 1)",
        "apple-out": "cubic-bezier(0.25, 0.1, 0.25, 1)",
      },
      transitionDuration: {
        240: "240ms",
        400: "400ms",
      },
      maxWidth: {
        prose: "40rem",
        page: "1120px",
      },
    },
  },
  plugins: [],
};
