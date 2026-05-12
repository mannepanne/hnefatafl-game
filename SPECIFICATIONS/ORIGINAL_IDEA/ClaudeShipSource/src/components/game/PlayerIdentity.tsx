import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useMyProfile } from '@/hooks/useLeaderboard';
import type { PieceStyle } from '@/hooks/usePieceStyle';
import { User, ChevronDown, ChevronUp, Shield, Gem } from 'lucide-react';
import { toast } from 'sonner';

interface PlayerIdentityProps {
  pieceStyle: PieceStyle;
  onPieceStyleChange: (style: PieceStyle) => void;
}

export default function PlayerIdentity({ pieceStyle, onPieceStyleChange }: PlayerIdentityProps) {
  const { user, loading, signInWithMagicLink } = useAuth();
  const { data: myProfile } = useMyProfile(user?.id ?? null);

  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  if (loading) return null;

  const handleSignIn = async () => {
    if (!email.trim()) return;
    setSending(true);
    const { error } = await signInWithMagicLink(email);
    setSending(false);
    if (error) {
      toast.error('Failed to send magic link');
    } else {
      setEmailSent(true);
      toast.success('Magic link sent! Check your email.');
    }
  };

  // Signed-in user
  if (user) {
    const displayName = myProfile?.display_name ?? user.email?.split('@')[0] ?? 'Warrior';
    return (
      <div className="space-y-3">
        <div className="bg-white/60 rounded-lg p-3 border border-[#b8860b]/20" style={{ fontFamily: 'Cinzel, serif' }}>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#8b4513]" />
            <div className="flex-1 min-w-0">
              <div className="text-[#8b7a68] text-[10px] tracking-[0.2em] uppercase">Warrior</div>
              <div className="text-[#3a2a1a] text-sm tracking-wider truncate">{displayName}</div>
            </div>
          </div>
          <div className="text-[#8b7a68] text-[10px] mt-1.5" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Your victories are being recorded.
          </div>
        </div>

        {/* Piece style toggle — registered users only */}
        <div className="bg-white/60 rounded-lg p-3 border border-[#c4b8a8]" style={{ fontFamily: 'Cinzel, serif' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gem className="w-3.5 h-3.5 text-[#b8860b]" />
              <div>
                <div className="text-[#3a2a1a] text-[11px] tracking-wider">Ornate Pieces</div>
                <div className="text-[#8b7a68] text-[10px]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                  Norse-crafted style
                </div>
              </div>
            </div>
            <Switch
              checked={pieceStyle === 'ornate'}
              onCheckedChange={(checked) => onPieceStyleChange(checked ? 'ornate' : 'classic')}
            />
          </div>
        </div>
      </div>
    );
  }

  // Anonymous / Wanderer
  return (
    <div className="bg-white/60 rounded-lg border border-[#c4b8a8] overflow-hidden" style={{ fontFamily: 'Cinzel, serif' }}>
      {/* Identity header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center gap-2 text-left hover:bg-white/40 transition-colors"
      >
        <User className="w-4 h-4 text-[#8b7a68]" />
        <div className="flex-1 min-w-0">
          <div className="text-[#8b7a68] text-[10px] tracking-[0.2em] uppercase">Playing as</div>
          <div className="text-[#3a2a1a] text-sm tracking-wider">Wanderer</div>
        </div>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-[#8b7a68]" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-[#8b7a68]" />
        )}
      </button>

      {/* Collapsed hint */}
      {!expanded && (
        <div className="px-3 pb-2.5 -mt-1">
          <p className="text-[#8b7a68] text-[11px] leading-snug" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Scores won't be saved.{' '}
            <button
              onClick={() => setExpanded(true)}
              className="text-[#8b4513] underline underline-offset-2 hover:text-[#a0522d]"
            >
              Claim your name?
            </button>
          </p>
        </div>
      )}

      {/* Expanded registration */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-[#c4b8a8]/50">
          <p className="text-[#5c4a38] text-[13px] leading-relaxed pt-2.5" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Register with your email to save your victories and track your progress.
            No password needed &mdash; we'll send a magic link.
          </p>

          {emailSent ? (
            <div className="bg-[#f5f0e8] rounded p-2.5">
              <p className="text-[#8b4513] text-[12px] leading-relaxed" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                Magic link sent! Check your email and click the link.
                Your game will continue undisturbed.
              </p>
            </div>
          ) : (
            <div className="flex gap-1.5">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
                className="bg-[#f5f0e8] border-[#c4b8a8] text-[#3a2a1a] placeholder:text-[#8b7a68]/50 text-xs h-8"
                style={{ fontFamily: 'Cormorant Garamond, serif' }}
              />
              <Button
                onClick={handleSignIn}
                disabled={sending || !email.trim()}
                className="bg-[#8b4513] hover:bg-[#a0522d] text-[#f5f0e8] text-[11px] tracking-wider h-8 px-3 whitespace-nowrap"
                size="sm"
              >
                {sending ? '...' : 'Register'}
              </Button>
            </div>
          )}

          {/* Privacy link */}
          <p className="text-[#8b7a68] text-[11px]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Your profile is private by default.{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#8b4513] underline underline-offset-2 hover:text-[#a0522d]"
            >
              Privacy policy
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
