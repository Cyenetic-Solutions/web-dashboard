"use client";
/** Recoverable workspace error; private server errors are not displayed. */
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section><h1 className="font-display text-4xl uppercase">Workspace unavailable</h1><button onClick={reset} className="mt-6 border border-cye-orange p-4">Try again</button></section>;
}
