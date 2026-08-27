import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Phone, Lock, ArrowRight, ArrowLeft, CheckCircle, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';

interface AuthScreenProps {
  onSuccess: (user: UserProfile, isNewUser: boolean) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [authMethod, setAuthMethod] = useState<'options' | 'email' | 'phone' | 'google-modal'>('options');
  const [emailMode, setEmailMode] = useState<'signin' | 'signup'>('signin');
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const [phone, setPhone] = useState('');
  const [phoneStep, setPhoneStep] = useState<'enter_phone' | 'enter_code'>('enter_phone');
  const [smsCode, setSmsCode] = useState('');
  const [generatedDemoCode, setGeneratedDemoCode] = useState('882914');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google account picker accounts
  const googleAccounts = [
    {
      name: 'Elena Rostova',
      email: 'elena.rostova@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    },
    {
      name: 'Julian Vance',
      email: 'julian.vance@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    },
  ];

  const handleGoogleSelect = async (account: typeof googleAccounts[0]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: account.email,
          name: account.name,
          avatarUrl: account.avatar,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      onSuccess(data.user, data.isNewUser);
    } catch (err: any) {
      setError(err.message || 'Unable to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError(null);

    const endpoint = emailMode === 'signup' ? '/api/auth/register' : '/api/auth/login';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          name: emailMode === 'signup' ? name.trim() || undefined : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      onSuccess(data.user, data.isNewUser);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendPhoneCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 6) {
      setError('Please enter a valid phone number');
      return;
    }
    setError(null);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Generate a clean 6-digit code for instant reliable verification
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedDemoCode(code);
      setSmsCode(code); // Pre-fill or make readily available for seamless UX
      setPhoneStep('enter_code');
    }, 450);
  };

