import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link2, Copy, Check, QrCode, ArrowRight, X, Heart, Shield, Sparkles } from 'lucide-react';
import { UserProfile, Invitation } from '../types';
import { playConnectedChime } from '../utils/audio';

interface ConnectModalProps {
  currentUser: UserProfile;
  onClose: () => void;
  onConnected: (partner: UserProfile, conversationId: string) => void;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({
  currentUser,
  onClose,
  onConnected,
}) => {
  const [tab, setTab] = useState<'generate' | 'connect'>('generate');
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteLink, setPasteLink] = useState('');
  const [showConnectedCelebration, setShowConnectedCelebration] = useState(false);
  const [connectedPartner, setConnectedPartner] = useState<UserProfile | null>(null);

  const handleGenerateLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/invitations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create invite link');
      }
      setInvitation(data.invitation);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getInviteUrl = () => {
    if (!invitation) return '';
    const origin = window.location.origin;
    return `${origin}?invite=${invitation.code}`;
  };

  const handleCopy = () => {
    const url = getInviteUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleNativeShare = async () => {
    const url = getInviteUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'LOVE YOU — Private Space Invitation',
          text: `${currentUser.name} invites you to connect on LOVE YOU.`,
          url,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const handleConnectWithLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteLink.trim()) {
      setError('Please enter or paste an invitation link');
      return;
    }

    setLoading(true);
    setError(null);

    // Extract code if user pasted full URL
    let code = pasteLink.trim();
    if (code.includes('invite=')) {
      const parts = code.split('invite=');
      code = parts[1]?.split('&')[0] || code;
    } else if (code.includes('/invite/')) {
      const parts = code.split('/invite/');
      code = parts[1]?.split('?')[0] || code;
    }

    try {
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          userId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'This connection link is invalid or expired.');
      }

      playConnectedChime(true);
      setConnectedPartner(data.partner);
      setShowConnectedCelebration(true);

      setTimeout(() => {
        onConnected(data.partner, data.conversationId);
      }, 1600);
    } catch (err: any) {
      setError(err.message || 'This connection link is invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07080b]/90 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md glass-panel-elevated rounded-2xl p-6 sm:p-7 relative overflow-hidden"
      >
        {/* Close Button */}
        {!showConnectedCelebration && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-[#8b91a5] hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {showConnectedCelebration ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="py-10 text-center flex flex-col items-center justify-center"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-20 h-20 rounded-full bg-[#e0a96d]/15 border border-[#e0a96d]/40 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(224,169,109,0.3)]"
            >
              <Heart className="w-10 h-10 text-[#e0a96d] fill-[#e0a96d]" />
            </motion.div>

            <h3 className="font-serif text-2xl tracking-[0.2em] font-semibold text-[#f5ede3] uppercase mb-1">
              Connected ❤️
            </h3>
            <p className="text-sm text-[#ebd0b0]">
              You and {connectedPartner?.name} are now privately connected.
            </p>
            <p className="text-xs text-[#8b91a5] mt-3 animate-pulse">
              Opening your private conversation...
            </p>
          </motion.div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h2 className="font-serif text-2xl tracking-[0.15em] font-semibold text-[#f5ede3] uppercase">
                Add Person
              </h2>
              <p className="text-xs text-[#a0a5b5] mt-1">
                Establish a secure private channel with your partner.
              </p>
            </div>

            {/* Segment Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#12141c] rounded-xl mb-6 border border-white/5">
              <button
                type="button"
                onClick={() => {
                  setTab('generate');
                  setError(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition cursor-pointer ${
                  tab === 'generate'
                    ? 'bg-[#e0a96d]/20 text-[#ebd0b0] shadow-sm'
                    : 'text-[#8b91a5] hover:text-white'
                }`}
              >
                Generate Link
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('connect');
                  setError(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition cursor-pointer ${
                  tab === 'connect'
                    ? 'bg-[#e0a96d]/20 text-[#ebd0b0] shadow-sm'
                    : 'text-[#8b91a5] hover:text-white'
                }`}
              >
                Connect With Link
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-500/20 text-red-300 text-xs text-center">
                {error}
              </div>
            )}

            <AnimatePresence mode="wait">
              {tab === 'generate' && (
                <motion.div
                  key="tab-generate"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="space-y-4"
                >
                  {!invitation ? (
                    <div className="text-center py-4 space-y-4">
                      <div className="w-12 h-12 mx-auto rounded-full bg-[#181a24] border border-[#e0a96d]/20 flex items-center justify-center">
                        <Link2 className="w-6 h-6 text-[#e0a96d]" />
                      </div>
                      <p className="text-xs text-[#a0a5b5] max-w-xs mx-auto">
                        Create a unique, one-time invitation link to share with your partner.
                      </p>

                      <button
                        id="btn-generate-invite-link"
                        type="button"
                        onClick={handleGenerateLink}
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl luxury-gradient-btn font-medium text-sm flex items-center justify-center gap-2 cursor-pointer transition active:scale-[0.99] disabled:opacity-50"
                      >
                        {loading ? <span>Generating Link...</span> : <span>Generate Invitation Link</span>}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-3.5 rounded-xl bg-[#12141c] border border-[#e0a96d]/25 space-y-2">
                        <div className="flex items-center justify-between text-xs text-[#a0a5b5]">
                          <span>Your LOVE YOU Link:</span>
                          <span className="text-[11px] text-[#e0a96d] flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Ready to share
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-black/40 font-mono text-xs text-[#f5ede3] break-all border border-white/5 select-all">
                          {getInviteUrl()}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          id="btn-copy-invite-link"
                          type="button"
                          onClick={handleCopy}
                          className="py-3 px-4 rounded-xl glass-input hover:bg-white/5 border border-white/10 text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                          {copied ? (
                            <>
                              <Check className="w-4 h-4 text-green-400" />
                              <span className="text-green-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 text-[#e0a96d]" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>

                        <button
                          id="btn-share-invite-link"
                          type="button"
                          onClick={handleNativeShare}
                          className="py-3 px-4 rounded-xl luxury-gradient-btn text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.99]"
                        >
                          <span>Share with Partner</span>
                        </button>
                      </div>

                      <div className="pt-2 text-center">
                        <p className="text-[11px] text-[#8b91a5] flex items-center justify-center gap-1">
                          <Shield className="w-3 h-3 text-[#e0a96d]/70" />
                          Secure one-time single connection token
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {tab === 'connect' && (
                <motion.form
                  key="tab-connect"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  onSubmit={handleConnectWithLink}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs text-[#a0a5b5] mb-1.5">
                      Paste Partner's Invitation Link or Code
                    </label>
                    <textarea
                      id="input-paste-invite-link"
                      required
                      rows={2}
                      value={pasteLink}
                      onChange={(e) => setPasteLink(e.target.value)}
                      placeholder="Paste LOVE YOU invitation link here..."
                      className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white placeholder-white/30 focus:outline-none resize-none font-mono"
                    />
                  </div>

                  <button
                    id="btn-connect-partner"
                    type="submit"
                    disabled={loading || !pasteLink.trim()}
                    className="w-full py-3.5 rounded-xl luxury-gradient-btn font-medium text-sm flex items-center justify-center gap-2 cursor-pointer transition active:scale-[0.99] disabled:opacity-50"
                  >
                    {loading ? (
                      <span>Validating Link...</span>
                    ) : (
                      <>
                        <span>Connect</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>
    </div>
  );
};
