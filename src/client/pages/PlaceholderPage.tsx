// ABOUT: Phase 1 landing page. Shows the parchment background, fonts loaded,
// ABOUT: and the pinned copy specified in the foundation spec.

export function PlaceholderPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-5xl font-display font-semibold tracking-wide text-parchment-ink sm:text-7xl">
        Hnefatafl
      </h1>
      <p className="mt-4 text-xl text-parchment-ink/80 sm:text-2xl">
        The king&apos;s table — coming soon
      </p>
      <p className="mt-12 text-sm text-parchment-ink/60">A faithful port in progress.</p>
    </main>
  );
}
