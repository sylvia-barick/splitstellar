import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "https://6dfa65825224e7561fcdcc372ca626a5@o4507623118438400.ingest.us.sentry.io/4507623120601088", // Fallback to safe workspace dummy project DSN
  tracesSampleRate: 1.0,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
});
