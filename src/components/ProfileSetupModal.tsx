import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Camera, Check, Upload, ArrowRight } from 'lucide-react';
import { UserProfile } from '../types';
import { LUXURY_AVATARS, compressImage } from '../utils/avatars';

interface ProfileSetupModalProps {
  initialUser: UserProfile;
  onComplete: (updatedUser: UserProfile) => void;
}

export const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({
  initialUser,
  onComplete,
}) => {
  const [name, setName] = useState(initialUser.name || '');
  const [selectedAvatar, setSelectedAvatar] = useState(
    initialUser.avatarUrl || LUXURY_AVATARS[0].url
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
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
            setSelectedAvatar(data.url);
          } else {
            setSelectedAvatar(base64Data);
          }
        } catch {
          setSelectedAvatar(base64Data);
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(compressed);
    } catch {
      setError('Could not process selected image');
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: initialUser.id,
          name: name.trim(),
          avatarUrl: selectedAvatar,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save profile');
      }
      onComplete(data.user);
    } catch (err: any) {
      setError(err.message || 'Error updating profile');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#07080b]/90 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md glass-panel-elevated rounded-2xl p-6 sm:p-8"
      >
        <div className="text-center mb-6">
          <h2 className="font-serif text-2xl tracking-[0.15em] font-semibold text-[#f5ede3] uppercase">
            Create Your Profile
          </h2>
          <p className="text-xs text-[#a0a5b5] mt-1">
            Choose how your partner will see you in your private space.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-lg bg-red-950/40 border border-red-500/20 text-red-300 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Main Avatar Preview */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#e0a96d]/40 shadow-[0_0_25px_rgba(224,169,109,0.2)] bg-[#14161f]">
                <img
                  src={selectedAvatar}
                  alt="Profile Preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#e0a96d] text-[#0b0c10] flex items-center justify-center shadow-lg hover:scale-105 transition cursor-pointer"
                title="Upload Photo"
              >
                <Camera className="w-4 h-4" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-[#e0a96d] hover:underline flex items-center gap-1.5 justify-center cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" /> Upload from device
              </button>
            </div>
          </div>

          {/* Curated Presets */}
          <div>
            <label className="block text-xs text-[#8b91a5] mb-2 text-center">
              Or pick an aesthetic portrait:
            </label>
            <div className="grid grid-cols-6 gap-2">
              {LUXURY_AVATARS.map((avatar) => {
                const isSelected = selectedAvatar === avatar.url;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar.url)}
                    className={`relative rounded-full overflow-hidden aspect-square border transition cursor-pointer ${
                      isSelected
                        ? 'border-[#e0a96d] ring-2 ring-[#e0a96d]/40 scale-105'
                        : 'border-white/10 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={avatar.url}
                      alt={avatar.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-[#e0a96d]/30 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-xs text-[#a0a5b5] mb-1.5">Your Name</label>
            <input
              id="input-profile-name"
              type="text"
              required
              maxLength={30}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maya"
              className="w-full px-4 py-3 rounded-xl glass-input text-sm text-white placeholder-white/30 focus:outline-none"
            />
          </div>

          {/* Continue Button */}
          <button
            id="btn-start-messaging"
            type="submit"
            disabled={uploading || !name.trim()}
            className="w-full py-3.5 rounded-xl luxury-gradient-btn font-medium text-sm flex items-center justify-center gap-2 cursor-pointer transition active:scale-[0.99] disabled:opacity-50"
          >
            {uploading ? (
              <span>Saving...</span>
            ) : (
              <>
                <span>Start</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
