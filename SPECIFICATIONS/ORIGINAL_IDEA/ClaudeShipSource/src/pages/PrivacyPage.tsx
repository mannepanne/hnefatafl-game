import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PrivacyPageProps {
  onBack: () => void;
  onShowContact?: () => void;
}

export default function PrivacyPage({ onBack, onShowContact }: PrivacyPageProps) {
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
              Last Updated &middot; 5 April 2026
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

          {/* What data we collect */}
          <section>
            <h2 className="text-[#8b4513] text-xl tracking-wider mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              What Data We Collect and Why
            </h2>

            <h3 className="text-[#3a2a1a] text-lg tracking-wider mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
              Email Address
            </h3>
            <p className="text-[#5c4a38] leading-relaxed text-base mb-4">
              When you create an account, we collect your email address. This is used primarily for
              authentication (signing in via magic link) and for service-related communications &mdash;
              such as important changes to the platform, security notices, or updates to these terms.
              We may also contact you on a one-off basis to invite you to opt in to occasional updates,
              but you will never be subscribed to any mailing list without your explicit consent.
              Your email will never be shared with any third party for any reason.
            </p>

            <h3 className="text-[#3a2a1a] text-lg tracking-wider mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
              Your Game Data
            </h3>
            <p className="text-[#5c4a38] leading-relaxed text-base">
              When you play games as a registered user, we store your game statistics &mdash; wins, losses,
              best times, and difficulty levels. This data powers the leaderboard and your personal
              profile. Your leaderboard participation is entirely opt-in; your profile is private by
              default and only visible to others if you choose to make it public.
            </p>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-[#c4b8a8] to-transparent" />

          {/* What we do not collect */}
          <section>
            <h2 className="text-[#8b4513] text-xl tracking-wider mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              What We Do Not Collect
            </h2>
            <p className="text-[#5c4a38] leading-relaxed text-base">
              We do not use tracking pixels or any form of cross-site tracking.
              We do not collect your location, device fingerprint, or browsing habits beyond this site.
              Anonymous game counts are tracked for site-wide statistics only; no personal data
              is collected from anonymous players.
            </p>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-[#c4b8a8] to-transparent" />

          {/* How your data is stored */}
          <section>
            <h2 className="text-[#8b4513] text-xl tracking-wider mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              How Your Data Is Stored
            </h2>
            <p className="text-[#5c4a38] leading-relaxed text-base">
              Your data is stored securely using Supabase, which provides encryption at rest and in transit.
              Authentication is handled through industry-standard protocols using passwordless magic links.
              No passwords are stored.
            </p>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-[#c4b8a8] to-transparent" />

          {/* Your rights */}
          <section>
            <h2 className="text-[#8b4513] text-xl tracking-wider mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              Your Rights
            </h2>
            <p className="text-[#5c4a38] leading-relaxed text-base mb-3">
              You have the right to:
            </p>
            <ul className="space-y-2 text-[#5c4a38] text-[15px]">
              <li>&bull; <strong className="text-[#3a2a1a]">Export your data</strong> &mdash; request a full copy of everything we hold about you</li>
              <li>&bull; <strong className="text-[#3a2a1a]">Delete your account</strong> &mdash; request complete removal of your account and all associated data, including game statistics and leaderboard entries</li>
              <li>&bull; <strong className="text-[#3a2a1a]">Correct your data</strong> &mdash; update your display name or leaderboard visibility at any time</li>
              <li>&bull; <strong className="text-[#3a2a1a]">Withdraw visibility</strong> &mdash; toggle your leaderboard profile to private at any time to hide your name and stats from other visitors</li>
            </ul>
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
              they will never be targeted based on your account data, email address, browsing history,
              or game statistics. We will not share any personal information with advertisers.
            </p>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-[#c4b8a8] to-transparent" />

          {/* Cookies */}
          <section>
            <h2 className="text-[#8b4513] text-xl tracking-wider mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              Cookies and Tracking
            </h2>
            <p className="text-[#5c4a38] leading-relaxed text-base">
              We use only essential cookies required for authentication (keeping you signed in).
              We do not use personalised advertising cookies or any form of cross-site tracking.
            </p>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-[#c4b8a8] to-transparent" />

          {/* Changes */}
          <section>
            <h2 className="text-[#8b4513] text-xl tracking-wider mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              Changes to This Policy
            </h2>
            <p className="text-[#5c4a38] leading-relaxed text-base">
              Given the limited scope of data collection, we do not anticipate significant changes
              to this policy. If changes are made, the updated date above will be revised.
            </p>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-[#c4b8a8] to-transparent" />

          {/* Contact */}
          <section>
            <h2 className="text-[#8b4513] text-xl tracking-wider mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              Contact
            </h2>
            <p className="text-[#5c4a38] leading-relaxed text-base">
              If you have any questions about this policy or your data, please{' '}
              {onShowContact ? (
                <button
                  onClick={onShowContact}
                  className="text-[#8b4513] underline underline-offset-2 hover:text-[#a0522d]"
                >
                  get in touch via our contact form
                </button>
              ) : (
                <a
                  href="/contact"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#8b4513] underline underline-offset-2 hover:text-[#a0522d]"
                >
                  get in touch via our contact form
                </a>
              )}.
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
