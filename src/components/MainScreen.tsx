import React from 'react';
import { motion } from 'motion/react';
import { Plus, MessageSquare, Settings, Heart, Shield, Sparkles, UserCheck } from 'lucide-react';
import { UserProfile, Connection, Message } from '../types';

interface MainScreenProps {
  currentUser: UserProfile;
  connection: Connection | null;
  lastMessage?: Message;
  isPartnerOnline: boolean;
  onOpenAddModal: () => void;
  onOpenChat: () => void;
  onOpenSettings: () => void;
}

export const MainScreen: React.FC<MainScreenProps> = ({
  currentUser,
  connection,
  lastMessage,
  isPartnerOnline,
  onOpenAddModal,
  onOpenChat,
  onOpenSettings,
}) => {
  const partner = connection?.partner;

  return (
    <div className="flex flex-col h-screen w-full bg-[#08090d] text-[#f0f2f5] select-none relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[480px] h-[480px] bg-gradient-to-tr from-[#e0a96d]/10 via-[#c28b51]/5 to-transparent rounded-full blur-[90px] pointer-events-none" />

      {/* Top Bar */}
      <header className="h-18 px-5 flex items-center justify-between border-b border-white/5 bg-[#0e1017]/85 backdrop-blur-md shrink-0 z-10">
        {/* User profile avatar (tappable for settings) */}
        <button
          id="btn-open-user-profile"
          type="button"
          onClick={onOpenSettings}
          className="flex items-center gap-2.5 group cursor-pointer"
        >
          <div className="relative">
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover border border-[#e0a96d]/40 group-hover:border-[#e0a96d] transition"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0e1017]" />
          </div>
          <span className="text-xs font-medium text-[#f0f2f5] group-hover:text-[#e0a96d] transition hidden sm:inline">
            {currentUser.name}
          </span>
        </button>

        {/* Brand */}
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-[#e0a96d]"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <h1 className="font-serif text-xl tracking-[0.2em] font-semibold text-[#f5ede3] uppercase">
            LOVE YOU
          </h1>
        </div>

        {/* Settings button */}
        <button
          id="btn-open-settings-top"
          type="button"
          onClick={onOpenSettings}
          className="p-2.5 rounded-full text-[#8b91a5] hover:text-white hover:bg-white/5 transition cursor-pointer"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* Main Center Area */}
      <main className="flex-1 flex flex-col justify-center items-center p-6 z-10 max-w-lg mx-auto w-full">
        {!connection || !partner ? (
          /* Empty State: Not connected yet */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full text-center space-y-6"
          >
            <div className="relative mx-auto w-24 h-24 rounded-full bg-[#141620] border border-[#e0a96d]/20 flex items-center justify-center shadow-[0_0_40px_rgba(224,169,109,0.1)]">
              <Heart className="w-10 h-10 text-[#e0a96d]/70" />
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.7, 0.3] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full border border-[#e0a96d]/40"
              />
            </div>

            <div className="space-y-2">
              <h2 className="font-serif text-2xl sm:text-3xl font-medium tracking-wide text-[#f5ede3]">
                Your private space is waiting.
              </h2>
              <p className="text-xs sm:text-sm text-[#8b91a5] max-w-xs mx-auto leading-relaxed">
                Connect with someone to start messaging privately.
              </p>
            </div>

            <div className="pt-2">
              <button
                id="btn-add-person-empty-state"
                type="button"
                onClick={onOpenAddModal}
                className="inline-flex items-center justify-center gap-2.5 py-4 px-8 rounded-2xl luxury-gradient-btn font-medium text-sm transition active:scale-[0.98] shadow-xl cursor-pointer"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                <span>Add Person</span>
              </button>
            </div>

            <div className="pt-6">
              <p className="text-[11px] text-[#8b91a5]/60 flex items-center justify-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#e0a96d]/50" />
                <span>1-on-1 private connection • No feeds • No algorithms</span>
              </p>
            </div>
          </motion.div>
        ) : (
          /* Connected State: Partner Conversation Available */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-4"
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#181a24] border border-[#e0a96d]/20 text-[11px] text-[#e0a96d] mb-2">
                <Sparkles className="w-3 h-3" /> Active Connection
              </div>
              <h2 className="font-serif text-2xl font-medium text-[#f5ede3] tracking-wide">
                Your Private Channel
              </h2>
            </div>

            {/* Partner Chat Card */}
            <button
              id="btn-open-partner-chat"
              type="button"
              onClick={onOpenChat}
              className="w-full p-4 rounded-2xl glass-panel-elevated hover:border-[#e0a96d]/40 transition text-left cursor-pointer group relative overflow-hidden"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={partner.avatarUrl}
                    alt={partner.name}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-full object-cover border-2 border-[#e0a96d]/40 group-hover:scale-105 transition"
                  />
                  {isPartnerOnline && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#181a24]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg font-semibold text-[#f5ede3] group-hover:text-[#ebd0b0] transition truncate">
                      {partner.name}
                    </h3>
                    <span className="text-[10px] text-[#8b91a5]">
                      {isPartnerOnline ? (
                        <span className="text-emerald-400">Online</span>
                      ) : (
                        'Partner'
                      )}
                    </span>
                  </div>

                  <p className="text-xs text-[#8b91a5] truncate mt-0.5">
                    {lastMessage?.type === 'voice'
                      ? '🎙️ Voice note'
                      : lastMessage?.type === 'image'
                      ? '📷 Photo'
                      : lastMessage?.text || 'Tap to open private conversation'}
                  </p>
                </div>
              </div>
            </button>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={onOpenChat}
                className="py-3 px-4 rounded-xl luxury-gradient-btn text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition active:scale-[0.98]"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Open Chat</span>
              </button>

              <button
                id="btn-add-or-invite-more"
                type="button"
                onClick={onOpenAddModal}
                className="py-3 px-4 rounded-xl glass-input hover:bg-white/5 text-xs text-[#ebd0b0] border border-white/10 flex items-center justify-center gap-2 cursor-pointer transition"
              >
                <Plus className="w-4 h-4 text-[#e0a96d]" />
                <span>Invite / Link</span>
              </button>
            </div>
          </motion.div>
        )}
      </main>

      {/* Floating or Bottom Bar */}
      <footer className="h-16 px-6 flex items-center justify-around border-t border-white/5 bg-[#0e1017]/85 backdrop-blur-md shrink-0 z-10">
        <button
          type="button"
          onClick={connection ? onOpenChat : onOpenAddModal}
          className="flex flex-col items-center gap-1 text-[#e0a96d] cursor-pointer"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] tracking-wider uppercase font-medium">Chat</span>
        </button>

        {/* Big Plus Center Action */}
        <button
          id="btn-footer-plus-action"
          type="button"
          onClick={onOpenAddModal}
          className="w-11 h-11 -mt-5 rounded-full luxury-gradient-btn flex items-center justify-center shadow-lg active:scale-95 transition cursor-pointer"
          title="Add Person"
        >
          <Plus className="w-5 h-5 text-[#0b0c10] stroke-[2.5]" />
        </button>

        <button
          id="btn-footer-profile"
          type="button"
          onClick={onOpenSettings}
          className="flex flex-col items-center gap-1 text-[#8b91a5] hover:text-white transition cursor-pointer"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] tracking-wider uppercase font-medium">Profile</span>
        </button>
      </footer>
    </div>
  );
};
