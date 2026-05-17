// ABOUT: Placeholder panel for views that are not yet implemented.
// ABOUT: Used by App.tsx for all isPlaceholderView() views (v0.2/v1.0 pages).

interface PlaceholderPageProps {
  onBack: () => void;
}

export default function PlaceholderPage({ onBack }: PlaceholderPageProps) {
  return (
    <div className="min-h-screen bg-[#f5f0e8] flex flex-col items-center justify-center" style={{ fontFamily: 'Cinzel, serif' }}>
      <p className="text-[#8b7a68] text-sm tracking-[0.3em] uppercase mb-6">Coming soon</p>
      <button
        onClick={onBack}
        className="text-[#8b7a68] hover:text-[#3a2a1a] text-xs tracking-[0.2em] uppercase transition-colors"
      >
        &larr; Back to Menu
      </button>
    </div>
  );
}
