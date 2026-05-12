import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SignInPageProps {
  onBack: () => void;
}

export default function SignInPage({ onBack }: SignInPageProps) {
  const { signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

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
          Sign In
        </h1>
        <div className="w-16" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-8">
          {/* Title */}
          <div className="text-center">
            <h2 className="text-[#3a2a1a] text-2xl tracking-wider mb-2">
              Claim Your Name
            </h2>
            <p className="text-[#6b5d4f] text-base leading-relaxed" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Register or sign in with your email to save your victories,
              track your progress, and join the leaderboard.
              No password needed &mdash; we&apos;ll send you a magic link.
            </p>
          </div>

          {/* Sign in form */}
          <div className="bg-white/70 rounded-lg p-6 border border-[#c4b8a8] space-y-4">
            {emailSent ? (
              <div className="text-center py-4">
                <div className="text-[#8b4513] text-lg tracking-wider mb-2">Link Sent!</div>
                <p className="text-[#5c4a38] text-base leading-relaxed" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                  Check your email at <strong className="text-[#3a2a1a]">{email}</strong> and
                  click the magic link to sign in. If you&apos;re new, your account will be created
                  automatically.
                </p>
                <button
                  onClick={() => { setEmailSent(false); setEmail(''); }}
                  className="mt-4 text-[#8b4513] text-sm underline underline-offset-2 hover:text-[#a0522d]"
                  style={{ fontFamily: 'Cormorant Garamond, serif' }}
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-[#8b7a68] text-[10px] tracking-[0.2em] uppercase block mb-1.5">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
                    className="bg-[#f5f0e8] border-[#c4b8a8] text-[#3a2a1a] placeholder:text-[#8b7a68]/50"
                    style={{ fontFamily: 'Cormorant Garamond, serif' }}
                  />
                </div>
                <Button
                  onClick={handleSignIn}
                  disabled={sending || !email.trim()}
                  className="w-full bg-[#8b4513] hover:bg-[#a0522d] text-[#f5f0e8] font-bold tracking-wider"
                >
                  {sending ? 'Sending...' : 'Send Magic Link'}
                </Button>
              </>
            )}
          </div>

          {/* Info */}
          <div className="space-y-3">
            <div className="bg-[#ebe4d6]/60 rounded-lg p-4 border border-[#c4b8a8]/60">
              <h4 className="text-[#8b7a68] text-xs tracking-wider uppercase mb-2">How it works</h4>
              <ul className="text-[#6b5d4f] text-sm leading-relaxed space-y-1.5" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                <li>&bull; Enter your email and we&apos;ll send you a sign-in link</li>
                <li>&bull; Click the link in your email to sign in instantly</li>
                <li>&bull; New users are registered automatically &mdash; no password needed</li>
                <li>&bull; Your profile is <strong className="text-[#3a2a1a]">private by default</strong></li>
              </ul>
            </div>

            <p className="text-center text-[#8b7a68] text-xs" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              By signing in, you agree to our{' '}
              <a
                href="/privacy"
                onClick={(e) => { e.preventDefault(); window.open('/privacy', '_blank'); }}
                className="text-[#8b4513] underline underline-offset-2 hover:text-[#a0522d]"
              >
                privacy policy
              </a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
