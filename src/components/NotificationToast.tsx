import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Mic, Image as ImageIcon, X } from 'lucide-react';
import { Message, UserProfile } from '../types';

interface NotificationToastProps {
  message: Message;
  sender: UserProfile;
  onClick: () => void;
  onClose: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  message,
  sender,
  onClick,
  onClose,
}) => {
  const getNotificationTitle = () => {
    if (message.type === 'voice') return 'New voice message';
    if (message.type === 'image') return 'New photo';
    return `New message from ${sender.name}`;
  };

  const getNotificationBody = () => {
    if (message.type === 'voice') return `${sender.name} sent a voice note`;
    if (message.type === 'image') return `${sender.name} shared a photo`;
    return message.text || 'Tap to view';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      onClick={onClick}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm glass-panel-elevated rounded-2xl p-3.5 flex items-center gap-3 shadow-2xl cursor-pointer border border-[#e0a96d]/30"
    >
      <img
        src={sender.avatarUrl}
        alt={sender.name}
        referrerPolicy="no-referrer"
        className="w-10 h-10 rounded-full object-cover border border-[#e0a96d]/40 shrink-0"
      />

      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-[#f5ede3] truncate">
          {getNotificationTitle()}
        </div>
        <div className="text-[11px] text-[#ebd0b0]/80 truncate">
          {getNotificationBody()}
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="p-1 text-[#8b91a5] hover:text-white rounded-full transition"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
};
