import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ContactPageProps {
  onBack: () => void;
}

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';

export default function ContactPage({ onBack }: ContactPageProps) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const handleTurnstileCallback = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  // Load and render Turnstile widget
  useEffect(() => {
    const renderWidget = () => {
      if (turnstileRef.current && window.turnstile && !widgetIdRef.current && TURNSTILE_SITE_KEY) {
        widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: handleTurnstileCallback,
          theme: 'light',
        });
      }
    };

    // If Turnstile is already initialized (e.g. navigated back to this page)
    if (window.turnstile) {
      renderWidget();
      return () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }

    // Use Turnstile's onload callback — the reliable signal that the API is ready.
    // Generate a unique global name to avoid collisions.
    const callbackName = `__turnstileReady_${Date.now()}`;
    (window as unknown as Record<string, unknown>)[callbackName] = renderWidget;

    const script = document.createElement('script');
    script.src = `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=${callbackName}`;
    script.async = true;
    document.head.appendChild(script);

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      delete (window as unknown as Record<string, unknown>)[callbackName];
    };
  }, [handleTurnstileCallback]);

  const handleSubmit = async () => {
    if (!email.trim() || !message.trim()) {
      toast.error('Please fill in all fields.');
      return;
    }
    if (!turnstileToken) {
      toast.error('Please complete the CAPTCHA verification.');
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('contact', {
        body: {
          email: email.trim(),
          message: message.trim(),
          turnstileToken,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSent(true);
      toast.success('Message sent!');
    } catch (err) {
      console.error('Contact form error:', err);
      toast.error('Failed to send message. Please try again.');
      // Reset Turnstile so they can retry
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
        setTurnstileToken(null);
      }
    } finally {
      setSending(false);
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
          Contact
        </h1>
        <div className="w-16" />
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-lg mx-auto px-6 py-8">
          {sent ? (
            <div className="text-center py-12 space-y-4">
              <div className="text-4xl mb-4">&#x2709;&#xFE0F;</div>
              <h2 className="text-[#3a2a1a] text-2xl tracking-wider">
                Message Sent
              </h2>
              <p className="text-[#5c4a38] text-base leading-relaxed" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                Thank you for getting in touch. We&apos;ll get back to you as soon as possible.
              </p>
              <div className="pt-4">
                <Button
                  onClick={onBack}
                  className="bg-[#8b4513] hover:bg-[#a0522d] text-[#f5f0e8] font-bold tracking-wider"
                  style={{ fontFamily: 'Cinzel, serif' }}
                >
                  Back to Menu
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Title */}
              <div className="text-center mb-2">
                <h2 className="text-[#3a2a1a] text-2xl tracking-wider mb-2">
                  Get in Touch
                </h2>
                <p className="text-[#6b5d4f] text-base leading-relaxed" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                  Questions about your data, the game, or anything else?
                  Send us a message and we&apos;ll get back to you.
                </p>
              </div>

              {/* Form */}
              <div className="bg-white/70 rounded-lg p-6 border border-[#c4b8a8] space-y-4">
                <div>
                  <label className="text-[#8b7a68] text-[10px] tracking-[0.2em] uppercase block mb-1.5">
                    Your Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-[#f5f0e8] border-[#c4b8a8] text-[#3a2a1a] placeholder:text-[#8b7a68]/50"
                    style={{ fontFamily: 'Cormorant Garamond, serif' }}
                    required
                  />
                </div>

                <div>
                  <label className="text-[#8b7a68] text-[10px] tracking-[0.2em] uppercase block mb-1.5">
                    Message
                  </label>
                  <Textarea
                    placeholder="How can we help?"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    className="bg-[#f5f0e8] border-[#c4b8a8] text-[#3a2a1a] placeholder:text-[#8b7a68]/50 resize-none"
                    style={{ fontFamily: 'Cormorant Garamond, serif' }}
                    required
                  />
                </div>

                {/* Turnstile CAPTCHA */}
                <div className="flex justify-center">
                  <div ref={turnstileRef} />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={sending || !email.trim() || !message.trim() || !turnstileToken}
                  className="w-full bg-[#8b4513] hover:bg-[#a0522d] text-[#f5f0e8] font-bold tracking-wider disabled:opacity-50"
                  style={{ fontFamily: 'Cinzel, serif' }}
                >
                  {sending ? 'Sending...' : 'Send Message'}
                </Button>
              </div>

              {/* Privacy note */}
              <p className="text-center text-[#8b7a68] text-xs" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                Your email will only be used to reply to your message.
                See our{' '}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#8b4513] underline underline-offset-2 hover:text-[#a0522d]"
                >
                  privacy policy
                </a>.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
