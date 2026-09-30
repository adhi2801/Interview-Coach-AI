import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["build", "node_modules"] },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...js.configs.recommended.rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // JSX usage marks imports as used; without eslint-plugin-react this
      // rule can't see it, so only flag unused non-component variables.
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]|^motion$", argsIgnorePattern: "^_", caughtErrors: "none" }],
    },
  },
  {
    files: ["**/*.test.{js,jsx}", "e2e/**/*.js", "api/**/*.js", "vite.config.js", "eslint.config.js", "playwright.config.js"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Playwright fixtures call use(), which is not a React hook.
    files: ["e2e/**/*.js"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
];
