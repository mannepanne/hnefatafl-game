// ABOUT: Sign-in page — email form for magic-link authentication.
// ABOUT: Two states: input form and "check your email" confirmation.

import { useState } from 'react';
import { requestMagicLink } from '@/client/lib/api';

interface SignInPageProps {
  onBack: () => void;
}

export default function SignInPage({ onBack }: SignInPageProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await requestMagicLink(email.trim().toLowerCase());
    setLoading(false);

    if ('error' in result) {
      if (result.error === 'rate_limit_exceeded') {
        setError('Too many requests. Please wait a while before trying again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
      return;
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div
        className="min-h-screen bg-[#f5f0e8] flex flex-col items-center justify-center px-4"
        style={{ fontFamily: 'Cinzel, serif' }}
      >
        <div className="max-w-sm w-full text-center">
          <h1 className="text-2xl font-bold tracking-[0.1em] text-[#3a2a1a] mb-4">Check your email</h1>
          <p className="text-[#5a4a3a] text-sm leading-relaxed mb-8" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            A sign-in link has been sent to <strong>{email}</strong>.{' '}
            The link expires in 15 minutes and can only be used once.
          </p>
          <button
            onClick={onBack}
            className="text-[#8b7a68] hover:text-[#3a2a1a] text-xs tracking-[0.2em] uppercase transition-colors"
          >
            &larr; Back to menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#f5f0e8] flex flex-col items-center justify-center px-4"
      style={{ fontFamily: 'Cinzel, serif' }}
    >
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-[0.1em] text-[#3a2a1a] mb-2">Sign in</h1>
          <p className="text-[#8b7a68] text-xs tracking-[0.15em] uppercase">
            Enter your email to receive a sign-in link
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            disabled={loading}
            className="w-full px-4 py-3 bg-white border border-[#c8b89a] rounded text-[#3a2a1a] text-sm placeholder-[#b8a888] focus:outline-none focus:border-[#8b6914] disabled:opacity-60"
            style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px' }}
          />

          {error && (
            <p className="text-sm text-red-700" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full py-3 bg-[#8b6914] hover:bg-[#7a5c10] disabled:opacity-50 disabled:cursor-not-allowed text-[#f5f0e8] text-xs tracking-[0.2em] uppercase transition-colors rounded"
          >
            {loading ? 'Sending…' : 'Send sign-in link'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onBack}
            className="text-[#8b7a68] hover:text-[#3a2a1a] text-xs tracking-[0.2em] uppercase transition-colors"
          >
            &larr; Back to menu
          </button>
        </div>
      </div>
    </div>
  );
}
