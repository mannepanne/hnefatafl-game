// ABOUT: Anonymous player identity card shown in the GamePage side panel.
// ABOUT: Replaces the authenticated PlayerIdentity for v0.1 anonymous-only play.

export default function WandererLabel() {
  return (
    <div
      className="bg-white/60 rounded-lg p-3 border border-[#c4b8a8]"
      style={{ fontFamily: 'Cinzel, serif' }}
    >
      <div className="text-[#8b7a68] text-[10px] tracking-[0.2em] uppercase mb-1">Player</div>
      <div className="text-[#3a2a1a] text-sm tracking-wider">Wanderer</div>
      <div className="text-[#8b7a68] text-xs mt-1">Playing anonymously</div>
    </div>
  );
}