  const handleVerifyPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsCode) {
      setError('Please enter verification code');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/phone-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phone.trim(),
          code: smsCode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid code');
      }
      onSuccess(data.user, data.isNewUser);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#0b0c10] text-[#f0f2f5] relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-to-b from-[#e0a96d]/10 via-[#c28b51]/5 to-transparent rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md glass-panel rounded-2xl p-6 sm:p-8 relative z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#181a24] border border-[#e0a96d]/20 mb-3 shadow-[0_0_20px_rgba(224,169,109,0.15)]">
            <svg
              className="w-6 h-6 text-[#e0a96d]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl tracking-[0.2em] font-semibold text-[#f5ede3] uppercase">
            LOVE YOU
          </h1>
          <p className="text-xs text-[#a0a5b5] mt-1 tracking-wide">
            {authMethod === 'options'
              ? 'Private luxury messaging for two'
              : authMethod === 'email'
              ? emailMode === 'signin' ? 'Welcome back to your private space' : 'Create your private account'
              : authMethod === 'phone'
              ? 'Secure phone verification'
              : 'Select your Google Account'}
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-5 p-3 rounded-lg bg-red-950/40 border border-red-500/20 text-red-300 text-xs text-center"
          >
            {error}
          </motion.div>
        )}

        {/* View Switcher */}
        <AnimatePresence mode="wait">
          {authMethod === 'options' && (
            <motion.div
              key="auth-options"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-3.5"
            >
              {/* Continue with Google */}
              <button
                id="btn-auth-google"
                type="button"
                onClick={() => setAuthMethod('google-modal')}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl glass-input hover:bg-white/5 border border-white/10 text-sm font-medium transition-all duration-200 active:scale-[0.99] cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Continue with Email */}
              <button
                id="btn-auth-email"
                type="button"
                onClick={() => {
                  setError(null);
                  setAuthMethod('email');
                }}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl glass-input hover:bg-white/5 border border-white/10 text-sm font-medium transition-all duration-200 active:scale-[0.99] cursor-pointer"
              >
                <Mail className="w-5 h-5 text-[#e0a96d]" />
                <span>Continue with Email</span>
              </button>

              {/* Continue with Phone Number */}
              <button
                id="btn-auth-phone"
                type="button"
                onClick={() => {
                  setError(null);
                  setAuthMethod('phone');
                  setPhoneStep('enter_phone');
                }}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl glass-input hover:bg-white/5 border border-white/10 text-sm font-medium transition-all duration-200 active:scale-[0.99] cursor-pointer"
              >
                <Phone className="w-5 h-5 text-[#e0a96d]" />
                <span>Continue with Phone Number</span>
              </button>

              <div className="pt-4 text-center">
                <p className="text-[11px] text-[#8b91a5] flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#e0a96d]/80 inline" />
                  <span>Private end-to-end connected architecture</span>
                </p>
              </div>
            </motion.div>
          )}

          {/* Google Account Selection Modal */}
          {authMethod === 'google-modal' && (
            <motion.div
              key="google-picker"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                <button
                  type="button"
                  onClick={() => setAuthMethod('options')}
                  className="text-xs text-[#a0a5b5] hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <span className="text-xs text-[#e0a96d] font-medium">Choose an account</span>
              </div>

              <div className="space-y-2">
                {googleAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    id={`btn-google-acc-${acc.name.replace(/\s+/g, '-').toLowerCase()}`}
                    type="button"
                    disabled={loading}
                    onClick={() => handleGoogleSelect(acc)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl glass-input hover:border-[#e0a96d]/40 transition text-left cursor-pointer group"
                  >
                    <img
                      src={acc.avatar}
                      alt={acc.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border border-white/10"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#f0f2f5] group-hover:text-[#ebd0b0] truncate">
                        {acc.name}
                      </div>
                      <div className="text-xs text-[#8b91a5] truncate">{acc.email}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#8b91a5] group-hover:text-[#e0a96d] transition" />
                  </button>
                ))}

                {/* Custom Google Account Option */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    handleGoogleSelect({
                      name: 'Connected Partner',
                      email: 'partner.love@gmail.com',
                      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80',
                    })
                  }
                  className="w-full py-2.5 px-3 rounded-xl border border-dashed border-white/15 text-xs text-[#a0a5b5] hover:text-white hover:border-[#e0a96d]/30 transition text-center cursor-pointer"
                >
                  + Use another Google account
                </button>
              </div>

              {loading && (
                <div className="text-center py-2 text-xs text-[#e0a96d] animate-pulse">
                  Authenticating with Google...
                </div>
              )}
            </motion.div>
          )}

          {/* Email Auth View */}
          {authMethod === 'email' && (
            <motion.form
              key="auth-email-form"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={handleEmailAuth}
              className="space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <button
                  type="button"
                  onClick={() => setAuthMethod('options')}
                  className="text-xs text-[#a0a5b5] hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailMode('signin');
                      setError(null);
                    }}
                    className={`px-2.5 py-1 rounded-md transition ${
                      emailMode === 'signin'
                        ? 'bg-[#e0a96d]/20 text-[#ebd0b0] font-medium'
                        : 'text-[#8b91a5] hover:text-white'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailMode('signup');
                      setError(null);
                    }}
                    className={`px-2.5 py-1 rounded-md transition ${
                      emailMode === 'signup'
                        ? 'bg-[#e0a96d]/20 text-[#ebd0b0] font-medium'
                        : 'text-[#8b91a5] hover:text-white'
                    }`}
                  >
                    Register
                  </button>
                </div>
              </div>

              {emailMode === 'signup' && (
                <div>
                  <label className="block text-xs text-[#a0a5b5] mb-1">Your Name</label>
                  <input
                    id="input-register-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Maya"
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm text-white placeholder-white/30 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-[#a0a5b5] mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8b91a5] absolute left-3.5 top-3" />
                  <input
                    id="input-auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl glass-input text-sm text-white placeholder-white/30 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#a0a5b5] mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8b91a5] absolute left-3.5 top-3" />
                  <input
                    id="input-auth-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl glass-input text-sm text-white placeholder-white/30 focus:outline-none"
                  />
                </div>
              </div>

              <button
                id="btn-submit-email-auth"
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl luxury-gradient-btn font-medium text-sm flex items-center justify-center gap-2 cursor-pointer transition active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <span>Please wait...</span>
                ) : (
                  <>
                    <span>{emailMode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.form>
          )}

          {/* Phone Auth View */}
          {authMethod === 'phone' && (
            <motion.div
              key="auth-phone-form"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    if (phoneStep === 'enter_code') {
                      setPhoneStep('enter_phone');
                    } else {
                      setAuthMethod('options');
                    }
                  }}
                  className="text-xs text-[#a0a5b5] hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <span className="text-xs text-[#e0a96d] font-medium">
                  {phoneStep === 'enter_phone' ? 'Step 1 of 2' : 'Step 2 of 2'}
                </span>
              </div>

              {phoneStep === 'enter_phone' ? (
                <form onSubmit={handleSendPhoneCode} className="space-y-4">
                  <div>
                    <label className="block text-xs text-[#a0a5b5] mb-1">Phone Number</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#8b91a5] absolute left-3.5 top-3" />
                      <input
                        id="input-auth-phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl glass-input text-sm text-white placeholder-white/30 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    id="btn-send-sms-code"
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl luxury-gradient-btn font-medium text-sm flex items-center justify-center gap-2 cursor-pointer transition active:scale-[0.99] disabled:opacity-50"
                  >
                    {loading ? <span>Sending Code...</span> : <span>Send Verification Code</span>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyPhoneCode} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-[#a0a5b5]">6-Digit SMS Code</label>
                      <span className="text-[11px] text-[#e0a96d]">Demo Code: {generatedDemoCode}</span>
                    </div>
                    <input
                      id="input-sms-code"
                      type="text"
                      maxLength={6}
                      required
                      value={smsCode}
                      onChange={(e) => setSmsCode(e.target.value)}
                      placeholder="882914"
                      className="w-full px-3.5 py-3 rounded-xl glass-input text-center tracking-[0.4em] font-mono text-lg text-white focus:outline-none"
                    />
                  </div>

                  <button
                    id="btn-verify-sms-code"
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl luxury-gradient-btn font-medium text-sm flex items-center justify-center gap-2 cursor-pointer transition active:scale-[0.99] disabled:opacity-50"
                  >
                    {loading ? <span>Verifying...</span> : <span>Verify & Continue</span>}
                  </button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
