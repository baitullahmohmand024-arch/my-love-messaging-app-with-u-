import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  X,
  User,
  Heart,
  Volume2,
  VolumeX,
  Bell,
  LogOut,
  Trash2,
  Camera,
  Shield,
  Unlink,
  Check,
  Calendar,
} from 'lucide-react';
import { UserProfile, Connection } from '../types';
import { UserSettings } from '../utils/storage';
import { compressImage } from '../utils/avatars';

interface SettingsModalProps {
  currentUser: UserProfile;
  connection: Connection | null;
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onUpdateProfile: (updatedUser: UserProfile) => void;
  onDisconnectPartner: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  currentUser,
  connection,
  settings,
  onUpdateSettings,
  onUpdateProfile,
  onDisconnectPartner,
  onLogout,
  onDeleteAccount,
  onClose,
}) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentUser.name);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressed = await compressImage(file, 600, 600, 0.85);
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const base64Data = evt.target?.result as string;
        try {
          const res = await fetch('/api/media/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: base64Data,
              filename: file.name,
              type: 'image',
            }),
          });
          const data = await res.json();
          if (res.ok && data.url) {
            setAvatarUrl(data.url);
          } else {
            setAvatarUrl(base64Data);
          }
        } catch {
          setAvatarUrl(base64Data);
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(compressed);
    } catch {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setUploading(true);
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          name: name.trim(),
          avatarUrl,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onUpdateProfile(data.user);
        setEditing(false);
      }
    } catch {
      // ignore
    } finally {
      setUploading(false);
    }
  };

  // Connected days calculation
  const getConnectedDuration = () => {
    if (!connection) return null;
    const days = Math.max(
      1,
      Math.floor((Date.now() - connection.createdAt) / (1000 * 60 * 60 * 24))
    );
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07080b]/90 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md glass-panel-elevated rounded-2xl p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <h2 className="font-serif text-xl tracking-[0.15em] font-semibold text-[#f5ede3] uppercase">
            Settings & Profile
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#8b91a5] hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-6">
          {/* User Profile Card */}
          <div className="p-4 rounded-xl bg-[#12141c] border border-white/5 relative">
            {editing ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <img
                      src={avatarUrl}
                      alt="Avatar preview"
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-full object-cover border border-[#e0a96d]/40"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center text-white cursor-pointer opacity-90 hover:opacity-100 transition"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-[11px] text-[#8b91a5] mb-1">Display Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg glass-input text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setName(currentUser.name);
                      setAvatarUrl(currentUser.avatarUrl);
                      setEditing(false);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs text-[#8b91a5] hover:text-white transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !name.trim()}
                    className="px-4 py-1.5 rounded-lg luxury-gradient-btn text-xs font-medium cursor-pointer transition active:scale-95"
                  >
                    {uploading ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-full object-cover border border-[#e0a96d]/30"
                  />
                  <div>
                    <h3 className="font-serif text-lg font-medium text-[#f5ede3]">
                      {currentUser.name}
                    </h3>
                    <p className="text-xs text-[#8b91a5]">
                      {currentUser.email || currentUser.phoneNumber || 'Private User'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="px-3 py-1.5 rounded-lg glass-input text-xs text-[#e0a96d] hover:bg-white/5 transition cursor-pointer"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Connected Partner Section */}
          {connection && connection.partner && (
            <div className="p-4 rounded-xl bg-[#151722] border border-[#e0a96d]/20 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-serif uppercase tracking-wider text-[#e0a96d] flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 fill-[#e0a96d]" /> Connected Space
                </span>
                <span className="text-[11px] text-[#8b91a5] flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Together for {getConnectedDuration()}
                </span>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <img
                  src={connection.partner.avatarUrl}
                  alt={connection.partner.name}
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-full object-cover border border-white/10"
                />
                <div>
                  <div className="text-sm font-medium text-[#f0f2f5]">
                    {connection.partner.name}
                  </div>
                  <div className="text-xs text-[#8b91a5]">
                    {connection.partner.isOnline ? (
                      <span className="text-emerald-400">Online now</span>
                    ) : (
                      'Connected Partner'
                    )}
                  </div>
                </div>
              </div>

              {!confirmDisconnect ? (
                <button
                  type="button"
                  onClick={() => setConfirmDisconnect(true)}
                  className="w-full py-2 text-xs text-red-400/80 hover:text-red-300 hover:bg-red-950/20 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Unlink className="w-3.5 h-3.5" /> Disconnect Partner
                </button>
              ) : (
                <div className="p-2.5 bg-red-950/40 rounded-lg border border-red-500/20 text-center space-y-2">
                  <p className="text-xs text-red-200">
                    Are you sure you want to disconnect? You can always reconnect later.
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDisconnect(false)}
                      className="px-3 py-1 rounded bg-white/10 text-xs text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={onDisconnectPartner}
                      className="px-3 py-1 rounded bg-red-600 text-xs text-white font-medium cursor-pointer"
                    >
                      Confirm Disconnect
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preferences */}
          <div className="space-y-3">
            <h4 className="text-xs tracking-wider uppercase text-[#8b91a5] font-serif">
              Preferences
            </h4>

            {/* Sound Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#12141c] border border-white/5">
              <div className="flex items-center gap-3">
                {settings.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-[#e0a96d]" />
                ) : (
                  <VolumeX className="w-4 h-4 text-[#8b91a5]" />
                )}
                <div>
                  <div className="text-xs font-medium text-[#f0f2f5]">Subtle Chimes</div>
                  <div className="text-[11px] text-[#8b91a5]">
                    Play luxury audio chimes on message send and receive
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    ...settings,
                    soundEnabled: !settings.soundEnabled,
                  })
                }
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.soundEnabled ? 'bg-[#e0a96d]' : 'bg-white/10'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-[#0b0c10] absolute top-1 transition-transform ${
                    settings.soundEnabled ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Notifications Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#12141c] border border-white/5">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-[#e0a96d]" />
                <div>
                  <div className="text-xs font-medium text-[#f0f2f5]">In-App Notifications</div>
                  <div className="text-[11px] text-[#8b91a5]">
                    Show subtle banners when partner sends photos or notes
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    ...settings,
                    notificationsEnabled: !settings.notificationsEnabled,
                  })
                }
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.notificationsEnabled ? 'bg-[#e0a96d]' : 'bg-white/10'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-[#0b0c10] absolute top-1 transition-transform ${
                    settings.notificationsEnabled ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Account Actions */}
          <div className="pt-2 space-y-2 border-t border-white/5">
            <button
              id="btn-logout"
              type="button"
              onClick={onLogout}
              className="w-full py-2.5 px-3 rounded-xl text-xs text-[#a0a5b5] hover:text-white hover:bg-white/5 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>

            {!confirmDelete ? (
              <button
                id="btn-delete-account-prompt"
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full py-2 text-xs text-red-500/70 hover:text-red-400 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Account
              </button>
            ) : (
              <div className="p-3 bg-red-950/40 rounded-xl border border-red-500/20 text-center space-y-2">
                <p className="text-xs text-red-200">
                  Permanently delete your account and conversation data?
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1 rounded bg-white/10 text-xs text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-confirm-delete-account"
                    type="button"
                    onClick={onDeleteAccount}
                    className="px-3 py-1 rounded bg-red-600 text-xs text-white font-medium cursor-pointer"
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
