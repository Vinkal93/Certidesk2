"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-white px-6 text-slate-900">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold">Application Error</h1>
          <p className="mt-2 text-sm text-slate-600">
            A critical error occurred. Please try refreshing the application.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
