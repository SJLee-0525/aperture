import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/features/**/_lib/*.ts",
        "src/lib/i18n/*.ts",
        "src/lib/format/*.ts",
        "src/lib/exif/*.ts",
        "src/lib/geo/*.ts",
        "src/lib/firebase/normalize-troubleshooting.ts",
        "src/hooks/use-query-modal.ts",
        "src/hooks/use-focus-trap.ts",
        "src/hooks/use-scroll-lock.ts",
        "src/features/contact/_hooks/use-contact-form.ts",
        "src/features/likes/_hooks/use-like.ts",
        "src/features/likes/_components/LikeButton.tsx",
        "src/features/search/_components/SearchResults.tsx",
        "src/components/Modal.tsx",
      ],
      exclude: ["src/**/*.test.{ts,tsx}"],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85,
      },
    },
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
