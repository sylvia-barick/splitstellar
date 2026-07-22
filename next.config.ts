import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "splitstellar",
  project: "splitstellar-app",
  // Suppress all Sentry CLI output
  silent: true,
  // Never fail the build if Sentry upload fails (no SENTRY_AUTH_TOKEN)
  errorHandler(err) {
    console.warn("Sentry build warning (non-fatal):", err.message);
  },
  // Disable source map upload — no SENTRY_AUTH_TOKEN is configured
  sourcemaps: {
    disable: true,
  },
});
