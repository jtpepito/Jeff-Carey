import type { Instrumentation } from "next";

/** Runs once when the server starts (not during the build). Database work only on the Node runtime. */
export async function register() {
  // This exact positive check lets the build leave the database code out of the edge bundle.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { onServerStart } = await import("./instrumentation-node");
    onServerStart();
  }
}

/** Logs the real error behind a 500, with the route, so production failures are diagnosable from the server log. */
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  const e = err as { message?: string; stack?: string; digest?: string };
  console.error(`[request error] ${request.method} ${request.path} (${context.routerKind} ${context.routePath}, ${context.renderSource ?? "?"})`);
  console.error(e.stack ?? e.message ?? err);
};
