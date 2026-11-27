import { defineConfig } from "vitest/config";

// Only unit/logic tests and the DB flow test. e2e specs are Playwright
// suites (import `test` from `@playwright/test`) and must not be collected
// by vitest's default `**/*.spec.ts` glob.
export default defineConfig({
	test: {
		include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
	},
});
