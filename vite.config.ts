import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";
import tailwindcss from "@tailwindcss/vite";
declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
  resolve: {
    alias: {
      $lib: new URL("./src/lib", import.meta.url).pathname,
    },
  },
  plugins: [
    sveltekit({
      compilerOptions: {
        // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
      },
      adapter: adapter(),
      paths: { base: (process.env.BASE_PATH ?? "") as "" | `/${string}` },
      prerender: { entries: ["*"] },
    }),
    tailwindcss(),
  ],
  test: {
    // Only unit/logic tests + the DB flow test. e2e specs are Playwright
    // suites (import `test` from `@playwright/test`) and must not be
    // collected by vitest's default `**/*.spec.ts` glob.
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
  },
});
