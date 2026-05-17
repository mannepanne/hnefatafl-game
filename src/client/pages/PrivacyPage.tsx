// ABOUT: Privacy policy page — v0.1 (anonymous play only, no accounts).
// ABOUT: Updated for Cloudflare stack; account/email sections excluded until v0.2.

import { Button } from '@/client/components/ui/button';
import { ScrollArea } from '@/client/components/ui/scroll-area';

interface PrivacyPageProps {
  onBack: () => void;
}

export default function PrivacyPage({ onBack }: PrivacyPageProps) {
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
          Privacy Policy
        </h1>
        <div className="w-16" />
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-8" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          <section>
            <p className="text-[#8b7a68] text-sm tracking-wider uppercase mb-4" style={{ fontFamily: 'Cinzel, serif' }}>
              Last Updated &middot; 17 May 2026
            </p>
          </section>

          {/* Who we are */}
          <section>
            <h2 className="text-[#8b4513] text-xl tracking-wider mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              Who We Are
            </h2>
            <p className="text-[#5c4a38] leading-relaxed text-base">
              Hnefatafl is a personal project &mdash; a digital recreation of the ancient Viking board game,
              built for the pure joy of strategy and Norse history. It is not a commercial product.
              There is no company behind it, no marketing department, and no interest in monetising your data.
            </p>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-[#c4b8a8] to-transparent" />

          {/* Current version note */}
          <section>
            <h2 className="text-[#8b4513] text-xl tracking-wider mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              Accounts and Personal Data
            </h2>
            <p className="text-[#5c4a38] leading-relaxed text-base">
              This version of the game is anonymous-only. There are no user accounts, no sign-in,
              and no personal data collected. You can play without providing any information about yourself.
              A future update will add optional accounts for tracking personal statistics and leaderboard
              participation &mdash; this policy will be updated at that point.
            </p>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-[#c4b8a8] to-transparent" />

          {/* What data we collect */}
          <section>
            <h2 className="text-[#8b4513] text-xl tracking-wider mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              What Data We Collect and Why
            </h2>
            <p className="text-[#5c4a38] leading-relaxed text-base mb-3">
              The only data collected is an anonymous counter of games played across all visitors.
              This is a single integer stored site-wide &mdash; no individual game, device, or session
              is identified. It is used purely to display a "games played" figure on the menu screen.
            </p>
            <p className="text-[#5c4a38] leading-relaxed text-base mb-3">
              To prevent artificial inflation of this counter, your IP address is temporarily noted
              to enforce a rate limit. IP addresses are never stored beyond the rate-limit window
              and are never linked to game data or used for any other purpose.
            </p>
            <p className="text-[#5c4a38] leading-relaxed text-base">
              We also use Cloudflare Web Analytics to collect anonymous page view statistics. This
              records which pages are visited, the referring page, approximate country of origin, and
              browser type &mdash; all in aggregate. No cookies are set, no individual visitor is
              identified, and the data is not linked to any personal information.
            </p>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-[#c4b8a8] to-transparent" />

          {/* What we do not collect */}
          <section>
            <h2 className="text-[#8b4513] text-xl tracking-wider mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              What We Do Not Collect
            </h2>
            <p className="text-[#5c4a38] leading-relaxed text-base">
              We do not use cross-site tracking or personal profiling. Page view analytics captures
              approximate country of origin but does not store or forward your IP address. We do not
              collect a device fingerprint or browsing habits beyond this site. We do not set any
              cookies. All game logic runs in your browser; no move or game state is ever sent to
              a server.
            </p>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-[#c4b8a8] to-transparent" />

          {/* How data is stored */}
          <section>
            <h2 className="text-[#8b4513] text-xl tracking-wider mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              How Data Is Stored
            </h2>
            <p className="text-[#5c4a38] leading-relaxed text-base">
              The anonymous games counter is stored in Cloudflare D1 (SQLite). The rate-limit
              record is held in Cloudflare KV and expires automatically. No data is stored outside
              Cloudflare infrastructure.
            </p>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-[#c4b8a8] to-transparent" />

          {/* Cookies */}
          <section>
            <h2 className="text-[#8b4513] text-xl tracking-wider mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              Cookies and Tracking
            </h2>
            <p className="text-[#5c4a38] leading-relaxed text-base">
              We do not set any cookies. There is no session, no authentication, and no preference
              storage in this version of the game.
            </p>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-[#c4b8a8] to-transparent" />

          {/* Advertising */}
          <section>
            <h2 className="text-[#8b4513] text-xl tracking-wider mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              Advertising
            </h2>
            <p className="text-[#5c4a38] leading-relaxed text-base">
              We may in the future display simple advertisements to help support the running costs
              of this project. If we do, these will be contextual and non-personalised &mdash;
              they will never be targeted based on browsing history or any personal data.
            </p>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-[#c4b8a8] to-transparent" />

          {/* Changes */}
          <section>
            <h2 className="text-[#8b4513] text-xl tracking-wider mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              Changes to This Policy
            </h2>
            <p className="text-[#5c4a38] leading-relaxed text-base">
              This policy will be updated when user accounts are introduced. The "Last Updated" date
              above will reflect any revision.
            </p>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-[#c4b8a8] to-transparent" />

          {/* Contact */}
          <section>
            <h2 className="text-[#8b4513] text-xl tracking-wider mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              Contact
            </h2>
            <p className="text-[#5c4a38] leading-relaxed text-base">
              If you have any questions about this policy, please get in touch via the contact form
              (coming in a future update).
            </p>
          </section>

          {/* Back button */}
          <div className="pt-4 pb-8">
            <Button
              onClick={onBack}
              className="w-full bg-[#8b4513] hover:bg-[#a0522d] text-[#f5f0e8] font-bold tracking-wider"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Back to Menu
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
