import type { Instrumentation } from "next";

/** Logs the real error behind a 500, with the route, so production failures are diagnosable from the server log. */
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  const e = err as { message?: string; stack?: string; digest?: string };
  console.error(`[request error] ${request.method} ${request.path} (${context.routerKind} ${context.routePath}, ${context.renderSource ?? "?"})`);
  console.error(e.stack ?? e.message ?? err);
};
