// ABOUT: How to Play page — Copenhagen ruleset overview for 11×11 Hnefatafl.
// ABOUT: Full scrollable rules with historical note. Port of the prototype's RulesPage.

import { Button } from '@/client/components/ui/button';
import { ScrollArea } from '@/client/components/ui/scroll-area';

interface RulesPageProps {
  onBack: () => void;
}

export default function RulesPage({ onBack }: RulesPageProps) {
  return (
    <div className="min-h-screen bg-[#f5f0e8] flex flex-col" style={{ fontFamily: 'Cinzel, serif' }}>
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-[#c4b8a8]">
        <button
          onClick={onBack}
          className="text-[#8b7a68] hover:text-[#3a2a1a] transition-colors text-sm tracking-wider uppercase"
        >
          &larr; Back
        </button>
        <h1 className="text-[#3a2a1a] text-sm tracking-[0.2em] uppercase font-semibold">
          How to Play
        </h1>
        <div className="w-16" />
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-8" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          {/* Introduction */}
          <section>
            <h2 className="text-[#8b4513] text-xl tracking-wider mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              The Game of Kings
            </h2>
            <p className="text-[#5c4a38] leading-relaxed text-base">
              Hnefatafl (pronounced "NEF-ah-tah-fel") is an ancient Norse strategy game dating back
              over a thousand years. Unlike chess, the two sides are unequal in both number and objective,
              creating an asymmetric battle of wits. The game was so beloved by the Vikings that mastery
              of it was listed among the great accomplishments of Norse jarls.
            </p>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-[#c4b8a8] to-transparent" />

          {/* The Board */}
          <section>
            <h2 className="text-[#8b4513] text-xl tracking-wider mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              The Board
            </h2>
            <p className="text-[#5c4a38] leading-relaxed text-base mb-3">
              The game is played on an 11&times;11 grid. Five squares are special:
            </p>
            <ul className="space-y-2 text-[#5c4a38] text-[15px]">
              <li className="flex items-start gap-3">
                <span className="w-4 h-4 mt-1 rounded bg-[#c4a87a] border border-[#b8860b]/30 flex-shrink-0" />
                <span><strong className="text-[#3a2a1a]">The Throne</strong> &mdash; the central square. Only the King may stop here, though all pieces may pass through it.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-4 h-4 mt-1 rounded bg-[#c4a87a] border border-[#b8860b]/30 flex-shrink-0" />
                <span><strong className="text-[#3a2a1a]">The Four Corners</strong> &mdash; these are the King's escape routes. Only the King may land on them.</span>
              </li>
            </ul>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-[#c4b8a8] to-transparent" />

          {/* The Sides */}
          <section>
            <h2 className="text-[#8b4513] text-xl tracking-wider mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              The Sides
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/70 rounded-lg p-4 border border-[#c4b8a8]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#f0e6d0] to-[#ddd0b8] border border-[#c4a87a]/40" />
                  <h3 className="text-[#3a2a1a] tracking-wider" style={{ fontFamily: 'Cinzel, serif' }}>Defenders</h3>
                </div>
                <p className="text-[#6b5d4f] text-[15px] leading-relaxed">
                  12 warriors and 1 King. Start at the centre. The King must escape to any corner to win.
                  Historically called "the Swedes."
                </p>
              </div>
              <div className="bg-white/70 rounded-lg p-4 border border-[#c4b8a8]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#7d5a3a] to-[#6b4c30] border border-[#8b6845]/40" />
                  <h3 className="text-[#3a2a1a] tracking-wider" style={{ fontFamily: 'Cinzel, serif' }}>Attackers</h3>
                </div>
                <p className="text-[#6b5d4f] text-[15px] leading-relaxed">
                  24 warriors. Start on the edges. Must capture the King before he escapes.
                  Historically called "the Muscovites."
                </p>
              </div>
            </div>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-[#c4b8a8] to-transparent" />

          {/* Movement */}
          <section>
            <h2 className="text-[#8b4513] text-xl tracking-wider mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              Movement
            </h2>
            <ul className="space-y-2 text-[#5c4a38] text-[15px]">
              <li>&bull; <strong className="text-[#3a2a1a]">Attackers move first</strong>, then players alternate.</li>
              <li>&bull; All pieces move like a rook in chess &mdash; any number of squares horizontally or vertically.</li>
              <li>&bull; Pieces cannot jump over other pieces.</li>
              <li>&bull; Only the King can land on the throne and corner squares.</li>
            </ul>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-[#c4b8a8] to-transparent" />

          {/* Capture */}
          <section>
            <h2 className="text-[#8b4513] text-xl tracking-wider mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              Capture
            </h2>
            <p className="text-[#5c4a38] leading-relaxed text-base mb-3">
              Pieces are captured by <strong className="text-[#3a2a1a]">custodial capture</strong> &mdash;
              trapping an enemy piece between two of your own pieces on opposite sides (horizontally or vertically).
            </p>
            <ul className="space-y-2 text-[#5c4a38] text-[15px]">
              <li>&bull; The capture is only triggered by the piece that <em>moves</em> to complete the trap.</li>
              <li>&bull; You can safely move between two enemy pieces without being captured.</li>
              <li>&bull; Multiple captures can occur in a single move.</li>
              <li>&bull; The throne and corners count as hostile squares for capture purposes.</li>
            </ul>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-[#c4b8a8] to-transparent" />

          {/* King Capture */}
          <section>
            <h2 className="text-[#8b4513] text-xl tracking-wider mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              Capturing the King
            </h2>
            <p className="text-[#5c4a38] leading-relaxed text-base mb-3">
              The King is harder to capture than ordinary pieces:
            </p>
            <ul className="space-y-2 text-[#5c4a38] text-[15px]">
              <li>&bull; <strong className="text-[#3a2a1a]">On the throne:</strong> attackers must surround him on all four sides.</li>
              <li>&bull; <strong className="text-[#3a2a1a]">Next to the throne:</strong> attackers need three sides (the throne counts as the fourth).</li>
              <li>&bull; <strong className="text-[#3a2a1a]">Elsewhere:</strong> attackers must surround him on all four sides.</li>
              <li>&bull; <strong className="text-[#3a2a1a]">On the edge:</strong> the King <em>cannot</em> be captured on the board edge.</li>
            </ul>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-[#c4b8a8] to-transparent" />

          {/* Winning */}
          <section>
            <h2 className="text-[#8b4513] text-xl tracking-wider mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              Victory Conditions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/70 rounded-lg p-4 border border-[#c4b8a8]">
                <h3 className="text-[#3a2a1a] tracking-wider mb-2" style={{ fontFamily: 'Cinzel, serif' }}>Defenders Win</h3>
                <p className="text-[#6b5d4f] text-[15px] leading-relaxed">
                  The King reaches any corner square. Immediate victory!
                </p>
              </div>
              <div className="bg-white/70 rounded-lg p-4 border border-[#c4b8a8]">
                <h3 className="text-[#3a2a1a] tracking-wider mb-2" style={{ fontFamily: 'Cinzel, serif' }}>Attackers Win</h3>
                <p className="text-[#6b5d4f] text-[15px] leading-relaxed">
                  The King is surrounded and captured. The Swedes fall without their leader.
                </p>
              </div>
            </div>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-[#c4b8a8] to-transparent" />

          {/* History */}
          <section>
            <h2 className="text-[#8b4513] text-xl tracking-wider mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              Historical Note
            </h2>
            <p className="text-[#5c4a38] leading-relaxed text-base mb-3">
              This implementation draws from the Copenhagen rules, the most widely used modern reconstruction
              of the ancient game. The 11&times;11 board size is based on archaeological evidence from Viking-age
              Scandinavia.
            </p>
            <p className="text-[#5c4a38] leading-relaxed text-base mb-3">
              Our best historical source comes from Carl Linnaeus, the great Swedish botanist, who documented
              a variant called "Tablut" during his 1732 expedition to Lapland. The S&aacute;mi people played it on
              embroidered reindeer hide, calling the defenders "Swedes" and the attackers "Muscovites" &mdash;
              a nod to Sweden's rivalry with the Grand Duchy of Moscow.
            </p>
            <p className="text-[#5c4a38] leading-relaxed text-base">
              The game was so central to Norse culture that it appears in the Poetic Edda, where the gods
              themselves play with golden pieces. Jarl Rognvald listed mastery of the game among his nine
              great accomplishments. It was played from roughly 400 CE until chess arrived in Scandinavia
              in the 11th century.
            </p>
          </section>

          {/* Back button */}
          <div className="pt-4 pb-8">
            <Button
              onClick={onBack}
              className="w-full bg-[#8b4513] hover:bg-[#a0522d] text-[#f5f0e8] font-bold tracking-wider"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Ready to Play
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
